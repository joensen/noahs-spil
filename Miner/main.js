// ===== MAIN — INIT, ANIMATE, EVENTS =====
import { PLAYER_HEIGHT, TOOLBAR_SLOTS, PI_2, DOUBLE_TAP_TIME, JUMP_VELOCITY } from './constants.js';
import { shared } from './state.js';
import { createMaterials } from './textures.js';
import { world, generatedChunks, findSurfaceY, generateChunkData, getBlock } from './world.js';
import { chunks, buildChunkMeshes, updateChunks, processChunkQueue, worldToChunk, chunkKey } from './chunks.js';
import { inventory, toolInventory, toolbar, selectedSlot, setSelectedSlot, setInventoryChangedCallback } from './inventory.js';
import { renderToolbar, showMessage } from './ui.js';
import { euler, velocity, movement, isSprinting, lastWTap, setIsSprinting, setLastWTap, updatePlayerMovement } from './physics.js';
import {
    createHighlight, updateTarget, breakBlock, placeBlock,
    targetBlock, breakProgress,
    isMouseHeld, breakTimer, lastBreakTarget, BREAK_INTERVAL,
    setIsMouseHeld, setBreakTimer, setLastBreakTarget,
} from './interaction.js';
import { openCrafting, closeCrafting, craftFromGrid } from './crafting.js';
import { initSaveDb, saveGame, loadGame, hasSaveGame, deleteSaveGame, AUTO_SAVE_INTERVAL } from './save.js';

// ===== DAY/NIGHT CYCLE =====
const DAY_CYCLE_DURATION = 600;

function updateDayNightCycle(delta) {
    shared.gameTime += delta / DAY_CYCLE_DURATION;
    if (shared.gameTime >= 1) shared.gameTime -= 1;

    const sunAngle  = shared.gameTime * Math.PI * 2;
    const sinFactor = Math.sin(sunAngle);

    shared.ambientLight.intensity = THREE.MathUtils.clamp(0.15 + 0.45 * sinFactor, 0.15, 0.6);
    shared.dirLight.intensity     = THREE.MathUtils.clamp(sinFactor * 0.8, 0, 0.8);

    const sunX = Math.cos(sunAngle) * 50;
    const sunY = Math.sin(sunAngle) * 50;
    shared.dirLight.position.set(sunX, sunY, 20);

    const dayColor   = new THREE.Color(0x87CEEB);
    const duskColor  = new THREE.Color(0xFF7744);
    const nightColor = new THREE.Color(0x0a0a2a);

    let skyColor;
    if (sinFactor > 0.2) {
        skyColor = dayColor;
    } else if (sinFactor > -0.1) {
        const t = (sinFactor - (-0.1)) / 0.3;
        skyColor = nightColor.clone().lerp(duskColor, t * 0.5);
        skyColor.lerp(dayColor, Math.max(0, (t - 0.3) / 0.7));
    } else {
        skyColor = nightColor;
    }
    shared.scene.background = skyColor;
    shared.scene.fog.color  = skyColor;

    if (sinFactor > 0.2) {
        shared.ambientLight.color.setHex(0xffffff);
        shared.dirLight.color.setHex(0xffffff);
    } else if (sinFactor > -0.1) {
        shared.ambientLight.color.set(0xffddaa);
        shared.dirLight.color.set(0xff9955);
    } else {
        shared.ambientLight.color.set(0x8888cc);
    }
}

function getTimeOfDayString() {
    const hour = Math.floor(shared.gameTime * 24);
    const min  = Math.floor((shared.gameTime * 24 - hour) * 60);
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

// ===== EVENT HANDLERS =====
function onPointerLockChange() {
    if (document.pointerLockElement === document.body) {
        shared.isPointerLocked = true;
    } else {
        shared.isPointerLocked = false;
        if (shared.gameStarted && !shared.craftingOpen) {
            document.getElementById('menu-screen').style.display = 'flex';
            document.getElementById('start-button').textContent = 'Klik for at fortsætte';
            document.getElementById('save-load-buttons').style.display = 'flex';
            document.getElementById('load-button-start').style.display = 'none';
        }
    }
}

function onMouseMove(event) {
    if (!shared.isPointerLocked) return;
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    euler.setFromQuaternion(shared.camera.quaternion);
    euler.y -= movementX * 0.002;
    euler.x -= movementY * 0.002;
    euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
    shared.camera.quaternion.setFromEuler(euler);
}

function onMouseDown(event) {
    if (!shared.isPointerLocked) return;
    if (event.button === 0) {
        setIsMouseHeld(true);
        setBreakTimer(BREAK_INTERVAL); // fire on first frame
    } else if (event.button === 2) {
        placeBlock();
    }
}

function onMouseUp(event) {
    if (event.button === 0) {
        setIsMouseHeld(false);
        // Reset partial break progress if block wasn't finished
        if (lastBreakTarget && breakProgress[lastBreakTarget]) {
            delete breakProgress[lastBreakTarget];
            if (shared.breakOverlay) shared.breakOverlay.visible = false;
        }
        setLastBreakTarget(null);
        setBreakTimer(0);
    }
}

function onKeyDown(event) {
    if (event.ctrlKey || event.metaKey) {
        if (shared.gameStarted) event.preventDefault();
        return;
    }
    if (event.altKey) return;

    if (event.code === 'KeyE') {
        if (shared.craftingOpen) {
            closeCrafting();
        } else if (shared.isPointerLocked && shared.gameStarted) {
            openCrafting();
        }
        return;
    }

    switch (event.code) {
        case 'KeyW':
            if (!movement.forward) {
                const now = performance.now();
                if (now - lastWTap < DOUBLE_TAP_TIME) setIsSprinting(true);
                setLastWTap(now);
            }
            movement.forward = true;
            break;
        case 'KeyS': movement.backward = true; break;
        case 'KeyA': movement.left    = true;  break;
        case 'KeyD': movement.right   = true;  break;
        case 'Space':
            event.preventDefault();
            if (movement.canJump) {
                velocity.y = JUMP_VELOCITY;
                movement.canJump = false;
            }
            break;
        case 'Digit1': case 'Digit2': case 'Digit3':
        case 'Digit4': case 'Digit5': case 'Digit6':
        case 'Digit7': case 'Digit8': case 'Digit9':
            setSelectedSlot(parseInt(event.code.charAt(5)) - 1);
            renderToolbar();
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': movement.forward  = false; setIsSprinting(false); break;
        case 'KeyS': movement.backward = false; break;
        case 'KeyA': movement.left     = false; break;
        case 'KeyD': movement.right    = false; break;
    }
}

function onContextMenu(event) { event.preventDefault(); }

function onWindowResize() {
    shared.camera.aspect = window.innerWidth / window.innerHeight;
    shared.camera.updateProjectionMatrix();
    shared.renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== INIT =====
function init() {
    initSaveDb();

    shared.scene = new THREE.Scene();
    shared.scene.background = new THREE.Color(0x87CEEB);
    shared.scene.fog = new THREE.Fog(0x87CEEB, 40, 120);

    shared.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);

    shared.renderer = new THREE.WebGLRenderer({ antialias: false });
    shared.renderer.setSize(window.innerWidth, window.innerHeight);
    shared.renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('game-container').appendChild(shared.renderer.domElement);

    shared.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    shared.scene.add(shared.ambientLight);
    shared.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    shared.dirLight.position.set(30, 50, 20);
    shared.scene.add(shared.dirLight);

    createMaterials();

    // Generate spawn chunks synchronously for immediate playability
    const spawnX = 128, spawnZ = 128;
    const spawnCx = worldToChunk(spawnX);
    const spawnCz = worldToChunk(spawnZ);
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            generateChunkData(spawnCx + dx, spawnCz + dz);
            buildChunkMeshes(spawnCx + dx, spawnCz + dz);
        }
    }

    const spawnY = findSurfaceY(spawnX, spawnZ);
    shared.camera.position.set(spawnX, spawnY + PLAYER_HEIGHT + 1, spawnZ);

    createHighlight();

    // Wire up inventory → toolbar re-render (breaks circular import)
    setInventoryChangedCallback(renderToolbar);
    renderToolbar();

    // Events
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize);

    window.addEventListener('beforeunload', (e) => {
        if (shared.gameStarted) { saveGame(); e.preventDefault(); }
    });

    document.getElementById('crafting-close').addEventListener('click', closeCrafting);
    document.getElementById('custom-craft-btn').addEventListener('click', craftFromGrid);
    document.addEventListener('click', () => {
        const picker = document.getElementById('item-picker');
        if (picker) picker.style.display = 'none';
    });

    hasSaveGame().then(exists => {
        if (exists) document.getElementById('load-button-start').style.display = 'inline-block';
    });

    function startGame() {
        document.body.requestPointerLock();
        document.getElementById('menu-screen').style.display = 'none';
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('toolbar').style.display = 'flex';
        document.getElementById('time-display').style.display = 'block';
        shared.gameStarted = true;
    }

    document.getElementById('start-button').addEventListener('click', startGame);

    document.getElementById('load-button-start').addEventListener('click', async () => {
        if (await loadGame()) showMessage('Spil indlæst!');
        startGame();
    });

    document.getElementById('save-button').addEventListener('click', async () => {
        const ok = await saveGame();
        showMessage(ok ? 'Spil gemt!' : 'Gem fejlede!');
    });

    document.getElementById('load-button').addEventListener('click', async () => {
        const ok = await loadGame();
        showMessage(ok ? 'Spil indlæst!' : 'Ingen gemte data fundet!');
    });

    document.getElementById('delete-save-button').addEventListener('click', async () => {
        await deleteSaveGame();
        showMessage('Gemte data slettet!');
        document.getElementById('save-load-buttons').style.display = 'none';
    });

    shared.renderer.render(shared.scene, shared.camera);
    lastTime = performance.now();
    requestAnimationFrame(animate);
}

// ===== ANIMATION LOOP =====
let lastTime = 0;
let autoSaveTimer = 0;

function animate(currentTime) {
    requestAnimationFrame(animate);

    const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    if (shared.isPointerLocked && shared.gameStarted) {
        updatePlayerMovement(delta);
        updateTarget();

        // Hold-to-mine
        if (isMouseHeld) {
            const currentKey = targetBlock
                ? `${targetBlock.x},${targetBlock.y},${targetBlock.z}`
                : null;

            // Target changed mid-mining — reset old block's progress
            if (lastBreakTarget && lastBreakTarget !== currentKey) {
                delete breakProgress[lastBreakTarget];
                if (shared.breakOverlay) shared.breakOverlay.visible = false;
            }
            setLastBreakTarget(currentKey);

            if (currentKey) {
                setBreakTimer(breakTimer + delta);
                if (breakTimer >= BREAK_INTERVAL) {
                    setBreakTimer(breakTimer - BREAK_INTERVAL);
                    breakBlock();
                    // If block was broken, reset for next target
                    if (!getBlock(targetBlock.x, targetBlock.y, targetBlock.z)) {
                        setLastBreakTarget(null);
                        setBreakTimer(0);
                    }
                }
            } else {
                setBreakTimer(0);
            }
        }
    }

    if (shared.gameStarted) {
        updateDayNightCycle(delta);
        document.getElementById('time-display').textContent = getTimeOfDayString();

        autoSaveTimer += delta;
        if (autoSaveTimer >= AUTO_SAVE_INTERVAL) {
            autoSaveTimer = 0;
            saveGame();
        }
    }

    // Sprint FOV effect
    const targetFov = isSprinting ? 82 : 75;
    shared.camera.fov += (targetFov - shared.camera.fov) * Math.min(1, delta * 8);
    shared.camera.updateProjectionMatrix();

    updateChunks();
    processChunkQueue();

    shared.renderer.render(shared.scene, shared.camera);
}

// ===== START =====
init();
