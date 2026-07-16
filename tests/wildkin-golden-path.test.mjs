import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SAVE_VERSION,
  SPECIES_DEFINITIONS,
  STRUCTURE_DEFINITIONS,
  addInventoryItem,
  advanceBreeding,
  advanceWorker,
  craftRecipe,
  createGameState,
  createWorker,
  deserializeGameSave,
  evaluateRecipe,
  inventoryCount,
  inventoryUsed,
  parentsAreCompatible,
  recordProgressEvent,
  removeInventoryItems,
  resolveCapture,
  serializeGameSave,
  startBreeding
} from '../src/wildkin-core.js';

const SEED = 20260716;

function stationTags(state) {
  return [...new Set(state.placedStructures.flatMap(({ type }) => STRUCTURE_DEFINITIONS[type].stationTags))];
}

function gather(state, bundle) {
  for (const [resourceId, amount] of Object.entries(bundle)) {
    const added = addInventoryItem(state.inventory, resourceId, amount);
    assert.equal(added.accepted, amount, `all ${resourceId} should fit in the pack`);
    assert.equal(added.remainder, 0);
    state.inventory = added.inventory;
    state.progress = recordProgressEvent(state.progress, { type: 'gather', resourceId, amount });
  }
}

function craft(state, recipeId) {
  const result = craftRecipe(state.inventory, recipeId, {
    progress: state.progress,
    stationTags: stationTags(state)
  });
  assert.equal(result.ok, true, `${recipeId} should be craftable at this gate: ${result.reason}`);
  state.inventory = result.inventory;
  state.progress = recordProgressEvent(state.progress, { type: 'craft', recipeId });
  return result.crafted;
}

function placeCraftedStructure(state, type) {
  const planId = `structure:${type}`;
  assert.equal(inventoryCount(state.inventory, planId), 1, `${type} plan should exist before placement`);
  const removed = removeInventoryItems(state.inventory, { [planId]: 1 });
  assert.equal(removed.ok, true);
  state.inventory = removed.inventory;
  const sequence = state.placedStructures.length + 1;
  const structure = {
    id: `golden-${type}-${sequence}`,
    type,
    x: sequence * 4,
    z: 18 - sequence * 3,
    rotation: 0
  };
  state.placedStructures.push(structure);
  state.progress = recordProgressEvent(state.progress, { type: 'place', structureId: type });
  return structure;
}

function craftAndPlace(state, type) {
  craft(state, type);
  return placeCraftedStructure(state, type);
}

function consume(state, costs) {
  const removed = removeInventoryItems(state.inventory, costs);
  assert.equal(removed.ok, true, `inventory should contain ${JSON.stringify(costs)}`);
  state.inventory = removed.inventory;
}

function capturedAdult({ id, speciesId, sex, color, stats, position }) {
  const species = SPECIES_DEFINITIONS[speciesId];
  return {
    id,
    speciesId,
    name: species.name,
    sex,
    color,
    health: 80,
    maxHealth: 80,
    stats,
    workSkill: species.work.skill,
    temperament: species.temperament,
    ageStage: 'adult',
    ageMs: 0,
    maturityDurationMs: 45000,
    scale: 1,
    assignment: 'roster',
    position
  };
}

test('deterministic empty-hands golden path reaches a saved victory without skipping a weapon tier', () => {
  const state = createGameState({ seed: SEED });
  state.baseStorage = {};
  state.feederFood = 1;
  state.capturedWildIds = [];

  // Empty hands are real, and every progression gate is still untouched.
  assert.equal(inventoryUsed(state.inventory), 0);
  assert.deepEqual(state.inventory.items, {});
  assert.deepEqual(state.placedStructures, []);
  assert.deepEqual(state.creatures, []);
  assert.deepEqual(state.workers, []);
  assert.equal(state.progress.activeQuestId, 'shorebound');
  assert.equal(evaluateRecipe('steel_repeater', {
    inventory: state.inventory,
    progress: state.progress,
    stationTags: []
  }).reason, 'locked');

  // One capacity-safe expedition gathers exactly the first camp's requirements.
  gather(state, { wood: 34, stone: 25, fiber: 15, food: 2, ore: 3 });
  assert.equal(inventoryUsed(state.inventory), 79);
  assert.equal(state.progress.activeQuestId, 'first_mechanism');
  assert.deepEqual(state.progress.completedQuestIds, ['shorebound']);

  craft(state, 'wooden_springcaster');
  craft(state, 'lumen_tether');
  assert.equal(inventoryCount(state.inventory, 'weapon:wooden_springcaster'), 1);
  assert.equal(inventoryCount(state.inventory, 'tool:lumen_tether'), 2);
  assert.equal(state.progress.activeQuestId, 'first_mechanism');

  const workbench = craftAndPlace(state, 'workbench');
  assert.equal(workbench.type, 'workbench');
  assert.equal(state.progress.activeQuestId, 'first_friend');
  assert.ok(state.progress.unlockedRecipes.includes('stonebolt_launcher'));
  assert.ok(state.progress.unlockedRecipes.includes('forge'));

  // Even a fabricated downstream branch cannot unlock steel without tier two.
  let attemptedSkip = structuredClone(state.progress);
  for (const event of [
    { type: 'capture' },
    { type: 'place', structureId: 'storage_bin' },
    { type: 'place', structureId: 'feeder' },
    { type: 'place', structureId: 'farm' },
    { type: 'assign-worker' },
    { type: 'collect-worker' },
    { type: 'place', structureId: 'nursery' },
    { type: 'place', structureId: 'forge' },
    { type: 'breed' }
  ]) attemptedSkip = recordProgressEvent(attemptedSkip, event);
  assert.equal(attemptedSkip.counters.crafted.stonebolt_launcher ?? 0, 0);
  assert.ok(!attemptedSkip.unlockedRecipes.includes('steel_repeater'));
  assert.equal(evaluateRecipe('steel_repeater', {
    inventory: state.inventory,
    progress: attemptedSkip,
    stationTags: ['workbench', 'forge']
  }).reason, 'locked');

  craft(state, 'stonebolt_launcher');
  assert.equal(inventoryCount(state.inventory, 'weapon:stonebolt_launcher'), 1);
  assert.equal(state.progress.counters.crafted.stonebolt_launcher, 1);
  assert.ok(!state.progress.unlockedRecipes.includes('steel_repeater'), 'a baby is still required');

  // A weakened Burramble is deterministically bonded and retained for deployment.
  const firstBond = resolveCapture({
    seed: state.seed,
    creatureId: 'wild-burramble-golden',
    speciesId: 'burramble',
    currentHealth: 20,
    maxHealth: 68,
    tetherPower: 1,
    attempt: 1,
    tutorialMode: true,
    hasCapturedAny: false
  }, { roll: () => 0 });
  assert.equal(firstBond.success, true);
  assert.ok(firstBond.chance > 0.5);
  consume(state, { 'tool:lumen_tether': 1 });
  const parentA = capturedAdult({
    id: 'kin-burramble-golden',
    speciesId: 'burramble',
    sex: 'female',
    color: '#79a45e',
    stats: { power: 56, work: 62, heart: 70 },
    position: { x: 18, y: 0, z: 8 }
  });
  state.creatures.push(parentA);
  state.capturedWildIds.push('wild-burramble-golden');
  state.progress = recordProgressEvent(state.progress, { type: 'capture' });
  assert.equal(state.progress.activeQuestId, 'living_camp');
  assert.ok(state.progress.unlockedRecipes.includes('feeder'));
  assert.ok(state.progress.unlockedRecipes.includes('farm'));
  assert.equal(inventoryCount(state.inventory, 'tool:lumen_tether'), 1);

  // The full working camp is crafted from the remaining first expedition stack.
  const cache = craftAndPlace(state, 'storage_bin');
  craftAndPlace(state, 'feeder');
  const farm = craftAndPlace(state, 'farm');
  craftAndPlace(state, 'forge');
  assert.deepEqual(stationTags(state).sort(), ['farm', 'feeder', 'forge', 'storage', 'workbench']);
  assert.deepEqual(state.inventory.items, {
    'weapon:wooden_springcaster': 1,
    'tool:lumen_tether': 1,
    'weapon:stonebolt_launcher': 1
  });

  parentA.assignment = 'worker';
  let worker = createWorker({
    id: 'worker-burramble-golden',
    creatureId: parentA.id,
    speciesId: parentA.speciesId,
    stationId: farm.id,
    storageId: cache.id,
    workRate: 1
  });
  state.workers.push(worker);
  state.progress = recordProgressEvent(state.progress, { type: 'assign-worker' });
  assert.equal(state.progress.activeQuestId, 'shared_harvest');
  assert.equal(state.progress.counters.workersAssigned, 1);

  // Travel, work, carry, arrive, and deposit are separate deterministic phases.
  const workerContext = {
    travelMs: 100,
    cycleMs: 500,
    depositMs: 50,
    hungerPerSecond: 0,
    stationOperational: true,
    storageHasSpace: true,
    feederFood: state.feederFood
  };
  let advanced = advanceWorker(worker, 100, workerContext);
  assert.equal(advanced.worker.mode, 'working');
  assert.deepEqual(advanced.events.map(({ type }) => type), ['worker-arrived-job']);
  advanced = advanceWorker(advanced.worker, 500, workerContext);
  assert.equal(advanced.worker.mode, 'traveling-to-storage');
  assert.deepEqual(advanced.worker.carried, { fiber: 2 });
  assert.deepEqual(advanced.events.map(({ type }) => type), ['worker-produced']);
  advanced = advanceWorker(advanced.worker, 100, workerContext);
  assert.equal(advanced.worker.mode, 'depositing');
  advanced = advanceWorker(advanced.worker, 50, workerContext);
  assert.equal(advanced.worker.mode, 'traveling-to-job');
  assert.equal(advanced.worker.completedDeliveries, 1);
  assert.deepEqual(advanced.deposits, { fiber: 2 });
  assert.deepEqual(advanced.events.map(({ type }) => type), ['worker-deposit']);
  worker = advanced.worker;
  state.workers[0] = worker;
  state.baseStorage = { ...advanced.deposits };

  const collected = addInventoryItem(state.inventory, 'fiber', state.baseStorage.fiber);
  assert.equal(collected.accepted, 2);
  state.inventory = collected.inventory;
  state.baseStorage = {};
  state.progress = recordProgressEvent(state.progress, { type: 'collect-worker' });
  assert.equal(state.progress.activeQuestId, 'new_leaf');
  assert.equal(state.progress.counters.workerCollected, 1);
  assert.ok(state.progress.unlockedRecipes.includes('nursery'));

  // A second expedition supplies a Nestbloom and food for the sixty-second brood.
  gather(state, { wood: 8, stone: 4, fiber: 4, food: 8 });
  const nursery = craftAndPlace(state, 'nursery');
  assert.equal(nursery.type, 'nursery');
  assert.equal(state.progress.activeQuestId, 'new_leaf');
  assert.equal(inventoryCount(state.inventory, 'food'), 4);

  const secondBond = resolveCapture({
    seed: state.seed,
    creatureId: 'wild-flintusk-golden',
    speciesId: 'flintusk',
    currentHealth: 20,
    maxHealth: 92,
    tetherPower: 1,
    attempt: 1,
    tutorialMode: false,
    hasCapturedAny: true
  }, { roll: () => 0 });
  assert.equal(secondBond.success, true);
  consume(state, { 'tool:lumen_tether': 1 });
  const parentB = capturedAdult({
    id: 'kin-flintusk-golden',
    speciesId: 'flintusk',
    sex: 'male',
    color: '#6c8582',
    stats: { power: 75, work: 80, heart: 61 },
    position: { x: -67, y: 0, z: -21 }
  });
  state.creatures.push(parentB);
  state.capturedWildIds.push('wild-flintusk-golden');
  state.progress = recordProgressEvent(state.progress, { type: 'capture' });
  assert.notEqual(parentA.sex, parentB.sex);
  assert.equal(parentsAreCompatible(parentA, parentB), true);

  const breeding = startBreeding(parentA, parentB, {
    seed: state.seed,
    nurseryId: nursery.id,
    availableFood: inventoryCount(state.inventory, 'food'),
    durationMs: 60000,
    sessionId: 'brood-golden-1'
  });
  assert.equal(breeding.ok, true);
  assert.equal(breeding.foodConsumed, 4);
  assert.equal(breeding.session.durationMs, 60000);
  consume(state, { food: breeding.foodConsumed });
  state.breedingSessions = [breeding.session];

  const almostHatched = advanceBreeding(breeding.session, 59999, {
    parentA,
    parentB,
    babyId: 'baby-golden-1'
  });
  assert.equal(almostHatched.completed, false);
  assert.equal(almostHatched.baby, null);
  assert.equal(almostHatched.session.status, 'incubating');
  const hatched = advanceBreeding(almostHatched.session, 1, {
    parentA,
    parentB,
    babyId: 'baby-golden-1'
  });
  assert.equal(hatched.completed, true);
  assert.equal(hatched.session.elapsedMs, 60000);
  assert.equal(hatched.session.status, 'complete');
  assert.equal(hatched.baby.ageStage, 'baby');
  assert.equal(hatched.baby.scale, 0.55);
  assert.deepEqual(hatched.baby.parentIds, [parentA.id, parentB.id]);
  assert.ok([parentA.speciesId, parentB.speciesId].includes(hatched.baby.speciesId));
  assert.ok([parentA.workSkill, parentB.workSkill].includes(hatched.baby.workSkill));
  assert.match(hatched.baby.color, /^#[0-9a-f]{6}$/);
  assert.ok(hatched.baby.stats.work >= 60 && hatched.baby.stats.work <= 82);

  const baby = {
    ...hatched.baby,
    name: 'Golden Bud',
    sex: 'female',
    health: 70,
    maxHealth: 70,
    assignment: 'roster',
    position: { x: nursery.x, y: 0, z: nursery.z + 3 }
  };
  state.breedingSessions = [hatched.session];
  state.creatures.push(baby);
  state.progress = recordProgressEvent(state.progress, { type: 'breed' });
  assert.equal(state.progress.activeQuestId, 'bloomsteel_age');
  assert.equal(state.progress.counters.babiesBorn, 1);
  assert.equal(new Set(state.creatures.map(({ id }) => id)).size, 3);
  assert.ok(state.progress.unlockedRecipes.includes('steel_repeater'));

  // Unlock alone is insufficient: ownership of the Stonebolt is a second gate.
  const withoutStonebolt = removeInventoryItems(state.inventory, { 'weapon:stonebolt_launcher': 1 });
  assert.equal(withoutStonebolt.ok, true);
  const missingTier = evaluateRecipe('steel_repeater', {
    inventory: withoutStonebolt.inventory,
    progress: state.progress,
    stationTags: stationTags(state)
  });
  assert.equal(missingTier.reason, 'item-required');
  assert.deepEqual(missingTier.missingRequirements, { 'weapon:stonebolt_launcher': 1 });

  // The last expedition is exact: five ingots plus the final weapon leave no raw stock.
  gather(state, { wood: 11, ore: 10, fiber: 4 });
  for (let index = 0; index < 5; index += 1) craft(state, 'steel_ingot');
  assert.equal(inventoryCount(state.inventory, 'steel'), 5);
  assert.equal(inventoryCount(state.inventory, 'wood'), 6);
  assert.equal(inventoryCount(state.inventory, 'fiber'), 4);
  assert.equal(inventoryCount(state.inventory, 'ore'), 0);
  craft(state, 'steel_repeater');
  state.equippedWeapon = 'steel_repeater';
  assert.deepEqual(state.inventory.items, {
    'weapon:wooden_springcaster': 1,
    'weapon:stonebolt_launcher': 1,
    'weapon:steel_repeater': 1
  });
  assert.equal(state.progress.activeQuestId, 'wake_the_peak');
  assert.equal(state.progress.counters.crafted.steel_ingot, 5);
  assert.equal(state.progress.counters.crafted.steel_repeater, 1);

  state.guardian = { health: 0, defeated: true };
  state.progress = recordProgressEvent(state.progress, { type: 'defeat-guardian' });
  assert.equal(state.progress.activeQuestId, 'dawncall');
  assert.equal(state.progress.counters.guardianDefeated, 1);
  state.progress = recordProgressEvent(state.progress, { type: 'activate-beacon' });
  state.victory = state.progress.victory;
  state.elapsedMs = 600000;
  assert.equal(state.progress.activeQuestId, null);
  assert.equal(state.progress.completedQuestIds.length, 9);
  assert.equal(state.progress.counters.beaconActivated, 1);
  assert.equal(state.victory, true);
  assert.deepEqual(state.progress.counters.gathered, {
    wood: 53,
    stone: 29,
    fiber: 23,
    food: 10,
    ore: 13,
    steel: 0
  });

  // The exact completed run survives a versioned local-save round trip.
  const serialized = serializeGameSave(state, { savedAt: 202607160001 });
  const loaded = deserializeGameSave(serialized);
  assert.equal(loaded.ok, true, loaded.errors?.join('; '));
  assert.equal(loaded.envelope.version, SAVE_VERSION);
  assert.equal(loaded.envelope.savedAt, 202607160001);
  assert.deepEqual(loaded.game, state);
  assert.equal(loaded.game.victory, true);
  assert.equal(loaded.game.elapsedMs, 600000);
  assert.equal(inventoryCount(loaded.game.inventory, 'weapon:steel_repeater'), 1);

  // Reset is a fresh core state, not a partially cleared victory object.
  const reset = createGameState({ seed: SEED });
  assert.equal(inventoryUsed(reset.inventory), 0);
  assert.deepEqual(reset.inventory.items, {});
  assert.deepEqual(reset.placedStructures, []);
  assert.deepEqual(reset.creatures, []);
  assert.deepEqual(reset.workers, []);
  assert.deepEqual(reset.breedingSessions, []);
  assert.equal(reset.equippedWeapon, null);
  assert.equal(reset.progress.activeQuestId, 'shorebound');
  assert.deepEqual(reset.progress.completedQuestIds, []);
  assert.equal(reset.progress.counters.captured, 0);
  assert.equal(reset.progress.counters.babiesBorn, 0);
  assert.equal(reset.progress.counters.guardianDefeated, 0);
  assert.equal(reset.progress.counters.beaconActivated, 0);
  assert.equal(reset.victory, false);
});
