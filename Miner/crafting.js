// ===== CRAFTING SCREEN & CUSTOM GRID =====
import { BLOCK_TYPES, NON_BLOCK_ITEMS, RECIPES, TOOLS } from './constants.js';
import { inventory, toolInventory, toolbar, selectedSlot, removeFromInventory, addToInventory, addToolToInventory } from './inventory.js';
import { getBlock } from './world.js';
import { shared } from './state.js';
import { showMessage, renderToolbar } from './ui.js';
import { drawToolIcon, renderItemOnCanvas } from './textures.js';

// ===== NEAR WORKBENCH CHECK =====
export function isNearWorkbench() {
    const px = shared.camera.position.x;
    const py = shared.camera.position.y;
    const pz = shared.camera.position.z;
    const range = 4;
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
                    if (dx * dx + dy * dy + dz * dz <= range * range) return true;
                }
            }
        }
    }
    return false;
}

// ===== CRAFT ITEM =====
export function craftItem(recipe) {
    for (const [item, amount] of Object.entries(recipe.cost)) {
        if ((inventory[item] || 0) < amount) return;
    }
    for (const [item, amount] of Object.entries(recipe.cost)) {
        for (let i = 0; i < amount; i++) removeFromInventory(item);
    }
    const resultAmount = recipe.result.amount || 1;
    if (recipe.result.type === 'block') {
        for (let i = 0; i < resultAmount; i++) addToInventory(recipe.result.item);
        showMessage(recipe.name + ' lavet!');
    } else if (recipe.result.type === 'item') {
        inventory[recipe.result.item] = (inventory[recipe.result.item] || 0) + resultAmount;
        renderToolbar();
        showMessage(recipe.name + ' lavet!');
    } else if (recipe.result.type === 'tool') {
        addToolToInventory(recipe.result.item);
        showMessage(recipe.name + ' lavet!');
    }
}

// ===== CUSTOM 3x3 CRAFTING GRID =====
const craftGrid = new Array(9).fill(null);
let pickerSlotIndex  = -1;
let customCraftResult = null;

export function renderCraftGrid() {
    const grid = document.getElementById('craft-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div');
        slot.className = 'craft-grid-slot';

        const item = craftGrid[i];
        if (item) {
            const canvas = document.createElement('canvas');
            canvas.width = 32; canvas.height = 32;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            renderItemOnCanvas(ctx, item);
            slot.appendChild(canvas);
        }

        slot.addEventListener('click', (e) => {
            e.stopPropagation();
            if (item) {
                craftGrid[i] = null;
                document.getElementById('item-picker').style.display = 'none';
            } else {
                showItemPicker(i);
            }
            renderCraftGrid();
            checkCustomRecipe();
        });
        grid.appendChild(slot);
    }
    updateCraftResult();
}

function showItemPicker(slotIndex) {
    pickerSlotIndex = slotIndex;
    const picker = document.getElementById('item-picker');
    picker.innerHTML = '';

    const available = [];
    for (const type of BLOCK_TYPES) {
        if ((inventory[type] || 0) > 0) available.push(type);
    }
    for (const item of NON_BLOCK_ITEMS) {
        if ((inventory[item] || 0) > 0) available.push(item);
    }

    if (available.length === 0) { picker.style.display = 'none'; return; }

    for (const item of available) {
        const div = document.createElement('div');
        div.className = 'picker-item';
        div.title = item;

        const canvas = document.createElement('canvas');
        canvas.width = 28; canvas.height = 28;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        renderItemOnCanvas(ctx, item);
        div.appendChild(canvas);

        const countSpan = document.createElement('span');
        countSpan.className = 'picker-count';
        countSpan.textContent = inventory[item] || 0;
        div.appendChild(countSpan);

        div.addEventListener('click', (e) => {
            e.stopPropagation();
            craftGrid[pickerSlotIndex] = item;
            picker.style.display = 'none';
            renderCraftGrid();
            checkCustomRecipe();
        });
        picker.appendChild(div);
    }
    picker.style.display = 'flex';
}

function checkCustomRecipe() {
    const gridItems = {};
    for (const item of craftGrid) {
        if (item) gridItems[item] = (gridItems[item] || 0) + 1;
    }
    const nearWB = isNearWorkbench();
    customCraftResult = null;

    for (const recipe of RECIPES) {
        if (recipe.needsWorkbench && !nearWB) continue;
        const costEntries = Object.entries(recipe.cost);
        if (costEntries.length !== Object.keys(gridItems).length) continue;
        let matches = true;
        for (const [item, amount] of costEntries) {
            if (gridItems[item] !== amount) { matches = false; break; }
        }
        if (matches) { customCraftResult = recipe; break; }
    }
    updateCraftResult();
}

function updateCraftResult() {
    const resultSlot = document.getElementById('craft-result-slot');
    const craftBtn   = document.getElementById('custom-craft-btn');
    if (!resultSlot || !craftBtn) return;
    resultSlot.innerHTML = '';

    if (customCraftResult) {
        const r = customCraftResult.result;
        const canvas = document.createElement('canvas');
        canvas.width = 40; canvas.height = 40;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        if (r.type === 'tool') {
            drawToolIcon(ctx, r.item);
        } else {
            renderItemOnCanvas(ctx, r.item);
        }
        resultSlot.appendChild(canvas);

        if (r.amount && r.amount > 1) {
            const span = document.createElement('span');
            span.className = 'result-count';
            span.textContent = r.amount;
            resultSlot.appendChild(span);
        }

        let canAfford = true;
        for (const [item, amount] of Object.entries(customCraftResult.cost)) {
            if ((inventory[item] || 0) < amount) { canAfford = false; break; }
        }
        craftBtn.disabled = !canAfford;
    } else {
        craftBtn.disabled = true;
    }
}

export function craftFromGrid() {
    if (!customCraftResult) return;
    for (const [item, amount] of Object.entries(customCraftResult.cost)) {
        if ((inventory[item] || 0) < amount) return;
    }
    craftItem(customCraftResult);
    for (let i = 0; i < 9; i++) craftGrid[i] = null;
    renderCraftGrid();
    checkCustomRecipe();
    openCrafting(); // refresh recipe list costs
}

// ===== OPEN / CLOSE CRAFTING =====
export function openCrafting() {
    shared.craftingOpen = true;
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

        // Result icon
        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = 24; iconCanvas.height = 24;
        iconCanvas.style.cssText = 'image-rendering:pixelated;flex-shrink:0;';
        const iconCtx = iconCanvas.getContext('2d');
        iconCtx.imageSmoothingEnabled = false;
        if (recipe.result.type === 'tool') {
            const tmp = document.createElement('canvas');
            tmp.width = 32; tmp.height = 32;
            drawToolIcon(tmp.getContext('2d'), recipe.result.item);
            iconCtx.drawImage(tmp, 0, 0, 24, 24);
        } else {
            renderItemOnCanvas(iconCtx, recipe.result.item);
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'recipe-name';
        const amtLabel = (recipe.result.amount && recipe.result.amount > 1) ? ` ×${recipe.result.amount}` : '';
        nameSpan.textContent = recipe.name + amtLabel;

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
        btn.addEventListener('click', () => { craftItem(recipe); openCrafting(); });

        row.appendChild(iconCanvas);
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

    const customDiv = document.getElementById('custom-crafting');
    if (customDiv) {
        customDiv.style.display = nearWB ? 'block' : 'none';
        if (nearWB) { renderCraftGrid(); checkCustomRecipe(); }
    }

    document.getElementById('crafting-screen').style.display = 'block';
}

export function closeCrafting() {
    shared.craftingOpen = false;
    document.getElementById('crafting-screen').style.display = 'none';
    document.getElementById('item-picker').style.display = 'none';
    for (let i = 0; i < 9; i++) craftGrid[i] = null;
    document.body.requestPointerLock();
}
