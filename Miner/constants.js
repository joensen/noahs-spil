// ===== CONSTANTS =====
export const BLOCK_TYPES = ['grass', 'dirt', 'stone', 'coal', 'wood', 'sand', 'brick', 'leaves', 'workbench', 'snow', 'cactus', 'torch'];
export const BLOCK_HARDNESS = {
    grass: 3, dirt: 3, stone: 5, coal: 4, wood: 4, sand: 2, brick: 5, leaves: 1, workbench: 4, snow: 2, cactus: 2, torch: 1
};
export const NON_BLOCK_ITEMS = ['stick']; // craftable items that aren't placeable blocks

export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE = 6;
export const CHUNKS_PER_FRAME = 2;
export const PLAYER_HEIGHT = 1.6;
export const PLAYER_WIDTH = 0.3;
export const PLAYER_BODY_HEIGHT = 1.5;
export const MOVE_SPEED = 5;
export const SPRINT_SPEED = 8.5;
export const DOUBLE_TAP_TIME = 300; // ms
export const GRAVITY = 20;
export const JUMP_VELOCITY = 6.5;
export const PI_2 = Math.PI / 2;
export const REACH_DISTANCE = 6;
export const TOOLBAR_SLOTS = 9;

export const TOOLS = {
    hand:           { name: 'Hånd',     durability: Infinity, speedMultiplier: 1, efficient: ['wood', 'leaves'] },
    wooden_pickaxe: { name: 'Træhakke', durability: 30, speedMultiplier: 3, efficient: ['stone', 'brick', 'coal'] },
    wooden_axe:     { name: 'Træøkse',  durability: 30, speedMultiplier: 3, efficient: ['wood'] },
    wooden_shovel:  { name: 'Træskovl', durability: 30, speedMultiplier: 3, efficient: ['dirt', 'grass', 'sand'] },
};

export const RECIPES = [
    { id: 'workbench_block', name: 'Arbejdsbord', result: { type: 'block', item: 'workbench',      amount: 1 }, cost: { wood: 4 },            needsWorkbench: false },
    { id: 'stick',           name: 'Pinde',       result: { type: 'item',  item: 'stick',          amount: 4 }, cost: { wood: 1 },            needsWorkbench: false },
    { id: 'torch',           name: 'Fakkel',      result: { type: 'block', item: 'torch',          amount: 4 }, cost: { coal: 1, stick: 1 }, needsWorkbench: false },
    { id: 'wooden_pickaxe',  name: 'Træhakke',    result: { type: 'tool',  item: 'wooden_pickaxe', amount: 1 }, cost: { wood: 3 },            needsWorkbench: true },
    { id: 'wooden_axe',      name: 'Træøkse',     result: { type: 'tool',  item: 'wooden_axe',     amount: 1 }, cost: { wood: 3 },            needsWorkbench: true },
    { id: 'wooden_shovel',   name: 'Træskovl',    result: { type: 'tool',  item: 'wooden_shovel',  amount: 1 }, cost: { wood: 2 },            needsWorkbench: true },
];

// Face definitions for face-culled mesh building
// Each face: direction to check neighbour, 4 corner vertices [x,y,z,u,v]
// Winding is CCW for outward-facing normals
export const FACES = [
    { dir: [1,0,0],  corners: [[1,0,0,0,0],[1,1,0,0,1],[1,1,1,1,1],[1,0,1,1,0]] },
    { dir: [-1,0,0], corners: [[0,0,1,0,0],[0,1,1,0,1],[0,1,0,1,1],[0,0,0,1,0]] },
    { dir: [0,1,0],  corners: [[1,1,0,0,0],[0,1,0,0,1],[0,1,1,1,1],[1,1,1,1,0]] },
    { dir: [0,-1,0], corners: [[0,0,0,0,0],[1,0,0,0,1],[1,0,1,1,1],[0,0,1,1,0]] },
    { dir: [0,0,1],  corners: [[0,0,1,0,0],[1,0,1,1,0],[1,1,1,1,1],[0,1,1,0,1]] },
    { dir: [0,0,-1], corners: [[1,0,0,0,0],[0,0,0,1,0],[0,1,0,1,1],[1,1,0,0,1]] },
];
