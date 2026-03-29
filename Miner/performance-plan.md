# Miner Performance Improvement Plan

## Context
The Miner game renders a voxel world using Three.js with chunk-based loading. Despite chunk loading, performance is not smooth. The root cause is that the rendering approach creates far too many draw calls and renders far too many hidden faces. Every block is a full BoxGeometry (6 faces), even when most faces are hidden by adjacent blocks.

## Performance Issues (ranked by impact)

### 1. NO FACE CULLING — Critical (10x+ improvement expected)
**Problem:** `buildChunkMeshes()` (line 699) renders every block as a full 6-face box. In a solid chunk, ~85% of faces are completely hidden by adjacent blocks and never visible. A 16x16 chunk with ~3000 blocks creates ~18,000 faces when only ~3,000 are actually visible.

**Fix:** Replace `BoxGeometry` per-block with a **greedy meshing** or at minimum **face-culling mesh builder**:
- For each block, check 6 neighbors. Only emit a face quad if the neighbor is air (no block).
- Build a single merged `BufferGeometry` per block-type per chunk with only visible faces.
- This eliminates ~80-85% of rendered triangles.

**Implementation:**
- New function `buildChunkGeometry(cx, cz)` that iterates all blocks, checks neighbors via `getBlock()`, and builds vertex/index/uv buffers for visible faces only.
- Replace current `InstancedMesh`/`Group` approach with one `Mesh` per block-type per chunk using merged geometry.
- Multi-face blocks (grass, snow, workbench) pick the correct material per face during mesh building.

**Files:** `Miner/script.js` — replace `buildChunkMeshes()` (line 699-751)

### 2. TOO MANY DRAW CALLS — High Impact
**Problem:** Each chunk creates up to 10 separate meshes (one per block type). With RENDER_DISTANCE=6, that's ~113 chunks × 10 types = ~1,130 draw calls. Multi-face blocks (grass, snow) using `Group` with individual `Mesh` objects make this even worse — each grass block is its own draw call.

**Fix:** After implementing face culling (#1), each chunk will have at most 10 meshes with merged geometry, which is manageable. The multi-face block Groups are eliminated by the merged geometry approach.

### 3. RAYCASTER REBUILDS EVERY FRAME — Medium Impact
**Problem:** `updateTarget()` (line 839) creates a new `THREE.Raycaster()` every frame and iterates ALL chunk meshes into an array. With Groups, it also flattens all children.

**Fix:**
- Create raycaster once, reuse it (`raycaster.set(...)` each frame).
- Only raycast against chunks near the player (within REACH_DISTANCE), not all loaded chunks.
- Cache the objects array; invalidate only when chunks load/unload.

**Files:** `Miner/script.js` — refactor `updateTarget()` (line 839)

### 4. TOOLBAR REDRAWS EVERY FRAME VIA DOM — Medium Impact
**Problem:** `renderToolbar()` (line 1399) calls `container.innerHTML = ''` and rebuilds 9 DOM elements with canvases every time it's called. It calls `createBlockTexture()` per block slot, regenerating textures.

**Fix:**
- Only call `renderToolbar()` when inventory/toolbar/selection actually changes (not every frame — it's currently called on events, but verify no frame-loop caller).
- Cache block texture canvases instead of regenerating.

**Files:** `Miner/script.js` — around line 1399

### 5. CHUNK MESH DISPOSAL NOT CLEANING GPU MEMORY — Low-Medium Impact
**Problem:** `removeChunkMeshes()` (line 753) removes meshes from scene but doesn't call `.dispose()` on geometries or materials. This leaks GPU memory over time as the player moves.

**Fix:** Call `geometry.dispose()` and `material.dispose()` (if not shared) on removed meshes.

**Files:** `Miner/script.js` — `removeChunkMeshes()` (line 753)

### 6. WORLD DICT STRING KEY LOOKUPS — Low Impact
**Problem:** `getBlock(x,y,z)` creates a string `"x,y,z"` every call. This is used thousands of times during chunk building and collision detection. String concatenation and hash lookup is slower than typed array access.

**Fix (optional, lower priority):** Could switch to `Int8Array` per chunk for block data, but the string dict is acceptable for this scale. Only pursue if other optimizations aren't enough.

### 7. REDUCE RENDER DISTANCE DYNAMICALLY — Low Impact (fallback)
**Problem:** RENDER_DISTANCE=6 loads ~113 chunks. If performance is still insufficient after face culling, this is too many.

**Fix:** Add adaptive render distance — start at 6, reduce to 4 if FPS drops below 30. Or reduce fog distance to match.

## Implementation Order
1. **Face culling mesh builder** (#1 + #2) — This is the big win. Do this first.
2. **GPU memory disposal** (#5) — Quick fix, prevents memory leaks.
3. **Raycaster optimization** (#3) — Moderate effort, noticeable improvement.
4. **Toolbar caching** (#4) — Quick check if it's called per-frame; fix if so.
5. **Adaptive render distance** (#7) — Only if needed after #1.

## Verification
- Open the game in Chrome, press F12, go to Performance tab
- Record a 5-second session of walking around
- Compare frame times before/after: target is <16ms per frame (60 FPS)
- Check GPU memory in `renderer.info` (log `renderer.info.memory` and `renderer.info.render`)
- Walk across biome boundaries and chunk borders to verify no visual glitches
- Break/place blocks to verify chunk rebuilds work correctly with new mesh system
