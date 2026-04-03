// ===== BLOCK TARGETING, BREAK/PLACE & TORCH LIGHTS =====
import { REACH_DISTANCE, CHUNK_SIZE, BLOCK_HARDNESS, NON_BLOCK_ITEMS, TOOLS } from './constants.js';
import { world, getBlock, setBlock } from './world.js';
import { chunks, chunkKey, worldToChunk, rebuildChunkAt } from './chunks.js';
import { inventory, toolInventory, toolbar, selectedSlot, setSelectedSlot, addToInventory, removeFromInventory, getEffectiveHardness } from './inventory.js';
import { showMessage, renderToolbar } from './ui.js';
import { shared } from './state.js';

// ===== TORCH LIGHT MANAGEMENT =====
export function addTorchLight(x, y, z) {
    const key = `${x},${y},${z}`;
    if (shared.torchLights[key]) return;
    const light = new THREE.PointLight(0xffaa44, 1.5, 12);
    light.position.set(x + 0.5, y + 0.5, z + 0.5);
    shared.scene.add(light);
    shared.torchLights[key] = light;
}

export function removeTorchLight(x, y, z) {
    const key = `${x},${y},${z}`;
    if (!shared.torchLights[key]) return;
    shared.scene.remove(shared.torchLights[key]);
    delete shared.torchLights[key];
}

export function clearAllTorchLights() {
    for (const key in shared.torchLights) {
        shared.scene.remove(shared.torchLights[key]);
        delete shared.torchLights[key];
    }
}

export function restoreTorchLights() {
    for (const key in world) {
        if (world[key] === 'torch') {
            const [x, y, z] = key.split(',').map(Number);
            addTorchLight(x, y, z);
        }
    }
}

// ===== HIGHLIGHT & BREAK OVERLAY =====
export function createHighlight() {
    const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const edges = new THREE.EdgesGeometry(geo);
    shared.highlightMesh = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
    );
    shared.highlightMesh.visible = false;
    shared.scene.add(shared.highlightMesh);

    const overlayGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    shared.breakOverlay = new THREE.Mesh(overlayGeo, new THREE.MeshBasicMaterial({
        color: 0x000000, transparent: true, opacity: 0, depthTest: true
    }));
    shared.breakOverlay.visible = false;
    shared.scene.add(shared.breakOverlay);
}

// ===== BLOCK TARGETING =====
export let targetBlock = null;
export const breakProgress = {};

const _raycaster = new THREE.Raycaster();
const _rayDir    = new THREE.Vector3();

export function updateTarget() {
    const camera = shared.camera;
    _rayDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
    _raycaster.set(camera.position, _rayDir);
    _raycaster.far = REACH_DISTANCE;

    const pcx = worldToChunk(camera.position.x);
    const pcz = worldToChunk(camera.position.z);
    const chunkReach = Math.ceil(REACH_DISTANCE / CHUNK_SIZE) + 1;

    const objects = [];
    for (let dx = -chunkReach; dx <= chunkReach; dx++) {
        for (let dz = -chunkReach; dz <= chunkReach; dz++) {
            const chunk = chunks[chunkKey(pcx + dx, pcz + dz)];
            if (!chunk) continue;
            for (const type in chunk.meshes) {
                if (chunk.meshes[type]) objects.push(chunk.meshes[type]);
            }
        }
    }

    const intersects = _raycaster.intersectObjects(objects);

    if (intersects.length > 0) {
        const hit    = intersects[0];
        const normal = hit.face.normal;
        const eps    = 0.01;
        const blockPos = {
            x: Math.floor(hit.point.x - normal.x * eps),
            y: Math.floor(hit.point.y - normal.y * eps),
            z: Math.floor(hit.point.z - normal.z * eps)
        };
        const faceDir = {
            x: Math.round(normal.x),
            y: Math.round(normal.y),
            z: Math.round(normal.z)
        };

        targetBlock = {
            x: blockPos.x, y: blockPos.y, z: blockPos.z,
            faceX: blockPos.x + faceDir.x,
            faceY: blockPos.y + faceDir.y,
            faceZ: blockPos.z + faceDir.z
        };

        shared.highlightMesh.position.set(blockPos.x + 0.5, blockPos.y + 0.5, blockPos.z + 0.5);
        shared.highlightMesh.visible = true;

        const bkey     = `${blockPos.x},${blockPos.y},${blockPos.z}`;
        const blockType = getBlock(blockPos.x, blockPos.y, blockPos.z);
        if (blockType && breakProgress[bkey]) {
            const maxHits = getEffectiveHardness(blockType, BLOCK_HARDNESS);
            const progress = breakProgress[bkey] / maxHits;
            shared.breakOverlay.position.copy(shared.highlightMesh.position);
            shared.breakOverlay.material.opacity = progress * 0.6;
            shared.breakOverlay.visible = true;
        } else {
            shared.breakOverlay.visible = false;
        }

        const hint = document.getElementById('interaction-hint');
        if (blockType === 'workbench') {
            hint.textContent = 'Tryk E for at crafte';
            hint.style.display = 'block';
        } else {
            hint.style.display = 'none';
        }
    } else {
        targetBlock = null;
        shared.highlightMesh.visible = false;
        shared.breakOverlay.visible = false;
        document.getElementById('interaction-hint').style.display = 'none';
    }
}

// ===== TOOL DURABILITY =====
export function consumeToolDurability() {
    const slot = toolbar[selectedSlot];
    if (!slot || slot.type !== 'tool' || slot.item === 'hand') return;
    const toolEntry = toolInventory[slot.toolIndex];
    if (!toolEntry) return;
    toolEntry.durability--;
    if (toolEntry.durability <= 0) {
        showMessage('Værktøj gik i stykker!');
        toolInventory[slot.toolIndex] = null;
        toolbar[selectedSlot] = null;
        setSelectedSlot(0);
    }
    renderToolbar();
}

// ===== BREAK BLOCK =====
export function breakBlock() {
    if (!targetBlock) return;
    const { x, y, z } = targetBlock;
    const key = `${x},${y},${z}`;
    const blockType = getBlock(x, y, z);
    if (!blockType) return;

    if (!breakProgress[key]) breakProgress[key] = 0;
    breakProgress[key]++;

    const maxHits = getEffectiveHardness(blockType, BLOCK_HARDNESS);
    if (breakProgress[key] >= maxHits) {
        if (blockType === 'torch') removeTorchLight(x, y, z);
        setBlock(x, y, z, null);
        delete breakProgress[key];
        rebuildChunkAt(x, z);
        shared.breakOverlay.visible = false;
        addToInventory(blockType);
        consumeToolDurability();
    }
}

// ===== PLACE BLOCK =====
export function placeBlock() {
    if (!targetBlock) return;
    const { faceX, faceY, faceZ } = targetBlock;

    const camera = shared.camera;
    const px  = Math.floor(camera.position.x);
    const py1 = Math.floor(camera.position.y);
    const py2 = Math.floor(camera.position.y - 1);
    if ((faceX === px && faceZ === Math.floor(camera.position.z)) &&
        (faceY === py1 || faceY === py2)) return;

    if (getBlock(faceX, faceY, faceZ)) return;

    const slot = toolbar[selectedSlot];
    if (!slot || slot.type !== 'block') return;

    const blockType = slot.item;
    if (NON_BLOCK_ITEMS.includes(blockType)) return;
    if (!inventory[blockType] || inventory[blockType] <= 0) return;

    removeFromInventory(blockType);
    setBlock(faceX, faceY, faceZ, blockType);
    if (blockType === 'torch') addTorchLight(faceX, faceY, faceZ);
    rebuildChunkAt(faceX, faceZ);
}

// ===== HOLD-TO-MINE STATE =====
export let isMouseHeld    = false;
export let breakTimer     = 0;
export let lastBreakTarget = null;
export const BREAK_INTERVAL = 0.25;

export function setIsMouseHeld(v) { isMouseHeld = v; }
export function setBreakTimer(v)  { breakTimer = v; }
export function setLastBreakTarget(v) { lastBreakTarget = v; }
