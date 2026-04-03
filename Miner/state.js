// ===== SHARED MUTABLE STATE =====
// Holds Three.js objects and global game flags.
// Populated during init() in main.js — no imports needed here.
export const shared = {
    scene: null,
    camera: null,
    renderer: null,
    ambientLight: null,
    dirLight: null,
    // Torch point lights keyed by "x,y,z"
    torchLights: {},
    // Block highlight/break overlay meshes
    highlightMesh: null,
    breakOverlay: null,
    // Game flags
    isPointerLocked: false,
    gameStarted: false,
    craftingOpen: false,
    // Day/night
    gameTime: 0.25,
};
