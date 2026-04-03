// ===== SAVE / LOAD (IndexedDB) =====
import { TOOLBAR_SLOTS, PLAYER_HEIGHT } from './constants.js';
import { world, generatedChunks, findSurfaceY } from './world.js';
import { chunks, buildChunkMeshes, removeChunkMeshes, chunkKey, worldToChunk, resetPlayerChunkPos } from './chunks.js';
import { inventory, toolInventory, toolbar, selectedSlot, setSelectedSlot } from './inventory.js';
import { euler, velocity } from './physics.js';
import { shared } from './state.js';
import { renderToolbar, showMessage } from './ui.js';
import { clearAllTorchLights, restoreTorchLights } from './interaction.js';

const DB_NAME  = 'miner_db';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const SAVE_KEY   = 'main';
export const AUTO_SAVE_INTERVAL = 60; // seconds

let saveDb = null;

function openSaveDb() {
    return new Promise((resolve, reject) => {
        if (saveDb) { resolve(saveDb); return; }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
        };
        req.onsuccess = (e) => { saveDb = e.target.result; resolve(saveDb); };
        req.onerror  = () => reject(req.error);
    });
}

function buildSaveData() {
    return {
        version: 1,
        player: {
            x: shared.camera.position.x,
            y: shared.camera.position.y,
            z: shared.camera.position.z,
            rotX: euler.x,
            rotY: euler.y,
        },
        gameTime: shared.gameTime || 0.25,
        inventory: { ...inventory },
        toolInventory: toolInventory.map(t => t ? { id: t.id, durability: t.durability } : null),
        toolbar: toolbar.map(s => s ? { ...s } : null),
        selectedSlot,
        world: { ...world },
        generatedChunks: Array.from(generatedChunks),
    };
}

export async function saveGame() {
    try {
        const db = await openSaveDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(buildSaveData(), SAVE_KEY);
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror    = () => { console.error('Gem fejlede:', tx.error); resolve(false); };
        });
    } catch (e) {
        console.error('Gem fejlede:', e);
        return false;
    }
}

export async function loadGame() {
    try {
        const db = await openSaveDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(SAVE_KEY);
        return new Promise((resolve) => {
            req.onsuccess = () => {
                const saveData = req.result;
                if (!saveData || saveData.version !== 1) { resolve(false); return; }
                applySaveData(saveData);
                resolve(true);
            };
            req.onerror = () => { console.error('Indlæs fejlede:', req.error); resolve(false); };
        });
    } catch (e) {
        console.error('Indlæs fejlede:', e);
        return false;
    }
}

function applySaveData(saveData) {
    // Clear world
    for (const key in world) delete world[key];
    generatedChunks.clear();

    // Remove chunk meshes and torch lights
    for (const key in chunks) {
        const [cx, cz] = key.split(',').map(Number);
        removeChunkMeshes(cx, cz);
    }
    clearAllTorchLights();

    // Restore world
    for (const key in saveData.world) world[key] = saveData.world[key];
    for (const key of saveData.generatedChunks) generatedChunks.add(key);

    // Restore torch lights from saved world
    restoreTorchLights();

    // Restore player
    shared.camera.position.set(saveData.player.x, saveData.player.y, saveData.player.z);
    euler.x = saveData.player.rotX;
    euler.y = saveData.player.rotY;
    shared.camera.quaternion.setFromEuler(euler);
    velocity.set(0, 0, 0);

    shared.gameTime = saveData.gameTime || 0.25;

    // Restore inventory
    for (const key in inventory) delete inventory[key];
    for (const key in saveData.inventory) inventory[key] = saveData.inventory[key];

    toolInventory.length = 0;
    if (saveData.toolInventory) {
        for (const t of saveData.toolInventory) {
            toolInventory.push(t ? { id: t.id, durability: t.durability } : null);
        }
    }

    for (let i = 0; i < TOOLBAR_SLOTS; i++) {
        toolbar[i] = saveData.toolbar[i] || null;
    }
    if (!toolbar[0]) toolbar[0] = { type: 'tool', item: 'hand' };
    setSelectedSlot(saveData.selectedSlot || 0);

    // Force chunk reload
    resetPlayerChunkPos();

    const pcx = worldToChunk(shared.camera.position.x);
    const pcz = worldToChunk(shared.camera.position.z);
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            const key = chunkKey(pcx + dx, pcz + dz);
            if (generatedChunks.has(key)) buildChunkMeshes(pcx + dx, pcz + dz);
        }
    }

    renderToolbar();
}

export async function hasSaveGame() {
    try {
        const db = await openSaveDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.count(SAVE_KEY);
        return new Promise((resolve) => {
            req.onsuccess = () => resolve(req.result > 0);
            req.onerror   = () => resolve(false);
        });
    } catch (e) { return false; }
}

export async function deleteSaveGame() {
    try {
        const db = await openSaveDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(SAVE_KEY);
    } catch (e) { console.error('Slet fejlede:', e); }
}

export function initSaveDb() {
    openSaveDb().catch(() => {});
}
