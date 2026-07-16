/**
 * Wildkin Frontier's renderer-independent game rules.
 *
 * Every function in this module is deterministic for the same arguments. State
 * transitions return new objects so the browser can autosave, replay, and test
 * the ten-minute golden path without depending on Three.js or wall-clock time.
 */

export const SAVE_VERSION = 2;
export const PROGRESS_SCHEMA_VERSION = 1;

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const round3 = (value) => Math.round(value * 1000) / 1000;
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const clone = (value) => JSON.parse(JSON.stringify(value));

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

export const RESOURCE_DEFINITIONS = deepFreeze({
  wood: { id: 'wood', name: 'Sunbark', category: 'gathered', area: 'Sunmeadow' },
  stone: { id: 'stone', name: 'Cloudstone', category: 'gathered', area: 'Flintwash' },
  fiber: { id: 'fiber', name: 'Twistgrass', category: 'gathered', area: 'Sunmeadow' },
  food: { id: 'food', name: 'Sunfruit', category: 'gathered', area: 'Sunmeadow' },
  ore: { id: 'ore', name: 'Star-iron Ore', category: 'gathered', area: 'Flintwash' },
  steel: { id: 'steel', name: 'Bloomsteel', category: 'refined', area: null }
});

export const STRUCTURE_DEFINITIONS = deepFreeze({
  workbench: { id: 'workbench', name: 'Hearthbench', stationTags: ['workbench'] },
  storage_bin: { id: 'storage_bin', name: 'Field Cache', stationTags: ['storage'] },
  feeder: { id: 'feeder', name: 'Nibble Trough', stationTags: ['feeder'] },
  farm: { id: 'farm', name: 'Sunpatch', stationTags: ['farm'] },
  forge: { id: 'forge', name: 'Emberbell Forge', stationTags: ['forge'] },
  nursery: { id: 'nursery', name: 'Nestbloom', stationTags: ['nursery'] },
  beacon: { id: 'beacon', name: 'Wayfarer Beacon', stationTags: ['beacon'] }
});

export const WEAPON_TIERS = deepFreeze([
  {
    tier: 1,
    id: 'wooden_springcaster',
    name: 'Wooden Springcaster',
    damage: 12,
    cadenceMs: 720,
    range: 22,
    stagger: 0.12,
    recipeId: 'wooden_springcaster'
  },
  {
    tier: 2,
    id: 'stonebolt_launcher',
    name: 'Stonebolt Launcher',
    damage: 27,
    cadenceMs: 900,
    range: 34,
    stagger: 0.3,
    recipeId: 'stonebolt_launcher'
  },
  {
    tier: 3,
    id: 'steel_repeater',
    name: 'Steel Repeater',
    damage: 21,
    cadenceMs: 260,
    range: 46,
    stagger: 0.2,
    recipeId: 'steel_repeater'
  }
]);

export const SPECIES_DEFINITIONS = deepFreeze({
  burramble: {
    id: 'burramble',
    name: 'Burramble',
    silhouette: 'low hexapod inside an open wicker-seed shell',
    temperament: 'busy',
    captureBase: 0.23,
    compatibilityGroup: 'sunwoken',
    work: { skill: 'ranching', stationTag: 'farm', cycleMs: 9000, outputs: [{ fiber: 2 }, { food: 2 }] },
    attack: { name: 'Bristle Fan', damage: 7, cooldownMs: 1600 }
  },
  flintusk: {
    id: 'flintusk',
    name: 'Flintusk',
    silhouette: 'wedge-bodied quadruped with tuning-fork tusks',
    temperament: 'stubborn',
    captureBase: 0.16,
    compatibilityGroup: 'sunwoken',
    work: { skill: 'mining', stationTag: 'forge', cycleMs: 10500, outputs: [{ stone: 2 }, { ore: 1 }] },
    attack: { name: 'Stone Charge', damage: 13, cooldownMs: 2200 }
  },
  coaloon: {
    id: 'coaloon',
    name: 'Coaloon',
    silhouette: 'balloon-bellied tripod with a chimney crest',
    temperament: 'shy',
    captureBase: 0.14,
    compatibilityGroup: 'sunwoken',
    work: { skill: 'kindling', stationTag: 'forge', cycleMs: 11000, outputs: [{ ore: 1 }, { stone: 1, ore: 1 }] },
    attack: { name: 'Ember Puff', damage: 16, cooldownMs: 2500 }
  },
  wickerwing: {
    id: 'wickerwing',
    name: 'Wickerwing',
    silhouette: 'broad woven glider with hooked feet and one long vane',
    temperament: 'watchful',
    captureBase: 0.19,
    compatibilityGroup: 'sunwoken',
    work: { skill: 'logging', stationTag: 'workbench', cycleMs: 9500, outputs: [{ wood: 2 }, { wood: 1, fiber: 1 }] },
    attack: { name: 'Vane Rake', damage: 10, cooldownMs: 1800 }
  },
  rippletail: {
    id: 'rippletail',
    name: 'Rippletail',
    silhouette: 'flat kite-shaped amphibian with two ribbon tails',
    temperament: 'gentle',
    captureBase: 0.26,
    compatibilityGroup: 'sunwoken',
    work: { skill: 'transporting', stationTag: 'storage', cycleMs: 8500, outputs: [{ food: 1 }, { fiber: 1 }] },
    attack: { name: 'Water Ribbon', damage: 8, cooldownMs: 1400 }
  }
});

export const WORK_SKILL_DEFINITIONS = deepFreeze({
  ranching: { id: 'ranching', stationTag: 'farm', cycleMs: 9000, outputs: [{ fiber: 2 }, { food: 2 }] },
  mining: { id: 'mining', stationTag: 'forge', cycleMs: 10500, outputs: [{ stone: 2 }, { ore: 1 }] },
  kindling: { id: 'kindling', stationTag: 'forge', cycleMs: 11000, outputs: [{ ore: 1 }, { stone: 1, ore: 1 }] },
  logging: { id: 'logging', stationTag: 'workbench', cycleMs: 9500, outputs: [{ wood: 2 }, { wood: 1, fiber: 1 }] },
  transporting: { id: 'transporting', stationTag: 'storage', cycleMs: 8500, outputs: [{ food: 1 }, { fiber: 1 }] }
});

export const RECIPE_DEFINITIONS = deepFreeze({
  workbench: {
    id: 'workbench', name: 'Hearthbench', costs: { wood: 6, stone: 4 },
    output: { kind: 'structure', id: 'workbench', count: 1 }, stationTags: []
  },
  storage_bin: {
    id: 'storage_bin', name: 'Field Cache', costs: { wood: 6, fiber: 2 },
    output: { kind: 'structure', id: 'storage_bin', count: 1 }, stationTags: []
  },
  wooden_springcaster: {
    id: 'wooden_springcaster', name: 'Wooden Springcaster', costs: { wood: 5, fiber: 3 },
    output: { kind: 'weapon', id: 'wooden_springcaster', count: 1 }, stationTags: []
  },
  lumen_tether: {
    id: 'lumen_tether', name: 'Glimmerline Spool', costs: { fiber: 3, stone: 1 },
    output: { kind: 'tool', id: 'lumen_tether', count: 2 }, stationTags: []
  },
  feeder: {
    id: 'feeder', name: 'Nibble Trough', costs: { wood: 3, food: 2 },
    output: { kind: 'structure', id: 'feeder', count: 1 }, stationTags: []
  },
  farm: {
    id: 'farm', name: 'Sunpatch', costs: { wood: 4, fiber: 4, stone: 2 },
    output: { kind: 'structure', id: 'farm', count: 1 }, stationTags: []
  },
  stonebolt_launcher: {
    id: 'stonebolt_launcher', name: 'Stonebolt Launcher', costs: { wood: 6, stone: 8, fiber: 3 },
    output: { kind: 'weapon', id: 'stonebolt_launcher', count: 1 }, stationTags: ['workbench']
  },
  forge: {
    id: 'forge', name: 'Emberbell Forge', costs: { stone: 10, wood: 4, ore: 3 },
    output: { kind: 'structure', id: 'forge', count: 1 }, stationTags: ['workbench']
  },
  nursery: {
    id: 'nursery', name: 'Nestbloom', costs: { wood: 8, stone: 4, fiber: 6, food: 4 },
    output: { kind: 'structure', id: 'nursery', count: 1 }, stationTags: ['workbench']
  },
  steel_ingot: {
    id: 'steel_ingot', name: 'Bloomsteel Ingot', costs: { ore: 2, wood: 1 },
    output: { kind: 'resource', id: 'steel', count: 1 }, stationTags: ['forge']
  },
  steel_repeater: {
    id: 'steel_repeater', name: 'Steel Repeater', costs: { wood: 6, steel: 5, fiber: 4 },
    output: { kind: 'weapon', id: 'steel_repeater', count: 1 }, stationTags: ['forge', 'workbench'],
    requiredItems: { 'weapon:stonebolt_launcher': 1 }
  },
  beacon: {
    id: 'beacon', name: 'Wayfarer Beacon', costs: { stone: 12, steel: 5 },
    output: { kind: 'structure', id: 'beacon', count: 1 }, stationTags: ['forge']
  }
});

export const INITIAL_RECIPE_UNLOCKS = deepFreeze([
  'workbench', 'storage_bin', 'wooden_springcaster', 'lumen_tether'
]);

export const QUEST_DEFINITIONS = deepFreeze([
  {
    id: 'shorebound',
    title: 'What the Tide Left',
    hint: 'Gather Sunbark, Cloudstone, Twistgrass, and Sunfruit.',
    criteria: [
      { counter: 'gathered.wood', amount: 6 },
      { counter: 'gathered.stone', amount: 4 },
      { counter: 'gathered.fiber', amount: 3 },
      { counter: 'gathered.food', amount: 2 }
    ]
  },
  {
    id: 'first_mechanism',
    title: 'A Clever Branch',
    hint: 'Make a Springcaster and place a Hearthbench.',
    criteria: [
      { counter: 'crafted.wooden_springcaster', amount: 1 },
      { counter: 'placed.workbench', amount: 1 }
    ]
  },
  {
    id: 'first_friend',
    title: 'A Gentle Tether',
    hint: 'Weaken a Wildkin, then hold C to braid a Glimmerline bond.',
    criteria: [{ counter: 'captured', amount: 1 }]
  },
  {
    id: 'living_camp',
    title: 'A Camp That Breathes',
    hint: 'Place a cache, trough, and garden; assign a wildkin.',
    criteria: [
      { counter: 'placed.storage_bin', amount: 1 },
      { counter: 'placed.feeder', amount: 1 },
      { counter: 'placed.farm', amount: 1 },
      { counter: 'workersAssigned', amount: 1 }
    ]
  },
  {
    id: 'shared_harvest',
    title: 'Shared Harvest',
    hint: 'Let a helper deliver supplies, then collect them.',
    criteria: [{ counter: 'workerCollected', amount: 1 }]
  },
  {
    id: 'new_leaf',
    title: 'A New Leaf',
    hint: 'Build a Nestbloom and welcome a baby Wildkin.',
    criteria: [
      { counter: 'placed.nursery', amount: 1 },
      { counter: 'babiesBorn', amount: 1 }
    ]
  },
  {
    id: 'bloomsteel_age',
    title: 'The Bloomsteel Age',
    hint: 'Refine Star-iron and make a Steel Repeater.',
    criteria: [{ counter: 'crafted.steel_repeater', amount: 1 }]
  },
  {
    id: 'wake_the_peak',
    title: 'Wake the Peak',
    hint: 'Defeat the old island guardian.',
    criteria: [{ counter: 'guardianDefeated', amount: 1 }]
  },
  {
    id: 'dawncall',
    title: 'The Wayfarer’s Song',
    hint: 'Activate the beacon. The island is yours to tend.',
    criteria: [{ counter: 'beaconActivated', amount: 1 }]
  }
]);

export function createInventory(capacity = 80, initialItems = {}) {
  if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('Inventory capacity must be a positive integer.');
  const items = {};
  for (const [itemId, amount] of Object.entries(initialItems ?? {})) {
    if (!Number.isInteger(amount) || amount < 0) throw new RangeError(`Invalid amount for ${itemId}.`);
    if (amount > 0) items[itemId] = amount;
  }
  if (Object.values(items).reduce((sum, amount) => sum + amount, 0) > capacity) {
    throw new RangeError('Initial items exceed inventory capacity.');
  }
  return { capacity, items };
}

export function inventoryCount(inventory, itemId) {
  return inventory?.items?.[itemId] ?? 0;
}

export function inventoryUsed(inventory) {
  return Object.values(inventory?.items ?? {}).reduce((sum, amount) => sum + amount, 0);
}

export function inventoryMissing(inventory, costs = {}) {
  const missing = {};
  for (const [itemId, amount] of Object.entries(costs)) {
    const deficit = amount - inventoryCount(inventory, itemId);
    if (deficit > 0) missing[itemId] = deficit;
  }
  return missing;
}

export function inventoryHas(inventory, costs = {}) {
  return Object.keys(inventoryMissing(inventory, costs)).length === 0;
}

export function addInventoryItem(inventory, itemId, amount = 1) {
  if (!itemId || !Number.isInteger(amount) || amount < 0) throw new RangeError('Item amount must be a non-negative integer.');
  const next = { capacity: inventory.capacity, items: { ...inventory.items } };
  const accepted = Math.min(amount, Math.max(0, inventory.capacity - inventoryUsed(inventory)));
  if (accepted > 0) next.items[itemId] = inventoryCount(next, itemId) + accepted;
  return { inventory: next, accepted, remainder: amount - accepted };
}

export function removeInventoryItems(inventory, costs = {}) {
  const missing = inventoryMissing(inventory, costs);
  if (Object.keys(missing).length > 0) return { ok: false, inventory, missing };
  const next = { capacity: inventory.capacity, items: { ...inventory.items } };
  for (const [itemId, amount] of Object.entries(costs)) {
    const remaining = (next.items[itemId] ?? 0) - amount;
    if (remaining > 0) next.items[itemId] = remaining;
    else delete next.items[itemId];
  }
  return { ok: true, inventory: next, missing: {} };
}

export function recipeOutputItemId(recipeOrId) {
  const recipe = typeof recipeOrId === 'string' ? RECIPE_DEFINITIONS[recipeOrId] : recipeOrId;
  if (!recipe) return null;
  return recipe.output.kind === 'resource' ? recipe.output.id : `${recipe.output.kind}:${recipe.output.id}`;
}

export function isRecipeUnlocked(progress, recipeId) {
  return Boolean(progress?.unlockedRecipes?.includes(recipeId));
}

/**
 * @param {string} recipeId
 * @param {{ inventory?: any, progress?: any, stationTags?: string[] }} [options]
 */
export function evaluateRecipe(recipeId, { inventory, progress, stationTags = [] } = {}) {
  const recipe = RECIPE_DEFINITIONS[recipeId];
  if (!recipe) return { ok: false, reason: 'unknown-recipe', missing: {} };
  if (progress && !isRecipeUnlocked(progress, recipeId)) {
    return { ok: false, reason: 'locked', missing: {} };
  }
  const absentStations = recipe.stationTags.filter((tag) => !stationTags.includes(tag));
  if (absentStations.length > 0) {
    return { ok: false, reason: 'station-required', missing: {}, absentStations };
  }
  const missingRequirements = inventoryMissing(inventory, recipe.requiredItems ?? {});
  if (Object.keys(missingRequirements).length > 0) {
    return { ok: false, reason: 'item-required', missing: {}, missingRequirements, absentStations: [] };
  }
  const missing = inventoryMissing(inventory, recipe.costs);
  if (Object.keys(missing).length > 0) return { ok: false, reason: 'resources', missing };
  return { ok: true, reason: null, missing: {}, absentStations: [] };
}

export function craftRecipe(inventory, recipeId, context = {}) {
  const evaluation = evaluateRecipe(recipeId, { ...context, inventory });
  if (!evaluation.ok) return { ...evaluation, inventory, crafted: null };
  const recipe = RECIPE_DEFINITIONS[recipeId];
  const removed = removeInventoryItems(inventory, recipe.costs);
  const itemId = recipeOutputItemId(recipe);
  const added = addInventoryItem(removed.inventory, itemId, recipe.output.count);
  if (added.remainder > 0) {
    return { ok: false, reason: 'inventory-full', missing: {}, inventory, crafted: null };
  }
  return {
    ok: true,
    reason: null,
    missing: {},
    inventory: added.inventory,
    crafted: { ...recipe.output, itemId }
  };
}

export function weaponById(weaponId) {
  return WEAPON_TIERS.find((weapon) => weapon.id === weaponId) ?? null;
}

export function nextWeaponTier(weaponId = null) {
  if (weaponId === null) return WEAPON_TIERS[0];
  const index = WEAPON_TIERS.findIndex((weapon) => weapon.id === weaponId);
  return index >= 0 ? (WEAPON_TIERS[index + 1] ?? null) : null;
}

export function stableHash32(value) {
  const string = String(value);
  let hash = 2166136261;
  for (let index = 0; index < string.length; index += 1) {
    hash ^= string.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  return hash >>> 0;
}

export function seededUnit(seed, key = '') {
  let value = stableHash32(`${seed}:${key}`);
  value += 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export function captureChance({
  speciesId,
  currentHealth,
  maxHealth,
  tetherPower = 1,
  attempt = 1,
  calmBonus = 0
}) {
  const species = SPECIES_DEFINITIONS[speciesId];
  if (!species) throw new RangeError(`Unknown species: ${speciesId}`);
  if (!(maxHealth > 0) || currentHealth < 0) throw new RangeError('Capture health values are invalid.');
  const healthRatio = clamp(currentHealth / maxHealth, 0, 1);
  const weakenedBonus = (1 - healthRatio) * 0.56;
  const tetherBonus = Math.max(0, tetherPower - 1) * 0.08;
  const persistenceBonus = Math.max(0, attempt - 1) * 0.055;
  return round3(clamp(species.captureBase + weakenedBonus + tetherBonus + persistenceBonus + calmBonus, 0.05, 0.94));
}

/**
 * Resolve one tether cast. `forceOutcome(context)` may return true/false for a
 * scripted sequence; null/undefined falls through. `tutorialSafety(context)`
 * can replace the default second-attempt guarantee used for the first capture.
 * `roll(context)` injects replay/test randomness while retaining the same API.
 */
export function resolveCapture(input, hooks = {}) {
  const chance = captureChance(input);
  const healthRatio = clamp(input.currentHealth / input.maxHealth, 0, 1);
  const context = { ...input, chance, healthRatio };
  const forced = typeof hooks.forceOutcome === 'function' ? hooks.forceOutcome(context) : undefined;
  const defaultTutorialSafety = Boolean(
    input.tutorialMode && !input.hasCapturedAny && healthRatio <= 0.35 && input.attempt >= 2
  );
  const tutorialGuaranteed = typeof hooks.tutorialSafety === 'function'
    ? Boolean(hooks.tutorialSafety(context))
    : defaultTutorialSafety;
  const roll = typeof hooks.roll === 'function'
    ? clamp(Number(hooks.roll(context)), 0, 0.999999999)
    : seededUnit(input.seed ?? 0, `${input.creatureId ?? input.speciesId}:capture:${input.attempt ?? 1}`);
  const success = typeof forced === 'boolean' ? forced : tutorialGuaranteed || roll < chance;
  return {
    success,
    chance,
    roll: round3(roll),
    tutorialGuaranteed: typeof forced === 'boolean' ? false : tutorialGuaranteed,
    reason: typeof forced === 'boolean'
      ? 'scripted'
      : tutorialGuaranteed
        ? 'tutorial-safety'
        : success ? 'chance' : 'escaped'
  };
}

function workerOutputFor(worker, species, cycleIndex) {
  const work = WORK_SKILL_DEFINITIONS[worker.skill] ?? species.work;
  return clone(work.outputs[cycleIndex % work.outputs.length]);
}

/**
 * @param {{ id: string, creatureId: string, speciesId: string, stationId: string, storageId?: string, workRate?: number, workSkill?: string }} worker
 */
export function createWorker({ id, creatureId, speciesId, stationId, storageId = 'base-cache', workRate = 1, workSkill }) {
  const species = SPECIES_DEFINITIONS[speciesId];
  if (!species) throw new RangeError(`Unknown worker species: ${speciesId}`);
  const resolvedSkill = WORK_SKILL_DEFINITIONS[workSkill] ? workSkill : species.work.skill;
  return {
    id,
    creatureId,
    speciesId,
    skill: resolvedSkill,
    stationId,
    storageId,
    mode: 'traveling-to-job',
    phaseMs: 0,
    hunger: 100,
    carried: null,
    cycles: 0,
    completedDeliveries: 0,
    workRate: clamp(workRate, 0.25, 3)
  };
}

/** Advance a worker and emit deposits instead of mutating a storage inventory. */
export function advanceWorker(worker, deltaMs, context = {}) {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new RangeError('Worker delta must be non-negative.');
  const species = SPECIES_DEFINITIONS[worker.speciesId];
  if (!species) throw new RangeError(`Unknown worker species: ${worker.speciesId}`);
  const next = clone(worker);
  const work = WORK_SKILL_DEFINITIONS[next.skill] ?? species.work;
  const events = [];
  const deposits = {};
  const travelMs = Math.max(100, context.travelMs ?? 1200);
  const feederTravelMs = Math.max(100, context.feederTravelMs ?? travelMs);
  const eatingMs = Math.max(250, context.eatingMs ?? 650);
  const depositMs = Math.max(50, context.depositMs ?? 350);
  const cycleMs = Math.max(500, (context.cycleMs ?? work.cycleMs) / next.workRate);
  next.hunger = round3(clamp(next.hunger - deltaMs * (context.hungerPerSecond ?? 0.12) / 1000, 0, 100));

  const feeding = () => next.mode === 'traveling-to-feeder' || next.mode === 'eating';
  if (next.hunger <= 15 && !feeding()) {
    if ((context.feederFood ?? 0) <= 0) {
      next.mode = 'hungry';
      next.phaseMs = 0;
      return { worker: next, events, deposits };
    }
    next.mode = 'traveling-to-feeder';
    next.phaseMs = 0;
    events.push({ type: 'worker-seeking-food', workerId: next.id });
  } else if (next.mode === 'hungry') {
    if ((context.feederFood ?? 0) <= 0) return { worker: next, events, deposits };
    next.mode = 'traveling-to-feeder';
    next.phaseMs = 0;
    events.push({ type: 'worker-seeking-food', workerId: next.id });
  }
  if (!feeding() && context.stationOperational === false && !next.carried) {
    next.mode = 'idle-no-station';
    next.phaseMs = 0;
    return { worker: next, events, deposits };
  }
  if (next.mode === 'idle-no-station') next.mode = 'traveling-to-job';
  if (next.mode === 'waiting-for-storage' && context.storageHasSpace !== false) next.mode = 'depositing';

  let remaining = deltaMs;
  let transitions = 0;
  while (remaining > 0 && transitions < 256) {
    transitions += 1;
    let duration;
    switch (next.mode) {
      case 'traveling-to-job': duration = travelMs; break;
      case 'working': duration = cycleMs; break;
      case 'traveling-to-storage': duration = travelMs; break;
      case 'depositing': duration = depositMs; break;
      case 'traveling-to-feeder': duration = feederTravelMs; break;
      case 'eating': duration = eatingMs; break;
      case 'waiting-for-storage':
      case 'hungry':
      case 'idle-no-station':
        remaining = 0;
        continue;
      default:
        next.mode = next.carried ? 'traveling-to-storage' : 'traveling-to-job';
        next.phaseMs = 0;
        continue;
    }
    const needed = Math.max(0, duration - next.phaseMs);
    const consumed = Math.min(remaining, needed);
    next.phaseMs += consumed;
    remaining -= consumed;
    if (next.phaseMs + 1e-7 < duration) continue;
    next.phaseMs = 0;
    if (next.mode === 'traveling-to-job') {
      next.mode = 'working';
      events.push({ type: 'worker-arrived-job', workerId: next.id, stationId: next.stationId });
    } else if (next.mode === 'working') {
      next.carried = workerOutputFor(next, species, next.cycles);
      next.cycles += 1;
      next.mode = 'traveling-to-storage';
      events.push({ type: 'worker-produced', workerId: next.id, items: clone(next.carried) });
    } else if (next.mode === 'traveling-to-storage') {
      next.mode = context.storageHasSpace === false ? 'waiting-for-storage' : 'depositing';
      events.push({ type: 'worker-arrived-storage', workerId: next.id, storageId: next.storageId });
      if (next.mode === 'waiting-for-storage') remaining = 0;
    } else if (next.mode === 'depositing') {
      for (const [itemId, amount] of Object.entries(next.carried ?? {})) {
        deposits[itemId] = (deposits[itemId] ?? 0) + amount;
      }
      events.push({ type: 'worker-deposit', workerId: next.id, storageId: next.storageId, items: clone(next.carried ?? {}) });
      next.carried = null;
      next.completedDeliveries += 1;
      next.mode = 'traveling-to-job';
    } else if (next.mode === 'traveling-to-feeder') {
      next.mode = 'eating';
      events.push({ type: 'worker-arrived-feeder', workerId: next.id });
    } else if (next.mode === 'eating') {
      if ((context.feederFood ?? 0) <= 0) {
        next.mode = 'hungry';
      } else {
        next.hunger = clamp(next.hunger + (context.foodRestore ?? 70), 0, 100);
        events.push({ type: 'worker-ate', workerId: next.id, amount: 1 });
        next.mode = next.carried ? 'traveling-to-storage' : 'traveling-to-job';
      }
    }
  }
  return { worker: next, events, deposits };
}

export function parentsAreCompatible(parentA, parentB) {
  if (!parentA || !parentB || parentA.id === parentB.id) return false;
  if (parentA.ageStage !== 'adult' || parentB.ageStage !== 'adult') return false;
  if (!['female', 'male'].includes(parentA.sex) || !['female', 'male'].includes(parentB.sex) || parentA.sex === parentB.sex) return false;
  const speciesA = SPECIES_DEFINITIONS[parentA.speciesId];
  const speciesB = SPECIES_DEFINITIONS[parentB.speciesId];
  return Boolean(speciesA && speciesB && speciesA.compatibilityGroup === speciesB.compatibilityGroup);
}

function channel(hex, offset) {
  return Number.parseInt(hex.slice(offset, offset + 2), 16);
}

function blendedColor(colorA = '#8acb78', colorB = '#efad67', jitter = 0) {
  const a = /^#[0-9a-f]{6}$/i.test(colorA) ? colorA : '#8acb78';
  const b = /^#[0-9a-f]{6}$/i.test(colorB) ? colorB : '#efad67';
  const channels = [1, 3, 5].map((offset) => clamp(Math.round((channel(a, offset) + channel(b, offset)) / 2 + jitter), 0, 255));
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export function inheritOffspring(parentA, parentB, { seed = 0, babyId = 'baby-1', maturityDurationMs = 45000 } = {}) {
  if (!parentsAreCompatible(parentA, parentB)) throw new RangeError('Parents are not compatible adults.');
  const pick = (key) => seededUnit(seed, `${babyId}:${key}`);
  const speciesId = pick('species') < 0.5 ? parentA.speciesId : parentB.speciesId;
  const statKeys = new Set([...Object.keys(parentA.stats ?? {}), ...Object.keys(parentB.stats ?? {})]);
  const stats = {};
  for (const key of statKeys) {
    const source = pick(`stat-source:${key}`) < 0.5 ? parentA : parentB;
    const fallback = source === parentA ? parentB : parentA;
    const base = Number(source.stats?.[key] ?? fallback.stats?.[key] ?? 1);
    const mutation = Math.floor(pick(`stat-mutation:${key}`) * 5) - 2;
    stats[key] = clamp(Math.round(base + mutation), 1, 100);
  }
  const workSkill = pick('work-skill') < 0.5
    ? (parentA.workSkill ?? SPECIES_DEFINITIONS[parentA.speciesId].work.skill)
    : (parentB.workSkill ?? SPECIES_DEFINITIONS[parentB.speciesId].work.skill);
  const temperament = pick('temperament') < 0.5
    ? (parentA.temperament ?? SPECIES_DEFINITIONS[parentA.speciesId].temperament)
    : (parentB.temperament ?? SPECIES_DEFINITIONS[parentB.speciesId].temperament);
  const colorJitter = Math.floor(pick('color') * 17) - 8;
  return {
    id: babyId,
    speciesId,
    parentIds: [parentA.id, parentB.id],
    color: blendedColor(parentA.color, parentB.color, colorJitter),
    stats,
    workSkill,
    temperament,
    ageStage: 'baby',
    ageMs: 0,
    maturityDurationMs: clamp(maturityDurationMs, 30000, 90000),
    scale: 0.55
  };
}

/**
 * @param {any} parentA
 * @param {any} parentB
 * @param {{ seed?: number, nurseryId?: string, availableFood?: number, durationMs?: number, sessionId?: string }} [options]
 */
export function startBreeding(parentA, parentB, {
  seed = 0,
  nurseryId = 'moon-nest-1',
  availableFood = 0,
  durationMs,
  sessionId
} = {}) {
  if (!parentsAreCompatible(parentA, parentB)) return { ok: false, reason: 'incompatible-parents', foodConsumed: 0, session: null };
  if (availableFood < 4) return { ok: false, reason: 'food-required', foodConsumed: 0, session: null };
  const id = sessionId ?? `brood-${stableHash32(`${seed}:${parentA.id}:${parentB.id}:${nurseryId}`).toString(36)}`;
  const resolvedDuration = durationMs ?? 45000 + Math.floor(seededUnit(seed, `${id}:duration`) * 30001);
  return {
    ok: true,
    reason: null,
    foodConsumed: 4,
    session: {
      id,
      nurseryId,
      seed,
      parentIds: [parentA.id, parentB.id],
      elapsedMs: 0,
      durationMs: clamp(resolvedDuration, 45000, 75000),
      status: 'incubating',
      produced: false
    }
  };
}

/**
 * @param {any} session
 * @param {number} deltaMs
 * @param {{ parentA?: any, parentB?: any, babyId?: string }} [options]
 */
export function advanceBreeding(session, deltaMs, { parentA, parentB, babyId } = {}) {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new RangeError('Breeding delta must be non-negative.');
  if (session.produced || session.status === 'complete') return { session: clone(session), baby: null, completed: true };
  const next = clone(session);
  next.elapsedMs = Math.min(next.durationMs, next.elapsedMs + deltaMs);
  if (next.elapsedMs < next.durationMs) return { session: next, baby: null, completed: false };
  const baby = inheritOffspring(parentA, parentB, {
    seed: next.seed,
    babyId: babyId ?? `${next.id}-baby`
  });
  next.status = 'complete';
  next.produced = true;
  return { session: next, baby, completed: true };
}

export function advanceCreatureGrowth(creature, deltaMs) {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new RangeError('Growth delta must be non-negative.');
  const next = clone(creature);
  if (next.ageStage === 'adult') return next;
  next.ageMs = Math.min(next.maturityDurationMs, (next.ageMs ?? 0) + deltaMs);
  const progress = clamp(next.ageMs / next.maturityDurationMs, 0, 1);
  next.scale = round3(0.55 + progress * 0.45);
  if (progress >= 1) {
    next.ageStage = 'adult';
    next.scale = 1;
  }
  return next;
}

function blankCounters() {
  return {
    gathered: { wood: 0, stone: 0, fiber: 0, food: 0, ore: 0, steel: 0 },
    crafted: {},
    placed: {},
    captured: 0,
    workersAssigned: 0,
    workerCollected: 0,
    babiesBorn: 0,
    guardianDefeated: 0,
    beaconActivated: 0
  };
}

export function createProgressState() {
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    counters: blankCounters(),
    completedQuestIds: [],
    activeQuestId: QUEST_DEFINITIONS[0].id,
    unlockedRecipes: [...INITIAL_RECIPE_UNLOCKS],
    goldenPathStep: 0,
    victory: false
  };
}

function readCounter(counters, path) {
  return path.split('.').reduce((value, key) => value?.[key], counters) ?? 0;
}

function criteriaMet(counters, criteria) {
  return criteria.every(({ counter, amount }) => readCounter(counters, counter) >= amount);
}

function derivedRecipeUnlocks(counters) {
  const unlocked = new Set(INITIAL_RECIPE_UNLOCKS);
  if (counters.captured >= 1) ['feeder', 'farm'].forEach((id) => unlocked.add(id));
  if ((counters.placed.workbench ?? 0) >= 1) ['stonebolt_launcher', 'forge'].forEach((id) => unlocked.add(id));
  if (counters.workerCollected >= 1) unlocked.add('nursery');
  if ((counters.placed.forge ?? 0) >= 1) unlocked.add('steel_ingot');
  if (counters.babiesBorn >= 1) unlocked.add('beacon');
  if (counters.babiesBorn >= 1 && (counters.crafted.stonebolt_launcher ?? 0) >= 1) unlocked.add('steel_repeater');
  return [...unlocked];
}

function recalculateProgress(progress) {
  const completed = [];
  for (const quest of QUEST_DEFINITIONS) {
    if (!criteriaMet(progress.counters, quest.criteria)) break;
    completed.push(quest.id);
  }
  return {
    ...progress,
    completedQuestIds: completed,
    activeQuestId: QUEST_DEFINITIONS[completed.length]?.id ?? null,
    unlockedRecipes: derivedRecipeUnlocks(progress.counters),
    goldenPathStep: completed.length,
    victory: progress.counters.beaconActivated >= 1
  };
}

export function recordProgressEvent(progress, event) {
  const next = clone(progress);
  const amount = Number.isFinite(event.amount) && event.amount > 0 ? Math.floor(event.amount) : 1;
  switch (event.type) {
    case 'gather':
      if (!(event.resourceId in next.counters.gathered)) throw new RangeError(`Unknown gathered resource: ${event.resourceId}`);
      next.counters.gathered[event.resourceId] += amount;
      break;
    case 'craft':
      if (!RECIPE_DEFINITIONS[event.recipeId]) throw new RangeError(`Unknown crafted recipe: ${event.recipeId}`);
      next.counters.crafted[event.recipeId] = (next.counters.crafted[event.recipeId] ?? 0) + amount;
      break;
    case 'place':
      if (!STRUCTURE_DEFINITIONS[event.structureId]) throw new RangeError(`Unknown placed structure: ${event.structureId}`);
      next.counters.placed[event.structureId] = (next.counters.placed[event.structureId] ?? 0) + amount;
      break;
    case 'capture': next.counters.captured += amount; break;
    case 'assign-worker': next.counters.workersAssigned += amount; break;
    case 'collect-worker': next.counters.workerCollected += amount; break;
    case 'breed': next.counters.babiesBorn += amount; break;
    case 'defeat-guardian': next.counters.guardianDefeated += amount; break;
    case 'activate-beacon': next.counters.beaconActivated += amount; break;
    default: throw new RangeError(`Unknown progress event: ${event.type}`);
  }
  return recalculateProgress(next);
}

export function questSnapshot(progress) {
  const quest = QUEST_DEFINITIONS.find(({ id }) => id === progress.activeQuestId) ?? null;
  if (!quest) return { quest: null, objectives: [], complete: true };
  return {
    quest,
    objectives: quest.criteria.map((criterion) => ({
      ...criterion,
      current: readCounter(progress.counters, criterion.counter),
      complete: readCounter(progress.counters, criterion.counter) >= criterion.amount
    })),
    complete: false
  };
}

export function createGameState({ seed = 481516, inventoryCapacity = 80 } = {}) {
  return {
    seed,
    elapsedMs: 0,
    inventory: createInventory(inventoryCapacity),
    placedStructures: [],
    creatures: [],
    workers: [],
    breedingSessions: [],
    broodCount: 0,
    progress: createProgressState(),
    equippedWeapon: null,
    player: {
      health: 100,
      stamina: 100,
      hunger: 100,
      position: { x: 0, y: 0, z: 38 },
      yaw: 0,
      pitch: -0.16
    },
    guardian: { health: 3200, defeated: false },
    victory: false,
    settings: { volume: 0.65, sensitivity: 0.85, renderScale: 1, reducedMotion: false }
  };
}

export function createSaveEnvelope(game, { savedAt = 0 } = {}) {
  return { version: SAVE_VERSION, savedAt, game: clone(game) };
}

function inventoryValidationErrors(inventory, prefix = 'game.inventory') {
  const errors = [];
  if (!isPlainObject(inventory)) return [`${prefix} must be an object.`];
  if (!Number.isInteger(inventory.capacity) || inventory.capacity < 1) errors.push(`${prefix}.capacity is invalid.`);
  if (!isPlainObject(inventory.items)) errors.push(`${prefix}.items must be an object.`);
  else {
    let used = 0;
    for (const [itemId, amount] of Object.entries(inventory.items)) {
      if (!itemId || !Number.isInteger(amount) || amount <= 0) errors.push(`${prefix}.items.${itemId} is invalid.`);
      else used += amount;
    }
    if (Number.isInteger(inventory.capacity) && used > inventory.capacity) errors.push(`${prefix} exceeds capacity.`);
  }
  return errors;
}

function validRecordOfNonNegativeIntegers(value) {
  return isPlainObject(value) && Object.values(value).every((amount) => Number.isInteger(amount) && amount >= 0);
}

function validPosition(position) {
  return isPlainObject(position) && Number.isFinite(position.x) && Number.isFinite(position.z)
    && (position.y === undefined || Number.isFinite(position.y));
}

function progressValidationErrors(progress) {
  const errors = [];
  if (!isPlainObject(progress)) return ['game.progress must be an object.'];
  const counters = progress.counters;
  if (!isPlainObject(counters)
    || !validRecordOfNonNegativeIntegers(counters.gathered)
    || !validRecordOfNonNegativeIntegers(counters.crafted)
    || !validRecordOfNonNegativeIntegers(counters.placed)) {
    errors.push('game.progress.counters resource groups are invalid.');
  } else {
    for (const resourceId of Object.keys(RESOURCE_DEFINITIONS)) {
      if (!Number.isInteger(counters.gathered[resourceId]) || counters.gathered[resourceId] < 0) errors.push(`game.progress.counters.gathered.${resourceId} is invalid.`);
    }
    for (const key of ['captured', 'workersAssigned', 'workerCollected', 'babiesBorn', 'guardianDefeated', 'beaconActivated']) {
      if (!Number.isInteger(counters[key]) || counters[key] < 0) errors.push(`game.progress.counters.${key} is invalid.`);
    }
  }
  if (!Array.isArray(progress.completedQuestIds) || progress.completedQuestIds.some((id) => !QUEST_DEFINITIONS.some((quest) => quest.id === id))) errors.push('game.progress.completedQuestIds is invalid.');
  if (!Array.isArray(progress.unlockedRecipes) || progress.unlockedRecipes.some((id) => !RECIPE_DEFINITIONS[id])) errors.push('game.progress.unlockedRecipes is invalid.');
  if (progress.activeQuestId !== null && !QUEST_DEFINITIONS.some((quest) => quest.id === progress.activeQuestId)) errors.push('game.progress.activeQuestId is invalid.');
  if (!Number.isInteger(progress.goldenPathStep) || progress.goldenPathStep < 0 || progress.goldenPathStep > QUEST_DEFINITIONS.length) errors.push('game.progress.goldenPathStep is invalid.');
  if (typeof progress.victory !== 'boolean') errors.push('game.progress.victory is invalid.');
  return errors;
}

export function validateSaveEnvelope(envelope) {
  const errors = [];
  if (!isPlainObject(envelope)) return { ok: false, errors: ['Save must be an object.'] };
  if (envelope.version !== SAVE_VERSION) errors.push(`Save version must be ${SAVE_VERSION}.`);
  if (!Number.isFinite(envelope.savedAt) || envelope.savedAt < 0) errors.push('savedAt is invalid.');
  const game = envelope.game;
  if (!isPlainObject(game)) errors.push('game must be an object.');
  else {
    if (!Number.isFinite(game.seed)) errors.push('game.seed is invalid.');
    if (!Number.isFinite(game.elapsedMs) || game.elapsedMs < 0) errors.push('game.elapsedMs is invalid.');
    errors.push(...inventoryValidationErrors(game.inventory));
    for (const key of ['placedStructures', 'creatures', 'workers', 'breedingSessions']) {
      if (!Array.isArray(game[key])) errors.push(`game.${key} must be an array.`);
    }
    if (Array.isArray(game.placedStructures)) {
      for (const structure of game.placedStructures) {
        if (!isPlainObject(structure) || typeof structure.id !== 'string' || !STRUCTURE_DEFINITIONS[structure.type]
          || !Number.isFinite(structure.x) || !Number.isFinite(structure.z)) errors.push('game.placedStructures contains an invalid structure.');
      }
    }
    if (Array.isArray(game.creatures)) {
      for (const creature of game.creatures) {
        if (!isPlainObject(creature) || typeof creature.id !== 'string' || !SPECIES_DEFINITIONS[creature.speciesId]
          || !['baby', 'adult'].includes(creature.ageStage) || !validPosition(creature.position)) errors.push('game.creatures contains an invalid creature.');
      }
    }
    if (Array.isArray(game.workers)) {
      for (const worker of game.workers) {
        if (!isPlainObject(worker) || typeof worker.id !== 'string' || typeof worker.creatureId !== 'string'
          || !SPECIES_DEFINITIONS[worker.speciesId] || !WORK_SKILL_DEFINITIONS[worker.skill] || typeof worker.stationId !== 'string'
          || !Number.isFinite(worker.phaseMs) || !Number.isFinite(worker.hunger) || !Number.isFinite(worker.workRate)) errors.push('game.workers contains an invalid worker.');
      }
    }
    if (Array.isArray(game.breedingSessions)) {
      const creaturesById = new Map((Array.isArray(game.creatures) ? game.creatures : []).map((creature) => [creature.id, creature]));
      const structuresById = new Map((Array.isArray(game.placedStructures) ? game.placedStructures : []).map((structure) => [structure.id, structure]));
      for (const session of game.breedingSessions) {
        if (!isPlainObject(session) || typeof session.id !== 'string' || !Array.isArray(session.parentIds)
          || session.parentIds.length !== 2 || session.parentIds.some((id) => typeof id !== 'string')
          || session.parentIds[0] === session.parentIds[1]
          || !Number.isFinite(session.elapsedMs) || session.elapsedMs < 0
          || !Number.isFinite(session.durationMs) || session.durationMs <= 0 || session.elapsedMs > session.durationMs
          || !Number.isFinite(session.seed) || typeof session.nurseryId !== 'string'
          || !['incubating', 'complete'].includes(session.status) || typeof session.produced !== 'boolean'
          || (session.status === 'incubating' && session.produced)
          || (session.status === 'complete' && !session.produced)) {
          errors.push('game.breedingSessions contains an invalid session.');
          continue;
        }
        const parents = session.parentIds.map((id) => creaturesById.get(id));
        if (parents.some((parent) => !parent || parent.ageStage !== 'adult')) errors.push('game.breedingSessions references missing or non-adult parents.');
        if (structuresById.get(session.nurseryId)?.type !== 'nursery') errors.push('game.breedingSessions references a missing nursery.');
      }
    }
    errors.push(...progressValidationErrors(game.progress));
    if (!isPlainObject(game.player) || !Number.isFinite(game.player?.health) || !Number.isFinite(game.player?.stamina)
      || !Number.isFinite(game.player?.hunger) || !validPosition(game.player?.position)) errors.push('game.player is invalid.');
    if (!isPlainObject(game.guardian) || !Number.isFinite(game.guardian?.health)) errors.push('game.guardian is invalid.');
    if (!isPlainObject(game.settings)) errors.push('game.settings must be an object.');
    else {
      if (!Number.isFinite(game.settings.volume) || game.settings.volume < 0 || game.settings.volume > 1) errors.push('game.settings.volume is invalid.');
      if (!Number.isFinite(game.settings.sensitivity) || game.settings.sensitivity < 0.4 || game.settings.sensitivity > 1.4) errors.push('game.settings.sensitivity is invalid.');
      if (![0.65, 0.8, 1].includes(game.settings.renderScale)) errors.push('game.settings.renderScale is invalid.');
      if (typeof game.settings.reducedMotion !== 'boolean') errors.push('game.settings.reducedMotion is invalid.');
    }
    if (typeof game.victory !== 'boolean') errors.push('game.victory must be boolean.');
    if (game.capturedWildIds !== undefined && (!Array.isArray(game.capturedWildIds) || game.capturedWildIds.some((id) => typeof id !== 'string'))) errors.push('game.capturedWildIds is invalid.');
    if (game.baseStorage !== undefined && !validRecordOfNonNegativeIntegers(game.baseStorage)) errors.push('game.baseStorage is invalid.');
    if (game.broodCount !== undefined && (!Number.isInteger(game.broodCount) || game.broodCount < 0)) errors.push('game.broodCount is invalid.');
  }
  return { ok: errors.length === 0, errors };
}

function legacyInventory(value, capacity = 80) {
  if (isPlainObject(value) && isPlainObject(value.items)) return clone(value);
  if (isPlainObject(value)) {
    const items = {};
    for (const [itemId, amount] of Object.entries(value)) {
      if (Number.isInteger(amount) && amount > 0) items[itemId] = amount;
    }
    const used = Object.values(items).reduce((sum, amount) => sum + amount, 0);
    return createInventory(Math.max(capacity, used), items);
  }
  return createInventory(capacity);
}

function migrateV1(input) {
  const oldGame = input.state ?? input.game ?? {};
  const base = createGameState({ seed: Number.isFinite(oldGame.seed) ? oldGame.seed : 481516 });
  const legacyCounters = clone(oldGame.progress?.counters ?? {});
  const progress = isPlainObject(oldGame.progress)
    ? recalculateProgress({
      ...createProgressState(),
      ...clone(oldGame.progress),
      counters: {
        ...blankCounters(),
        ...legacyCounters,
        gathered: { ...blankCounters().gathered, ...(legacyCounters.gathered ?? {}) },
        crafted: { ...(legacyCounters.crafted ?? {}) },
        placed: { ...(legacyCounters.placed ?? {}) }
      }
    })
    : createProgressState();
  const legacyStructures = clone(oldGame.placedStructures ?? oldGame.structures ?? [])
    .filter((structure) => isPlainObject(structure) && typeof structure.id === 'string' && STRUCTURE_DEFINITIONS[structure.type])
    .map((structure) => ({ ...structure, x: Number.isFinite(structure.x) ? structure.x : 0, z: Number.isFinite(structure.z) ? structure.z : 0 }));
  const legacyBreeding = clone(oldGame.breedingSessions ?? oldGame.breeding ?? [])
    .filter((session) => isPlainObject(session) && typeof session.id === 'string' && Array.isArray(session.parentIds) && session.parentIds.length === 2)
    .map((session) => ({
      ...session,
      elapsedMs: Number.isFinite(session.elapsedMs) ? session.elapsedMs : 0,
      durationMs: Number.isFinite(session.durationMs) ? session.durationMs : 60000,
      status: session.status === 'complete' ? 'complete' : 'incubating',
      produced: Boolean(session.produced || session.status === 'complete')
    }));
  const game = {
    ...base,
    ...clone(oldGame),
    inventory: legacyInventory(oldGame.inventory, oldGame.inventoryCapacity ?? 80),
    placedStructures: legacyStructures,
    creatures: clone(oldGame.creatures ?? []),
    workers: clone(oldGame.workers ?? []),
    breedingSessions: legacyBreeding,
    progress,
    player: { ...base.player, ...(clone(oldGame.player ?? {})) },
    guardian: { ...base.guardian, ...(clone(oldGame.guardian ?? {})) },
    settings: { ...base.settings, ...(clone(oldGame.settings ?? {})) },
    victory: Boolean(oldGame.victory)
  };
  delete game.structures;
  delete game.breeding;
  delete game.inventoryCapacity;
  return { version: SAVE_VERSION, savedAt: input.savedAt ?? 0, game };
}

export function migrateSaveEnvelope(input) {
  if (!isPlainObject(input)) return { ok: false, error: 'Save must be an object.', envelope: null, migratedFrom: null };
  if (input.version === SAVE_VERSION) {
    return { ok: true, error: null, envelope: clone(input), migratedFrom: null };
  }
  if (input.version === 1) {
    return { ok: true, error: null, envelope: migrateV1(input), migratedFrom: 1 };
  }
  return {
    ok: false,
    error: input.version > SAVE_VERSION ? 'Save was created by a newer game version.' : 'Unsupported or missing save version.',
    envelope: null,
    migratedFrom: null
  };
}

export function serializeGameSave(game, options = {}) {
  return JSON.stringify(createSaveEnvelope(game, options));
}

export function deserializeGameSave(serialized) {
  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return { ok: false, error: 'Save data is not valid JSON.', errors: ['Save data is not valid JSON.'], game: null, envelope: null, migratedFrom: null };
  }
  const migration = migrateSaveEnvelope(parsed);
  if (!migration.ok) return { ...migration, errors: [migration.error], game: null };
  const validation = validateSaveEnvelope(migration.envelope);
  if (!validation.ok) {
    return { ok: false, error: 'Save data failed validation.', errors: validation.errors, game: null, envelope: null, migratedFrom: migration.migratedFrom };
  }
  return {
    ok: true,
    error: null,
    errors: [],
    game: clone(migration.envelope.game),
    envelope: migration.envelope,
    migratedFrom: migration.migratedFrom
  };
}
