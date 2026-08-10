# City Zero

A web-first, stylized 3D city-building and decision game where every building, policy, crisis, leader, and player choice changes a deterministic living simulation.

> **Project status:** the current playable build proves the basic interaction and simulation loop, but its city is drawn with simple HTML Canvas 2D shapes. It does **not** yet use the approved 3D graphics stack and cannot reach the visual quality of the reference images without replacing the renderer.

## Technical Verdict

The approved technologies are the best fit for our goals, but they still need to be implemented.

| Area | Decision |
|---|---|
| Game language | TypeScript |
| 3D renderer | Babylon.js |
| Graphics backend | WebGPU first, WebGL 2 fallback |
| Runtime assets | glTF/GLB models, compressed geometry, KTX2/Basis textures |
| Art production | Blender plus a validated modular asset pipeline |
| Game interface | React |
| Build tooling | Vite |
| Simulation | Fixed-step deterministic engine in Web Workers |
| Local saves | IndexedDB, versioned saves, checksums, rolling backups |
| Android | Capacitor 8 |
| Windows | Tauri 2 |
| Private preview | ChatGPT Sites |

Babylon.js is the right choice because City Zero needs a code-first web engine with orthographic cameras, physically based materials, shadows, instancing, level of detail, particles, post-processing, WebGPU support, and a WebGL fallback. React remains useful for menus and panels, but it must not render the city every frame.

Vinext and Cloudflare may remain thin hosting adapters for the private preview. The reusable game runtime must be a browser-only Vite application/package so the same code can be shipped through the web, Capacitor, and Tauri.

## Why the Current Graphics Look Bad

The current renderer manually draws roads, buildings, water, trees, and shadows as basic 2D canvas paths. This was useful to prove that construction and simulation work, but it is not a commercial art pipeline.

The target game must use:

- Independent 3D terrain, roads, buildings, trees, vehicles, water, lights, and effects.
- Authored modular models and textures rather than one generated city image.
- Real materials, soft shadows, day/night lighting, weather, particles, animation, and depth.
- Code-generated placement, state, variation, upgrades, damage, and movement.
- A strict visual comparison against the approved reference images.

Reference images are mandatory art direction. They must never become static gameplay backgrounds.

## Product Vision

City Zero is a deep but understandable city strategy game. The player is a mayor rebuilding and expanding a city whose economy, infrastructure, people, leaders, and crises react to each other and remember past decisions.

### Core Loop

1. Read the city and its causal problems.
2. Build infrastructure and assign priorities.
3. Advance time and observe real consequences.
4. Respond to policies, events, and multi-stage crises.
5. Manage advisers, public trust, and competing interests.
6. Expand into new districts and adapt to the city's identity.
7. Live with long-term consequences rather than reset isolated choices.

The game must explain *why* a result happened, not only show that a number changed.

## Simulation Pillars

The initial causal model connects:

- Money, income, costs, debt, and maintenance.
- Water production, storage, consumption, drought, and quality.
- Energy supply, demand, reliability, and clean generation.
- Population, housing capacity, migration, and district growth.
- Jobs, factories, services, productivity, and unemployment.
- Satisfaction, trust, health, safety, and service access.
- Pollution, green space, weather, and industrial pressure.
- Roads, transit, congestion, logistics, and emergency access.

Example chain:

```text
Drought -> low water reserve -> service pressure -> health risk
        -> public anger -> adviser conflict -> policy choice
        -> short-term relief or long-term infrastructure change
```

All authoritative calculations must be deterministic code. Artificial intelligence may later write news, adviser dialogue, or mayor reports, but it must never decide money, resources, or outcomes.

## Cities and Difficulty

Cities must differ structurally, not only visually.

- **Desert coastal city:** severe water pressure; solar and desalination opportunities.
- **Fertile city:** strong agriculture and growth; land, flooding, and expansion trade-offs.
- **Wind city:** cheap wind energy; storms, damage, and unreliable transport.
- **Dense megacity:** jobs and tall buildings; difficult residents, congestion, high costs, and limited land.

Each city has unique resources, hazards, policies, building rules, population behavior, missions, and visual identity. Later disasters may include heatwaves, droughts, sandstorms, floods, fires, supply failures, and social unrest.

## Mayor, Advisers, and Memory

The mayor is a playable leadership choice, not decoration. Different mayors have abilities, weaknesses, and specializations that unlock systems, policies, advantages, or difficult trade-offs from the beginning.

Advisers manage sectors such as industry, water, finance, public relations, health, transport, and resident satisfaction. Every important character needs:

- Skills, flaws, influence, trust, loyalty, and personal goals.
- Distinct movement, voice, reactions, and visual identity.
- Personal problems and conflicts that can affect city operations.
- Persistent memories of the player's promises, delays, sacrifices, and successes.
- Relationships with the mayor, residents, factions, and other advisers.

Choices must change future dialogue, available decisions, crisis behavior, and endings.

## World and Rendering Rules

- Orthographic isometric camera with fixed rotation for the first release.
- Drag, zoom, select, focus, and mobile multi-touch controls.
- Modular terrain chunks, roads, intersections, plots, and districts.
- Data-driven buildings with construction, operating, idle, upgraded, damaged, and crisis states.
- Stylized, warm, detailed, readable art suitable for a phone screen.
- Soft directional light, baked support lighting, night windows, weather, water, traffic, smoke, and environmental motion.
- Thin instances, object pools, frustum culling, chunk loading, compressed assets, and levels of detail.
- Adaptive quality that reduces shadows and effects before reducing gameplay clarity.
- WebGPU when available; automatic WebGL 2 recovery when it is not.

Primary validation is a mid-range Android phone, including the Samsung Galaxy A56. The target is stable 30 frames per second in balanced mode and up to 60 on stronger devices.

## Required Architecture

```text
Player Input
    -> Validated Game Commands
    -> Deterministic Simulation Worker
    -> State Changes / Render Snapshots
    -> 3D World Renderer
    -> React Interface

Simulation -> Versioned Save Repository
Assets -> Validator -> Optimizer -> Runtime Bundles
```

Mandatory separation:

- **Simulation:** authoritative numbers, rules, time, events, and outcomes.
- **World:** coordinates, tiles, roads, districts, occupancy, and entities.
- **Renderer:** meshes, materials, lighting, weather, animation, and camera.
- **Interface:** information, controls, decisions, accessibility, and settings.
- **Content:** data files for buildings, cities, policies, crises, characters, and missions.
- **Platform adapters:** Sites, Android, and Windows integration only.

A visual change must never alter simulation results. A frame-rate drop must never change the city outcome.

## Determinism and Commands

Every run stores a seed and an ordered command log. The same seed and commands must recreate the same city state on every platform.

Commands include identifiers, simulation tick, entity identifier, payload, expected revision, and idempotency protection. Duplicate construction, double payment, occupied plots, stale actions, and repeated purchases must be rejected safely.

## Golden Vertical Slice

Do not build the full game first. The first release-quality slice contains:

- One small desert coastal district.
- One factory, power plant, water tank, homes, hospital, park, and roads.
- Working traffic, economy, water, energy, population, satisfaction, health, pollution, and congestion.
- Three policies and one multi-stage water crisis.
- One mayor and a small adviser team with trust and memory.
- Day/night, weather, sound, construction, upgrade, selection, and save/load.
- Final-quality graphics, interaction, and performance.

**Gate:** no expansion is allowed until this scene matches the approved visual references in a side-by-side review and meets the phone performance target.

## Asset Pipeline

1. Create models in Blender using one art guide and shared scale.
2. Use modular parts and controlled visual variants.
3. Export to glTF/GLB with named meshes, pivots, sockets, collision bounds, and levels of detail.
4. Compress geometry and textures.
5. Validate polygon count, texture size, materials, naming, scale, bounds, and missing references.
6. Test each asset in the golden scene under the game's real camera and lighting.
7. Pack assets by city and load only what is needed.

A later internal editor must let the team add a building, policy, disaster, character, mission, or city through data and assets without changing the engine.

## Saving and Platform Delivery

- Local-first, offline-capable saves in IndexedDB.
- Atomic writes, checksums, three rolling backups, storage failure handling, and explicit migrations.
- Safe recovery after app suspension, forced shutdown, renderer loss, or corrupted data.
- Optional accounts and cloud synchronization only after local saving is proven.
- One game source for Sites preview, web release, Android through Capacitor, and Windows through Tauri.
- Later Android release work includes server-verified purchases, Play Integrity, Android App Bundle, and asset delivery when the art package becomes large.

## Testing and Quality

Required automated checks:

- Unit tests for every formula and command.
- Invariants: no invalid numbers, negative population, duplicated occupancy, or inconsistent totals.
- Property-based tests across thousands of generated states.
- Long simulations covering years of game time to detect impossible economies, infinite growth, unwinnable events, and repetitive crises.
- Exact replay tests using seed plus command log.
- Save corruption and migration tests.
- Visual regression screenshots against the golden references.
- Performance, memory, loading, suspend/resume, offline, touch, and graphics-recovery tests.
- Real-device testing across low, balanced, and high quality modes.

After release, collect privacy-respecting crash, frame-time, loading, save, difficulty, and player-exit telemetry.

## Execution Gates

1. **Foundation:** contracts, folders, art guide, target devices, and renderer boundary.
2. **Graphics proof:** Babylon.js, WebGPU/WebGL 2 selection, camera, one asset, light, shadow, and diagnostics.
3. **Golden scene:** final-quality small district approved visually.
4. **Generated world:** chunks, terrain, roads, plots, and occupancy.
5. **Interactive buildings:** construction, state, upgrades, damage, and data-driven content.
6. **Simulation separation:** fixed clock, worker, commands, snapshots, seed, and replay.
7. **Living city:** traffic, water, weather, particles, day/night, and sound.
8. **Performance and recovery:** levels of detail, compression, adaptive quality, memory, and graphics restoration.
9. **Reliable saves:** offline operation, backups, corruption recovery, and migrations.
10. **Platform proof:** the same save and deterministic result on web, Android, and Windows.
11. **Game expansion:** cities, leaders, advisers, crises, missions, progression, server features, and launch content.

## Current Prototype

The present prototype already demonstrates deterministic resources, construction, upgrades, policies, a water crisis, relationship memory, day/night, weather, camera controls, and local backups. Keep it as a gameplay proof and test fixture; replace its 2D renderer rather than treating it as the final visual foundation.

### Run the Existing Prototype

Requires Node.js 22.13 or later.

```bash
npm ci
npm run dev
```

Validation:

```bash
npm test
npm run build
```

## Definition of Success

City Zero's core is ready only when:

- The live 3D scene approaches the approved reference quality.
- Terrain, roads, buildings, vehicles, lights, and weather are independent runtime objects.
- The city changes without swapping a background image.
- Simulation results are deterministic and independent of frame rate.
- A run can be replayed exactly from its seed and commands.
- The target Android device maintains stable performance.
- Saves survive crashes and upgrades.
- The same game core works on web, Android, and Windows.
- New content is added through validated data and assets instead of engine rewrites.
