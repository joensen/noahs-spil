// ===== CHUNK MESH BUILDING & LOADING =====
import { BLOCK_TYPES, CHUNK_SIZE, RENDER_DISTANCE, CHUNKS_PER_FRAME, FACES } from './constants.js';
import { world, getBlock, generateChunkData } from './world.js';
import { materials } from './textures.js';
import { shared } from './state.js';

export const chunks = {};
export let lastPlayerChunkX = null;
export let lastPlayerChunkZ = null;
export let chunkLoadQueue = [];

export function chunkKey(cx, cz) { return `${cx},${cz}`; }
export function worldToChunk(v) { return Math.floor(v / CHUNK_SIZE); }

// Called after save/load to force updateChunks to re-evaluate
export function resetPlayerChunkPos() {
    lastPlayerChunkX = null;
    lastPlayerChunkZ = null;
}

// ===== CHUNK MESH BUILDING (Face-culled) =====
export function buildChunkMeshes(cx, cz) {
    const key = chunkKey(cx, cz);
    removeChunkMeshes(cx, cz);

    const sx = cx * CHUNK_SIZE;
    const sz = cz * CHUNK_SIZE;

    const typeBuffers = {};
    for (const type of BLOCK_TYPES) {
        if (Array.isArray(materials[type])) {
            typeBuffers[type] = Array.from({ length: 6 }, () => ({
                positions: [], normals: [], uvs: [], indices: [], vertexCount: 0
            }));
        } else {
            typeBuffers[type] = { positions: [], normals: [], uvs: [], indices: [], vertexCount: 0 };
        }
    }

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const x = sx + lx, z = sz + lz;
            for (let y = -22; y <= 55; y++) {
                const type = getBlock(x, y, z);
                if (!type || !typeBuffers[type]) continue;

                const isMultiMat = Array.isArray(materials[type]);

                for (let f = 0; f < 6; f++) {
                    const face = FACES[f];
                    const nx = x + face.dir[0];
                    const ny = y + face.dir[1];
                    const nz = z + face.dir[2];
                    if (getBlock(nx, ny, nz)) continue;

                    const buf = isMultiMat ? typeBuffers[type][f] : typeBuffers[type];
                    const vi = buf.vertexCount;

                    for (const c of face.corners) {
                        buf.positions.push(x + c[0], y + c[1], z + c[2]);
                        buf.normals.push(face.dir[0], face.dir[1], face.dir[2]);
                        buf.uvs.push(c[3], c[4]);
                    }
                    buf.indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
                    buf.vertexCount += 4;
                }
            }
        }
    }

    const chunkMeshes = {};

    for (const type of BLOCK_TYPES) {
        const isMultiMat = Array.isArray(materials[type]);

        if (isMultiMat) {
            const buckets = typeBuffers[type];
            const totalIndices = buckets.reduce((s, b) => s + b.indices.length, 0);
            if (totalIndices === 0) { chunkMeshes[type] = null; continue; }

            const allPositions = [], allNormals = [], allUvs = [], allIndices = [];
            let vertexOffset = 0, indexOffset = 0;
            const geometry = new THREE.BufferGeometry();

            for (let f = 0; f < 6; f++) {
                const b = buckets[f];
                if (b.indices.length === 0) continue;
                for (const idx of b.indices) allIndices.push(idx + vertexOffset);
                allPositions.push(...b.positions);
                allNormals.push(...b.normals);
                allUvs.push(...b.uvs);
                geometry.addGroup(indexOffset, b.indices.length, f);
                indexOffset += b.indices.length;
                vertexOffset += b.vertexCount;
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
            geometry.setAttribute('normal',   new THREE.Float32BufferAttribute(allNormals, 3));
            geometry.setAttribute('uv',       new THREE.Float32BufferAttribute(allUvs, 2));
            geometry.setIndex(allIndices);

            const mesh = new THREE.Mesh(geometry, materials[type]);
            chunkMeshes[type] = mesh;
            shared.scene.add(mesh);
        } else {
            const buf = typeBuffers[type];
            if (buf.vertexCount === 0) { chunkMeshes[type] = null; continue; }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(buf.positions, 3));
            geometry.setAttribute('normal',   new THREE.Float32BufferAttribute(buf.normals, 3));
            geometry.setAttribute('uv',       new THREE.Float32BufferAttribute(buf.uvs, 2));
            geometry.setIndex(buf.indices);

            const mesh = new THREE.Mesh(geometry, materials[type]);
            chunkMeshes[type] = mesh;
            shared.scene.add(mesh);
        }
    }

    chunks[key] = { meshes: chunkMeshes };
}

export function removeChunkMeshes(cx, cz) {
    const key = chunkKey(cx, cz);
    const chunk = chunks[key];
    if (!chunk) return;
    for (const type in chunk.meshes) {
        const m = chunk.meshes[type];
        if (!m) continue;
        shared.scene.remove(m);
        if (m.geometry) m.geometry.dispose();
    }
    delete chunks[key];
}

export function rebuildChunkAt(x, z) {
    const cx = worldToChunk(x);
    const cz = worldToChunk(z);
    if (chunks[chunkKey(cx, cz)]) buildChunkMeshes(cx, cz);
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    if (lx === 0 && chunks[chunkKey(cx - 1, cz)]) buildChunkMeshes(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1 && chunks[chunkKey(cx + 1, cz)]) buildChunkMeshes(cx + 1, cz);
    if (lz === 0 && chunks[chunkKey(cx, cz - 1)]) buildChunkMeshes(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1 && chunks[chunkKey(cx, cz + 1)]) buildChunkMeshes(cx, cz + 1);
}

// ===== CHUNK LOADING / UNLOADING =====
export function updateChunks() {
    const pcx = worldToChunk(shared.camera.position.x);
    const pcz = worldToChunk(shared.camera.position.z);

    if (pcx === lastPlayerChunkX && pcz === lastPlayerChunkZ) return;
    lastPlayerChunkX = pcx;
    lastPlayerChunkZ = pcz;

    const needed = new Set();
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
        for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
            if (dx * dx + dz * dz > (RENDER_DISTANCE + 0.5) ** 2) continue;
            needed.add(chunkKey(pcx + dx, pcz + dz));
        }
    }

    for (const key in chunks) {
        if (!needed.has(key)) {
            const [cx, cz] = key.split(',').map(Number);
            removeChunkMeshes(cx, cz);
        }
    }

    chunkLoadQueue = [];
    for (const key of needed) {
        if (!chunks[key]) {
            const [cx, cz] = key.split(',').map(Number);
            const dist = (cx - pcx) ** 2 + (cz - pcz) ** 2;
            chunkLoadQueue.push({ cx, cz, dist });
        }
    }
    chunkLoadQueue.sort((a, b) => a.dist - b.dist);
}

export function processChunkQueue() {
    let loaded = 0;
    while (chunkLoadQueue.length > 0 && loaded < CHUNKS_PER_FRAME) {
        const { cx, cz } = chunkLoadQueue.shift();
        generateChunkData(cx, cz);
        buildChunkMeshes(cx, cz);
        loaded++;
    }
}
