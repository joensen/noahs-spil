// ===== INVENTORY, TOOLBAR & TOOLS =====
import { BLOCK_TYPES, NON_BLOCK_ITEMS, TOOLBAR_SLOTS, TOOLS } from './constants.js';

export const inventory = {};        // { blockType: count }
export const toolInventory = [];    // [{ id, durability }, ...]
export const toolbar = new Array(TOOLBAR_SLOTS).fill(null);
toolbar[0] = { type: 'tool', item: 'hand' };
export let selectedSlot = 0;

// Callback registered by ui.js to re-render after inventory changes.
// Avoids a circular import: inventory.js → ui.js → inventory.js.
let _onChanged = () => {};
export function setInventoryChangedCallback(fn) { _onChanged = fn; }

export function setSelectedSlot(i) { selectedSlot = i; }

export function addToInventory(blockType) {
    inventory[blockType] = (inventory[blockType] || 0) + 1;
    autoAssignToToolbar(blockType);
    _onChanged();
}

export function removeFromInventory(blockType) {
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
    _onChanged();
    return true;
}

export function autoAssignToToolbar(item) {
    if (!BLOCK_TYPES.includes(item)) return; // non-block items don't auto-fill toolbar
    for (let i = 0; i < TOOLBAR_SLOTS; i++) {
        if (toolbar[i] && toolbar[i].type === 'block' && toolbar[i].item === item) return;
    }
    for (let i = 0; i < TOOLBAR_SLOTS; i++) {
        if (!toolbar[i]) { toolbar[i] = { type: 'block', item }; return; }
    }
}

export function addToolToInventory(toolId) {
    const toolDef = TOOLS[toolId];
    const entry = { id: toolId, durability: toolDef.durability };
    toolInventory.push(entry);
    const toolIndex = toolInventory.length - 1;
    for (let i = 0; i < TOOLBAR_SLOTS; i++) {
        if (!toolbar[i]) {
            toolbar[i] = { type: 'tool', item: toolId, toolIndex };
            _onChanged();
            return;
        }
    }
    _onChanged();
}

// ===== TOOL HELPERS =====
export function getEffectiveHardness(blockType, hardness) {
    const base = hardness[blockType] || 3;
    const slot = toolbar[selectedSlot];
    if (!slot || slot.type !== 'tool') return base * 5;
    const toolId = slot.item;
    const toolDef = TOOLS[toolId];
    if (!toolDef) return base * 5;
    if (toolDef.efficient && toolDef.efficient.includes(blockType)) {
        return Math.max(1, Math.ceil(base / toolDef.speedMultiplier));
    }
    if (toolId === 'hand') return base * 5;
    return base;
}
