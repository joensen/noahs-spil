# Miner — CLAUDE.md

## What is this?
A Minecraft-inspired 3D voxel survival game built with vanilla JavaScript and Three.js (r128 via CDN). Uses ES modules — requires a local dev server (e.g. `python -m http.server 8000`). Danish UI throughout.

## Files
- `index.html` — Game shell, HUD elements (crosshair, toolbar, crafting screen, menu), loads Three.js from CDN then `main.js` as an ES module
- `style.css` — HUD and overlay styling
- `features.md` — Feature roadmap with dependency ordering; implemented features are marked with ✅

### JavaScript modules (load order: leaf → root)
| File | Responsibility | Imports from |
|---|---|---|
| `constants.js` | BLOCK_TYPES, TOOLS, RECIPES, FACES, game constants | — |
| `noise.js` | SimplexNoise class, fbm2d | — |
| `state.js` | Shared Three.js objects, game flags (`shared` object) | — |
| `textures.js` | Texture generation, `materials` dict, icon drawing helpers | constants |
| `world.js` | `world` dict, `getBlock`/`setBlock`, biomes, terrain gen | constants, noise |
| `chunks.js` | Chunk mesh building and loading | constants, world, textures, state |
| `inventory.js` | Inventory, toolbar, tool state; callback pattern to avoid circular dep with ui.js | constants |
| `ui.js` | `renderToolbar`, `showMessage` | constants, inventory, textures |
| `physics.js` | Player movement, collision detection | constants, world, state, chunks |
| `interaction.js` | Block targeting, break/place, torch lights | constants, world, chunks, inventory, ui, state |
| `crafting.js` | Crafting screen, custom 3×3 grid, recipe matching | constants, inventory, world, state, ui, textures |
| `save.js` | IndexedDB save/load | constants, world, chunks, inventory, physics, state, ui, interaction |
| `main.js` | init, animate loop, event handlers, day/night cycle | everything |

### Key design decisions
- `THREE` is a CDN global — all modules access it without importing
- `setBlock` in world.js is pure (no Three.js); torch lights are managed in interaction.js
- `inventory.js` uses a registered callback (`setInventoryChangedCallback`) to trigger `renderToolbar` without importing ui.js, avoiding a circular dep
- `shared` (state.js) holds scene, camera, renderer, lights, torchLights, and game flags so modules that need them don't have to import from main.js

## Architecture — Data Flow

### World Data
- `world` object: flat dictionary mapping `"x,y,z"` string keys to block type strings (e.g. `"grass"`, `"stone"`)
- `getBlock(x,y,z)` / `setBlock(x,y,z,type)` — all world access goes through these
- No block objects — just strings in a hash map

### Chunk System
The world is divided into 16×16 (XZ) chunks for lazy generation and rendering:
- `generatedChunks` (Set) — tracks which chunks have had terrain generated
- `chunks` object — `"cx,cz"` → `{ meshes: { blockType: THREE.Object3D } }` for loaded chunks
- `generateChunkData(cx,cz)` — generates terrain, caves, and vegetation for one chunk into `world`
- `buildChunkMeshes(cx,cz)` — creates Three.js meshes from `world` data for one chunk
- `updateChunks()` — called each frame, compares player chunk position to last known, queues load/unload
- `processChunkQueue()` — processes up to `CHUNKS_PER_FRAME` (2) chunks per frame from the queue (closest first)
- `rebuildChunkAt(x,z)` — rebuilds the chunk containing world coordinate (x,z), called after block break/place

When modifying terrain generation, only `generateChunkData` needs to change. Mesh building is generic.

### Biome System
Two noise layers (`tempNoise`, `moistNoise`) at frequency 0.004 determine biome per column:
- `getBiome(x,z)` → `'plains'|'forest'|'mountains'|'desert'|'tundra'`
- `getTerrainHeight(x,z)` — computes height using biome-specific noise params, blends at biome borders
- `BIOMES` constant defines per-biome: octaves, freq, amp, base height, surface/sub blocks, tree density
- Mountains use stone surface above y=12; desert spawns cacti instead of trees

### Rendering
- **Face-culled mesh building**: only visible faces (where neighbor is air) are emitted — ~80-85% triangle reduction vs rendering all 6 faces per block
- Each chunk builds one merged `BufferGeometry` per block type with only exposed faces
- Multi-face materials (grass, snow, workbench) use `geometry.addGroup()` to assign per-face materials within a single mesh
- Single-material blocks use a single `Mesh` with merged geometry per chunk
- `FACES` constant defines the 6 face directions with vertex positions, UVs, and normals
- Block targeting uses a reusable `Raycaster` against nearby chunk meshes; block position computed from hit point + face normal
- GPU memory properly disposed via `geometry.dispose()` when chunks unload
- `rebuildChunkAt()` also rebuilds adjacent chunks when block is on chunk boundary (face culling correctness)

### Block Types
Each block type needs entries in: `BLOCK_TYPES` array, `BLOCK_HARDNESS`, `createBlockTexture()` switch, and `createMaterials()`. Multi-face blocks also need a side material function and special handling in `createMaterials()`.

Current types: grass, dirt, stone, wood, sand, brick, leaves, workbench, snow, cactus

### Tools & Crafting
- `TOOLS` defines tool stats (durability, speed multiplier, efficient-on block types)
- `RECIPES` array: each recipe has cost, result (block or tool), and whether it needs a workbench
- Crafting UI opens with E key; workbench proximity unlocks advanced recipes
- Tool durability tracked per-instance in `toolInventory` array

### Inventory & Toolbar
- `inventory` object: `{ blockType: count }` for block items
- `toolInventory` array: tool instances with id + remaining durability
- `toolbar` array (9 slots): each slot is `{ type: 'block'|'tool', item: string }` or null
- Slot 0 is always the hand tool

### Player Physics
- First-person camera (no player mesh)
- AABB collision with `PLAYER_WIDTH` (0.3 half-width) and `PLAYER_HEIGHT` (1.6)
- `playerCollidesHorizontal` / `findFloorUnderPlayer` / `findCeilingAbovePlayer` — check world blocks directly
- Auto-jump: when horizontal movement is blocked but 1 block up is clear, auto-jumps
- Respawn at (128, surface, 128) if player falls below y=-30

### Texture Generation
All textures are procedurally generated on 16×16 canvases using `createBlockTexture(type)`. No image files needed. Textures use `NearestFilter` for pixelated look.

## Key Constants
| Constant | Value | Purpose |
|---|---|---|
| `CHUNK_SIZE` | 16 | Blocks per chunk side |
| `RENDER_DISTANCE` | 6 | Chunks loaded around player |
| `CHUNKS_PER_FRAME` | 2 | Max chunks generated per frame |
| `PLAYER_WIDTH` | 0.3 | Half-width; allows 1-wide gap traversal |
| `PLAYER_HEIGHT` | 1.6 | Eye height from feet |
| `REACH_DISTANCE` | 6 | Block interaction range |

## Common Tasks

### Adding a new block type
1. Add name to `BLOCK_TYPES` array and `BLOCK_HARDNESS`
2. Add texture case in `createBlockTexture()`
3. If multi-face: create side material function, add special case in `createMaterials()`
4. If single-face: it's handled automatically by the loop in `createMaterials()`

### Adding a new biome
1. Add entry to `BIOMES` constant with terrain params and surface blocks
2. Add condition in `getBiome()` based on temperature/moisture values
3. If biome needs special vegetation, add case in the vegetation pass of `generateChunkData()`

### Adding a new tool
1. Add to `TOOLS` constant with stats
2. Add icon case in `drawToolIcon()`
3. Add recipe in `RECIPES` array

### Adding a new recipe
Add entry to `RECIPES`: `{ id, name, result: { type, item }, cost: { material: amount }, needsWorkbench: bool }`

## Gotchas
- Multi-face material blocks (grass, snow, workbench) use `geometry.addGroup()` with a materials array to assign different textures per face direction within a single merged mesh.
- Chunk mesh building scans y from -22 to 55 — extend this range if terrain gets taller.
- Tree placement is clamped within chunk bounds (±1 margin for leaves) to avoid cross-chunk artifacts.
- The `isNearWorkbench` function scans blocks within range, not the entire world.
- UI text is in Danish (the game is for a Danish audience).
