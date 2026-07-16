# Asset provenance

Wildkin Frontier does not redistribute art, audio, code, characters, names, maps, UI, or other material from the commercial games reviewed for high-level genre research.

| Asset | Source | Prompt summary and use |
| --- | --- | --- |
| `assets/wildkin/wildkin-title-source.png` → `wildkin-title.jpg` | Generated with built-in OpenAI image generation on 2026-07-15 | Original 16:9 key art showing a wayfarer, the broken beacon, braided trails, and this project's wicker, slate, bellows, glider, and ribbon-bodied creature silhouettes. No text, brands, artist names, reference images, or existing characters. |
| `assets/wildkin/wildkin-portraits-source.png` → `wildkin-portraits.jpg` | Generated with built-in OpenAI image generation on 2026-07-15 | Original vertical field-guide plate for Burramble, Flintusk, Coaloon, Wickerwing, and Rippletail with project-specific work props and tactile paper treatment. No labels, franchise references, or existing character designs. |
| `assets/wildkin/wildkin-ui-source.png` → `wildkin-ui-paper.jpg` | Generated with built-in OpenAI image generation on 2026-07-15 | Original parchment texture with braided teal cord, botanical impressions, clay flecks, and tool marks. No readable text, logos, third-party icons, or recognizable game motifs. |
| World, characters, structures, projectiles, particles, lighting, and animation | Authored procedurally in `src/wildkin-visuals.js` and `src/wildkin.js` | Original code-native Three.js content; no external models, textures, animation packs, or game assets. |
| Ambience, gathering, crafting, weapons, five creature voices, bonding, workers, nursery, guardian, and victory cues | Synthesized at runtime by `src/wildkin-audio.js` | Original Web Audio synthesis; no samples, music tracks, or third-party audio libraries. |

The source PNGs are retained for provenance. The smaller JPEG derivatives are used by the production browser build. Full normalized production briefs are recorded in [assets/wildkin/IMAGEGEN_PROMPTS.md](assets/wildkin/IMAGEGEN_PROMPTS.md).
