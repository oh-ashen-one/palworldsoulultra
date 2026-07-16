import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INITIAL_RECIPE_UNLOCKS,
  SAVE_VERSION,
  addInventoryItem,
  advanceBreeding,
  advanceCreatureGrowth,
  advanceWorker,
  captureChance,
  craftRecipe,
  createGameState,
  createInventory,
  createProgressState,
  createWorker,
  deserializeGameSave,
  evaluateRecipe,
  inheritOffspring,
  inventoryCount,
  inventoryUsed,
  parentsAreCompatible,
  recordProgressEvent,
  resolveCapture,
  serializeGameSave,
  startBreeding
} from '../src/wildkin-core.js';

function adult(overrides = {}) {
  return {
    id: 'kin-a',
    speciesId: 'burramble',
    ageStage: 'adult',
    sex: 'female',
    position: { x: 0, z: 0 },
    color: '#84c978',
    stats: { vigor: 52, focus: 41 },
    workSkill: 'ranching',
    temperament: 'busy',
    ...overrides
  };
}

test('a new game starts with a genuinely empty inventory and no owned progress', () => {
  const state = createGameState({ seed: 20260715, inventoryCapacity: 40 });

  assert.equal(state.seed, 20260715);
  assert.deepEqual(state.inventory, { capacity: 40, items: {} });
  assert.equal(inventoryUsed(state.inventory), 0);
  assert.equal(inventoryCount(state.inventory, 'wood'), 0);
  assert.deepEqual(state.placedStructures, []);
  assert.deepEqual(state.creatures, []);
  assert.deepEqual(state.workers, []);
  assert.deepEqual(state.breedingSessions, []);
  assert.equal(state.equippedWeapon, null);
  assert.deepEqual(state.progress.unlockedRecipes, [...INITIAL_RECIPE_UNLOCKS]);
});

test('recipe unlocks and station prerequisites follow the intended progression', () => {
  let progress = createProgressState();
  const stocked = createInventory(160, { wood: 30, stone: 30, fiber: 20, food: 10, ore: 10, steel: 10, 'weapon:stonebolt_launcher': 1 });

  assert.equal(evaluateRecipe('wooden_springcaster', { inventory: stocked, progress }).ok, true);
  assert.deepEqual(
    evaluateRecipe('stonebolt_launcher', { inventory: stocked, progress }),
    { ok: false, reason: 'locked', missing: {} }
  );

  progress = recordProgressEvent(progress, { type: 'place', structureId: 'workbench' });
  assert.ok(progress.unlockedRecipes.includes('stonebolt_launcher'));
  assert.ok(progress.unlockedRecipes.includes('forge'));
  assert.equal(
    evaluateRecipe('stonebolt_launcher', { inventory: stocked, progress }).reason,
    'station-required'
  );
  assert.equal(
    evaluateRecipe('stonebolt_launcher', { inventory: stocked, progress, stationTags: ['workbench'] }).ok,
    true
  );

  progress = recordProgressEvent(progress, { type: 'capture' });
  assert.ok(progress.unlockedRecipes.includes('feeder'));
  assert.ok(progress.unlockedRecipes.includes('farm'));
  assert.ok(!progress.unlockedRecipes.includes('nursery'));

  progress = recordProgressEvent(progress, { type: 'collect-worker' });
  assert.ok(progress.unlockedRecipes.includes('nursery'));
  assert.ok(!progress.unlockedRecipes.includes('steel_ingot'));

  progress = recordProgressEvent(progress, { type: 'place', structureId: 'forge' });
  assert.ok(progress.unlockedRecipes.includes('steel_ingot'));
  assert.ok(!progress.unlockedRecipes.includes('steel_repeater'));

  progress = recordProgressEvent(progress, { type: 'breed' });
  assert.ok(!progress.unlockedRecipes.includes('steel_repeater'));
  assert.ok(progress.unlockedRecipes.includes('beacon'));
  progress = recordProgressEvent(progress, { type: 'craft', recipeId: 'stonebolt_launcher' });
  assert.ok(progress.unlockedRecipes.includes('steel_repeater'));
  assert.equal(
    evaluateRecipe('steel_repeater', { inventory: stocked, progress, stationTags: ['forge'] }).reason,
    'station-required'
  );
  assert.equal(
    evaluateRecipe('steel_repeater', {
      inventory: stocked,
      progress,
      stationTags: ['forge', 'workbench']
    }).ok,
    true
  );
});

test('crafting consumes exact costs, produces the declared item, and leaves its input immutable', () => {
  const inventory = createInventory(20, { wood: 5, fiber: 3, stone: 2 });
  const snapshot = structuredClone(inventory);
  const result = craftRecipe(inventory, 'wooden_springcaster', { progress: createProgressState() });

  assert.equal(result.ok, true);
  assert.deepEqual(result.crafted, {
    kind: 'weapon',
    id: 'wooden_springcaster',
    count: 1,
    itemId: 'weapon:wooden_springcaster'
  });
  assert.equal(inventoryCount(result.inventory, 'weapon:wooden_springcaster'), 1);
  assert.equal(inventoryCount(result.inventory, 'wood'), 0);
  assert.equal(inventoryCount(result.inventory, 'fiber'), 0);
  assert.equal(inventoryCount(result.inventory, 'stone'), 2);
  assert.deepEqual(inventory, snapshot);
});

test('capture odds improve with weakening and repeated attempts and stay deterministic', () => {
  const healthy = captureChance({ speciesId: 'flintusk', currentHealth: 100, maxHealth: 100, attempt: 1 });
  const weakened = captureChance({ speciesId: 'flintusk', currentHealth: 25, maxHealth: 100, attempt: 1 });
  const persistent = captureChance({ speciesId: 'flintusk', currentHealth: 25, maxHealth: 100, attempt: 3 });

  assert.ok(healthy < weakened);
  assert.ok(weakened < persistent);
  assert.equal(
    captureChance({ speciesId: 'flintusk', currentHealth: 25, maxHealth: 100, attempt: 3 }),
    persistent
  );

  const input = {
    seed: 77,
    creatureId: 'wild-flintusk-1',
    speciesId: 'flintusk',
    currentHealth: 60,
    maxHealth: 100,
    attempt: 1
  };
  assert.deepEqual(resolveCapture(input), resolveCapture(input));
  assert.equal(resolveCapture(input, { roll: () => 0 }).success, true);
  assert.equal(resolveCapture(input, { roll: () => 0.999 }).success, false);
});

test('the first-capture tutorial guarantees a weakened second attempt only', () => {
  const base = {
    seed: 10,
    creatureId: 'tutorial-flintusk',
    speciesId: 'flintusk',
    currentHealth: 35,
    maxHealth: 100,
    tutorialMode: true,
    hasCapturedAny: false
  };

  const first = resolveCapture({ ...base, attempt: 1 }, { roll: () => 0.999 });
  assert.equal(first.success, false);
  assert.equal(first.tutorialGuaranteed, false);

  const second = resolveCapture({ ...base, attempt: 2 }, { roll: () => 0.999 });
  assert.equal(second.success, true);
  assert.equal(second.tutorialGuaranteed, true);
  assert.equal(second.reason, 'tutorial-safety');

  const afterTutorial = resolveCapture(
    { ...base, attempt: 2, hasCapturedAny: true },
    { roll: () => 0.999 }
  );
  assert.equal(afterTutorial.success, false);
  assert.equal(afterTutorial.tutorialGuaranteed, false);
});

test('workers visibly travel, work, carry, deposit, and repeat without mutating prior states', () => {
  const initial = createWorker({
    id: 'worker-1',
    creatureId: 'burramble-1',
    speciesId: 'burramble',
    stationId: 'farm-1',
    storageId: 'cache-1'
  });
  const initialSnapshot = structuredClone(initial);
  const context = { travelMs: 100, cycleMs: 500, depositMs: 50, hungerPerSecond: 0 };

  const arrived = advanceWorker(initial, 100, context);
  assert.equal(arrived.worker.mode, 'working');
  assert.deepEqual(arrived.events.map(({ type }) => type), ['worker-arrived-job']);
  assert.deepEqual(initial, initialSnapshot);

  const produced = advanceWorker(arrived.worker, 500, context);
  assert.equal(produced.worker.mode, 'traveling-to-storage');
  assert.deepEqual(produced.worker.carried, { fiber: 2 });
  assert.deepEqual(produced.events.map(({ type }) => type), ['worker-produced']);

  const atCache = advanceWorker(produced.worker, 100, context);
  assert.equal(atCache.worker.mode, 'depositing');
  assert.deepEqual(atCache.deposits, {});

  const deposited = advanceWorker(atCache.worker, 50, context);
  assert.equal(deposited.worker.mode, 'traveling-to-job');
  assert.equal(deposited.worker.carried, null);
  assert.equal(deposited.worker.completedDeliveries, 1);
  assert.deepEqual(deposited.deposits, { fiber: 2 });
  assert.deepEqual(deposited.events.map(({ type }) => type), ['worker-deposit']);
});

test('hungry workers pause without food and emit an eat event when a trough is stocked', () => {
  const hungry = {
    ...createWorker({
      id: 'worker-hungry',
      creatureId: 'burramble-hungry',
      speciesId: 'burramble',
      stationId: 'farm-1'
    }),
    hunger: 10
  };

  const paused = advanceWorker(hungry, 0, { feederFood: 0 });
  assert.equal(paused.worker.mode, 'hungry');
  assert.deepEqual(paused.events, []);

  const seeking = advanceWorker(paused.worker, 0, { feederFood: 1, foodRestore: 70, feederTravelMs: 100, eatingMs: 250 });
  assert.equal(seeking.worker.mode, 'traveling-to-feeder');
  assert.deepEqual(seeking.events, [{ type: 'worker-seeking-food', workerId: 'worker-hungry' }]);
  const arrived = advanceWorker(seeking.worker, 100, { feederFood: 1, foodRestore: 70, feederTravelMs: 100, eatingMs: 250 });
  assert.equal(arrived.worker.mode, 'eating');
  const fed = advanceWorker(arrived.worker, 250, { feederFood: 1, foodRestore: 70, feederTravelMs: 100, eatingMs: 250 });
  assert.equal(fed.worker.mode, 'traveling-to-job');
  assert.ok(Math.abs(fed.worker.hunger - 79.958) < 0.001);
  assert.deepEqual(fed.events, [{ type: 'worker-ate', workerId: 'worker-hungry', amount: 1 }]);
});

test('breeding validates parents and food, then completes only when its timer expires', () => {
  const parentA = adult();
  const parentB = adult({
    id: 'kin-b',
    sex: 'male',
    speciesId: 'flintusk',
    color: '#d89b58',
    stats: { vigor: 66, focus: 35 },
    workSkill: 'mining',
    temperament: 'stubborn'
  });

  assert.equal(parentsAreCompatible(parentA, parentB), true);
  assert.equal(parentsAreCompatible(parentA, { ...parentB, sex: 'female' }), false);
  assert.equal(parentsAreCompatible(parentA, { ...parentA }), false);
  assert.equal(parentsAreCompatible(parentA, { ...parentB, ageStage: 'baby' }), false);
  assert.equal(startBreeding(parentA, parentB, { availableFood: 3 }).reason, 'food-required');

  const started = startBreeding(parentA, parentB, {
    seed: 1234,
    nurseryId: 'nest-1',
    availableFood: 4,
    durationMs: 60000,
    sessionId: 'brood-test'
  });
  assert.equal(started.ok, true);
  assert.equal(started.foodConsumed, 4);
  assert.equal(started.session.durationMs, 60000);

  const waiting = advanceBreeding(started.session, 59999, { parentA, parentB });
  assert.equal(waiting.completed, false);
  assert.equal(waiting.baby, null);
  assert.equal(waiting.session.status, 'incubating');

  const hatched = advanceBreeding(waiting.session, 1, { parentA, parentB, babyId: 'baby-test' });
  assert.equal(hatched.completed, true);
  assert.equal(hatched.session.status, 'complete');
  assert.equal(hatched.session.produced, true);
  assert.equal(hatched.baby.id, 'baby-test');
  assert.deepEqual(hatched.baby.parentIds, ['kin-a', 'kin-b']);
  assert.equal(hatched.baby.ageStage, 'baby');
});

test('offspring inheritance is seeded and growth reaches a full-size adult', () => {
  const parentA = adult();
  const parentB = adult({
    id: 'kin-b',
    sex: 'male',
    speciesId: 'coaloon',
    color: '#d7a05d',
    stats: { vigor: 70, focus: 33 },
    workSkill: 'kindling',
    temperament: 'shy'
  });
  const options = { seed: 90210, babyId: 'seeded-baby', maturityDurationMs: 45000 };
  const baby = inheritOffspring(parentA, parentB, options);

  assert.deepEqual(baby, inheritOffspring(parentA, parentB, options));
  assert.ok(['burramble', 'coaloon'].includes(baby.speciesId));
  assert.ok(['ranching', 'kindling'].includes(baby.workSkill));
  assert.match(baby.color, /^#[0-9a-f]{6}$/);
  assert.ok(Object.values(baby.stats).every((value) => value >= 1 && value <= 100));

  const halfway = advanceCreatureGrowth(baby, 22500);
  assert.equal(halfway.ageStage, 'baby');
  assert.equal(halfway.scale, 0.775);
  const adultBaby = advanceCreatureGrowth(halfway, 22500);
  assert.equal(adultBaby.ageStage, 'adult');
  assert.equal(adultBaby.scale, 1);
  assert.equal(adultBaby.ageMs, 45000);
});

test('versioned saves round-trip without aliasing the source game state', () => {
  const game = createGameState({ seed: 8080 });
  game.elapsedMs = 123456;
  game.inventory = addInventoryItem(game.inventory, 'wood', 7).inventory;
  game.creatures.push(adult({ id: 'saved-kin' }));
  const serialized = serializeGameSave(game, { savedAt: 987654321 });
  const loaded = deserializeGameSave(serialized);

  assert.equal(loaded.ok, true);
  assert.equal(loaded.envelope.version, SAVE_VERSION);
  assert.equal(loaded.envelope.savedAt, 987654321);
  assert.deepEqual(loaded.game, game);
  assert.notEqual(loaded.game, game);
  assert.notEqual(loaded.game.inventory, game.inventory);

  loaded.game.inventory.items.wood = 1;
  assert.equal(game.inventory.items.wood, 7);
});

test('version 1 saves migrate legacy field names and flat inventories', () => {
  const legacy = JSON.stringify({
    version: 1,
    savedAt: 4242,
    state: {
      seed: 5150,
      elapsedMs: 9000,
      inventoryCapacity: 12,
      inventory: { wood: 3, food: 2, ignoredZero: 0 },
      structures: [{ id: 'old-bench', type: 'workbench' }],
      breeding: [{ id: 'old-brood', status: 'incubating' }]
    }
  });
  const loaded = deserializeGameSave(legacy);

  assert.equal(loaded.ok, true);
  assert.equal(loaded.migratedFrom, 1);
  assert.equal(loaded.envelope.version, SAVE_VERSION);
  assert.equal(loaded.envelope.savedAt, 4242);
  assert.equal(loaded.game.seed, 5150);
  assert.deepEqual(loaded.game.inventory, { capacity: 12, items: { wood: 3, food: 2 } });
  assert.deepEqual(loaded.game.placedStructures, [{ id: 'old-bench', type: 'workbench', x: 0, z: 0 }]);
  assert.deepEqual(loaded.game.breedingSessions, []);
  assert.equal('structures' in loaded.game, false);
  assert.equal('breeding' in loaded.game, false);
  assert.equal('inventoryCapacity' in loaded.game, false);
});

test('corrupt, invalid, and future-version saves fail safely without throwing', () => {
  assert.doesNotThrow(() => deserializeGameSave('{not json'));
  const invalidJson = deserializeGameSave('{not json');
  assert.equal(invalidJson.ok, false);
  assert.match(invalidJson.error, /valid JSON/i);

  const invalidShape = deserializeGameSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, game: {} }));
  assert.equal(invalidShape.ok, false);
  assert.match(invalidShape.error, /validation/i);
  assert.ok(invalidShape.errors.length > 0);

  const invalidSettingsState = createGameState();
  invalidSettingsState.settings.sensitivity = /** @type {any} */ ({ bad: true });
  invalidSettingsState.settings.renderScale = /** @type {any} */ ('not-a-number');
  invalidSettingsState.settings.reducedMotion = /** @type {any} */ ('sometimes');
  const invalidSettings = deserializeGameSave(serializeGameSave(invalidSettingsState));
  assert.equal(invalidSettings.ok, false);
  assert.ok(invalidSettings.errors.some((error) => /settings\.sensitivity/.test(error)));
  assert.ok(invalidSettings.errors.some((error) => /settings\.renderScale/.test(error)));
  assert.ok(invalidSettings.errors.some((error) => /settings\.reducedMotion/.test(error)));

  const orphanedBreedingState = createGameState();
  orphanedBreedingState.breedingSessions = [{
    id: 'orphaned-brood',
    nurseryId: 'missing-nursery',
    seed: 10,
    parentIds: ['missing-a', 'missing-b'],
    elapsedMs: 1,
    durationMs: 60000,
    status: 'incubating',
    produced: false
  }];
  const orphanedBreeding = deserializeGameSave(serializeGameSave(orphanedBreedingState));
  assert.equal(orphanedBreeding.ok, false);
  assert.ok(orphanedBreeding.errors.some((error) => /parents/.test(error)));
  assert.ok(orphanedBreeding.errors.some((error) => /nursery/.test(error)));

  const future = deserializeGameSave(JSON.stringify({ version: SAVE_VERSION + 1, savedAt: 0, game: {} }));
  assert.equal(future.ok, false);
  assert.match(future.error, /newer game version/i);
});
