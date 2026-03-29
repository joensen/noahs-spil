# Miner Survival — Feature Roadmap

Features are ordered by dependency: independent features come first, dependent features later. Each feature is a self-contained user story that can be picked up and implemented individually.

---

## ✅ Auto Jump
Player automatically jumps when walking into a 1-block-high obstacle, removing the need to manually press space for small ledges.

**Status:** Implemented

## ✅ Walk Through 1-Wide Gaps
Player can walk through 1-block-wide, 2-block-tall openings. Player width reduced from 1.0 to 0.6 blocks.

**Status:** Implemented

## ✅ 256×256 World
Map expanded from 64×64 to 256×256 for much larger exploration. Fog and camera range adjusted accordingly.

**Status:** Implemented

## ✅ Better Caves & Mountains
Mountains are taller with thicker walls (4 octaves, higher amplitude). Caves are smaller and less frequent (higher noise threshold, lower frequency for thicker walls between caves).

**Status:** Implemented

---

## 1. Terrain Generation Improvements
Introduce Perlin/simplex noise to create rolling hills, valleys, and height variation instead of a flat world. Add underground caves carved out by a second noise pass. This makes the world feel natural and gives players a reason to explore.

**Dependencies:** None — replaces the current flat terrain generator. *(Partially done — simplex noise terrain with caves is implemented)*

## 2. More Block Types
Add new blocks: iron ore, coal ore, gold ore, diamond ore, glass, wooden planks, and cobblestone. Ores generate embedded in stone underground; planks and glass are crafted. This expands the building and crafting palette significantly.

**Dependencies:** None — only requires registering new block IDs and textures.

## ✅ 3. Biomes
Divide the world into biomes (forest, desert, plains, snowy tundra) that control surface block type, tree density, and terrain shape. Each biome uses different noise parameters and block distributions to create distinct regions.

**Status:** Implemented — 5 biomes (plains, forest, mountains, desert, tundra) with temperature/moisture noise selection, height blending at borders, biome-specific vegetation (dense trees in forest, cacti in desert, sparse trees in tundra), and snow/cactus block types.

## 4. Health Bar & Fall Damage
Display a 10-heart health bar on the HUD. The player takes damage proportional to fall distance (>3 blocks). Health regenerates slowly when hunger is full. Reaching zero health triggers a death/respawn screen.

**Dependencies:** None — adds a new HUD element and a physics check on landing.

## 5. Stone / Iron / Diamond Tool Tiers
Add stone, iron, and diamond variants of pickaxe, axe, and shovel. Higher tiers mine faster and last longer. Certain ores (iron, gold, diamond) require a minimum tool tier to drop items.

**Dependencies:** More Block Types (needs ores and cobblestone to exist for crafting and mining tier gates).

## 6. Furnace
A placeable furnace block that opens a smelting UI. Accepts fuel (coal, wood) and an input item, then produces output over time — e.g., iron ore → iron ingot, sand → glass, raw food → cooked food. Recipes are data-driven.

**Dependencies:** More Block Types (needs coal and ores to smelt).

## 7. Chest / Storage
A placeable chest block that opens a 27-slot inventory UI. Items can be moved between the player inventory and the chest. Multiple chests can be placed independently. This solves inventory overflow as the player accumulates resources.

**Dependencies:** None — only needs the existing inventory system and a new block type.

## 8. Doors
Craftable wooden and iron doors that occupy two vertical blocks. Right-click toggles open/closed state with a simple rotation animation. Doors block mob pathfinding when closed, giving players a way to secure shelters.

**Dependencies:** None — a new interactive block with open/closed state.

## 9. Hunger Bar & Food System
Display a 10-drumstick hunger bar alongside health. Hunger drains slowly over time and faster when sprinting or mining. Eating food items (apples, bread, cooked meat) restores hunger points. When hunger is empty, health starts draining.

**Dependencies:** Health Bar (hunger interacts with health regeneration and damage).

## 10. Day/Night Cycle & Lighting
Implement a game clock that cycles through day and night over ~10 minutes. Ambient light dims at night and brightens at dawn. Block faces are shaded based on sunlight level. This creates atmosphere and sets the stage for hostile mobs.

**Dependencies:** None — modifies the renderer's ambient light based on a timer.

## 11. Torches & Light Sources
Craftable torches (stick + coal) that can be placed on blocks and emit point light. Light propagates through air blocks with falloff. Indoor and underground areas are dark without torches, making them essential for cave exploration.

**Dependencies:** Day/Night Cycle (lighting engine must exist for point lights to layer on top), More Block Types (needs coal for crafting).

## 12. Passive Mobs
Add pigs, cows, and chickens that spawn on grass in daylight. They wander randomly, have simple physics/collision, and drop food items (raw pork, raw beef, raw chicken) and leather when killed. This provides a renewable food source.

**Dependencies:** Hunger Bar & Food System (food drops need a purpose), Health Bar (mobs need a health/damage model).

## 13. Hostile Mobs
Zombies and skeletons spawn in darkness (night surface, unlit caves). They pathfind toward the player and deal contact damage. Skeletons shoot projectile arrows. Mobs despawn in daylight or at distance. This creates the core survival threat.

**Dependencies:** Day/Night Cycle (spawn conditions), Health Bar (player takes damage), Torches (players need a way to light areas and prevent spawns).

## 14. Combat System
Add swords (wooden through diamond) with varying damage. Left-click deals damage to mobs with a short cooldown and knockback. Mobs flash red when hit. Critical hits occur when falling. This gives the player offensive tools against hostile mobs.

**Dependencies:** Hostile Mobs (need enemies to fight), Stone/Iron/Diamond Tool Tiers (sword tiers follow the same material progression).

## 15. Armor
Craftable armor pieces (helmet, chestplate, leggings, boots) in leather, iron, and diamond tiers. Each piece reduces incoming damage by a percentage. An armor bar appears above health. Armor has durability and breaks over time.

**Dependencies:** Combat System (armor is only meaningful when the player takes combat damage), Stone/Iron/Diamond Tool Tiers (shares the material tier system).

## 16. Water & Lava
Water and lava are fluid blocks that flow outward and downward from source blocks. Water slows movement and extinguishes fire; lava deals damage and emits light. Water + lava contact creates cobblestone or obsidian. Adds environmental hazards and utility.

**Dependencies:** Health Bar (lava must deal damage), Torches & Light Sources (lava needs to emit light through the lighting engine).

## 17. Farming
Add a hoe tool that converts grass/dirt into farmland. Plant seeds (dropped from grass) on farmland near water. Crops grow through stages over time and can be harvested for wheat. Wheat crafts into bread. Provides a reliable, renewable food source.

**Dependencies:** Hunger Bar & Food System (food output needs a purpose), Water (farmland hydration mechanic).

## 18. Bed
Craft a bed from wool and planks. Right-clicking a placed bed at night skips to dawn and sets the player's spawn point. If hostile mobs are nearby, sleeping is blocked with a warning message. Essential quality-of-life for the day/night cycle.

**Dependencies:** Day/Night Cycle (skipping night requires a game clock), Hostile Mobs (nearby-mob check during sleep), Passive Mobs (sheep drop wool for crafting).

## 19. Sound Effects
Add spatial sound effects for block breaking/placing, footsteps on different surfaces, mob sounds (zombie groans, skeleton rattles, animal noises), tool usage, damage taken, and UI interactions. Uses Web Audio API with distance-based falloff.

**Dependencies:** None technically, but best added after mobs and combat exist so all sound triggers are in place.

## 20. Music & Ambient Audio
Add calm background music tracks that play intermittently (Minecraft-style). Layer ambient sounds based on context: birds during day, crickets at night, wind in mountains, dripping in caves. Music fades between tracks with volume controls in a settings menu.

**Dependencies:** Sound Effects (shares the audio system), Day/Night Cycle (ambient sounds vary by time), Biomes (ambient sounds vary by location).

## 21. Bigger / Infinite World (Chunk Loading)
Divide the world into 16x16 chunks that load/unload as the player moves. Generate new terrain on demand using seeded noise. Only render chunks within view distance. This removes the 32x32 world boundary and enables true exploration.

**Dependencies:** Terrain Generation Improvements (chunk generator must use noise-based terrain), Biomes (new chunks need biome assignment).

## 22. Save / Load Game
Serialize the world state (blocks, player position/inventory/health/hunger, time of day, chest contents, mob positions) to localStorage or IndexedDB. Add save/load buttons to the pause menu. Auto-save periodically. Allows players to keep progress across sessions.

**Dependencies:** Chunk Loading (must serialize chunk data efficiently), Hunger Bar & Health Bar (must persist player stats).

## 23. Creative Mode Toggle
Add a toggle in the pause menu or a `/gamemode` command to switch between survival and creative. Creative mode gives unlimited blocks, instant breaking, flight (double-tap jump), no health/hunger, and access to all block types via a creative inventory grid.

**Dependencies:** Save/Load (game mode is part of saved state), Health Bar & Hunger Bar (creative disables these systems), all block types and items should exist so creative inventory is complete.
