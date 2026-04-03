// ===== TEXTURE GENERATION & MATERIALS =====
import { BLOCK_TYPES } from './constants.js';

export const materials = {};

// Cached block textures for toolbar/crafting rendering (canvas elements)
const blockTextureCache = {};
export function getCachedBlockTexture(type) {
    if (!blockTextureCache[type]) {
        blockTextureCache[type] = createBlockTexture(type);
    }
    return blockTextureCache[type];
}

export function makeTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

export function createBlockTexture(type) {
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
                ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
            }
            break;

        case 'dirt':
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < 30; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#7a5a10' : '#9b7924';
                ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
            }
            break;

        case 'stone':
            ctx.fillStyle = '#888';
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < 40; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#777' : '#999';
                ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
            }
            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = '#666';
                ctx.fillRect(Math.floor(Math.random() * (size - 2)), Math.floor(Math.random() * (size - 2)), 2, 2);
            }
            break;

        case 'coal':
            ctx.fillStyle = '#888';
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < 20; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#777' : '#999';
                ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
            }
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(Math.floor(Math.random() * (size - 3)), Math.floor(Math.random() * (size - 3)),
                    2 + Math.floor(Math.random() * 2), 2 + Math.floor(Math.random() * 2));
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
                ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
            }
            break;

        case 'sand':
            ctx.fillStyle = '#E8D68C';
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < 25; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#D8C67C' : '#F0DE94';
                ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
            }
            break;

        case 'brick':
            ctx.fillStyle = '#B54A3A';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#C8B8A0';
            for (let row = 0; row < size; row += 4) ctx.fillRect(0, row, size, 1);
            for (let row = 0; row < size; row += 4) {
                const offset = (Math.floor(row / 4) % 2) * 4;
                for (let col = offset; col < size; col += 8) ctx.fillRect(col, row, 1, 4);
            }
            break;

        case 'leaves':
            ctx.fillStyle = '#2d7a2d';
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < 30; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#1e6b1e' : '#3d8a3d';
                ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 2, 2);
            }
            for (let i = 0; i < 8; i++) {
                ctx.fillStyle = '#1a5a1a';
                ctx.fillRect(Math.floor(Math.random() * (size - 3)), Math.floor(Math.random() * (size - 3)), 3, 3);
            }
            break;

        case 'workbench':
            ctx.fillStyle = '#A0722A';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#7a5520';
            for (let x = 0; x < size; x += 4) ctx.fillRect(x, 0, 1, size);
            for (let y = 0; y < size; y += 4) ctx.fillRect(0, y, size, 1);
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
                ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
            }
            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = '#d8dce4';
                ctx.fillRect(Math.floor(Math.random() * (size - 2)), Math.floor(Math.random() * (size - 2)), 2, 1);
            }
            break;

        case 'cactus':
            ctx.fillStyle = '#2d6e2d';
            ctx.fillRect(0, 0, size, size);
            for (let x = 0; x < size; x += 4) {
                ctx.fillStyle = '#1e5e1e';
                ctx.fillRect(x, 0, 1, size);
            }
            for (let i = 0; i < 12; i++) {
                ctx.fillStyle = '#4a9a4a';
                ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
            }
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = '#c8d890';
                ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
            }
            break;

        case 'torch':
            ctx.fillStyle = '#1a1008';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#6B4810';
            ctx.fillRect(6, 5, 4, 11);
            ctx.fillStyle = '#8B6220';
            ctx.fillRect(7, 5, 2, 11);
            ctx.fillStyle = '#cc4400';
            ctx.fillRect(5, 2, 6, 4);
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(6, 1, 4, 4);
            ctx.fillStyle = '#ffdd00';
            ctx.fillRect(7, 1, 2, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(7, 1, 1, 1);
            break;
    }

    return canvas;
}

function createGrassSideMaterial() {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 20; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#7a5a10' : '#9b7924';
        ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
    }
    ctx.fillStyle = '#5a8f29';
    ctx.fillRect(0, 0, size, 3);
    for (let x = 0; x < size; x++) {
        if (Math.random() > 0.5) { ctx.fillStyle = '#4a7f20'; ctx.fillRect(x, 3, 1, 1); }
    }
    return canvas;
}

function createSnowSideMaterial() {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 20; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#7a5a10' : '#9b7924';
        ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
    }
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, size, 3);
    for (let x = 0; x < size; x++) {
        if (Math.random() > 0.5) { ctx.fillStyle = '#e4e8ee'; ctx.fillRect(x, 3, 1, 1); }
    }
    return canvas;
}

function createWorkbenchSideMaterial() {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#A0722A';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#8B6220';
    for (let y = 0; y < size; y += 4) ctx.fillRect(0, y, size, 1);
    for (let i = 0; i < 15; i++) {
        ctx.fillStyle = '#B0823A';
        ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
    }
    return canvas;
}

export function createMaterials() {
    const grassTop    = makeTexture(createBlockTexture('grass'));
    const grassSide   = makeTexture(createGrassSideMaterial());
    const grassBottom = makeTexture(createBlockTexture('dirt'));
    materials['grass'] = [
        new THREE.MeshLambertMaterial({ map: grassSide }),
        new THREE.MeshLambertMaterial({ map: grassSide }),
        new THREE.MeshLambertMaterial({ map: grassTop }),
        new THREE.MeshLambertMaterial({ map: grassBottom }),
        new THREE.MeshLambertMaterial({ map: grassSide }),
        new THREE.MeshLambertMaterial({ map: grassSide }),
    ];

    const wbTop  = makeTexture(createBlockTexture('workbench'));
    const wbSide = makeTexture(createWorkbenchSideMaterial());
    materials['workbench'] = [
        new THREE.MeshLambertMaterial({ map: wbSide }),
        new THREE.MeshLambertMaterial({ map: wbSide }),
        new THREE.MeshLambertMaterial({ map: wbTop }),
        new THREE.MeshLambertMaterial({ map: wbSide }),
        new THREE.MeshLambertMaterial({ map: wbSide }),
        new THREE.MeshLambertMaterial({ map: wbSide }),
    ];

    const snowTop    = makeTexture(createBlockTexture('snow'));
    const snowSide   = makeTexture(createSnowSideMaterial());
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

// ===== ICON DRAWING =====
export function drawToolIcon(ctx, toolId) {
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
            ctx.fillRect(4, 24, 3, 3); ctx.fillRect(7, 21, 3, 3);
            ctx.fillRect(10, 18, 3, 3); ctx.fillRect(13, 15, 3, 3);
            ctx.fillStyle = '#A0722A';
            ctx.fillRect(8, 6, 3, 3); ctx.fillRect(11, 9, 3, 3);
            ctx.fillRect(14, 12, 3, 3); ctx.fillRect(17, 9, 3, 3); ctx.fillRect(20, 6, 3, 3);
            break;
        case 'wooden_axe':
            ctx.fillStyle = '#8B6220';
            ctx.fillRect(4, 24, 3, 3); ctx.fillRect(7, 21, 3, 3);
            ctx.fillRect(10, 18, 3, 3); ctx.fillRect(13, 15, 3, 3);
            ctx.fillStyle = '#A0722A';
            ctx.fillRect(16, 8, 3, 3); ctx.fillRect(19, 5, 3, 3);
            ctx.fillRect(19, 8, 3, 3); ctx.fillRect(19, 11, 3, 3); ctx.fillRect(22, 8, 3, 3);
            break;
        case 'wooden_shovel':
            ctx.fillStyle = '#8B6220';
            ctx.fillRect(13, 22, 3, 3); ctx.fillRect(13, 19, 3, 3);
            ctx.fillRect(13, 16, 3, 3); ctx.fillRect(13, 13, 3, 3);
            ctx.fillStyle = '#A0722A';
            ctx.fillRect(11, 4, 7, 3); ctx.fillRect(10, 7, 9, 3); ctx.fillRect(11, 10, 7, 3);
            break;
    }
}

export function drawItemIcon(ctx, itemId) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    switch (itemId) {
        case 'stick':
            ctx.fillStyle = '#6B4810';
            ctx.fillRect(Math.round(w * 0.38), Math.round(h * 0.06), Math.round(w * 0.25), Math.round(h * 0.88));
            ctx.fillStyle = '#A0722A';
            ctx.fillRect(Math.round(w * 0.44), Math.round(h * 0.06), Math.round(w * 0.08), Math.round(h * 0.88));
            break;
    }
}

export function renderItemOnCanvas(ctx, item) {
    if (BLOCK_TYPES.includes(item)) {
        const texCanvas = getCachedBlockTexture(item);
        ctx.drawImage(texCanvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
        drawItemIcon(ctx, item);
    }
}
