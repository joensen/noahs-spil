// ===== MINER - 3D Block Building Game (Survival Mode) =====

// ===== CONSTANTS =====
const BLOCK_TYPES = ['grass', 'dirt', 'stone', 'wood', 'sand', 'brick', 'leaves', 'workbench', 'snow', 'cactus'];
const BLOCK_HARDNESS = {
    grass: 3, dirt: 3, stone: 5, wood: 4, sand: 2, brick: 5, leaves: 1, workbench: 4, snow: 2, cactus: 2
};
const CHUNK_SIZE = 16;
const RENDER_DISTANCE = 6;       // chunks
const CHUNKS_PER_FRAME = 2;      // max chunks to generate+mesh per frame
const PLAYER_HEIGHT = 1.6;
const MOVE_SPEED = 5;
const SPRINT_SPEED = 8.5;
const DOUBLE_TAP_TIME = 300; // ms
const GRAVITY = 20;
const JUMP_VELOCITY = 8;
const PI_2 = Math.PI / 2;
const REACH_DISTANCE = 6;
const TOOLBAR_SLOTS = 9;

// ===== TOOLS =====
const TOOLS = {
    hand:           { name: 'Hånd',     durability: Infinity, speedMultiplier: 1, efficient: ['wood', 'leaves'] },
    wooden_pickaxe: { name: 'Træhakke', durability: 30, speedMultiplier: 3, efficient: ['stone', 'brick'] },
    wooden_axe:     { name: 'Træøkse',  durability: 30, speedMultiplier: 3, efficient: ['wood'] },
    wooden_shovel:  { name: 'Træskovl', durability: 30, speedMultiplier: 3, efficient: ['dirt', 'grass', 'sand'] },
};

// ===== RECIPES =====
const RECIPES = [
    { id: 'workbench_block', name: 'Arbejdsbord', result: { type: 'block', item: 'workbench' }, cost: { wood: 4 }, needsWorkbench: false },
    { id: 'wooden_pickaxe',  name: 'Træhakke',    result: { type: 'tool',  item: 'wooden_pickaxe' }, cost: { wood: 3 }, needsWorkbench: true },
    { id: 'wooden_axe',      name: 'Træøkse',     result: { type: 'tool',  item: 'wooden_axe' },     cost: { wood: 3 }, needsWorkbench: true },
    { id: 'wooden_shovel',   name: 'Træskovl',    result: { type: 'tool',  item: 'wooden_shovel' },  cost: { wood: 2 }, needsWorkbench: true },
];

// ===== STATE =====
let scene, camera, renderer;
let isPointerLocked = false;
let gameStarted = false;
let craftingOpen = false;

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const velocity = new THREE.Vector3();
const movement = { forward: false, backward: false, left: false, right: false, canJump: true };
let isSprinting = false;
let lastWTap = 0;
const direction = new THREE.Vector3();

// World data: key "x,y,z" -> block type string
const world = {};

// Chunk system
const chunks = {};                // "cx,cz" -> { meshes: { type: Object3D } }
const generatedChunks = new Set();
let lastPlayerChunkX = null;
let lastPlayerChunkZ = null;
let chunkLoadQueue = [];

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const materials = {};

// Face definitions for face-culled mesh building
// Each face: direction to check neighbor, 4 corner vertices [x,y,z,u,v]
// Winding is CCW for outward-facing normals
// Material indices match Three.js BoxGeometry convention: +x,-x,+y,-y,+z,-z
const FACES = [
    { dir: [1,0,0], corners: [[1,0,0,0,0],[1,1,0,0,1],[1,1,1,1,1],[1,0,1,1,0]] },
    { dir: [-1,0,0], corners: [[0,0,1,0,0],[0,1,1,0,1],[0,1,0,1,1],[0,0,0,1,0]] },
    { dir: [0,1,0], corners: [[1,1,0,0,0],[0,1,0,0,1],[0,1,1,1,1],[1,1,1,1,0]] },
    { dir: [0,-1,0], corners: [[0,0,0,0,0],[1,0,0,0,1],[1,0,1,1,1],[0,0,1,1,0]] },
    { dir: [0,0,1], corners: [[0,0,1,0,0],[1,0,1,1,0],[1,1,1,1,1],[0,1,1,0,1]] },
    { dir: [0,0,-1], corners: [[1,0,0,0,0],[0,0,0,1,0],[0,1,0,1,1],[1,1,0,0,1]] },
];

// Reusable raycaster (avoid creating new one each frame)
const _raycaster = new THREE.Raycaster();
const _rayDir = new THREE.Vector3();

// Block targeting
let targetBlock = null;
let highlightMesh = null;
let breakProgress = {};
let breakOverlay = null;

// Inventory
const inventory = {};       // { wood: 5, dirt: 3 }
const toolInventory = [];   // [{ id: 'wooden_pickaxe', durability: 30 }, ...]
const toolbar = new Array(TOOLBAR_SLOTS).fill(null);
// Slot 0 is always hand
toolbar[0] = { type: 'tool', item: 'hand' };

let selectedSlot = 0;

// Message system
let messageTimer = null;

// Day/Night cycle
const DAY_CYCLE_DURATION = 600; // 10 minutes in seconds
let gameTime = 0.25; // 0..1 where 0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight (start at noon)
let ambientLight = null;
let dirLight = null;

// Timing
let lastTime = 0;

// ===== TEXTURE GENERATION =====
function createBlockTexture(type) {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    switch (type) {
        case 'grass':
            ctx.fillStyle = '#5a8f29';
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < 20; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#4a7f20' : '#6a9f35';
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * size);
                ctx.fillRect(x, y, 1, 1);
            }
            break;

        case 'dirt':
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < 30; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#7a5a10' : '#9b7924';
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * size);
                ctx.fillRect(x, y, 1, 1);
            }
            break;

        case 'stone':
            ctx.fillStyle = '#888';
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < 40; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#777' : '#999';
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * size);
                ctx.fillRect(x, y, 1, 1);
            }
            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = '#666';
                const x = Math.floor(Math.random() * (size - 2));
                const y = Math.floor(Math.random() * (size - 2));
                ctx.fillRect(x, y, 2, 2);
            }
            break;

        case 'wood':
            ctx.fillStyle = '#A0722A';
            ctx.fillRect(0, 0, size, size);
            for (let x = 0; x < size; x += 3) {
                ctx.fillStyle = '#8B6220';
                ctx.fillRect(x, 0, 1, size);
            }
            for (let i = 0; i < 15; i++) {
                ctx.fillStyle = '#B0823A';
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * size);
                ctx.fillRect(x, y, 1, 1);
            }
            break;

        case 'sand':
            ctx.fillStyle = '#E8D68C';
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < 25; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#D8C67C' : '#F0DE94';
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * size);
                ctx.fillRect(x, y, 1, 1);
            }
            break;

        case 'brick':
            ctx.fillStyle = '#B54A3A';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#C8B8A0';
            for (let row = 0; row < size; row += 4) {
                ctx.fillRect(0, row, size, 1);
            }
            for (let row = 0; row < size; row += 4) {
                const offset = (Math.floor(row / 4) % 2) * 4;
                for (let col = offset; col < size; col += 8) {
                    ctx.fillRect(col, row, 1, 4);
                }
            }
            break;

        case 'leaves':
            ctx.fillStyle = '#2d7a2d';
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < 30; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#1e6b1e' : '#3d8a3d';
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * size);
                ctx.fillRect(x, y, 2, 2);
            }
            for (let i = 0; i < 8; i++) {
                ctx.fillStyle = '#1a5a1a';
                const x = Math.floor(Math.random() * (size - 3));
                const y = Math.floor(Math.random() * (size - 3));
                ctx.fillRect(x, y, 3, 3);
            }
            break;

        case 'workbench':
            ctx.fillStyle = '#A0722A';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#7a5520';
            for (let x = 0; x < size; x += 4) {
                ctx.fillRect(x, 0, 1, size);
            }
            for (let y = 0; y < size; y += 4) {
                ctx.fillRect(0, y, size, 1);
            }
            for (let gx = 1; gx < size; gx += 4) {
                for (let gy = 1; gy < size; gy += 4) {
                    ctx.fillStyle = Math.random() > 0.5 ? '#c09050' : '#b08040';
                    ctx.fillRect(gx, gy, 3, 3);
                }
            }
            break;

        case 'snow':
            ctx.fillStyle = '#f0f4f8';
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < 20; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#e4e8ee' : '#ffffff';
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * size);
                ctx.fillRect(x, y, 1, 1);
            }
            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = '#d8dce4';
                const x = Math.floor(Math.random() * (size - 2));
                const y = Math.floor(Math.random() * (size - 2));
                ctx.fillRect(x, y, 2, 1);
            }
            break;

        case 'cactus':
            ctx.fillStyle = '#2d6e2d';
            ctx.fillRect(0, 0, size, size);
            // Vertical stripe pattern
            for (let x = 0; x < size; x += 4) {
                ctx.fillStyle = '#1e5e1e';
                ctx.fillRect(x, 0, 1, size);
            }
            // Spines
            for (let i = 0; i < 12; i++) {
                ctx.fillStyle = '#4a9a4a';
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * size);
                ctx.fillRect(x, y, 1, 1);
            }
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = '#c8d890';
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * size);
                ctx.fillRect(x, y, 1, 1);
            }
            break;
    }

    return canvas;
}

function createGrassSideMaterial() {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 20; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#7a5a10' : '#9b7924';
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = '#5a8f29';
    ctx.fillRect(0, 0, size, 3);
    for (let x = 0; x < size; x++) {
        if (Math.random() > 0.5) {
            ctx.fillStyle = '#4a7f20';
            ctx.fillRect(x, 3, 1, 1);
        }
    }

    return canvas;
}

function createSnowSideMaterial() {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Dirt base
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 20; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#7a5a10' : '#9b7924';
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        ctx.fillRect(x, y, 1, 1);
    }
    // Snow on top
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, size, 3);
    for (let x = 0; x < size; x++) {
        if (Math.random() > 0.5) {
            ctx.fillStyle = '#e4e8ee';
            ctx.fillRect(x, 3, 1, 1);
        }
    }

    return canvas;
}

function createWorkbenchSideMaterial() {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#A0722A';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#8B6220';
    for (let y = 0; y < size; y += 4) {
        ctx.fillRect(0, y, size, 1);
    }
    for (let i = 0; i < 15; i++) {
        ctx.fillStyle = '#B0823A';
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        ctx.fillRect(x, y, 1, 1);
    }

    return canvas;
}

function makeTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

// Cached block textures for toolbar rendering
const blockTextureCache = {};
function getCachedBlockTexture(type) {
    if (!blockTextureCache[type]) {
        blockTextureCache[type] = createBlockTexture(type);
    }
    return blockTextureCache[type];
}

function createMaterials() {
    const grassTop = makeTexture(createBlockTexture('grass'));
    const grassSide = makeTexture(createGrassSideMaterial());
    const grassBottom = makeTexture(createBlockTexture('dirt'));

    materials['grass'] = [
        new THREE.MeshLambertMaterial({ map: grassSide }),
        new THREE.MeshLambertMaterial({ map: grassSide }),
        new THREE.MeshLambertMaterial({ map: grassTop }),
        new THREE.MeshLambertMaterial({ map: grassBottom }),
        new THREE.MeshLambertMaterial({ map: grassSide }),
        new THREE.MeshLambertMaterial({ map: grassSide }),
    ];

    const wbTop = makeTexture(createBlockTexture('workbench'));
    const wbSide = makeTexture(createWorkbenchSideMaterial());

    materials['workbench'] = [
        new THREE.MeshLambertMaterial({ map: wbSide }),
        new THREE.MeshLambertMaterial({ map: wbSide }),
        new THREE.MeshLambertMaterial({ map: wbTop }),
        new THREE.MeshLambertMaterial({ map: wbSide }),
        new THREE.MeshLambertMaterial({ map: wbSide }),
        new THREE.MeshLambertMaterial({ map: wbSide }),
    ];

    // Snow: snow top, snow side (snow-over-dirt), dirt bottom
    const snowTop = makeTexture(createBlockTexture('snow'));
    const snowSide = makeTexture(createSnowSideMaterial());
    const snowBottom = makeTexture(createBlockTexture('dirt'));

    materials['snow'] = [
        new THREE.MeshLambertMaterial({ map: snowSide }),
        new THREE.MeshLambertMaterial({ map: snowSide }),
        new THREE.MeshLambertMaterial({ map: snowTop }),
        new THREE.MeshLambertMaterial({ map: snowBottom }),
        new THREE.MeshLambertMaterial({ map: snowSide }),
        new THREE.MeshLambertMaterial({ map: snowSide }),
    ];

    for (const type of BLOCK_TYPES) {
        if (type === 'grass' || type === 'workbench' || type === 'snow') continue;
        const tex = makeTexture(createBlockTexture(type));
        materials[type] = new THREE.MeshLambertMaterial({ map: tex });
    }
}

// ===== WORLD =====
function getBlock(x, y, z) {
    return world[`${x},${y},${z}`];
}

function setBlock(x, y, z, type) {
    if (type) {
        world[`${x},${y},${z}`] = type;
    } else {
        delete world[`${x},${y},${z}`];
    }
}

// ===== SIMPLEX NOISE (Stefan Gustavson, public domain) =====
class SimplexNoise {
    constructor(seed) {
        const perm = new Uint8Array(256);
        for (let i = 0; i < 256; i++) perm[i] = i;
        let s = seed | 0;
        for (let i = 255; i > 0; i--) {
            s = (s * 16807 + 0) & 0x7fffffff;
            const j = s % (i + 1);
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        this.p = new Uint8Array(512);
        for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];

        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
    }

    _dot2(g, x, y) { return g[0]*x + g[1]*y; }
    _dot3(g, x, y, z) { return g[0]*x + g[1]*y + g[2]*z; }

    noise2d(x, y) {
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        const t = (i + j) * G2;
        const X0 = i - t, Y0 = j - t;
        const x0 = x - X0, y0 = y - Y0;
        const i1 = x0 > y0 ? 1 : 0;
        const j1 = x0 > y0 ? 0 : 1;
        const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2*G2, y2 = y0 - 1 + 2*G2;
        const ii = i & 255, jj = j & 255;
        const gi0 = this.p[ii + this.p[jj]] % 12;
        const gi1 = this.p[ii + i1 + this.p[jj + j1]] % 12;
        const gi2 = this.p[ii + 1 + this.p[jj + 1]] % 12;
        let n0 = 0, n1 = 0, n2 = 0;
        let t0 = 0.5 - x0*x0 - y0*y0;
        if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * this._dot2(this.grad3[gi0], x0, y0); }
        let t1 = 0.5 - x1*x1 - y1*y1;
        if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * this._dot2(this.grad3[gi1], x1, y1); }
        let t2 = 0.5 - x2*x2 - y2*y2;
        if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * this._dot2(this.grad3[gi2], x2, y2); }
        return 70 * (n0 + n1 + n2);
    }

    noise3d(x, y, z) {
        const F3 = 1/3, G3 = 1/6;
        const s = (x + y + z) * F3;
        const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
        const t = (i + j + k) * G3;
        const X0 = i - t, Y0 = j - t, Z0 = k - t;
        const x0 = x - X0, y0 = y - Y0, z0 = z - Z0;
        let i1, j1, k1, i2, j2, k2;
        if (x0 >= y0) {
            if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
            else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
            else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
        } else {
            if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
            else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
            else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
        }
        const x1=x0-i1+G3, y1=y0-j1+G3, z1=z0-k1+G3;
        const x2=x0-i2+2*G3, y2=y0-j2+2*G3, z2=z0-k2+2*G3;
        const x3=x0-1+3*G3, y3=y0-1+3*G3, z3=z0-1+3*G3;
        const ii=i&255, jj=j&255, kk=k&255;
        const gi0=this.p[ii+this.p[jj+this.p[kk]]]%12;
        const gi1=this.p[ii+i1+this.p[jj+j1+this.p[kk+k1]]]%12;
        const gi2=this.p[ii+i2+this.p[jj+j2+this.p[kk+k2]]]%12;
        const gi3=this.p[ii+1+this.p[jj+1+this.p[kk+1]]]%12;
        let n0=0,n1=0,n2=0,n3=0;
        let t0=0.6-x0*x0-y0*y0-z0*z0;
        if(t0>0){t0*=t0;n0=t0*t0*this._dot3(this.grad3[gi0],x0,y0,z0);}
        let t1=0.6-x1*x1-y1*y1-z1*z1;
        if(t1>0){t1*=t1;n1=t1*t1*this._dot3(this.grad3[gi1],x1,y1,z1);}
        let t2=0.6-x2*x2-y2*y2-z2*z2;
        if(t2>0){t2*=t2;n2=t2*t2*this._dot3(this.grad3[gi2],x2,y2,z2);}
        let t3=0.6-x3*x3-y3*y3-z3*z3;
        if(t3>0){t3*=t3;n3=t3*t3*this._dot3(this.grad3[gi3],x3,y3,z3);}
        return 32*(n0+n1+n2+n3);
    }
}

function fbm2d(noise, x, z, octaves, freq, amp) {
    let val = 0, f = freq, a = amp;
    for (let i = 0; i < octaves; i++) {
        val += noise.noise2d(x * f, z * f) * a;
        f *= 2;
        a *= 0.5;
    }
    return val;
}

function findSurfaceY(x, z) {
    for (let y = 50; y >= -22; y--) {
        if (getBlock(Math.floor(x), y, Math.floor(z))) return y + 1;
    }
    return 1;
}

const terrainNoise = new SimplexNoise(42);
const tempNoise = new SimplexNoise(137);
const moistNoise = new SimplexNoise(259);

// ===== BIOMES =====
const BIOMES = {
    plains:    { octaves: 2, freq: 0.008, amp: 3,  base: 0,  surface: 'grass', sub: 'dirt', treeGrid: 14, treeChance: 0.15 },
    forest:    { octaves: 3, freq: 0.018, amp: 7,  base: 1,  surface: 'grass', sub: 'dirt', treeGrid: 6,  treeChance: 0.75 },
    mountains: { octaves: 5, freq: 0.012, amp: 28, base: 6,  surface: 'grass', sub: 'dirt', treeGrid: 16, treeChance: 0.08 },
    desert:    { octaves: 2, freq: 0.006, amp: 2,  base: -1, surface: 'sand',  sub: 'sand', treeGrid: 0,  treeChance: 0   },
    tundra:    { octaves: 2, freq: 0.010, amp: 4,  base: 0,  surface: 'snow',  sub: 'dirt', treeGrid: 16, treeChance: 0.06 },
};

function getBiome(x, z) {
    const temp = tempNoise.noise2d(x * 0.004, z * 0.004);
    const moist = moistNoise.noise2d(x * 0.004, z * 0.004);

    if (temp < -0.2) return 'tundra';
    if (temp > 0.3 && moist < 0.0) return 'desert';
    if (moist > 0.2) return 'forest';
    if (temp > 0.05 && moist < -0.15) return 'mountains';
    return 'plains';
}

function getTerrainHeight(x, z) {
    const biome = getBiome(x, z);
    const b = BIOMES[biome];
    const height = b.base + fbm2d(terrainNoise, x, z, b.octaves, b.freq, b.amp);

    // Smooth blending: sample nearby biome transitions
    // Check if neighbors have different biomes; if so, blend heights
    const blendRadius = 8;
    const nx1 = getBiome(x - blendRadius, z);
    const nx2 = getBiome(x + blendRadius, z);
    const nz1 = getBiome(x, z - blendRadius);
    const nz2 = getBiome(x, z + blendRadius);

    // If all neighbors same biome, no blending needed
    if (nx1 === biome && nx2 === biome && nz1 === biome && nz2 === biome) {
        return Math.floor(height);
    }

    // Blend with neighbor biome heights
    let totalHeight = height * 4;
    let totalWeight = 4;
    const neighbors = [
        { bx: x - blendRadius, bz: z },
        { bx: x + blendRadius, bz: z },
        { bx: x, bz: z - blendRadius },
        { bx: x, bz: z + blendRadius },
    ];
    for (const n of neighbors) {
        const nb = BIOMES[getBiome(n.bx, n.bz)];
        const nh = nb.base + fbm2d(terrainNoise, x, z, nb.octaves, nb.freq, nb.amp);
        totalHeight += nh;
        totalWeight += 1;
    }

    return Math.floor(totalHeight / totalWeight);
}

// ===== CHUNK HELPERS =====
function chunkKey(cx, cz) { return `${cx},${cz}`; }
function worldToChunk(v) { return Math.floor(v / CHUNK_SIZE); }

// ===== CHUNK TERRAIN GENERATION =====
function generateChunkData(cx, cz) {
    const key = chunkKey(cx, cz);
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

            // Mountains: stone surface above y=12, grass below
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
    // Use a fine grid (spacing 4) and let biome treeChance control density
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

            // Deterministic random from noise for tree chance
            const roll = (terrainNoise.noise2d(tx * 1.7 + 300, tz * 1.7 + 300) + 1) * 0.5; // 0..1
            if (roll > b.treeChance) continue;

            // Desert: place cactus instead of trees
            if (biome === 'desert') {
                let surfaceY = null;
                for (let y = 50; y >= -22; y--) {
                    if (getBlock(tx, y, tz) === 'sand') { surfaceY = y; break; }
                }
                if (surfaceY === null) continue;
                // Cactus: 2-4 blocks tall
                const cactusHeight = 2 + Math.floor((terrainNoise.noise2d(tx * 3.1, tz * 3.1) + 1) * 1.5);
                for (let dy = 1; dy <= cactusHeight; dy++) {
                    setBlock(tx, surfaceY + dy, tz, 'cactus');
                }
                continue;
            }

            // Find surface (grass or snow)
            let surfaceY = null;
            for (let y = 50; y >= -22; y--) {
                const block = getBlock(tx, y, tz);
                if (block === 'grass' || block === 'snow') { surfaceY = y; break; }
            }
            if (surfaceY === null) continue;

            // Skip steep slopes
            const nHeights = [
                getBlock(tx - 1, surfaceY, tz) ? 0 : (getBlock(tx - 1, surfaceY - 1, tz) ? -1 : -2),
                getBlock(tx + 1, surfaceY, tz) ? 0 : (getBlock(tx + 1, surfaceY - 1, tz) ? -1 : -2),
                getBlock(tx, surfaceY, tz - 1) ? 0 : (getBlock(tx, surfaceY - 1, tz - 1) ? -1 : -2),
                getBlock(tx, surfaceY, tz + 1) ? 0 : (getBlock(tx, surfaceY - 1, tz + 1) ? -1 : -2),
            ];
            if (nHeights.some(h => h < -1)) continue;

            // Tree trunk
            const trunkBase = surfaceY + 1;
            const trunkHeight = biome === 'forest' ? 5 : 4; // taller trees in forest
            for (let y = trunkBase; y < trunkBase + trunkHeight; y++) {
                setBlock(tx, y, tz, 'wood');
            }
            // Leaf crown
            const leafBase = trunkBase + trunkHeight - 1;
            const leafRadius = biome === 'forest' ? 2 : 1;
            for (let dx = -leafRadius; dx <= leafRadius; dx++) {
                for (let dz = -leafRadius; dz <= leafRadius; dz++) {
                    // Skip corners for rounder shape on large crowns
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
}

// ===== CHUNK MESH BUILDING (Face-culled) =====
function buildChunkMeshes(cx, cz) {
    const key = chunkKey(cx, cz);
    removeChunkMeshes(cx, cz);

    const sx = cx * CHUNK_SIZE;
    const sz = cz * CHUNK_SIZE;

    // Collect visible face data per block type
    // Multi-material types need faces grouped by direction for geometry groups
    const typeBuffers = {};
    for (const type of BLOCK_TYPES) {
        if (Array.isArray(materials[type])) {
            typeBuffers[type] = Array.from({length: 6}, () => ({
                positions: [], normals: [], uvs: [], indices: [], vertexCount: 0
            }));
        } else {
            typeBuffers[type] = {
                positions: [], normals: [], uvs: [], indices: [], vertexCount: 0
            };
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

                    // Only emit face if neighbor is air (no block)
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

            const allPositions = [];
            const allNormals = [];
            const allUvs = [];
            const allIndices = [];
            let vertexOffset = 0;
            let indexOffset = 0;

            const geometry = new THREE.BufferGeometry();

            for (let f = 0; f < 6; f++) {
                const b = buckets[f];
                if (b.indices.length === 0) continue;

                for (let i = 0; i < b.indices.length; i++) allIndices.push(b.indices[i] + vertexOffset);
                for (let i = 0; i < b.positions.length; i++) allPositions.push(b.positions[i]);
                for (let i = 0; i < b.normals.length; i++) allNormals.push(b.normals[i]);
                for (let i = 0; i < b.uvs.length; i++) allUvs.push(b.uvs[i]);

                geometry.addGroup(indexOffset, b.indices.length, f);
                indexOffset += b.indices.length;
                vertexOffset += b.vertexCount;
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
            geometry.setIndex(allIndices);

            const mesh = new THREE.Mesh(geometry, materials[type]);
            chunkMeshes[type] = mesh;
            scene.add(mesh);
        } else {
            const buf = typeBuffers[type];
            if (buf.vertexCount === 0) { chunkMeshes[type] = null; continue; }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(buf.positions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(buf.normals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uvs, 2));
            geometry.setIndex(buf.indices);

            const mesh = new THREE.Mesh(geometry, materials[type]);
            chunkMeshes[type] = mesh;
            scene.add(mesh);
        }
    }

    chunks[key] = { meshes: chunkMeshes };
}

function removeChunkMeshes(cx, cz) {
    const key = chunkKey(cx, cz);
    const chunk = chunks[key];
    if (!chunk) return;
    for (const type in chunk.meshes) {
        const m = chunk.meshes[type];
        if (!m) continue;
        scene.remove(m);
        if (m.geometry) m.geometry.dispose();
        // Materials are shared across chunks, don't dispose them
    }
    delete chunks[key];
}

function rebuildChunkAt(x, z) {
    const cx = worldToChunk(x);
    const cz = worldToChunk(z);
    if (chunks[chunkKey(cx, cz)]) {
        buildChunkMeshes(cx, cz);
    }
    // Rebuild adjacent chunks if block is on chunk boundary (face culling depends on neighbors)
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    if (lx === 0 && chunks[chunkKey(cx - 1, cz)]) buildChunkMeshes(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1 && chunks[chunkKey(cx + 1, cz)]) buildChunkMeshes(cx + 1, cz);
    if (lz === 0 && chunks[chunkKey(cx, cz - 1)]) buildChunkMeshes(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1 && chunks[chunkKey(cx, cz + 1)]) buildChunkMeshes(cx, cz + 1);
}

// ===== CHUNK LOADING / UNLOADING =====
function updateChunks() {
    const pcx = worldToChunk(camera.position.x);
    const pcz = worldToChunk(camera.position.z);

    if (pcx === lastPlayerChunkX && pcz === lastPlayerChunkZ) return;
    lastPlayerChunkX = pcx;
    lastPlayerChunkZ = pcz;

    // Determine which chunks should be loaded
    const needed = new Set();
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
        for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
            if (dx * dx + dz * dz > (RENDER_DISTANCE + 0.5) * (RENDER_DISTANCE + 0.5)) continue;
            needed.add(chunkKey(pcx + dx, pcz + dz));
        }
    }

    // Unload chunks that are too far
    for (const key in chunks) {
        if (!needed.has(key)) {
            const [cx, cz] = key.split(',').map(Number);
            removeChunkMeshes(cx, cz);
        }
    }

    // Build queue of chunks to load, sorted by distance (closest first)
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

function processChunkQueue() {
    let loaded = 0;
    while (chunkLoadQueue.length > 0 && loaded < CHUNKS_PER_FRAME) {
        const { cx, cz } = chunkLoadQueue.shift();
        generateChunkData(cx, cz);
        buildChunkMeshes(cx, cz);
        loaded++;
    }
}

// ===== HIGHLIGHT & BREAK OVERLAY =====
function createHighlight() {
    const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const edges = new THREE.EdgesGeometry(geo);
    highlightMesh = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
    highlightMesh.visible = false;
    scene.add(highlightMesh);

    const overlayGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    breakOverlay = new THREE.Mesh(overlayGeo, new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
        depthTest: true
    }));
    breakOverlay.visible = false;
    scene.add(breakOverlay);
}

// ===== BLOCK TARGETING =====
function updateTarget() {
    _rayDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
    _raycaster.set(camera.position, _rayDir);
    _raycaster.far = REACH_DISTANCE;

    // Only raycast against nearby chunks (within reach distance)
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
        const hit = intersects[0];
        const normal = hit.face.normal;

        // Compute block position from hit point (nudge into the block)
        const eps = 0.01;
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
            x: blockPos.x,
            y: blockPos.y,
            z: blockPos.z,
            faceX: blockPos.x + faceDir.x,
            faceY: blockPos.y + faceDir.y,
            faceZ: blockPos.z + faceDir.z
        };

        highlightMesh.position.set(blockPos.x + 0.5, blockPos.y + 0.5, blockPos.z + 0.5);
        highlightMesh.visible = true;

        // Update break overlay
        const bkey = `${blockPos.x},${blockPos.y},${blockPos.z}`;
        const blockType = getBlock(blockPos.x, blockPos.y, blockPos.z);
        if (blockType && breakProgress[bkey]) {
            const maxHits = getEffectiveHardness(blockType);
            const progress = breakProgress[bkey] / maxHits;
            breakOverlay.position.copy(highlightMesh.position);
            breakOverlay.material.opacity = progress * 0.6;
            breakOverlay.visible = true;
        } else {
            breakOverlay.visible = false;
        }

        // Show interaction hint for workbench
        const hint = document.getElementById('interaction-hint');
        if (blockType === 'workbench') {
            hint.textContent = 'Tryk E for at crafte';
            hint.style.display = 'block';
        } else {
            hint.style.display = 'none';
        }
    } else {
        targetBlock = null;
        highlightMesh.visible = false;
        breakOverlay.visible = false;
        document.getElementById('interaction-hint').style.display = 'none';
    }
}

// ===== INVENTORY =====
function addToInventory(blockType) {
    inventory[blockType] = (inventory[blockType] || 0) + 1;
    autoAssignToToolbar(blockType);
    renderToolbar();
}

function removeFromInventory(blockType) {
    if (!inventory[blockType]) return false;
    inventory[blockType]--;
    if (inventory[blockType] <= 0) {
        delete inventory[blockType];
        for (let i = 0; i < TOOLBAR_SLOTS; i++) {
            if (toolbar[i] && toolbar[i].type === 'block' && toolbar[i].item === blockType && !inventory[blockType]) {
                toolbar[i] = null;
            }
        }
    }
    renderToolbar();
    return true;
}

function autoAssignToToolbar(blockType) {
    for (let i = 0; i < TOOLBAR_SLOTS; i++) {
        if (toolbar[i] && toolbar[i].type === 'block' && toolbar[i].item === blockType) return;
    }
    for (let i = 0; i < TOOLBAR_SLOTS; i++) {
        if (!toolbar[i]) {
            toolbar[i] = { type: 'block', item: blockType };
            return;
        }
    }
}

function addToolToInventory(toolId) {
    const toolDef = TOOLS[toolId];
    const toolEntry = { id: toolId, durability: toolDef.durability };
    toolInventory.push(toolEntry);
    const toolIndex = toolInventory.length - 1;
    for (let i = 0; i < TOOLBAR_SLOTS; i++) {
        if (!toolbar[i]) {
            toolbar[i] = { type: 'tool', item: toolId, toolIndex: toolIndex };
            renderToolbar();
            return;
        }
    }
    renderToolbar();
}

// ===== EFFECTIVE HARDNESS =====
function getEffectiveHardness(blockType) {
    const base = BLOCK_HARDNESS[blockType] || 3;
    const slot = toolbar[selectedSlot];
    if (!slot || slot.type !== 'tool') return base * 5;
    const toolId = slot.item;
    const toolDef = TOOLS[toolId];
    if (!toolDef) return base * 5;

    if (toolDef.efficient && toolDef.efficient.includes(blockType)) {
        return Math.max(1, Math.ceil(base / toolDef.speedMultiplier));
    }
    if (toolId === 'hand') {
        return base * 5;
    }
    return base;
}

// ===== TOOL DURABILITY =====
function consumeToolDurability() {
    const slot = toolbar[selectedSlot];
    if (!slot || slot.type !== 'tool' || slot.item === 'hand') return;

    const toolEntry = toolInventory[slot.toolIndex];
    if (!toolEntry) return;

    toolEntry.durability--;
    if (toolEntry.durability <= 0) {
        showMessage('Værktøj gik i stykker!');
        toolInventory[slot.toolIndex] = null;
        toolbar[selectedSlot] = null;
        selectedSlot = 0;
    }
    renderToolbar();
}

// ===== BLOCK INTERACTION =====
function breakBlock() {
    if (!targetBlock) return;

    const { x, y, z } = targetBlock;
    const key = `${x},${y},${z}`;
    const blockType = getBlock(x, y, z);
    if (!blockType) return;

    if (!breakProgress[key]) {
        breakProgress[key] = 0;
    }
    breakProgress[key]++;

    const maxHits = getEffectiveHardness(blockType);
    if (breakProgress[key] >= maxHits) {
        setBlock(x, y, z, null);
        delete breakProgress[key];
        rebuildChunkAt(x, z);
        breakOverlay.visible = false;

        addToInventory(blockType);
        consumeToolDurability();
    }
}

function placeBlock() {
    if (!targetBlock) return;

    const { faceX, faceY, faceZ } = targetBlock;

    const px = Math.floor(camera.position.x);
    const py1 = Math.floor(camera.position.y);
    const py2 = Math.floor(camera.position.y - 1);
    if ((faceX === px && faceZ === Math.floor(camera.position.z)) &&
        (faceY === py1 || faceY === py2)) {
        return;
    }

    if (getBlock(faceX, faceY, faceZ)) return;

    const slot = toolbar[selectedSlot];
    if (!slot || slot.type !== 'block') return;

    const blockType = slot.item;
    if (!inventory[blockType] || inventory[blockType] <= 0) return;

    removeFromInventory(blockType);
    setBlock(faceX, faceY, faceZ, blockType);
    rebuildChunkAt(faceX, faceZ);
}

// ===== PLAYER MOVEMENT =====
const PLAYER_WIDTH = 0.3;
const PLAYER_BODY_HEIGHT = 1.5;

function updatePlayerMovement(delta) {
    velocity.y -= GRAVITY * delta;

    direction.z = Number(movement.forward) - Number(movement.backward);
    direction.x = Number(movement.right) - Number(movement.left);
    direction.normalize();

    const speed = isSprinting ? SPRINT_SPEED : MOVE_SPEED;
    const moveVector = new THREE.Vector3();

    if (movement.forward || movement.backward) {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();
        moveVector.add(forward.multiplyScalar(direction.z * speed * delta));
    }

    if (movement.left || movement.right) {
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(camera.quaternion);
        right.y = 0;
        right.normalize();
        moveVector.add(right.multiplyScalar(direction.x * speed * delta));
    }

    const eyeY = camera.position.y;
    const px = camera.position.x;
    const pz = camera.position.z;

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

    const dy = velocity.y * delta;
    const newEyeY = camera.position.y + dy;

    if (dy <= 0) {
        const feetY = newEyeY - PLAYER_HEIGHT;
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

    if (camera.position.y < -30) {
        // Generate spawn chunk data if needed for surface lookup
        const spawnCx = worldToChunk(128);
        const spawnCz = worldToChunk(128);
        generateChunkData(spawnCx, spawnCz);
        const respawnY = findSurfaceY(128, 128);
        camera.position.set(128, respawnY + PLAYER_HEIGHT + 1, 128);
        velocity.y = 0;
    }
}

function playerCollidesHorizontal(x, eyeY, z) {
    const hw = PLAYER_WIDTH;
    const feetY = eyeY - PLAYER_HEIGHT;
    const headY = eyeY + 0.1;

    const minBX = Math.floor(x - hw);
    const maxBX = Math.floor(x + hw);
    const minBZ = Math.floor(z - hw);
    const maxBZ = Math.floor(z + hw);
    const minBY = Math.floor(feetY + 0.01);
    const maxBY = Math.floor(headY);

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

function findFloorUnderPlayer(x, z, eyeY) {
    const hw = PLAYER_WIDTH;
    const feetY = eyeY - PLAYER_HEIGHT;
    const startY = Math.floor(feetY);

    const minBX = Math.floor(x - hw + 0.001);
    const maxBX = Math.floor(x + hw - 0.001);
    const minBZ = Math.floor(z - hw + 0.001);
    const maxBZ = Math.floor(z + hw - 0.001);

    let highestFloor = -100;

    for (let bx = minBX; bx <= maxBX; bx++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
            for (let by = startY; by >= -22; by--) {
                if (getBlock(bx, by, bz)) {
                    const top = by + 1;
                    if (top > highestFloor) {
                        highestFloor = top;
                    }
                    break;
                }
            }
        }
    }

    return highestFloor;
}

function findCeilingAbovePlayer(x, z, eyeY) {
    const hw = PLAYER_WIDTH;
    const headY = eyeY + 0.1;
    const startY = Math.ceil(headY);

    const minBX = Math.floor(x - hw + 0.001);
    const maxBX = Math.floor(x + hw - 0.001);
    const minBZ = Math.floor(z - hw + 0.001);
    const maxBZ = Math.floor(z + hw - 0.001);

    let lowestCeil = 100;

    for (let bx = minBX; bx <= maxBX; bx++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
            for (let by = startY; by <= startY + 10; by++) {
                if (getBlock(bx, by, bz)) {
                    const bottom = by;
                    if (bottom < lowestCeil) {
                        lowestCeil = bottom;
                    }
                    break;
                }
            }
        }
    }

    return lowestCeil;
}

// ===== POINTER LOCK =====
function onPointerLockChange() {
    if (document.pointerLockElement === document.body) {
        isPointerLocked = true;
    } else {
        isPointerLocked = false;
        if (gameStarted && !craftingOpen) {
            document.getElementById('menu-screen').style.display = 'flex';
            document.getElementById('start-button').textContent = 'Klik for at fortsætte';
            document.getElementById('save-load-buttons').style.display = 'flex';
            document.getElementById('load-button-start').style.display = 'none';
        }
    }
}

function onMouseMove(event) {
    if (!isPointerLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    euler.setFromQuaternion(camera.quaternion);
    euler.y -= movementX * 0.002;
    euler.x -= movementY * 0.002;
    euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
    camera.quaternion.setFromEuler(euler);
}

function onMouseDown(event) {
    if (!isPointerLocked) return;

    if (event.button === 0) {
        breakBlock();
    } else if (event.button === 2) {
        placeBlock();
    }
}

function onKeyDown(event) {
    if (event.ctrlKey || event.metaKey) {
        if (gameStarted) {
            event.preventDefault();
        }
        return;
    }
    if (event.altKey) return;

    if (event.code === 'KeyE') {
        if (craftingOpen) {
            closeCrafting();
        } else if (isPointerLocked && gameStarted) {
            openCrafting();
        }
        return;
    }

    switch (event.code) {
        case 'KeyW':
            if (!movement.forward) {
                const now = performance.now();
                if (now - lastWTap < DOUBLE_TAP_TIME) {
                    isSprinting = true;
                }
                lastWTap = now;
            }
            movement.forward = true;
            break;
        case 'KeyS': movement.backward = true; break;
        case 'KeyA': movement.left = true; break;
        case 'KeyD': movement.right = true; break;
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
            selectedSlot = parseInt(event.code.charAt(5)) - 1;
            renderToolbar();
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': movement.forward = false; isSprinting = false; break;
        case 'KeyS': movement.backward = false; break;
        case 'KeyA': movement.left = false; break;
        case 'KeyD': movement.right = false; break;
    }
}

function onContextMenu(event) {
    event.preventDefault();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== TOOLBAR UI =====
function drawToolIcon(ctx, toolId) {
    ctx.clearRect(0, 0, 32, 32);

    switch (toolId) {
        case 'hand':
            ctx.fillStyle = '#e8b88a';
            ctx.fillRect(10, 12, 12, 14);
            ctx.fillRect(7, 16, 5, 8);
            ctx.fillRect(10, 6, 3, 8);
            ctx.fillRect(14, 4, 3, 10);
            ctx.fillRect(18, 6, 3, 8);
            break;

        case 'wooden_pickaxe':
            ctx.fillStyle = '#8B6220';
            ctx.fillRect(4, 24, 3, 3);
            ctx.fillRect(7, 21, 3, 3);
            ctx.fillRect(10, 18, 3, 3);
            ctx.fillRect(13, 15, 3, 3);
            ctx.fillStyle = '#A0722A';
            ctx.fillRect(8, 6, 3, 3);
            ctx.fillRect(11, 9, 3, 3);
            ctx.fillRect(14, 12, 3, 3);
            ctx.fillRect(17, 9, 3, 3);
            ctx.fillRect(20, 6, 3, 3);
            break;

        case 'wooden_axe':
            ctx.fillStyle = '#8B6220';
            ctx.fillRect(4, 24, 3, 3);
            ctx.fillRect(7, 21, 3, 3);
            ctx.fillRect(10, 18, 3, 3);
            ctx.fillRect(13, 15, 3, 3);
            ctx.fillStyle = '#A0722A';
            ctx.fillRect(16, 8, 3, 3);
            ctx.fillRect(19, 5, 3, 3);
            ctx.fillRect(19, 8, 3, 3);
            ctx.fillRect(19, 11, 3, 3);
            ctx.fillRect(22, 8, 3, 3);
            break;

        case 'wooden_shovel':
            ctx.fillStyle = '#8B6220';
            ctx.fillRect(13, 22, 3, 3);
            ctx.fillRect(13, 19, 3, 3);
            ctx.fillRect(13, 16, 3, 3);
            ctx.fillRect(13, 13, 3, 3);
            ctx.fillStyle = '#A0722A';
            ctx.fillRect(11, 4, 7, 3);
            ctx.fillRect(10, 7, 9, 3);
            ctx.fillRect(11, 10, 7, 3);
            break;
    }
}

function renderToolbar() {
    const container = document.getElementById('toolbar');
    container.innerHTML = '';

    for (let i = 0; i < TOOLBAR_SLOTS; i++) {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'toolbar-slot' + (i === selectedSlot ? ' selected' : '');
        slotDiv.dataset.slot = i;

        const canvas = document.createElement('canvas');
        canvas.className = 'slot-icon';
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const slotData = toolbar[i];
        if (slotData) {
            if (slotData.type === 'block') {
                const texCanvas = getCachedBlockTexture(slotData.item);
                ctx.drawImage(texCanvas, 0, 0, 32, 32);

                const count = inventory[slotData.item] || 0;
                if (count > 0) {
                    const countSpan = document.createElement('span');
                    countSpan.className = 'slot-count';
                    countSpan.textContent = count;
                    slotDiv.appendChild(countSpan);
                }
            } else if (slotData.type === 'tool') {
                drawToolIcon(ctx, slotData.item);

                if (slotData.item !== 'hand' && slotData.toolIndex !== undefined) {
                    const toolEntry = toolInventory[slotData.toolIndex];
                    if (toolEntry) {
                        const toolDef = TOOLS[slotData.item];
                        const pct = (toolEntry.durability / toolDef.durability) * 100;
                        const durDiv = document.createElement('div');
                        durDiv.className = 'slot-durability';
                        const fillDiv = document.createElement('div');
                        fillDiv.className = 'durability-fill';
                        fillDiv.style.width = pct + '%';
                        if (pct < 30) fillDiv.style.background = '#f44336';
                        else if (pct < 60) fillDiv.style.background = '#ff9800';
                        durDiv.appendChild(fillDiv);
                        slotDiv.appendChild(durDiv);
                    }
                }
            }
        }

        slotDiv.appendChild(canvas);

        const keySpan = document.createElement('span');
        keySpan.className = 'slot-key';
        keySpan.textContent = i + 1;
        slotDiv.appendChild(keySpan);

        slotDiv.addEventListener('click', () => {
            selectedSlot = i;
            renderToolbar();
        });

        container.appendChild(slotDiv);
    }
}

// ===== CRAFTING =====
function isNearWorkbench() {
    const px = camera.position.x;
    const py = camera.position.y;
    const pz = camera.position.z;
    const range = 4;

    // Only check blocks within range instead of entire world
    const minX = Math.floor(px - range), maxX = Math.floor(px + range);
    const minY = Math.floor(py - range), maxY = Math.floor(py + range);
    const minZ = Math.floor(pz - range), maxZ = Math.floor(pz + range);

    for (let bx = minX; bx <= maxX; bx++) {
        for (let by = minY; by <= maxY; by++) {
            for (let bz = minZ; bz <= maxZ; bz++) {
                if (getBlock(bx, by, bz) === 'workbench') {
                    const dx = px - (bx + 0.5);
                    const dy = py - (by + 0.5);
                    const dz = pz - (bz + 0.5);
                    if (dx * dx + dy * dy + dz * dz <= range * range) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function openCrafting() {
    craftingOpen = true;
    document.exitPointerLock();

    const nearWB = isNearWorkbench();
    const recipeList = document.getElementById('recipe-list');
    recipeList.innerHTML = '';

    const available = RECIPES.filter(r => !r.needsWorkbench || nearWB);

    if (available.length === 0) {
        recipeList.innerHTML = '<p style="color:#999;text-align:center;padding:12px;">Ingen opskrifter tilgængelige</p>';
    }

    for (const recipe of available) {
        const row = document.createElement('div');
        row.className = 'recipe-row';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'recipe-name';
        nameSpan.textContent = recipe.name;

        const costSpan = document.createElement('span');
        costSpan.className = 'recipe-cost';
        const costParts = [];
        let canAfford = true;
        for (const [item, amount] of Object.entries(recipe.cost)) {
            const have = inventory[item] || 0;
            const ok = have >= amount;
            if (!ok) canAfford = false;
            costParts.push(`<span class="${ok ? 'cost-ok' : 'cost-missing'}">${amount} ${item} (${have})</span>`);
        }
        costSpan.innerHTML = costParts.join(', ');

        const btn = document.createElement('button');
        btn.className = 'craft-btn';
        btn.textContent = 'Lav';
        btn.disabled = !canAfford;
        btn.addEventListener('click', () => {
            craftItem(recipe);
            openCrafting();
        });

        row.appendChild(nameSpan);
        row.appendChild(costSpan);
        row.appendChild(btn);
        recipeList.appendChild(row);
    }

    if (!nearWB && available.length > 0) {
        const hint = document.createElement('p');
        hint.style.cssText = 'color:#999;text-align:center;padding:8px;font-size:13px;';
        hint.textContent = 'Stå ved et arbejdsbord for flere opskrifter';
        recipeList.appendChild(hint);
    }

    document.getElementById('crafting-screen').style.display = 'block';
}

function closeCrafting() {
    craftingOpen = false;
    document.getElementById('crafting-screen').style.display = 'none';
    document.body.requestPointerLock();
}

function craftItem(recipe) {
    for (const [item, amount] of Object.entries(recipe.cost)) {
        if ((inventory[item] || 0) < amount) return;
    }

    for (const [item, amount] of Object.entries(recipe.cost)) {
        for (let i = 0; i < amount; i++) {
            removeFromInventory(item);
        }
    }

    if (recipe.result.type === 'block') {
        addToInventory(recipe.result.item);
        showMessage(recipe.name + ' lavet!');
    } else if (recipe.result.type === 'tool') {
        addToolToInventory(recipe.result.item);
        showMessage(recipe.name + ' lavet!');
    }
}

// ===== MESSAGES =====
function showMessage(text) {
    const el = document.getElementById('message-display');
    el.textContent = text;
    el.classList.add('visible');

    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = setTimeout(() => {
        el.classList.remove('visible');
    }, 2000);
}

// ===== SAVE / LOAD (IndexedDB) =====
const DB_NAME = 'miner_db';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const SAVE_KEY = 'main';
const AUTO_SAVE_INTERVAL = 60; // seconds
let autoSaveTimer = 0;
let saveDbReady = false;
let saveDb = null;

function openSaveDb() {
    return new Promise((resolve, reject) => {
        if (saveDb) { resolve(saveDb); return; }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = (e) => {
            saveDb = e.target.result;
            saveDbReady = true;
            resolve(saveDb);
        };
        req.onerror = () => reject(req.error);
    });
}

function buildSaveData() {
    return {
        version: 1,
        player: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
            rotX: euler.x,
            rotY: euler.y,
        },
        gameTime: gameTime,
        inventory: { ...inventory },
        toolInventory: toolInventory.map(t => t ? { id: t.id, durability: t.durability } : null),
        toolbar: toolbar.map(s => s ? { ...s } : null),
        selectedSlot: selectedSlot,
        world: { ...world },
        generatedChunks: Array.from(generatedChunks),
    };
}

async function saveGame() {
    try {
        const db = await openSaveDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(buildSaveData(), SAVE_KEY);
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => { console.error('Gem fejlede:', tx.error); resolve(false); };
        });
    } catch (e) {
        console.error('Gem fejlede:', e);
        return false;
    }
}

async function loadGame() {
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
    // Clear current world state
    for (const key in world) delete world[key];
    generatedChunks.clear();

    // Unload all chunk meshes
    for (const key in chunks) {
        const [cx, cz] = key.split(',').map(Number);
        removeChunkMeshes(cx, cz);
    }

    // Restore world blocks
    for (const key in saveData.world) {
        world[key] = saveData.world[key];
    }

    // Restore generated chunks set
    for (const key of saveData.generatedChunks) {
        generatedChunks.add(key);
    }

    // Restore player
    camera.position.set(saveData.player.x, saveData.player.y, saveData.player.z);
    euler.x = saveData.player.rotX;
    euler.y = saveData.player.rotY;
    camera.quaternion.setFromEuler(euler);
    velocity.set(0, 0, 0);

    // Restore game time
    gameTime = saveData.gameTime || 0.25;

    // Restore inventory
    for (const key in inventory) delete inventory[key];
    for (const key in saveData.inventory) {
        inventory[key] = saveData.inventory[key];
    }

    // Restore tool inventory
    toolInventory.length = 0;
    if (saveData.toolInventory) {
        for (const t of saveData.toolInventory) {
            toolInventory.push(t ? { id: t.id, durability: t.durability } : null);
        }
    }

    // Restore toolbar
    for (let i = 0; i < TOOLBAR_SLOTS; i++) {
        toolbar[i] = saveData.toolbar[i] || null;
    }
    if (!toolbar[0]) toolbar[0] = { type: 'tool', item: 'hand' };
    selectedSlot = saveData.selectedSlot || 0;

    // Force chunk reload
    lastPlayerChunkX = null;
    lastPlayerChunkZ = null;

    // Build meshes for chunks near player
    const pcx = worldToChunk(camera.position.x);
    const pcz = worldToChunk(camera.position.z);
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            const cx = pcx + dx;
            const cz = pcz + dz;
            const key = chunkKey(cx, cz);
            if (generatedChunks.has(key)) {
                buildChunkMeshes(cx, cz);
            }
        }
    }

    renderToolbar();
}

async function hasSaveGame() {
    try {
        const db = await openSaveDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.count(SAVE_KEY);
        return new Promise((resolve) => {
            req.onsuccess = () => resolve(req.result > 0);
            req.onerror = () => resolve(false);
        });
    } catch (e) {
        return false;
    }
}

async function deleteSaveGame() {
    try {
        const db = await openSaveDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(SAVE_KEY);
    } catch (e) {
        console.error('Slet fejlede:', e);
    }
}

// ===== DAY/NIGHT CYCLE =====
function updateDayNightCycle(delta) {
    gameTime += delta / DAY_CYCLE_DURATION;
    if (gameTime >= 1) gameTime -= 1;

    // Sun angle: 0 at dawn, PI/2 at noon, PI at dusk, 3PI/2 at midnight
    const sunAngle = gameTime * Math.PI * 2;

    // Light intensity based on sun position
    // sinFactor: 1 at noon, -1 at midnight
    const sinFactor = Math.sin(sunAngle);

    // Ambient: 0.15 at midnight, 0.6 at noon
    const ambientIntensity = THREE.MathUtils.clamp(0.15 + 0.45 * sinFactor, 0.15, 0.6);
    ambientLight.intensity = ambientIntensity;

    // Directional (sun): 0 at night, 0.8 at noon
    const sunIntensity = THREE.MathUtils.clamp(sinFactor * 0.8, 0, 0.8);
    dirLight.intensity = sunIntensity;

    // Move sun position
    const sunX = Math.cos(sunAngle) * 50;
    const sunY = Math.sin(sunAngle) * 50;
    dirLight.position.set(sunX, sunY, 20);

    // Sky color: blend between day sky and night sky
    const dayColor = new THREE.Color(0x87CEEB);
    const duskColor = new THREE.Color(0xFF7744);
    const nightColor = new THREE.Color(0x0a0a2a);

    let skyColor;
    if (sinFactor > 0.2) {
        // Day
        skyColor = dayColor;
    } else if (sinFactor > -0.1) {
        // Dusk/dawn transition
        const t = (sinFactor - (-0.1)) / 0.3; // 0..1
        skyColor = nightColor.clone().lerp(duskColor, t * 0.5);
        skyColor.lerp(dayColor, Math.max(0, (t - 0.3) / 0.7));
    } else {
        // Night
        const t = THREE.MathUtils.clamp((sinFactor + 1) / 0.9, 0, 1);
        skyColor = nightColor;
    }

    scene.background = skyColor;
    scene.fog.color = skyColor;

    // Tint ambient light: warm at dawn/dusk, cool at night, white at day
    if (sinFactor > 0.2) {
        ambientLight.color.setHex(0xffffff);
        dirLight.color.setHex(0xffffff);
    } else if (sinFactor > -0.1) {
        ambientLight.color.set(0xffddaa);
        dirLight.color.set(0xff9955);
    } else {
        ambientLight.color.set(0x8888cc);
    }
}

function getTimeOfDayString() {
    // Returns a Danish string for the current time of day
    const hour = Math.floor(gameTime * 24);
    const min = Math.floor((gameTime * 24 - hour) * 60);
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

// ===== INIT =====
function init() {
    // Pre-open IndexedDB for save/load
    openSaveDb().catch(() => {});

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 40, 120);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('game-container').appendChild(renderer.domElement);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(30, 50, 20);
    scene.add(dirLight);

    createMaterials();

    // Generate only the spawn area chunks (synchronous, for immediate playability)
    const spawnX = 128;
    const spawnZ = 128;
    const spawnCx = worldToChunk(spawnX);
    const spawnCz = worldToChunk(spawnZ);

    // Generate a small radius synchronously so the player has ground to stand on
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            const cx = spawnCx + dx;
            const cz = spawnCz + dz;
            generateChunkData(cx, cz);
            buildChunkMeshes(cx, cz);
        }
    }

    const spawnY = findSurfaceY(spawnX, spawnZ);
    camera.position.set(spawnX, spawnY + PLAYER_HEIGHT + 1, spawnZ);

    // Force chunk system to pick up remaining chunks
    lastPlayerChunkX = null;
    lastPlayerChunkZ = null;

    createHighlight();
    renderToolbar();

    // Events
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize);

    window.addEventListener('beforeunload', (e) => {
        if (gameStarted) {
            // Fire-and-forget save attempt (auto-save covers most cases)
            saveGame();
            e.preventDefault();
        }
    });

    document.getElementById('crafting-close').addEventListener('click', closeCrafting);

    // Show load button on start screen if save exists
    hasSaveGame().then(exists => {
        if (exists) {
            document.getElementById('load-button-start').style.display = 'inline-block';
        }
    });

    function startGame() {
        document.body.requestPointerLock();
        document.getElementById('menu-screen').style.display = 'none';
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('toolbar').style.display = 'flex';
        document.getElementById('time-display').style.display = 'block';
        gameStarted = true;
    }

    document.getElementById('start-button').addEventListener('click', startGame);

    document.getElementById('load-button-start').addEventListener('click', async () => {
        if (await loadGame()) {
            showMessage('Spil indlæst!');
        }
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

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// ===== ANIMATION LOOP =====
function animate(currentTime) {
    requestAnimationFrame(animate);

    const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    if (isPointerLocked && gameStarted) {
        updatePlayerMovement(delta);
        updateTarget();
    }

    // Day/night cycle
    if (gameStarted) {
        updateDayNightCycle(delta);
        document.getElementById('time-display').textContent = getTimeOfDayString();
    }

    // Auto-save
    if (gameStarted) {
        autoSaveTimer += delta;
        if (autoSaveTimer >= AUTO_SAVE_INTERVAL) {
            autoSaveTimer = 0;
            saveGame();
        }
    }

    // Sprint FOV effect
    const targetFov = isSprinting ? 82 : 75;
    camera.fov += (targetFov - camera.fov) * Math.min(1, delta * 8);
    camera.updateProjectionMatrix();

    // Progressive chunk loading
    updateChunks();
    processChunkQueue();

    renderer.render(scene, camera);
}

// ===== START =====
init();
