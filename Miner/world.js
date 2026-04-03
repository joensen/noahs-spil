// ===== WORLD DATA & TERRAIN GENERATION =====
import { CHUNK_SIZE } from './constants.js';
import { SimplexNoise, fbm2d } from './noise.js';

// World data: key "x,y,z" -> block type string
export const world = {};
export const generatedChunks = new Set();

export function getBlock(x, y, z) {
    return world[`${x},${y},${z}`];
}

// Pure world mutation — no Three.js here.
// Torch light management is handled in interaction.js.
export function setBlock(x, y, z, type) {
    const key = `${x},${y},${z}`;
    if (type) {
        world[key] = type;
    } else {
        delete world[key];
    }
}

// ===== NOISE INSTANCES =====
export const terrainNoise = new SimplexNoise(42);
export const tempNoise    = new SimplexNoise(137);
export const moistNoise   = new SimplexNoise(259);

// ===== BIOMES =====
export const BIOMES = {
    plains:    { octaves: 2, freq: 0.008, amp: 3,  base: 0,  surface: 'grass', sub: 'dirt', treeGrid: 14, treeChance: 0.15 },
    forest:    { octaves: 3, freq: 0.018, amp: 7,  base: 1,  surface: 'grass', sub: 'dirt', treeGrid: 6,  treeChance: 0.75 },
    mountains: { octaves: 5, freq: 0.012, amp: 28, base: 6,  surface: 'grass', sub: 'dirt', treeGrid: 16, treeChance: 0.08 },
    desert:    { octaves: 2, freq: 0.006, amp: 2,  base: -1, surface: 'sand',  sub: 'sand', treeGrid: 0,  treeChance: 0   },
    tundra:    { octaves: 2, freq: 0.010, amp: 4,  base: 0,  surface: 'snow',  sub: 'dirt', treeGrid: 16, treeChance: 0.06 },
};

export function getBiome(x, z) {
    const temp  = tempNoise.noise2d(x * 0.004, z * 0.004);
    const moist = moistNoise.noise2d(x * 0.004, z * 0.004);
    if (temp < -0.2) return 'tundra';
    if (temp > 0.3 && moist < 0.0) return 'desert';
    if (moist > 0.2) return 'forest';
    if (temp > 0.05 && moist < -0.15) return 'mountains';
    return 'plains';
}

export function getTerrainHeight(x, z) {
    const biome = getBiome(x, z);
    const b = BIOMES[biome];
    const height = b.base + fbm2d(terrainNoise, x, z, b.octaves, b.freq, b.amp);

    const blendRadius = 8;
    const nx1 = getBiome(x - blendRadius, z);
    const nx2 = getBiome(x + blendRadius, z);
    const nz1 = getBiome(x, z - blendRadius);
    const nz2 = getBiome(x, z + blendRadius);

    if (nx1 === biome && nx2 === biome && nz1 === biome && nz2 === biome) {
        return Math.floor(height);
    }

    let totalHeight = height * 4, totalWeight = 4;
    for (const { bx, bz } of [
        { bx: x - blendRadius, bz: z },
        { bx: x + blendRadius, bz: z },
        { bx: x, bz: z - blendRadius },
        { bx: x, bz: z + blendRadius },
    ]) {
        const nb = BIOMES[getBiome(bx, bz)];
        totalHeight += nb.base + fbm2d(terrainNoise, x, z, nb.octaves, nb.freq, nb.amp);
        totalWeight++;
    }
    return Math.floor(totalHeight / totalWeight);
}

export function findSurfaceY(x, z) {
    for (let y = 50; y >= -22; y--) {
        if (getBlock(Math.floor(x), y, Math.floor(z))) return y + 1;
    }
    return 1;
}

// ===== CHUNK TERRAIN GENERATION =====
export function generateChunkData(cx, cz) {
    const key = `${cx},${cz}`;
    if (generatedChunks.has(key)) return;
    generatedChunks.add(key);

    const sx = cx * CHUNK_SIZE;
    const sz = cz * CHUNK_SIZE;

    // Pass 1 — Biome-aware terrain
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const x = sx + lx, z = sz + lz;
            const biome = getBiome(x, z);
            const b = BIOMES[biome];
            const surfaceY = getTerrainHeight(x, z);

            let surfaceBlock = b.surface;
            let subBlock = b.sub;
            if (biome === 'mountains' && surfaceY > 12) {
                surfaceBlock = 'stone';
                subBlock = 'stone';
            }

            for (let y = -20; y <= surfaceY; y++) {
                if (y === surfaceY) {
                    setBlock(x, y, z, surfaceBlock);
                } else if (y >= surfaceY - 2) {
                    setBlock(x, y, z, subBlock);
                } else {
                    setBlock(x, y, z, 'stone');
                }
            }
        }
    }

    // Pass 2 — Cave carving
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const x = sx + lx, z = sz + lz;
            for (let y = -18; y <= 10; y++) {
                const k = `${x},${y},${z}`;
                if (!world[k]) continue;
                if (!world[`${x},${y + 1},${z}`]) continue;
                if (terrainNoise.noise3d(x * 0.07, y * 0.07, z * 0.07) > 0.45) {
                    delete world[k];
                }
            }
        }
    }

    // Pass 3 — Biome-aware vegetation
    const gridStep = 4;
    const gridStartX = Math.ceil((sx + 2) / gridStep) * gridStep;
    const gridStartZ = Math.ceil((sz + 2) / gridStep) * gridStep;
    const gridEndX = sx + CHUNK_SIZE - 3;
    const gridEndZ = sz + CHUNK_SIZE - 3;

    for (let gx = gridStartX; gx <= gridEndX; gx += gridStep) {
        for (let gz = gridStartZ; gz <= gridEndZ; gz += gridStep) {
            const jx = Math.floor(terrainNoise.noise2d(gx * 0.5, gz * 0.5) * 2);
            const jz = Math.floor(terrainNoise.noise2d(gx * 0.5 + 100, gz * 0.5 + 100) * 2);
            const tx = gx + jx;
            const tz = gz + jz;

            if (tx < sx + 1 || tx >= sx + CHUNK_SIZE - 1) continue;
            if (tz < sz + 1 || tz >= sz + CHUNK_SIZE - 1) continue;

            const biome = getBiome(tx, tz);
            const b = BIOMES[biome];

            const roll = (terrainNoise.noise2d(tx * 1.7 + 300, tz * 1.7 + 300) + 1) * 0.5;
            if (roll > b.treeChance) continue;

            if (biome === 'desert') {
                let surfaceY = null;
                for (let y = 50; y >= -22; y--) {
                    if (getBlock(tx, y, tz) === 'sand') { surfaceY = y; break; }
                }
                if (surfaceY === null) continue;
                const cactusHeight = 2 + Math.floor((terrainNoise.noise2d(tx * 3.1, tz * 3.1) + 1) * 1.5);
                for (let dy = 1; dy <= cactusHeight; dy++) setBlock(tx, surfaceY + dy, tz, 'cactus');
                continue;
            }

            let surfaceY = null;
            for (let y = 50; y >= -22; y--) {
                const block = getBlock(tx, y, tz);
                if (block === 'grass' || block === 'snow') { surfaceY = y; break; }
            }
            if (surfaceY === null) continue;

            const nHeights = [
                getBlock(tx - 1, surfaceY, tz) ? 0 : (getBlock(tx - 1, surfaceY - 1, tz) ? -1 : -2),
                getBlock(tx + 1, surfaceY, tz) ? 0 : (getBlock(tx + 1, surfaceY - 1, tz) ? -1 : -2),
                getBlock(tx, surfaceY, tz - 1) ? 0 : (getBlock(tx, surfaceY - 1, tz - 1) ? -1 : -2),
                getBlock(tx, surfaceY, tz + 1) ? 0 : (getBlock(tx, surfaceY - 1, tz + 1) ? -1 : -2),
            ];
            if (nHeights.some(h => h < -1)) continue;

            const trunkBase   = surfaceY + 1;
            const trunkHeight = biome === 'forest' ? 5 : 4;
            for (let y = trunkBase; y < trunkBase + trunkHeight; y++) setBlock(tx, y, tz, 'wood');

            const leafBase   = trunkBase + trunkHeight - 1;
            const leafRadius = biome === 'forest' ? 2 : 1;
            for (let dx = -leafRadius; dx <= leafRadius; dx++) {
                for (let dz = -leafRadius; dz <= leafRadius; dz++) {
                    if (leafRadius > 1 && Math.abs(dx) === leafRadius && Math.abs(dz) === leafRadius) continue;
                    for (let dy = 0; dy <= 2; dy++) {
                        if (dx === 0 && dz === 0 && dy === 0) continue;
                        setBlock(tx + dx, leafBase + dy, tz + dz, 'leaves');
                    }
                }
            }
            setBlock(tx, leafBase + 3, tz, 'leaves');
        }
    }

    // Pass 4 — Coal ore generation
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const x = sx + lx, z = sz + lz;
            for (let y = -15; y <= 8; y++) {
                if (getBlock(x, y, z) !== 'stone') continue;
                const n = terrainNoise.noise3d(x * 0.2 + 500, y * 0.2 + 500, z * 0.2 + 500);
                if (n > 0.55) setBlock(x, y, z, 'coal');
            }
        }
    }
}
