// ===== PLAYER PHYSICS =====
import { PLAYER_HEIGHT, PLAYER_WIDTH, MOVE_SPEED, SPRINT_SPEED, GRAVITY, JUMP_VELOCITY, DOUBLE_TAP_TIME } from './constants.js';
import { getBlock, findSurfaceY, generatedChunks, generateChunkData } from './world.js';
import { shared } from './state.js';
import { worldToChunk } from './chunks.js';

export const velocity  = new THREE.Vector3();
export const movement  = { forward: false, backward: false, left: false, right: false, canJump: true };
export const euler     = new THREE.Euler(0, 0, 0, 'YXZ');
export const direction = new THREE.Vector3();
export let isSprinting = false;
export let lastWTap    = 0;

export function setIsSprinting(v) { isSprinting = v; }
export function setLastWTap(v)    { lastWTap = v; }

export function updatePlayerMovement(delta) {
    const camera = shared.camera;
    velocity.y -= GRAVITY * delta;

    direction.z = Number(movement.forward)  - Number(movement.backward);
    direction.x = Number(movement.right)    - Number(movement.left);
    direction.normalize();

    const speed = isSprinting ? SPRINT_SPEED : MOVE_SPEED;
    const moveVector = new THREE.Vector3();

    if (movement.forward || movement.backward) {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.y = 0; forward.normalize();
        moveVector.add(forward.multiplyScalar(direction.z * speed * delta));
    }
    if (movement.left || movement.right) {
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(camera.quaternion);
        right.y = 0; right.normalize();
        moveVector.add(right.multiplyScalar(direction.x * speed * delta));
    }

    const eyeY = camera.position.y;
    const px   = camera.position.x;
    const pz   = camera.position.z;
    const newX = px + moveVector.x;
    const newZ = pz + moveVector.z;
    let needAutoJump = false;

    if (!playerCollidesHorizontal(newX, eyeY, pz)) {
        camera.position.x = newX;
    } else if (movement.canJump && !playerCollidesHorizontal(newX, eyeY + 1, pz)) {
        needAutoJump = true;
        camera.position.x = newX;
    }

    if (!playerCollidesHorizontal(camera.position.x, eyeY, newZ)) {
        camera.position.z = newZ;
    } else if (movement.canJump && !playerCollidesHorizontal(camera.position.x, eyeY + 1, newZ)) {
        needAutoJump = true;
        camera.position.z = newZ;
    }

    if (needAutoJump && movement.canJump) {
        velocity.y = JUMP_VELOCITY;
        movement.canJump = false;
    }

    const dy     = velocity.y * delta;
    const newEyeY = camera.position.y + dy;

    if (dy <= 0) {
        const feetY  = newEyeY - PLAYER_HEIGHT;
        const floorY = findFloorUnderPlayer(camera.position.x, camera.position.z, camera.position.y);
        if (feetY <= floorY) {
            camera.position.y = floorY + PLAYER_HEIGHT;
            velocity.y = 0;
            movement.canJump = true;
        } else {
            camera.position.y = newEyeY;
            movement.canJump = false;
        }
    } else {
        const headY = newEyeY + 0.1;
        const ceilY = findCeilingAbovePlayer(camera.position.x, camera.position.z, camera.position.y);
        if (headY >= ceilY) {
            camera.position.y = ceilY - 0.1;
            velocity.y = 0;
        } else {
            camera.position.y = newEyeY;
        }
        movement.canJump = false;
    }

    // Respawn if fallen out of world
    if (camera.position.y < -30) {
        const spawnCx = worldToChunk(128);
        const spawnCz = worldToChunk(128);
        generateChunkData(spawnCx, spawnCz);
        const respawnY = findSurfaceY(128, 128);
        camera.position.set(128, respawnY + PLAYER_HEIGHT + 1, 128);
        velocity.y = 0;
    }
}

export function playerCollidesHorizontal(x, eyeY, z) {
    const hw    = PLAYER_WIDTH;
    const feetY = eyeY - PLAYER_HEIGHT;
    const headY = eyeY + 0.1;
    const minBX = Math.floor(x - hw), maxBX = Math.floor(x + hw);
    const minBZ = Math.floor(z - hw), maxBZ = Math.floor(z + hw);
    const minBY = Math.floor(feetY + 0.01), maxBY = Math.floor(headY);

    for (let by = minBY; by <= maxBY; by++) {
        for (let bx = minBX; bx <= maxBX; bx++) {
            for (let bz = minBZ; bz <= maxBZ; bz++) {
                if (getBlock(bx, by, bz)) {
                    if (x + hw > bx && x - hw < bx + 1 &&
                        z + hw > bz && z - hw < bz + 1 &&
                        feetY + 0.01 < by + 1 && headY > by) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

export function findFloorUnderPlayer(x, z, eyeY) {
    const hw    = PLAYER_WIDTH;
    const feetY = eyeY - PLAYER_HEIGHT;
    const startY = Math.floor(feetY);
    const minBX = Math.floor(x - hw + 0.001), maxBX = Math.floor(x + hw - 0.001);
    const minBZ = Math.floor(z - hw + 0.001), maxBZ = Math.floor(z + hw - 0.001);
    let highestFloor = -100;

    for (let bx = minBX; bx <= maxBX; bx++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
            for (let by = startY; by >= -22; by--) {
                if (getBlock(bx, by, bz)) {
                    if (by + 1 > highestFloor) highestFloor = by + 1;
                    break;
                }
            }
        }
    }
    return highestFloor;
}

export function findCeilingAbovePlayer(x, z, eyeY) {
    const hw    = PLAYER_WIDTH;
    const headY = eyeY + 0.1;
    const startY = Math.ceil(headY);
    const minBX = Math.floor(x - hw + 0.001), maxBX = Math.floor(x + hw - 0.001);
    const minBZ = Math.floor(z - hw + 0.001), maxBZ = Math.floor(z + hw - 0.001);
    let lowestCeil = 100;

    for (let bx = minBX; bx <= maxBX; bx++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
            for (let by = startY; by <= startY + 10; by++) {
                if (getBlock(bx, by, bz)) {
                    if (by < lowestCeil) lowestCeil = by;
                    break;
                }
            }
        }
    }
    return lowestCeil;
}
