# Wildkin Frontier — Research and Design Boundary

Research snapshot: **2026-07-15**. This document uses first-party sources only and treats them as genre research, not as a content specification. Wildkin Frontier is an original 8–12 minute single-player vertical slice.

## Official sources reviewed

- [Pocketpair: Palworld overview](https://www.pocketpair.jp/en/games-en/palworld-en/) — accessed 2026-07-15. Establishes the broad loop of capturing and training creatures, building and automating a base, and caring for workers with distinct skills.
- [Palworld Steam store](https://store.steampowered.com/app/1623730/Palworld/) — accessed 2026-07-15. Confirms the current 1.0 release context and genre mixture: open-world survival crafting, creature collection, base building, automation, and action.
- [Palworld v1.0 official release changelog](https://store.steampowered.com/news/app/1623730/view/686383649529010623) — accessed 2026-07-15. Relevant genre-level observations include clearer creature individuality, work-specialization progression, inheritance through breeding, faster early discovery, improved worker hauling/storage, shorter boss encounters, and stronger feedback for rewards, crafting, gathering, and assignment.
- [Palworld v1.0.1 official hotfix](https://steamcommunity.com/games/1623730/announcements/detail/710029448730116121) — accessed 2026-07-15. The save-discard fix reinforces that versioned saves, validation, and safe failure are release-critical rather than optional polish.
- [Official server guide: configuration parameters, version 1.0.0](https://docs.palworldgame.com/settings-and-operation/configuration/) — accessed 2026-07-15. Shows that gatherable durability/yield/respawn, capture chance, hunger, stamina, damage, worker output, egg time, and death penalty are separate tuning axes.
- [Official server guide: technology IDs, version 1.0.0](https://docs.palworldgame.com/settings-and-operation/technologyids/) — accessed 2026-07-15. Shows a broad technology vocabulary spanning primitive tools, weapons, breeding, food, beds, storage, farms, furnaces, workshops, power, and late-game production. No IDs, recipes, ordering, or names are imported.

## Genre findings translated into Wildkin Frontier

The useful inspiration is a **coupled loop**, not any franchise expression:

1. Explore and gather enough to become capable.
2. Weaken and befriend a wild creature through readable action feedback.
3. Give that creature a role whose animation and output match its aptitude.
4. Collect the output yourself and turn it into the next tool or facility.
5. Care, breeding, and inherited traits make creatures feel like individuals rather than interchangeable machines.
6. A visible landmark and guardian convert preparation into a short, legible finale.

For this small game, every friction axis is tuned independently. Hunger creates gentle urgency but never interrupts the golden path; resource nodes break quickly and respawn; capture becomes reliable at low health; worker production takes roughly 8.5–11 seconds plus short visible travel and handoff phases; nursery gestation is 45–75 seconds; defeat returns the player to camp without inventory loss. Automation deliberately ends at a storage handoff: workers deposit resources, while the player must collect them. This keeps the base alive without letting the game play itself.

The 1.0 notes particularly support three design priorities: distinct idle/work/attack motion sells companionship; visible work suitability makes team choices understandable; and reduced repetition improves discovery pacing. Wildkin Frontier applies those principles with five ordinary creatures, one guardian, one compact island, three regions, and one complete progression arc.

## Originality and IP boundary

Allowed inspiration is limited to high-level genre ideas such as survival meters, gathering, crafting tiers, base placement, creature companionship, task aptitude, inherited traits, and a prepare-then-boss cadence.

Wildkin Frontier must not reproduce or closely evoke Palworld or any other referenced game's creature names or silhouettes, capture containers, logos, lore, factions, maps, landmarks, UI composition, iconography, terminology, technology tree, recipes, balance values, written text, animations, sound design, textures, screenshots, or source data. In particular:

- Capture uses a continuous, visible **Glimmerline** tether—not a thrown ball, capsule, or sphere.
- Creatures use new silhouettes built from unusual body plans, not familiar mascot anatomy or recolors.
- Facilities are handmade frontier objects with specific jobs, not copied industrial props or layouts.
- Progression uses an original spring-powered fantasy armament family, not a real-world firearm ladder.
- Generated art prompts describe only Wildkin Frontier's own shapes, palette, materials, mood, and composition; they never name a comparison title or artist.
- All geometry, UI, text, audio, recipes, and values are authored for this project. Third-party game assets are never downloaded, traced, or used as generation references.

Similarity test: if a player could identify a specific external character, prop, UI panel, or location from a still image with the title hidden, revise it. Generic genre recognition is acceptable; product-specific recognition is not.

## Eight-to-twelve-minute golden path

| Target time | Player beat | New proof / reward | Pacing guardrail |
|---|---|---|---|
| 0:00–0:45 | Wake at the broken Wayfarer Beacon; gather loose wood, stone, fiber, and fruit | First recipe and nearby camp silhouette become readable | Resources sit in a 20 m teaching ring; no modal tutorial |
| 0:45–1:40 | Craft the Wooden Springcaster and Glimmerline spool; eat once | Ranged combat, hunger relief, capture prompt | Recipes highlight exact shortages; starter food restores generously |
| 1:40–3:00 | Enter the Sunmeadow, weaken and tether the first Wildkin | First companion follows and fights | First target is docile, isolated, and reliably bonds below 35% health |
| 3:00–4:10 | Place Hearthbench, Field Cache, Nibble Trough, and Sunpatch; assign the companion | A visible worker cycle deposits the first resource stack | Ghost placement is forgiving; worker path is short and never blocked by décor |
| 4:10–5:20 | Gather in Flintwash, capture a complementary second adult, collect worker output | Automation loop and two-creature choice become clear | Quest hint names the needed aptitude, not a mandatory species |
| 5:20–6:20 | Build Nestbloom; feed and pair two compatible adults | Nursery countdown starts; parent trait preview appears | Any female/male adult pairing in this slice is compatible; timer rolls 45–75 s deterministically per save |
| 6:20–7:30 | Craft Stonebolt Launcher; mine ore and build Emberbell Forge | Harder-hitting weapon and ore-to-steel handoff | Forge recipe uses one short ore trip; companion work can satisfy part of it |
| 7:05–8:15 | Welcome the baby and inspect mixed color, stats, temperament, and aptitude | Breeding promise is visibly fulfilled | Baby appears small near the Nestbloom and reaches work-ready growth quickly |
| 8:00–9:30 | Collect forged steel and craft Steel Repeater | Final power spike; beacon objective unlocks | No random rare drop; UI reserves steel for the required recipe |
| 9:00–11:00 | Cross Stormscar, dodge hazards, defeat the Stormhollow, restore the beacon | Victory panel, healed island light, sandbox unlock | Guardian fight targets 60–100 s; failure respawns at camp with progress intact |
| 11:00+ | Continue building, breeding, collecting, and exploring | Open-ended sandbox | Quest UI collapses; nothing auto-resets after victory |

Parallel progress is intentional: the nursery timer runs while ore is gathered and forged, and base workers continue during exploration. A blind player may finish around minute 11; a repeat player can finish near minute 8 without exploits.

## Original game vocabulary

### Wildkin

| Name | Silhouette and temperament | Field attack | Work aptitude |
|---|---|---|---|
| **Burramble** | Low hexapod inside an open wicker-seed shell; busy and social | Short-range bristle fan | Harvests fiber and tends the Sunpatch |
| **Flintusk** | Wedge-bodied quadruped with tuning-fork tusks and three slate plates; stubborn | Short tell into a ground-skimming stone charge | Mines stone and ore |
| **Coaloon** | Balloon-bellied tripod with a glowing chimney crest; shy but industrious | Puffs an arcing ember projectile | Fans the Emberbell Forge |
| **Wickerwing** | Broad woven glider with hooked feet and one long vane; watchful | Swoops through a clearly telegraphed vane rake | Gathers Sunbark and fiber at the Hearthbench |
| **Rippletail** | Flat, kite-shaped amphibian with four feet and two ribbon tails; curious | Sideways water-ribbon projectile | Waters crops and hauls nearby drops |
| **Stormhollow** | Guardian: tall, faceless ring-body of dark wood with orbiting stone chimes | Telegraphs wind rings, chime volleys, and a radial stomp | Not capturable; defeating it powers the beacon |

All five ordinary Wildkin are cross-species Nestbloom-compatible in the vertical slice when paired female/male. The baby's body plan is selected from either parent; palette is blended from both; each stat comes from one parent with a small seeded variance; one temperament tendency and one work aptitude are inherited. This is deliberately simple, visible, and deterministic enough to test.

### Tools and weapons

- **Glimmerline** — wrist windlass that projects two braided light strands. Holding `C` on a weakened target tightens three visible knots; breaking line of sight loosens them. Success recruits the creature directly to the roster.
- **Wooden Springcaster** — quiet bent-wood pellet arm with a leaf-shaped magazine; quick, low damage, hand-crafted from starter materials.
- **Stonebolt Launcher** — Hearthbench weapon with a chunky flywheel and knapped bolts; slower and harder hitting than the wooden tier.
- **Steel Repeater** — Emberbell-forged final weapon with a visible three-chamber cadence; accurate burst fire and a bright brass/teal completion flourish.

### Structures

- **Hearthbench** *(Workbench)* — stump, vise, and hanging tool roll; unlocks advanced recipes.
- **Field Cache** *(Storage Bin)* — open-lid slat chest whose front counter shows uncollected deposits.
- **Nibble Trough** *(Feeder)* — divided food tray; fed status improves worker pace.
- **Nestbloom** *(Nursery)* — woven canopy around two parent pads and a central sprouting cradle.
- **Sunpatch** *(Farm)* — four raised soil beds with a small irrigation wheel.
- **Emberbell Forge** *(Forge)* — bell-shaped clay furnace with a foot bellows and visible ingot tray.
- **Wayfarer Beacon** — broken camp landmark and final victory device, restored with the Stormhollow's chime-core.

## Art direction and token system

**Thesis:** a sun-warmed field journal brought to life as a tactile low-poly diorama. Surfaces are matte and imperfect; technology looks improvised from wood, cord, stone, ceramic, and small pieces of metal. The mood is hopeful frontier craft, never militarized industry.

| Token | Value / rule |
|---|---|
| `ink` | `#132733` — text, outlines, deep shadow |
| `parchment` | `#F4E8C8` — panels and readable highlights |
| `leaf` | `#638E57` — friendly nature / health |
| `new-growth` | `#9BC76B` — success and interactable accents |
| `sun` | `#F2B64B` — quests, crafting readiness, warmth |
| `clay` | `#D96F50` — damage, hunger warning, fired ceramic |
| `river` | `#4AA4AC` — stamina, Glimmerline, water |
| `slate` | `#6F7F86` — stone and inactive controls |
| `steel` | `#B8C9C5` — final-tier material |
| `night-veil` | `rgba(12, 27, 36, 0.82)` — overlays without opaque black |
| Spacing | `4 / 8 / 12 / 16 / 24 / 32 px`; HUD gaps use 8 or 12 |
| Corners | 6 px for slots, 12 px for panels, 999 px only for meters/chips |
| Type | Headings: `Avenir Next, Trebuchet MS, sans-serif`; body: `Inter, system-ui, sans-serif`; use weight and case, not novelty fonts |
| Motion | 110 ms input response, 180 ms HUD transition, 360 ms reward flourish; no continuous UI bobbing |

World geometry uses faceted shapes with strong silhouettes and no black cartoon outline. Each Wildkin gets one dominant primitive and one asymmetrical feature; eyes are small amber or teal insets rather than oversized mascot faces. Structures use trapezoids, lashings, tool silhouettes, and exposed moving parts. Friendly effects are braided arcs and leaf-like motes; danger effects are angular clay-red shards; capture feedback never forms a sphere.

Lighting moves from warm cream sunlight and cool teal distance fog in Sunmeadow, through pale slate reflections in Flintwash, to deep blue wind and amber sparks in Stormscar. Keep value contrast strong enough that resources, workers, and projectiles read at 1280×720.

Generated image set: one 16:9 title key art, one vertical field-guide plate with five Wildkin portraits, and one square UI parchment texture (paper grain, braided line, tool marks). Prompts include the palette and exact original silhouettes above, request clean low-poly editorial illustration, exclude text, and contain no franchise, studio, artist, or copyrighted character names. The resulting files and normalized prompts are recorded in asset provenance.

Audio follows the same material grammar: dry wood clicks, cord twangs, ceramic knocks, soft stone scrapes, airy chimes, and brief warm synth pads. Creature calls should reflect body construction—wicker rustle, resonant slate, bellows puff, water trill—so work can be understood even when off-center.
