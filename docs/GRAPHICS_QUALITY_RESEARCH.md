# City Zero Graphics Quality Research

## Decision

Keep Phaser 4.2.1 and the 2.5D isometric direction. The engine is not the quality bottleneck. Art assets, compositing, lighting, camera framing, motion, and mobile performance discipline determine the visible result.

The `/core` route is now a high-fidelity vertical slice: one production-quality city plate is composited with live traffic, smoke, water highlights, day/night grading, interactive hotspots, camera movement, and a responsive game HUD. This is a proof of the rendering direction, not the final world-streaming architecture.

## Evidence from primary sources

- Phaser 4 rebuilt its WebGL renderer around render nodes and restores the rendering context automatically. Its unified filters can be stacked on objects or cameras for bloom, glow, blur, shadow, color grading, masking, and image-based lighting.
  Source: https://phaser.io/news/2026/05/phaser-3-vs-phaser-4
- Phaser 4 lighting works across sprites, images, graphics, particles, text, and tilemaps. It also supports self-shadows and explicit light height.
  Source: https://phaser.io/tutorials/phaser-4-rendering-concepts
- `SpriteGPULayer` is appropriate for very large quantities of predictable background objects such as crowds, rain, snow, debris, and ambient animation. It is not the right choice for individually interactive buildings or agents.
  Source: https://phaser.io/news/2026/05/phaser4-spritegpulayer-performance
- Particle objects are pooled and recycled, which makes bounded smoke, dust, sparks, rain, and similar effects practical on mobile.
  Source: https://docs.phaser.io/api-documentation/class/gameobjects-particles-particle
- Cameras support pan, zoom, fade, flash, shake, per-camera filtering, and selective object rendering.
  Source: https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera
- Phaser's official showcase includes commercial-scale browser games and an isometric 30 km² farming simulation. These prove delivery scale, not automatic art quality.
  Source: https://phaser.io/games

## Quality system for the final game

1. **World art** — split every district into terrain, roads, water, large structures, small structures, vegetation, decals, and foreground occluders. Never ship one flattened city image as the full game world.
2. **Asset states** — every important building needs construction, idle, damaged, disabled, upgraded, selected, day, and night states.
3. **Surface depth** — add normal maps and controlled self-shadowing to selected hero assets. Use baked shadows for the majority of the city.
4. **Atmosphere** — use bounded pooled emitters for smoke, dust, rain, sparks, fire, and pollution. Use GPU layers later for very large non-interactive crowds and weather.
5. **Lighting** — combine baked daylight with selective dynamic lights. Avoid enabling dynamic lighting on every object because lighting changes shaders and breaks batches.
6. **Camera** — retain a controlled isometric angle, smooth pan and cursor-centered zoom, safe bounds, focus transitions, and predictable selection framing.
7. **Color** — define one grade per biome and time-of-day state. Do not stack arbitrary effects until the image becomes muddy.
8. **Interface** — keep the city visible. Use compact glass panels, large touch targets, a consistent icon family, and contextual detail instead of permanent side panels.

## Performance gates

| Gate | Mobile target |
|---|---:|
| Frame rate | 60 FPS target; 30 FPS minimum on supported low tier |
| Main-thread frame budget | 16.7 ms target |
| Initial playable download | 8 MB maximum compressed |
| Active standard interactive objects | Budget and profile per district |
| Ambient particles | Quality-tiered and camera-bounded |
| Texture dimensions | Device-tier capped; no accidental oversized textures |
| Render scale | 1× low, 1.5× balanced, up to 2× high |
| Off-camera updates | Disabled or reduced |

## Next production milestone

Replace the single city plate with one small layered district containing 8–12 separate buildings, road and terrain layers, one normal-mapped hero building, day/night variants, occlusion, and a measurable draw-call and memory budget. Do not expand simulation content until that district passes the visual and performance gates.
