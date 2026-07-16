import * as THREE from 'three';
import {
  QUEST_DEFINITIONS,
  RECIPE_DEFINITIONS,
  RESOURCE_DEFINITIONS,
  SPECIES_DEFINITIONS,
  STRUCTURE_DEFINITIONS,
  WORK_SKILL_DEFINITIONS,
  WEAPON_TIERS,
  addInventoryItem,
  advanceBreeding,
  advanceCreatureGrowth,
  advanceWorker,
  captureChance,
  craftRecipe,
  createGameState,
  createWorker,
  deserializeGameSave,
  evaluateRecipe,
  inventoryCount,
  inventoryMissing,
  parentsAreCompatible,
  questSnapshot,
  recordProgressEvent,
  removeInventoryItems,
  resolveCapture,
  serializeGameSave,
  startBreeding,
  weaponById
} from './wildkin-core.js';
import {
  BEACON_POSITION,
  CAMP_CENTER,
  COLORS,
  GUARDIAN_POSITION,
  WORLD_RADIUS,
  activateBeacon,
  createGlimmerline,
  createGuardianMesh,
  createPickupMesh,
  createPlayerMesh,
  createProjectileMesh,
  createResourceMesh,
  createStructureMesh,
  createWildkinMesh,
  createWorld,
  material,
  setGlimmerline
} from './wildkin-visuals.js';
import { WildkinAudio } from './wildkin-audio.js';
import './wildkin.css';

const SAVE_KEY = 'wildkin-frontier-save';
const LEGACY_SAVE_KEYS = Object.freeze(['wildkin-frontier-save-v2', 'wildkin-frontier-save-v1']);
const AUTOSAVE_SECONDS = 10;
const PLAYER_RADIUS = 1.05;
const BASE_MOVE_SPEED = 8.6;
const SPRINT_SPEED = 13.2;
const JUMP_SPEED = 10.5;
const GRAVITY = 28;

const RESOURCE_COLORS = Object.freeze({
  wood: '#8a5f3e',
  stone: '#6f7f86',
  fiber: '#9bc76b',
  food: '#f2b64b',
  ore: '#b8734b',
  steel: '#b8c9c5'
});

const SPECIES_COLORS = Object.freeze({
  burramble: '#779d58',
  flintusk: '#687e7d',
  coaloon: '#b85d43',
  wickerwing: '#92754e',
  rippletail: '#4b9fab'
});

const RESOURCE_LAYOUT = Object.freeze([
  ['wood', 13, 32], ['wood', 24, 40], ['wood', -17, 37], ['wood', -30, 29], ['wood', 41, 20], ['wood', -48, 14],
  ['wood', 64, 10], ['wood', -76, 9], ['wood', 77, 38], ['wood', -93, 32], ['wood', 53, -16], ['wood', -58, -47],
  ['stone', -10, 20], ['stone', -24, 10], ['stone', -39, -4], ['stone', -49, -19], ['stone', -62, -31], ['stone', -72, -43],
  ['stone', -87, -25], ['stone', -96, -8], ['stone', -46, -58], ['stone', 37, -25], ['stone', 56, -44],
  ['fiber', 6, 23], ['fiber', -7, 27], ['fiber', 18, 15], ['fiber', 31, 31], ['fiber', -25, 42], ['fiber', 48, 48],
  ['fiber', -57, 43], ['fiber', 72, 24], ['fiber', -88, 49], ['fiber', 91, 12],
  ['food', 4, 34], ['food', -13, 18], ['food', 27, 26], ['food', 38, 43], ['food', -35, 50], ['food', 58, 23],
  ['food', -64, 58], ['food', 78, 51], ['food', 99, 26],
  ['ore', -56, -17], ['ore', -68, -33], ['ore', -81, -48], ['ore', -96, -31], ['ore', -70, -62],
  ['ore', 47, -48], ['ore', 61, -65], ['ore', 80, -54], ['ore', 94, -76]
]);

const WILD_LAYOUT = Object.freeze([
  { id: 'wild-burramble-a', speciesId: 'burramble', sex: 'female', x: 18, z: 8 },
  { id: 'wild-rippletail-a', speciesId: 'rippletail', sex: 'male', x: 33, z: 19 },
  { id: 'wild-wickerwing-a', speciesId: 'wickerwing', sex: 'female', x: -42, z: 22 },
  { id: 'wild-flintusk-a', speciesId: 'flintusk', sex: 'male', x: -67, z: -21 },
  { id: 'wild-coaloon-a', speciesId: 'coaloon', sex: 'female', x: 61, z: -49 },
  { id: 'wild-burramble-b', speciesId: 'burramble', sex: 'male', x: 71, z: 27 },
  { id: 'wild-flintusk-b', speciesId: 'flintusk', sex: 'female', x: -88, z: -42 }
]);

const STRUCTURE_DESCRIPTIONS = Object.freeze({
  workbench: 'Unlocks launchers, the forge, and careful craft.',
  storage_bin: 'Workers carry finished supplies here for collection.',
  feeder: 'Stores Sunfruit so helpers can eat and keep working.',
  farm: 'A bright patch for ranching, fiber, and food work.',
  forge: 'Turns Star-iron into Bloomsteel at a working ember crucible.',
  nursery: 'Pairs two adults and grows an inherited baby.'
});

const RESOURCE_NODE_STATS = Object.freeze({
  wood: { health: 3, yield: 4, respawn: 48 },
  stone: { health: 3, yield: 4, respawn: 44 },
  fiber: { health: 1, yield: 3, respawn: 35 },
  food: { health: 1, yield: 3, respawn: 31 },
  ore: { health: 4, yield: 4, respawn: 54 }
});

const HOTBAR_BASE = Object.freeze([
  { kind: 'hands', id: 'hands', label: 'Bare hands', color: '#d7a47e' },
  { kind: 'weapon', id: 'wooden_springcaster', label: 'Wooden Springcaster', color: '#8a5f3e' },
  { kind: 'weapon', id: 'stonebolt_launcher', label: 'Stonebolt Launcher', color: '#6f7f86' },
  { kind: 'weapon', id: 'steel_repeater', label: 'Steel Repeater', color: '#b8c9c5' },
  { kind: 'tether', id: 'lumen_tether', label: 'Glimmerline', color: '#4aa4ac' },
  { kind: 'food', id: 'food', label: 'Sunfruit', color: '#f2b64b' },
  { kind: 'build', id: 'build', label: 'Camp plans', color: '#638e57' },
  { kind: 'party', id: 'party', label: 'Trail party', color: '#d96f50' }
]);

function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
function lerpAngle(a, b, amount) {
  const difference = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + difference * amount;
}
function formatTime(seconds) {
  const totalMinutes = Math.floor(seconds / 60);
  return `${String(totalMinutes).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function hexToNumber(value, fallback = COLORS.growth) {
  try { return new THREE.Color(value).getHex(); } catch { return fallback; }
}
function creatureDisplayName(creature) {
  if (!creature) return 'Unknown Wildkin';
  if (creature.name) return creature.name;
  return SPECIES_DEFINITIONS[creature.speciesId]?.name ?? 'Wildkin';
}
function creatureTraitSummary(creature, species) {
  const stats = Object.entries(creature.stats ?? {}).map(([key, value]) => `${key} ${value}`).join(' · ');
  const temperament = creature.temperament ?? species.temperament;
  const coat = creature.color ?? SPECIES_COLORS[creature.speciesId];
  return `${creature.parentIds ? 'inherited ' : ''}${temperament} temperament · coat ${coat}${stats ? ` · ${stats}` : ''}`;
}
function readStoredTrail() {
  for (const key of [SAVE_KEY, ...LEGACY_SAVE_KEYS]) {
    const serialized = localStorage.getItem(key);
    if (!serialized) continue;
    const result = deserializeGameSave(serialized);
    if (result?.ok) return { key, result };
    if (key === SAVE_KEY) return { key, result };
  }
  return null;
}
function itemName(itemId) {
  if (RESOURCE_DEFINITIONS[itemId]) return RESOURCE_DEFINITIONS[itemId].name;
  const [kind, id] = itemId.split(':');
  if (kind === 'weapon') return weaponById(id)?.name ?? id;
  if (kind === 'structure') return STRUCTURE_DEFINITIONS[id]?.name ?? id;
  if (kind === 'tool' && id === 'lumen_tether') return 'Glimmerline spool';
  return itemId.replaceAll('_', ' ');
}
function setEntityRef(root, entity) {
  root.userData.entity = entity;
  root.traverse((child) => { child.userData.entity = entity; });
}
function seededValue(seed, salt = 0) {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

class ResourceNode {
  constructor(game, type, x, z, index) {
    this.game = game;
    this.id = `resource-${type}-${index}`;
    this.kind = 'resource';
    this.type = type;
    this.position = new THREE.Vector3(x, 0, z);
    this.maxHealth = RESOURCE_NODE_STATS[type].health;
    this.health = this.maxHealth;
    this.respawnTimer = 0;
    this.mesh = createResourceMesh(type, index);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = seededValue(game.state.seed, index) * Math.PI * 2;
    this.mesh.scale.setScalar(.88 + seededValue(game.state.seed + 11, index) * .24);
    setEntityRef(this.mesh, this);
    game.scene.add(this.mesh);
  }

  hit(power = 1) {
    if (!this.mesh.visible) return;
    this.health -= Math.max(1, power);
    this.mesh.scale.multiplyScalar(1.06);
    this.game.effects.push({ kind: 'scale-reset', target: this.mesh, life: .11, base: this.mesh.scale.x / 1.06 });
    this.game.audio.gather(this.type);
    this.game.emitMotes(this.position.clone().setY(this.type === 'wood' ? 4 : 1.5), RESOURCE_COLORS[this.type], 4);
    if (this.health > 0) return;
    this.mesh.visible = false;
    this.respawnTimer = RESOURCE_NODE_STATS[this.type].respawn;
    const count = RESOURCE_NODE_STATS[this.type].yield;
    for (let index = 0; index < count; index += 1) {
      const angle = index * Math.PI * 2 / count + seededValue(this.game.state.seed, index + this.position.x);
      this.game.spawnPickup(this.type, this.position.clone().add(new THREE.Vector3(Math.cos(angle) * 1.1, 1.2, Math.sin(angle) * 1.1)));
    }
  }

  update(delta) {
    if (this.mesh.visible || this.respawnTimer <= 0) return;
    this.respawnTimer -= delta;
    if (this.respawnTimer <= 0) {
      this.health = this.maxHealth;
      this.mesh.visible = true;
      this.mesh.scale.setScalar(.88 + seededValue(this.game.state.seed + 11, Number(this.id.replace(/\D/g, ''))) * .24);
    }
  }
}

class Pickup {
  constructor(game, type, position, source = 'gather') {
    this.game = game;
    this.id = `pickup-${game.nextId++}`;
    this.kind = 'pickup';
    this.type = type;
    this.source = source;
    this.position = position.clone();
    this.baseY = position.y;
    this.age = 0;
    this.mesh = createPickupMesh(type);
    this.mesh.position.copy(position);
    setEntityRef(this.mesh, this);
    game.scene.add(this.mesh);
  }

  update(delta) {
    this.age += delta;
    this.mesh.rotation.y += delta * 1.9;
    this.mesh.position.y = this.baseY + Math.sin(this.age * 3.4) * .22;
  }

  collect() {
    const result = addInventoryItem(this.game.state.inventory, this.type, 1);
    if (!result.accepted) { this.game.toast('Your pack is full. Collect the Field Cache first.'); return false; }
    this.game.state.inventory = result.inventory;
    if (this.source === 'gather') this.game.progress({ type: 'gather', resourceId: this.type });
    this.game.audio.gather(this.type);
    this.game.disposeTransient(this.mesh);
    this.game.pickups = this.game.pickups.filter((pickup) => pickup !== this);
    this.game.markDirty();
    return true;
  }
}

class KinEntity {
  constructor(game, data, mode = 'wild') {
    this.game = game;
    this.id = data.id;
    this.kind = mode === 'wild' ? 'wildkin' : 'kin';
    this.mode = mode;
    this.data = data;
    this.speciesId = data.speciesId;
    this.maxHealth = data.maxHealth ?? (this.speciesId === 'flintusk' ? 92 : this.speciesId === 'coaloon' ? 76 : 68);
    this.health = data.health ?? this.maxHealth;
    this.position = new THREE.Vector3(data.position?.x ?? 0, 0, data.position?.z ?? 0);
    this.velocity = new THREE.Vector3();
    this.wanderAngle = seededValue(game.state.seed, this.id.length) * Math.PI * 2;
    this.wanderTimer = 1 + seededValue(game.state.seed + 31, this.id.charCodeAt(0)) * 3;
    this.attackCooldown = .7 + seededValue(game.state.seed + 77, this.id.length) * 1.5;
    this.hitFlash = 0;
    this.captureAttempts = data.captureAttempts ?? 0;
    this.directHarvestReady = Boolean(data.directHarvestReady);
    this.carriedMesh = null;
    this.mesh = createWildkinMesh(this.speciesId, data.color ?? SPECIES_COLORS[this.speciesId], data.scale ?? (data.ageStage === 'baby' ? .55 : 1));
    this.mesh.position.copy(this.position);
    setEntityRef(this.mesh, this);
    game.scene.add(this.mesh);
  }

  persistPosition() {
    this.data.position = { x: this.position.x, z: this.position.z };
    this.data.health = this.health;
    this.data.captureAttempts = this.captureAttempts;
    this.data.directHarvestReady = this.directHarvestReady;
  }

  takeDamage(amount, fromPlayer = true) {
    if (this.mode !== 'wild') return;
    this.health = Math.max(1, this.health - Math.max(1, amount));
    this.hitFlash = .16;
    this.velocity.add(this.position.clone().sub(this.game.player.position).setY(0).normalize().multiplyScalar(2.5));
    this.game.audio.hit();
    this.game.emitMotes(this.position.clone().setY(2), '#d96f50', 6);
    if (fromPlayer) this.game.targetEntity = this;
    this.persistPosition();
  }

  setCarried(type) {
    if (this.carriedMesh) this.game.disposeTransient(this.carriedMesh);
    this.carriedMesh = type ? createPickupMesh(type, true) : null;
    if (this.carriedMesh) {
      this.carriedMesh.position.set(0, 4.9, 0);
      this.mesh.add(this.carriedMesh);
    }
  }

  updateWild(delta) {
    this.wanderTimer -= delta;
    const toPlayer = this.game.player.position.clone().sub(this.position).setY(0);
    const distance = toPlayer.length();
    if (distance < 11 && this.health < this.maxHealth * .72) {
      this.velocity.add(toPlayer.normalize().multiplyScalar(-delta * 7));
    } else if (distance < (['coaloon', 'rippletail', 'wickerwing'].includes(this.speciesId) ? 15 : 7.5) && this.attackCooldown <= 0) {
      const species = SPECIES_DEFINITIONS[this.speciesId];
      this.attackCooldown = species.attack.cooldownMs / 1000;
      if (['coaloon', 'rippletail', 'wickerwing'].includes(this.speciesId)) {
        const origin = this.position.clone().setY(this.speciesId === 'wickerwing' ? 3.2 : 2);
        const direction = this.game.player.position.clone().setY(2.3).sub(origin).normalize();
        this.game.projectiles.push(new Projectile(this.game, {
          position: origin,
          direction,
          speed: this.speciesId === 'wickerwing' ? 18 : this.speciesId === 'rippletail' ? 13 : 10,
          damage: species.attack.damage * .6,
          weaponId: `${this.speciesId}-attack`,
          hostile: true,
          life: 2.2,
          message: `${species.name} answered with ${species.attack.name}`
        }));
        this.game.audio.creature(this.speciesId, 'attack');
        this.game.emitMotes(origin, SPECIES_COLORS[this.speciesId], 7);
      } else {
        this.game.audio.creature(this.speciesId, 'attack');
        this.game.damagePlayer(species.attack.damage * .6, `${species.name} answered with ${species.attack.name}`);
        this.velocity.add(toPlayer.normalize().multiplyScalar(this.speciesId === 'flintusk' ? 8 : -2.5));
        if (this.speciesId === 'flintusk') this.mesh.rotation.x = -.14;
      }
    } else if (this.wanderTimer <= 0) {
      this.wanderTimer = 2.2 + Math.random() * 2.4;
      this.wanderAngle += (Math.random() - .5) * 1.8;
    }
    this.velocity.add(new THREE.Vector3(Math.sin(this.wanderAngle), 0, Math.cos(this.wanderAngle)).multiplyScalar(delta * .65));
    this.velocity.multiplyScalar(Math.max(0, 1 - delta * 2.8));
    this.position.addScaledVector(this.velocity, delta);
    if (this.position.length() > WORLD_RADIUS - 12) this.position.multiplyScalar((WORLD_RADIUS - 12) / this.position.length());
  }

  updateParty(delta, partyIndex) {
    const behind = new THREE.Vector3(
      Math.sin(this.game.player.yaw + Math.PI) * (4.3 + partyIndex * 1.9) + (partyIndex % 2 ? 2 : -2),
      0,
      Math.cos(this.game.player.yaw + Math.PI) * (4.3 + partyIndex * 1.9)
    );
    const target = this.game.player.position.clone().add(behind);
    const toTarget = target.sub(this.position);
    if (toTarget.length() > 28) this.position.copy(target);
    else if (toTarget.length() > 1.3) this.position.addScaledVector(toTarget.normalize(), delta * 6.2);
    const guardian = this.game.guardian;
    if (guardian?.active && !guardian.defeated && this.attackCooldown <= 0 && this.position.distanceTo(guardian.position) < 20) {
      this.attackCooldown = SPECIES_DEFINITIONS[this.speciesId].attack.cooldownMs / 1000;
      guardian.takeDamage(SPECIES_DEFINITIONS[this.speciesId].attack.damage * .32, false);
      this.game.audio.creature(this.speciesId, 'attack');
      this.game.emitMotes(guardian.position.clone().setY(5.5), SPECIES_COLORS[this.speciesId], 4);
    }
  }

  updateWorker(delta) {
    const worker = this.game.state.workers.find((entry) => entry.creatureId === this.id);
    if (!worker) return;
    const structure = worker.mode === 'traveling-to-feeder' || worker.mode === 'eating'
      ? this.game.structureByType('feeder')
      : worker.mode.includes('storage') || worker.mode === 'depositing' || worker.mode === 'waiting-for-storage'
        ? this.game.structureByType('storage_bin')
        : this.game.structures.find((entry) => entry.id === worker.stationId) ?? this.game.structureByType(WORK_SKILL_DEFINITIONS[worker.skill]?.stationTag ?? SPECIES_DEFINITIONS[this.speciesId].work.stationTag);
    const target = structure?.position ?? CAMP_CENTER;
    if (worker.mode.startsWith('traveling')) {
      const direction = target.clone().sub(this.position).setY(0);
      if (direction.length() > .8) this.position.addScaledVector(direction.normalize(), delta * clamp(direction.length() * .9, 4.8, 16));
    }
  }

  update(delta, index = 0) {
    this.attackCooldown -= delta;
    this.hitFlash = Math.max(0, this.hitFlash - delta);
    if (this.mode === 'wild') this.updateWild(delta);
    else if (this.data.assignment === 'party') this.updateParty(delta, index);
    else if (this.data.assignment === 'worker') this.updateWorker(delta);
    else {
      const target = CAMP_CENTER.clone().add(new THREE.Vector3(Math.sin(index * 2.2) * 5, 0, Math.cos(index * 1.7) * 5));
      const direction = target.sub(this.position).setY(0);
      if (direction.length() > 1.5) this.position.addScaledVector(direction.normalize(), delta * 2.2);
    }
    this.mesh.position.copy(this.position);
    if (this.velocity.lengthSq() > .05) this.mesh.rotation.y = lerpAngle(this.mesh.rotation.y, Math.atan2(this.velocity.x, this.velocity.z), delta * 7);
    const movement = this.mode === 'wild' ? this.velocity.length() : this.data.assignment === 'party' ? 1 : .4;
    const reducedMotion = this.game.state.settings.reducedMotion;
    this.mesh.position.y = (reducedMotion ? 0 : Math.sin(this.game.elapsed * (2.7 + movement) + index) * .08) + (this.speciesId === 'wickerwing' ? 1.6 : 0);
    this.mesh.rotation.z = reducedMotion ? 0 : Math.sin(this.game.elapsed * 2.4 + index) * .025;
    if (this.mesh.userData.wings && !reducedMotion) this.mesh.userData.wings.forEach((wing, wingIndex) => { wing.rotation.z = Math.sin(this.game.elapsed * 5 + wingIndex * Math.PI) * .16; });
    if (this.mesh.userData.ember) this.mesh.userData.ember.scale.setScalar(1 + Math.sin(this.game.elapsed * 5) * .14);
    if (this.hitFlash > 0) this.mesh.scale.setScalar((this.data.scale ?? 1) * 1.08);
    else this.mesh.scale.setScalar(this.data.scale ?? (this.data.ageStage === 'baby' ? .55 : 1));
    this.persistPosition();
  }
}

class StructureEntity {
  constructor(game, data) {
    this.game = game;
    this.id = data.id;
    this.kind = 'structure';
    this.type = data.type;
    this.data = data;
    this.position = new THREE.Vector3(data.x, 0, data.z);
    this.mesh = createStructureMesh(data.type);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = data.rotation ?? 0;
    setEntityRef(this.mesh, this);
    game.scene.add(this.mesh);
  }

  update(delta) {
    const moving = this.mesh.userData.movingPart;
    if (moving) moving.rotation.z += delta * .38;
    const glow = this.mesh.userData.glow;
    if (glow) glow.scale.setScalar(.9 + Math.sin(this.game.elapsed * 6) * .08);
    const cradle = this.mesh.userData.cradle;
    if (cradle && this.game.state.breedingSessions.some((session) => session.status === 'incubating')) cradle.rotation.y += delta * .7;
  }
}

class Projectile {
  constructor(game, { position, direction, speed, damage, weaponId, hostile = false, life = 2.4, message = 'A stone chime struck true' }) {
    this.game = game;
    this.id = `projectile-${game.nextId++}`;
    this.kind = 'projectile';
    this.position = position.clone();
    this.velocity = direction.clone().normalize().multiplyScalar(speed);
    this.damage = damage;
    this.weaponId = weaponId;
    this.hostile = hostile;
    this.message = message;
    this.life = life;
    this.mesh = createProjectileMesh(weaponId, hostile);
    this.mesh.position.copy(position);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    game.scene.add(this.mesh);
  }

  remove() {
    this.game.disposeTransient(this.mesh);
    this.game.projectiles = this.game.projectiles.filter((entry) => entry !== this);
  }

  update(delta) {
    this.life -= delta;
    this.position.addScaledVector(this.velocity, delta);
    this.mesh.position.copy(this.position);
    if (this.hostile && this.position.distanceTo(this.game.player.position.clone().setY(2.4)) < 1.7) {
      this.game.damagePlayer(this.damage, this.message);
      this.remove();
      return;
    }
    if (!this.hostile) {
      const wild = this.game.wildKin.find((kin) => kin.position.distanceTo(this.position.clone().setY(0)) < 2.2);
      if (wild) {
        wild.takeDamage(this.damage);
        this.remove();
        return;
      }
      if (this.game.guardian?.active && !this.game.guardian.defeated && this.game.guardian.position.distanceTo(this.position.clone().setY(0)) < 4.8) {
        this.game.guardian.takeDamage(this.damage, true);
        this.remove();
        return;
      }
    }
    if (this.life <= 0 || this.position.length() > WORLD_RADIUS + 30) this.remove();
  }
}

class GuardianEntity {
  constructor(game) {
    this.game = game;
    this.id = 'stormhollow';
    this.kind = 'guardian';
    this.position = GUARDIAN_POSITION.clone();
    this.maxHealth = 3200;
    this.health = game.state.guardian?.health ?? this.maxHealth;
    this.defeated = Boolean(game.state.guardian?.defeated);
    this.active = !this.defeated && game.hasWeapon('steel_repeater') && game.state.progress.counters.babiesBorn > 0;
    this.attackTimer = 2.5;
    this.telegraph = 0;
    this.mesh = createGuardianMesh();
    this.mesh.position.copy(this.position);
    this.mesh.visible = !this.defeated;
    setEntityRef(this.mesh, this);
    game.scene.add(this.mesh);
  }

  wake() {
    if (this.active || this.defeated) return;
    this.active = true;
    this.game.audio.guardian();
    this.game.toast('Stormhollow wakes beyond the wind arch. Bring your trail party.');
    this.game.emitMotes(this.position.clone().setY(7), '#f2b64b', 22);
  }

  takeDamage(amount, playerHit = true) {
    if (!this.active || this.defeated) {
      if (playerHit) this.game.toast('The ring-body sleeps behind a wind seal. Raise a baby and forge the Steel Repeater.');
      return;
    }
    const vulnerable = this.telegraph <= 0;
    const resolved = Math.max(1, amount * (vulnerable ? .58 : .24));
    this.health = Math.max(0, this.health - resolved);
    this.game.state.guardian.health = this.health;
    this.game.audio.hit();
    this.mesh.userData.core.scale.setScalar(1.35);
    this.game.effects.push({ kind: 'scale-reset', target: this.mesh.userData.core, life: .13, base: 1 });
    this.game.emitMotes(this.position.clone().setY(6), vulnerable ? '#f2b64b' : '#6f7f86', 5);
    if (this.health <= 0) this.defeat();
  }

  defeat() {
    if (this.defeated) return;
    this.defeated = true;
    this.active = false;
    this.game.state.guardian = { health: 0, defeated: true };
    this.game.progress({ type: 'defeat-guardian' });
    this.game.audio.guardian();
    this.game.emitMotes(this.position.clone().setY(6), '#f2b64b', 42);
    this.game.toast('Stormhollow releases its chime-core. Carry the song to the Wayfarer Beacon.');
    this.game.effects.push({ kind: 'guardian-fade', target: this.mesh, life: 1.3, base: 1 });
    this.game.markDirty();
  }

  volley() {
    const origin = this.position.clone().setY(6);
    const toward = this.game.player.position.clone().setY(2.4).sub(origin).normalize();
    for (let index = -2; index <= 2; index += 1) {
      const direction = toward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), index * .12);
      this.game.projectiles.push(new Projectile(this.game, { position: origin, direction, speed: 12, damage: 10, weaponId: 'guardian-chime', hostile: true, life: 4 }));
    }
    this.game.audio.guardian();
  }

  update(delta) {
    if (this.defeated) return;
    const data = this.mesh.userData;
    data.ring.rotation.z += delta * (this.active ? .48 : .08);
    data.inner.rotation.z -= delta * (this.active ? .72 : .12);
    data.chimes.forEach((chime, index) => {
      const angle = this.game.elapsed * (this.active ? .7 : .18) + index * Math.PI * 2 / data.chimes.length;
      chime.position.set(Math.cos(angle) * 5.1, 6.2 + Math.sin(angle) * 3.2, Math.sin(angle * .7) * .8);
    });
    if (!this.active) return;
    const distance = this.position.distanceTo(this.game.player.position);
    if (distance > 58) return;
    this.attackTimer -= delta;
    if (this.telegraph > 0) {
      this.telegraph -= delta;
      const pulse = 1 + (1 - this.telegraph / .75) * .45;
      data.ring.scale.setScalar(pulse);
      data.core.material.emissiveIntensity = 1.2 + pulse;
      if (this.telegraph <= 0) {
        data.ring.scale.setScalar(1);
        data.core.material.emissiveIntensity = 1;
        if (distance < 13) this.game.damagePlayer(18, 'Stormhollow’s wind ring broke over the camp');
        else this.volley();
        this.attackTimer = 2.2;
      }
    } else if (this.attackTimer <= 0) {
      this.telegraph = .75;
      this.game.audio.guardian();
    }
  }
}

class WildkinGame {
  constructor() {
    this.canvas = document.querySelector('#wildkin-canvas');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x86b6b1);
    this.scene.fog = new THREE.FogExp2(0x86b6b1, .0046);
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, .1, 800);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    const hemisphere = new THREE.HemisphereLight(0xd9f0df, 0x26383a, 2.35);
    this.scene.add(hemisphere);
    this.sun = new THREE.DirectionalLight(0xffe1a4, 3.6);
    this.sun.position.set(72, 112, 55);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1536, 1536);
    this.sun.shadow.camera.left = -155;
    this.sun.shadow.camera.right = 155;
    this.sun.shadow.camera.top = 155;
    this.sun.shadow.camera.bottom = -155;
    this.sun.shadow.camera.near = 5;
    this.sun.shadow.camera.far = 320;
    this.scene.add(this.sun);
    this.rim = new THREE.DirectionalLight(0x6fb4be, 1.15);
    this.rim.position.set(-80, 36, -95);
    this.scene.add(this.rim);

    this.world = createWorld(this.scene, 481516);
    this.playerMesh = createPlayerMesh();
    this.scene.add(this.playerMesh);
    this.glimmerline = createGlimmerline();
    this.scene.add(this.glimmerline);

    this.audio = new WildkinAudio(.65);
    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();
    this.keys = new Set();
    this.pointerLocked = false;
    this.canvasEngaged = false;
    this.mouseDragging = false;
    this.mouseDragDistance = 0;
    this.mousePressWasFirstEngagement = false;
    this.mousePrimaryHeld = false;
    this.mouseHoldActed = false;
    this.mousePressStartedAt = 0;
    this.playing = false;
    this.paused = true;
    this.panelOpen = null;
    this.titleSettingsDirty = false;
    this.nextId = 1;
    this.state = this.withRuntimeDefaults(createGameState());
    this.elapsed = 0;
    this.autosaveTimer = 0;
    this.uiTimer = 0;
    this.selectedSlot = 0;
    this.lastShotAt = -99;
    this.lastDodgeAt = -99;
    this.targetEntity = null;
    this.captureTarget = null;
    this.captureProgress = 0;
    this.captureKnot = 0;
    this.buildMode = null;
    this.buildRotation = 0;
    this.buildGhost = null;
    this.dirty = false;
    this.toastTimer = null;
    this.resources = [];
    this.pickups = [];
    this.wildKin = [];
    this.kin = [];
    this.structures = [];
    this.projectiles = [];
    this.effects = [];
    this.motes = [];
    this.guardian = null;
    this.player = {
      position: new THREE.Vector3(0, 0, 38),
      velocity: new THREE.Vector3(),
      yaw: 0,
      pitch: -.16,
      onGround: true,
      dodgeVelocity: new THREE.Vector3(),
      moveAmount: 0
    };

    this.bindEvents();
    this.refreshContinueButton();
    this.resetRuntime();
    this.animate();
  }

  withRuntimeDefaults(state) {
    state.baseStorage = state.baseStorage ?? {};
    state.feederFood = Number.isFinite(state.feederFood) ? state.feederFood : 0;
    state.broodCount = Number.isInteger(state.broodCount) && state.broodCount >= 0 ? state.broodCount : state.breedingSessions.length;
    state.capturedWildIds = Array.isArray(state.capturedWildIds) ? state.capturedWildIds : [];
    state.stats = {
      gathered: state.stats?.gathered ?? 0,
      captures: state.stats?.captures ?? 0,
      workerDeposits: state.stats?.workerDeposits ?? 0,
      shots: state.stats?.shots ?? 0,
      respawns: state.stats?.respawns ?? 0,
      startedAt: state.stats?.startedAt ?? Date.now()
    };
    state.settings = {
      volume: state.settings?.volume ?? .65,
      sensitivity: state.settings?.sensitivity ?? .85,
      renderScale: state.settings?.renderScale ?? 1,
      reducedMotion: Boolean(state.settings?.reducedMotion)
    };
    state.guardian = {
      health: Number.isFinite(state.guardian?.health) ? state.guardian.health : 3200,
      defeated: Boolean(state.guardian?.defeated)
    };
    state.player = {
      health: Number.isFinite(state.player?.health) ? state.player.health : 100,
      stamina: Number.isFinite(state.player?.stamina) ? state.player.stamina : 100,
      hunger: Number.isFinite(state.player?.hunger) ? state.player.hunger : 100,
      position: state.player?.position ?? { x: 0, y: 0, z: 38 },
      yaw: Number.isFinite(state.player?.yaw) ? state.player.yaw : 0,
      pitch: Number.isFinite(state.player?.pitch) ? state.player.pitch : -.16
    };
    state.victory = Boolean(state.victory || state.progress?.victory);
    return state;
  }

  removeRuntimeObject(object) {
    if (object?.mesh) this.disposeTransient(object.mesh);
  }

  disposeTransient(root) {
    if (!root) return;
    root.removeFromParent?.();
    root.traverse?.((child) => child.geometry?.dispose?.());
  }

  clearRuntime() {
    [...this.resources, ...this.pickups, ...this.wildKin, ...this.kin, ...this.structures, ...this.projectiles].forEach((entry) => this.removeRuntimeObject(entry));
    this.effects.forEach((effect) => { if (effect.mesh) this.disposeTransient(effect.mesh); });
    this.motes.forEach((mote) => this.disposeTransient(mote.mesh));
    if (this.guardian?.mesh) this.disposeTransient(this.guardian.mesh);
    this.resources = [];
    this.pickups = [];
    this.wildKin = [];
    this.kin = [];
    this.structures = [];
    this.projectiles = [];
    this.effects = [];
    this.motes = [];
    this.guardian = null;
    this.cancelBuild();
  }

  resetRuntime() {
    this.clearRuntime();
    this.elapsed = this.state.elapsedMs / 1000;
    this.lastShotAt = this.elapsed - 99;
    this.lastDodgeAt = this.elapsed - 99;
    this.lastDamageAt = this.elapsed - 99;
    this.captureMissingToastAt = this.elapsed - 99;
    this.captureTarget = null;
    this.captureProgress = 0;
    this.captureKnot = 0;
    this.autosaveTimer = 0;
    this.keys.clear();
    this.canvasEngaged = false;
    this.mouseDragging = false;
    this.mouseDragDistance = 0;
    this.mousePressWasFirstEngagement = false;
    this.mousePrimaryHeld = false;
    this.mouseHoldActed = false;
    this.mousePressStartedAt = 0;
    this.buildRotation = 0;
    this.player.position.set(this.state.player.position.x ?? 0, this.state.player.position.y ?? 0, this.state.player.position.z ?? 38);
    this.player.velocity.set(0, 0, 0);
    this.player.yaw = this.state.player.yaw ?? 0;
    this.player.pitch = this.state.player.pitch ?? -.16;
    this.playerMesh.position.copy(this.player.position);

    RESOURCE_LAYOUT.forEach(([type, x, z], index) => this.resources.push(new ResourceNode(this, type, x, z, index)));
    const capturedIds = new Set(this.state.capturedWildIds);
    for (const layout of WILD_LAYOUT) {
      if (capturedIds.has(layout.id)) continue;
      this.wildKin.push(new KinEntity(this, {
        ...layout,
        position: { x: layout.x, z: layout.z },
        color: SPECIES_COLORS[layout.speciesId],
        ageStage: 'adult',
        temperament: SPECIES_DEFINITIONS[layout.speciesId].temperament,
        workSkill: SPECIES_DEFINITIONS[layout.speciesId].work.skill
      }, 'wild'));
    }
    for (const creature of this.state.creatures) {
      creature.assignment = creature.assignment ?? 'roster';
      creature.position = creature.position ?? { x: CAMP_CENTER.x + Math.random() * 4, z: CAMP_CENTER.z + Math.random() * 4 };
      this.kin.push(new KinEntity(this, creature, 'captured'));
    }
    for (const worker of this.state.workers) {
      const creature = this.kin.find((entry) => entry.id === worker.creatureId);
      if (creature && worker.carried) creature.setCarried(Object.keys(worker.carried)[0] ?? null);
    }
    for (const structure of this.state.placedStructures) this.structures.push(new StructureEntity(this, structure));
    this.guardian = new GuardianEntity(this);
    setEntityRef(this.world.beacon, this.world.beacon.userData);
    this.world.beacon.userData.core.visible = false;
    this.world.beacon.userData.beam.visible = false;
    this.world.beacon.userData.activated = false;
    if (this.state.victory || this.state.progress.counters.beaconActivated > 0) activateBeacon(this.world.beacon);
    this.audio.setVolume(this.state.settings.volume);
    document.querySelector('#volume-input').value = Math.round(this.state.settings.volume * 100);
    document.querySelector('#sensitivity-input').value = Math.round(this.state.settings.sensitivity * 100);
    document.querySelector('#render-scale').value = String(this.state.settings.renderScale);
    document.querySelector('#reduced-motion').checked = this.state.settings.reducedMotion;
    document.documentElement.classList.toggle('reduce-motion', this.state.settings.reducedMotion);
    this.applyRenderScale();
    this.updateAllUi(true);
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.applyRenderScale();
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (this.playing && !this.pointerLocked && !this.panelOpen && !this.paused) this.openPause();
    });
    document.addEventListener('mousemove', (event) => {
      if ((!this.pointerLocked && !this.mouseDragging) || this.paused || this.panelOpen) return;
      if (this.mouseDragging) this.mouseDragDistance += Math.hypot(event.movementX, event.movementY);
      if (this.mouseDragDistance >= 6) this.mousePrimaryHeld = false;
      const sensitivity = .0018 * this.state.settings.sensitivity;
      this.player.yaw -= event.movementX * sensitivity;
      this.player.pitch = clamp(this.player.pitch - event.movementY * sensitivity, -.75, .5);
    });
    window.addEventListener('mouseup', (event) => {
      const shouldAct = event.button === 0
        && this.mouseDragging
        && this.mouseDragDistance < 6
        && !this.mousePressWasFirstEngagement
        && !this.mouseHoldActed
        && this.playing
        && !this.paused
        && !this.panelOpen;
      this.mouseDragging = false;
      this.mouseDragDistance = 0;
      this.mousePressWasFirstEngagement = false;
      this.mousePrimaryHeld = false;
      this.mouseHoldActed = false;
      this.mousePressStartedAt = 0;
      if (shouldAct) this.primaryAction();
    });
    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDragging = false;
      this.mousePrimaryHeld = false;
      this.mouseDragDistance = 0;
    });
    this.canvas.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || !this.playing || this.paused || this.panelOpen) return;
      const firstEngagement = !this.canvasEngaged;
      this.canvasEngaged = true;
      this.mouseDragging = true;
      this.mouseDragDistance = 0;
      this.mousePressWasFirstEngagement = firstEngagement;
      this.mousePrimaryHeld = true;
      this.mouseHoldActed = false;
      this.mousePressStartedAt = performance.now();
      this.canvas.focus({ preventScroll: true });
    });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    document.querySelector('#new-game-button').addEventListener('click', () => this.openPanel('reset-panel', { modal: true, fromTitle: true }));
    document.querySelector('#continue-button').addEventListener('click', () => this.continueGame());
    document.querySelector('#title-help-button').addEventListener('click', () => this.openPanel('settings-panel', { modal: true, fromTitle: true }));
    document.querySelector('#confirm-reset-button').addEventListener('click', () => this.startNewGame());
    document.querySelector('#begin-expedition-button').addEventListener('click', () => {
      this.enterWorld();
      this.toast('Empty hands. Open ground. Follow the braided trail.');
    });
    document.querySelector('#resume-button').addEventListener('click', () => this.resumeGame());
    document.querySelector('#settings-button').addEventListener('click', () => this.openPanel('settings-panel', { modal: true }));
    document.querySelector('#save-quit-button').addEventListener('click', () => this.saveAndTitle());
    document.querySelector('#collect-cache-button').addEventListener('click', () => this.collectCache());
    document.querySelector('#continue-sandbox-button').addEventListener('click', () => this.continueSandbox());
    document.querySelector('#new-run-button').addEventListener('click', () => this.openPanel('reset-panel', { modal: true }));
    document.querySelector('#volume-input').addEventListener('input', (event) => {
      this.state.settings.volume = Number(event.target.value) / 100;
      this.audio.setVolume(this.state.settings.volume);
      if (!this.playing) this.titleSettingsDirty = true;
      this.markDirty();
    });
    document.querySelector('#sensitivity-input').addEventListener('input', (event) => {
      this.state.settings.sensitivity = Number(event.target.value) / 100;
      if (!this.playing) this.titleSettingsDirty = true;
      this.markDirty();
    });
    document.querySelector('#render-scale').addEventListener('change', (event) => {
      this.state.settings.renderScale = Number(event.target.value);
      this.applyRenderScale();
      if (!this.playing) this.titleSettingsDirty = true;
      this.markDirty();
    });
    document.querySelector('#reduced-motion').addEventListener('change', (event) => {
      this.state.settings.reducedMotion = event.target.checked;
      document.documentElement.classList.toggle('reduce-motion', event.target.checked);
      if (!this.playing) this.titleSettingsDirty = true;
      this.markDirty();
    });

    document.querySelectorAll('[data-close-panel]').forEach((button) => button.addEventListener('click', () => this.closePanel(button.dataset.closePanel)));
    document.querySelectorAll('[data-inventory-tab]').forEach((button) => button.addEventListener('click', () => this.switchInventoryTab(button.dataset.inventoryTab)));
  }

  onKeyDown(event) {
    if (!this.playing) return;
    if (event.code === 'Escape') {
      if (this.buildMode) { this.cancelBuild(); return; }
      if (this.panelOpen) { this.closePanel(this.panelOpen); return; }
      if (!this.paused) this.openPause();
      return;
    }
    if (this.paused) return;
    const interactiveTarget = event.target instanceof Element && Boolean(event.target.closest('button, input, select, textarea, a'));
    if (this.panelOpen && interactiveTarget) return;
    if ((this.pointerLocked || this.canvasEngaged) && ['Tab', 'Space'].includes(event.code)) event.preventDefault();
    if (this.pointerLocked || this.canvasEngaged || this.buildMode) this.keys.add(event.code);
    if (/^Digit[1-8]$/.test(event.code) && (this.pointerLocked || this.canvasEngaged)) {
      this.selectedSlot = Number(event.code.slice(-1)) - 1;
      this.updateHotbar();
      return;
    }
    if (event.code === 'Tab' || event.code === 'KeyI') this.togglePanel('inventory-panel');
    else if (event.code === 'KeyB') this.togglePanel('build-panel');
    else if (event.code === 'KeyE') this.interact();
    else if (event.code === 'KeyR' && this.buildMode) this.buildRotation += Math.PI / 4;
    else if ((event.code === 'ControlLeft' || event.code === 'ControlRight')) this.dodge();
  }

  applyRenderScale() {
    const scale = this.state.settings.renderScale ?? 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75) * scale);
  }

  refreshContinueButton() {
    const button = document.querySelector('#continue-button');
    const save = readStoredTrail()?.result;
    button.disabled = !save?.ok;
    button.textContent = save?.ok ? `Continue · ${formatTime((save.game.elapsedMs ?? 0) / 1000)}` : 'No saved trail';
  }

  startNewGame() {
    const retainedSettings = { ...this.state.settings };
    [SAVE_KEY, ...LEGACY_SAVE_KEYS].forEach((key) => localStorage.removeItem(key));
    const seed = 481516 + Math.floor(Math.random() * 100000);
    this.state = this.withRuntimeDefaults(createGameState({ seed }));
    this.state.settings = retainedSettings;
    this.state.guardian = { health: 3200, defeated: false };
    this.state.player.position = { x: 0, y: 0, z: 38 };
    this.state.stats.startedAt = Date.now();
    this.resetRuntime();
    this.closeAllPanels();
    this.openPanel('onboarding-panel', { modal: true, fromTitle: true });
  }

  continueGame() {
    const stored = readStoredTrail();
    const result = stored?.result;
    if (!result?.ok) {
      this.toast('That trail could not be read safely. Start a new one; the broken data was not loaded.');
      this.refreshContinueButton();
      return;
    }
    if (stored.key !== SAVE_KEY || result.migratedFrom) {
      localStorage.setItem(SAVE_KEY, serializeGameSave(result.game, { savedAt: result.envelope?.savedAt ?? Date.now() }));
    }
    const titleSettings = this.titleSettingsDirty ? { ...this.state.settings } : null;
    this.state = this.withRuntimeDefaults(result.game);
    if (titleSettings) this.state.settings = titleSettings;
    this.resetRuntime();
    this.enterWorld();
    if (result.migratedFrom) this.toast(`Save upgraded safely from version ${result.migratedFrom}.`);
  }

  enterWorld() {
    this.audio.unlock().catch((error) => console.warn('Wildkin audio stayed muted until the next interaction.', error));
    document.querySelector('#title-screen').classList.remove('is-visible');
    document.querySelector('#game-hud').classList.remove('is-hidden');
    this.closeAllPanels();
    this.playing = true;
    this.paused = false;
    this.canvasEngaged = true;
    this.titleSettingsDirty = false;
    this.clock.getDelta();
    this.canvas.focus({ preventScroll: true });
    this.updateAllUi(true);
  }

  saveAndTitle() {
    this.save(true);
    this.playing = false;
    this.paused = true;
    document.exitPointerLock?.();
    this.closeAllPanels();
    document.querySelector('#game-hud').classList.add('is-hidden');
    document.querySelector('#title-screen').classList.add('is-visible');
    this.refreshContinueButton();
  }

  resumeGame() {
    this.closeAllPanels();
    this.paused = false;
    this.canvas.focus({ preventScroll: true });
  }

  openPause() {
    if (!this.playing) return;
    this.paused = true;
    this.openPanel('pause-panel', { modal: true });
    document.exitPointerLock?.();
  }

  openPanel(id, { modal = false, fromTitle = false } = {}) {
    const previousPanel = this.panelOpen && this.panelOpen !== id ? this.panelOpen : null;
    if (previousPanel) document.querySelector(`#${previousPanel}`)?.classList.add('is-hidden');
    this.panelOpen = id;
    const panel = document.querySelector(`#${id}`);
    panel?.classList.remove('is-hidden');
    if (panel) {
      panel.dataset.fromTitle = String(fromTitle);
      panel.dataset.returnPanel = previousPanel ?? '';
    }
    if (!modal && this.playing) document.exitPointerLock?.();
    if (id === 'inventory-panel') this.renderInventoryPanel();
    if (id === 'build-panel') this.renderBuildPanel();
    if (id === 'work-panel') this.renderCache();
    if (id === 'nursery-panel') this.renderNursery();
    requestAnimationFrame(() => panel?.querySelector('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')?.focus({ preventScroll: true }));
  }

  closePanel(id) {
    const panel = document.querySelector(`#${id}`);
    const fromTitle = panel?.dataset.fromTitle === 'true';
    const returnPanel = panel?.dataset.returnPanel;
    panel?.classList.add('is-hidden');
    if (this.panelOpen === id) this.panelOpen = null;
    if (id === 'pause-panel' && this.playing) this.paused = false;
    if (returnPanel && this.playing && this.paused) {
      const previous = document.querySelector(`#${returnPanel}`);
      previous?.classList.remove('is-hidden');
      this.panelOpen = returnPanel;
      requestAnimationFrame(() => previous?.querySelector('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')?.focus({ preventScroll: true }));
      return;
    }
    if (this.playing && !this.paused && !fromTitle) this.canvas.focus({ preventScroll: true });
  }

  closeAllPanels() {
    document.querySelectorAll('.game-panel, .modal-layer').forEach((panel) => panel.classList.add('is-hidden'));
    this.panelOpen = null;
  }

  togglePanel(id) {
    if (this.panelOpen === id) this.closePanel(id);
    else this.openPanel(id);
  }

  switchInventoryTab(tab) {
    document.querySelectorAll('[data-inventory-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.inventoryTab === tab));
    ['craft', 'pack', 'kin'].forEach((view) => document.querySelector(`#${view}-view`).classList.toggle('is-hidden', view !== tab));
    if (tab === 'kin') this.renderKinRoster();
    if (tab === 'pack') this.renderPack();
  }

  markDirty() { this.dirty = true; }

  syncStateFromRuntime() {
    this.state.elapsedMs = Math.floor(this.elapsed * 1000);
    this.state.player.health = this.state.player.health ?? 100;
    this.state.player.stamina = this.state.player.stamina ?? 100;
    this.state.player.hunger = this.state.player.hunger ?? 100;
    this.state.player.position = { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z };
    this.state.player.yaw = this.player.yaw;
    this.state.player.pitch = this.player.pitch;
    this.kin.forEach((kin) => kin.persistPosition());
  }

  save(force = false) {
    if (!this.playing && !force) return;
    this.syncStateFromRuntime();
    try {
      localStorage.setItem(SAVE_KEY, serializeGameSave(this.state, { savedAt: Date.now() }));
      this.dirty = false;
      if (force) this.toast('Trail saved locally.');
    } catch (error) {
      console.error('Wildkin save failed', error);
      this.toast('The trail could not be saved. Your current session is still running.');
    }
  }

  progress(event) {
    const before = this.state.progress.activeQuestId;
    this.state.progress = recordProgressEvent(this.state.progress, event);
    const after = this.state.progress.activeQuestId;
    if (before !== after) {
      const completed = QUEST_DEFINITIONS.find((quest) => quest.id === before);
      if (completed) {
        this.toast(`Trail complete: ${completed.title}`);
        this.audio.craft(2);
      }
    }
    this.markDirty();
    this.updateQuest();
    this.renderInventoryPanel();
  }

  stationTags() {
    return [...new Set(this.state.placedStructures.flatMap((structure) => STRUCTURE_DEFINITIONS[structure.type]?.stationTags ?? []))];
  }

  hasWeapon(id) { return inventoryCount(this.state.inventory, `weapon:${id}`) > 0; }

  craft(recipeId) {
    const result = craftRecipe(this.state.inventory, recipeId, {
      progress: this.state.progress,
      stationTags: this.stationTags()
    });
    if (!result.ok) {
      if (result.reason === 'resources') {
        const missing = Object.entries(result.missing).map(([id, amount]) => `${amount} ${itemName(id)}`).join(', ');
        this.toast(`Still needed: ${missing}.`);
      } else if (result.reason === 'station-required') this.toast(`Use ${result.absentStations.map((tag) => tag === 'workbench' ? 'the Hearthbench' : tag === 'forge' ? 'the Emberbell Forge' : tag).join(' + ')}.`);
      else if (result.reason === 'locked') this.toast('Follow the braided trail to learn that plan.');
      else if (result.reason === 'item-required') this.toast(`Keep your ${Object.entries(result.missingRequirements).map(([id]) => itemName(id)).join(' + ')} before upgrading.`);
      else this.toast('That craft cannot fit in your pack yet.');
      return;
    }
    this.state.inventory = result.inventory;
    this.progress({ type: 'craft', recipeId });
    this.audio.craft(weaponById(recipeId)?.tier ?? (recipeId.includes('steel') ? 3 : 1));
    this.emitMotes(this.player.position.clone().setY(3), recipeId.includes('steel') ? '#b8c9c5' : '#f2b64b', 10);
    if (recipeId === 'steel_repeater' && this.state.progress.counters.babiesBorn > 0) this.guardian.wake();
    this.toast(`Made ${RECIPE_DEFINITIONS[recipeId].name}.`);
    this.renderInventoryPanel();
    this.updateAllUi(true);
  }

  renderInventoryPanel() {
    if (!document.querySelector('#inventory-panel')) return;
    const grid = document.querySelector('#recipe-grid');
    grid.innerHTML = '';
    for (const recipe of Object.values(RECIPE_DEFINITIONS)) {
      if (recipe.id === 'beacon') continue;
      const evaluation = evaluateRecipe(recipe.id, { inventory: this.state.inventory, progress: this.state.progress, stationTags: this.stationTags() });
      const card = document.createElement('article');
      card.className = `recipe-card ${evaluation.reason === 'locked' ? 'is-locked' : ''}`;
      const missing = inventoryMissing(this.state.inventory, recipe.costs);
      const requirements = Object.entries(recipe.requiredItems ?? {}).map(([id]) => `<span class="cost-chip ${inventoryCount(this.state.inventory, id) ? '' : 'is-missing'}">keep ${itemName(id)}</span>`).join('');
      card.innerHTML = `<span class="kicker">${recipe.output.kind.toUpperCase()}</span><h3>${recipe.name}</h3><p>${this.recipeDescription(recipe.id)}</p><div class="cost-row">${Object.entries(recipe.costs).map(([id, amount]) => `<span class="cost-chip ${missing[id] ? 'is-missing' : ''}">${amount} ${RESOURCE_DEFINITIONS[id]?.name ?? id}</span>`).join('')}${requirements}</div><button ${evaluation.ok ? '' : 'disabled'}>${evaluation.ok ? 'Make it' : evaluation.reason === 'locked' ? 'Trail locked' : evaluation.reason === 'station-required' ? 'Needs station' : evaluation.reason === 'item-required' ? 'Needs prior launcher' : 'Missing supplies'}</button>`;
      card.querySelector('button').addEventListener('click', () => this.craft(recipe.id));
      grid.appendChild(card);
    }
    this.renderPack();
    this.renderKinRoster();
  }

  recipeDescription(id) {
    const descriptions = {
      workbench: STRUCTURE_DESCRIPTIONS.workbench,
      storage_bin: STRUCTURE_DESCRIPTIONS.storage_bin,
      wooden_springcaster: 'A quick bent-wood arm for gentle, readable combat.',
      lumen_tether: 'Two braided-light bonding attempts. Hold C on a weakened Wildkin.',
      feeder: STRUCTURE_DESCRIPTIONS.feeder,
      farm: STRUCTURE_DESCRIPTIONS.farm,
      stonebolt_launcher: 'A slower flywheel shot with enough weight to stagger.',
      forge: STRUCTURE_DESCRIPTIONS.forge,
      nursery: STRUCTURE_DESCRIPTIONS.nursery,
      steel_ingot: 'Refine two Star-iron into one bright Bloomsteel ingot.',
      steel_repeater: 'The frontier’s final three-chamber power spike.'
    };
    return descriptions[id] ?? 'A useful frontier craft.';
  }

  renderPack() {
    const grid = document.querySelector('#inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const entries = Object.entries(this.state.inventory.items);
    if (!entries.length) grid.innerHTML = '<p>Your pack is empty. The first loose supplies wait around camp.</p>';
    for (const [id, amount] of entries) {
      const color = RESOURCE_COLORS[id] ?? (id.includes('steel') ? '#b8c9c5' : id.includes('tether') ? '#4aa4ac' : id.includes('weapon') ? '#d96f50' : '#638e57');
      const item = document.createElement('article');
      item.className = 'inventory-item';
      item.innerHTML = `<i style="--item-color:${color}"></i><strong>${itemName(id)}</strong><span>× ${amount}</span>`;
      grid.appendChild(item);
    }
  }

  renderBuildPanel() {
    const grid = document.querySelector('#structure-grid');
    grid.innerHTML = '';
    for (const type of ['workbench', 'storage_bin', 'feeder', 'farm', 'forge', 'nursery']) {
      const definition = STRUCTURE_DEFINITIONS[type];
      const count = inventoryCount(this.state.inventory, `structure:${type}`);
      const card = document.createElement('article');
      card.className = `structure-card ${count ? '' : 'is-locked'}`;
      card.innerHTML = `<span class="kicker">PLAN × ${count}</span><h3>${definition.name}</h3><p>${STRUCTURE_DESCRIPTIONS[type]}</p><button ${count ? '' : 'disabled'}>${count ? 'Place this plan' : 'Craft in pack first'}</button>`;
      card.querySelector('button').addEventListener('click', () => this.beginBuild(type));
      grid.appendChild(card);
    }
  }

  beginBuild(type) {
    if (!inventoryCount(this.state.inventory, `structure:${type}`)) return;
    this.closePanel('build-panel');
    this.cancelBuild();
    this.buildMode = type;
    this.buildGhost = createStructureMesh(type, true);
    this.scene.add(this.buildGhost);
    this.toast(`Placing ${STRUCTURE_DEFINITIONS[type].name}. Click to place · R rotates · Esc cancels.`);
    this.canvas.focus({ preventScroll: true });
  }

  cancelBuild() {
    if (this.buildGhost) this.disposeTransient(this.buildGhost);
    this.buildGhost = null;
    this.buildMode = null;
  }

  buildPosition() {
    const forward = new THREE.Vector3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw)).multiplyScalar(-10);
    const position = this.player.position.clone().add(forward).setY(0);
    position.x = Math.round(position.x * 2) / 2;
    position.z = Math.round(position.z * 2) / 2;
    return position;
  }

  buildIsValid(position) {
    if (position.distanceTo(CAMP_CENTER) > 48) return false;
    if (position.length() > WORLD_RADIUS - 14) return false;
    return this.structures.every((structure) => structure.position.distanceTo(position) > 6.2);
  }

  placeBuild() {
    if (!this.buildMode || !this.buildGhost) return false;
    const position = this.buildPosition();
    if (!this.buildIsValid(position)) { this.toast('Move the ghost inside camp and away from another structure.'); return true; }
    const removed = removeInventoryItems(this.state.inventory, { [`structure:${this.buildMode}`]: 1 });
    if (!removed.ok) { this.cancelBuild(); return true; }
    this.state.inventory = removed.inventory;
    const data = { id: `structure-${this.buildMode}-${this.nextId++}`, type: this.buildMode, x: position.x, z: position.z, rotation: this.buildRotation };
    this.state.placedStructures.push(data);
    this.structures.push(new StructureEntity(this, data));
    this.progress({ type: 'place', structureId: data.type });
    this.audio.craft(1);
    this.emitMotes(position.clone().setY(2), '#f2b64b', 14);
    this.toast(`${STRUCTURE_DEFINITIONS[data.type].name} is ready.`);
    const placedType = this.buildMode;
    this.cancelBuild();
    if (placedType === 'storage_bin' && Object.keys(this.state.baseStorage).length) this.toast('The Field Cache remembers every worker deposit.');
    this.updateAllUi(true);
    return true;
  }

  renderKinRoster() {
    const roster = document.querySelector('#kin-roster');
    if (!roster) return;
    roster.innerHTML = '';
    if (!this.state.creatures.length) {
      roster.innerHTML = '<p>Weaken a Wildkin, then hold <kbd>C</kbd> to braid a Glimmerline bond.</p>';
      return;
    }
    for (const creature of this.state.creatures) {
      const species = SPECIES_DEFINITIONS[creature.speciesId];
      const card = document.createElement('article');
      card.className = 'kin-card';
      const assignment = creature.assignment === 'worker' ? 'working at camp' : creature.assignment === 'party' ? 'in trail party' : creature.ageStage === 'baby' ? 'growing at camp' : 'resting at camp';
      card.innerHTML = `<i class="kin-orb" style="--kin-color:${creature.color ?? SPECIES_COLORS[creature.speciesId]}"></i><div class="kin-copy"><strong>${creatureDisplayName(creature)} ${creature.sex === 'female' ? '♀' : creature.sex === 'male' ? '♂' : ''}</strong><small>${creature.ageStage === 'baby' ? 'baby · ' : ''}${creature.workSkill ?? species.work.skill} · ${species.attack.name} · ${assignment}</small><small class="kin-inheritance">${creatureTraitSummary(creature, species)}</small></div><div class="kin-actions"><button data-party>Party</button><button data-work>Work</button></div>`;
      card.querySelector('[data-party]').disabled = creature.ageStage === 'baby' || creature.assignment === 'party';
      card.querySelector('[data-work]').disabled = creature.ageStage === 'baby' || creature.assignment === 'worker';
      card.querySelector('[data-party]').addEventListener('click', () => this.assignCreature(creature.id, 'party'));
      card.querySelector('[data-work]').addEventListener('click', () => this.assignCreature(creature.id, 'worker'));
      roster.appendChild(card);
    }
  }

  structureByType(typeOrTag) {
    return this.structures.find((structure) => structure.type === typeOrTag || STRUCTURE_DEFINITIONS[structure.type]?.stationTags.includes(typeOrTag)) ?? null;
  }

  assignCreature(creatureId, assignment) {
    const creature = this.state.creatures.find((entry) => entry.id === creatureId);
    if (!creature || creature.ageStage === 'baby') return;
    if (assignment === 'party') {
      const party = this.state.creatures.filter((entry) => entry.assignment === 'party' && entry.id !== creatureId);
      if (party.length >= 2) party[0].assignment = 'roster';
      creature.assignment = 'party';
      this.state.workers = this.state.workers.filter((worker) => worker.creatureId !== creatureId);
      this.toast(`${creatureDisplayName(creature)} joins the trail party.`);
    } else {
      const species = SPECIES_DEFINITIONS[creature.speciesId];
      const inheritedWork = WORK_SKILL_DEFINITIONS[creature.workSkill] ?? species.work;
      const station = this.structureByType(inheritedWork.stationTag);
      const storage = this.structureByType('storage_bin');
      if (!station || !storage) {
        this.toast(`Build ${!storage ? 'a Field Cache' : `a ${inheritedWork.stationTag === 'forge' ? 'Forge' : inheritedWork.stationTag === 'farm' ? 'Sunpatch' : inheritedWork.stationTag === 'workbench' ? 'Hearthbench' : 'matching station'}`} first.`);
        return;
      }
      creature.assignment = 'worker';
      this.state.workers = this.state.workers.filter((worker) => worker.creatureId !== creatureId);
      this.state.workers.push(createWorker({
        id: `worker-${creatureId}`,
        creatureId,
        speciesId: creature.speciesId,
        stationId: station.id,
        storageId: storage.id,
        workSkill: creature.workSkill,
        workRate: 1 + ((creature.stats?.work ?? 50) - 50) / 180
      }));
      this.progress({ type: 'assign-worker' });
      this.toast(`${creatureDisplayName(creature)} starts ${inheritedWork.id}. Watch each trip between station, trough, and cache.`);
    }
    this.markDirty();
    this.renderKinRoster();
    this.updatePartyUi();
  }

  renderCache() {
    const grid = document.querySelector('#cache-grid');
    grid.innerHTML = '';
    const entries = Object.entries(this.state.baseStorage).filter(([, amount]) => amount > 0);
    if (!entries.length) grid.innerHTML = '<p>No uncollected deposits yet. A worker visibly carries each finished stack here.</p>';
    for (const [id, amount] of entries) {
      const item = document.createElement('article');
      item.className = 'cache-item';
      item.innerHTML = `<span>${itemName(id)}</span><strong>${amount}</strong>`;
      grid.appendChild(item);
    }
    document.querySelector('#collect-cache-button').disabled = !entries.length;
  }

  collectCache() {
    let collected = 0;
    let inventory = this.state.inventory;
    const remaining = {};
    for (const [id, amount] of Object.entries(this.state.baseStorage)) {
      const result = addInventoryItem(inventory, id, amount);
      inventory = result.inventory;
      collected += result.accepted;
      if (result.remainder) remaining[id] = result.remainder;
    }
    if (!collected) { this.toast('The Field Cache is empty, or your pack is full.'); return; }
    this.state.inventory = inventory;
    this.state.baseStorage = remaining;
    this.state.stats.workerDeposits += collected;
    this.progress({ type: 'collect-worker' });
    this.audio.deposit();
    this.toast(`Collected ${collected} worker-made supplies.`);
    this.renderCache();
    this.updateAllUi(true);
  }

  renderNursery() {
    const content = document.querySelector('#nursery-content');
    const session = this.state.breedingSessions.find((entry) => entry.status === 'incubating');
    if (session) {
      const parentA = this.state.creatures.find((creature) => creature.id === session.parentIds[0]);
      const parentB = this.state.creatures.find((creature) => creature.id === session.parentIds[1]);
      const progress = clamp(session.elapsedMs / session.durationMs, 0, 1);
      content.innerHTML = `<div class="nursery-live"><p><strong>${creatureDisplayName(parentA)}</strong> + <strong>${creatureDisplayName(parentB)}</strong></p><div class="capture-track"><i style="width:${progress * 100}%"></i><b></b><b></b><b></b></div><p>${Math.ceil((session.durationMs - session.elapsedMs) / 1000)} seconds · color and stats blend; one temperament and work aptitude carry forward</p><small>${parentA.temperament} / ${parentA.workSkill} + ${parentB.temperament} / ${parentB.workSkill}</small></div>`;
      return;
    }
    const adults = this.state.creatures.filter((creature) => creature.ageStage === 'adult');
    if (adults.length < 2) {
      content.innerHTML = '<p>Bond with two adult Wildkin first. Any opposite-sex pair in this frontier can raise a baby.</p>';
      return;
    }
    const firstPair = adults.flatMap((parentA) => adults.map((parentB) => [parentA, parentB])).find(([parentA, parentB]) => parentA.id !== parentB.id && parentA.sex !== parentB.sex && parentsAreCompatible(parentA, parentB));
    if (!firstPair) {
      content.innerHTML = '<p>The adults here cannot form an opposite-sex pair yet. Bond with another Wildkin and return.</p>';
      return;
    }
    const options = adults.map((creature) => `<option value="${creature.id}">${creatureDisplayName(creature)} ${creature.sex === 'female' ? '♀' : '♂'} · ${creature.workSkill}</option>`).join('');
    content.innerHTML = `<div class="settings-grid"><label>First parent<select id="parent-a-select">${options}</select></label><label>Second parent<select id="parent-b-select">${options}</select></label></div><p>The Nestbloom uses 4 Sunfruit. The cradle takes 45–75 seconds while you mine and forge.</p><button id="start-breeding-button" class="button button--primary">Begin the Nestbloom</button>`;
    const selectA = content.querySelector('#parent-a-select');
    const selectB = content.querySelector('#parent-b-select');
    selectA.value = firstPair[0].id;
    selectB.value = firstPair[1].id;
    content.querySelector('#start-breeding-button').addEventListener('click', () => this.beginBreeding(selectA.value, selectB.value));
  }

  beginBreeding(parentAId, parentBId) {
    const parentA = this.state.creatures.find((creature) => creature.id === parentAId);
    const parentB = this.state.creatures.find((creature) => creature.id === parentBId);
    if (!parentA || !parentB || parentA.sex === parentB.sex || !parentsAreCompatible(parentA, parentB)) {
      this.toast('Choose two different compatible adults of opposite sex.');
      return;
    }
    const availableFood = inventoryCount(this.state.inventory, 'food');
    const nextBrood = this.state.broodCount + 1;
    const started = startBreeding(parentA, parentB, {
      seed: this.state.seed,
      nurseryId: this.structureByType('nursery')?.id,
      availableFood,
      sessionId: `brood-${this.state.seed}-${nextBrood}`
    });
    if (!started.ok) { this.toast(started.reason === 'food-required' ? 'The Nestbloom needs 4 Sunfruit.' : 'Those parents cannot pair.'); return; }
    this.state.inventory = removeInventoryItems(this.state.inventory, { food: started.foodConsumed }).inventory;
    this.state.broodCount = nextBrood;
    this.state.breedingSessions = [started.session];
    this.toast('The Nestbloom curls shut. Keep gathering while the new life takes shape.');
    this.audio.tether(1);
    this.markDirty();
    this.renderNursery();
    this.updateAllUi(true);
  }

  hatchBaby(baby, parentA, parentB) {
    baby.sex = seededValue(this.state.seed, this.state.creatures.length + 441) > .5 ? 'female' : 'male';
    baby.name = `${SPECIES_DEFINITIONS[baby.speciesId].name} Bud ${this.state.progress.counters.babiesBorn + 1}`;
    baby.maxHealth = Math.round(((parentA.maxHealth ?? 68) + (parentB.maxHealth ?? 68)) / 2);
    baby.health = baby.maxHealth;
    baby.assignment = 'roster';
    baby.position = { x: this.structureByType('nursery')?.position.x ?? CAMP_CENTER.x, z: (this.structureByType('nursery')?.position.z ?? CAMP_CENTER.z) + 3 };
    this.state.creatures.push(baby);
    const entity = new KinEntity(this, baby, 'captured');
    this.kin.push(entity);
    this.progress({ type: 'breed' });
    this.audio.hatch();
    this.emitMotes(entity.position.clone().setY(2), baby.color, 28);
    this.audio.creature(baby.speciesId, 'bond');
    this.toast(`${baby.name} hatched: ${baby.color} coat · ${baby.temperament} · inherited ${baby.workSkill}.`);
    if (this.hasWeapon('steel_repeater')) this.guardian.wake();
    this.markDirty();
    this.updateAllUi(true);
  }

  getInteractiveRoots() {
    return [
      ...this.resources.filter((entry) => entry.mesh.visible).map((entry) => entry.mesh),
      ...this.pickups.map((entry) => entry.mesh),
      ...this.wildKin.map((entry) => entry.mesh),
      ...this.kin.map((entry) => entry.mesh),
      ...this.structures.map((entry) => entry.mesh),
      ...(this.guardian?.mesh?.visible ? [this.guardian.mesh] : []),
      this.world.beacon
    ];
  }

  aimEntity() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects(this.getInteractiveRoots(), true);
    for (const hit of hits) {
      let object = hit.object;
      while (object && !object.userData.entity && object.parent) object = object.parent;
      const entity = object?.userData?.entity ?? (object === this.world.beacon || object?.parent === this.world.beacon ? this.world.beacon.userData : null);
      if (!entity) continue;
      const maximum = entity.kind === 'wildkin' || entity.kind === 'guardian' ? 42 : entity.kind === 'resource' ? 15 : 13;
      if (hit.distance <= maximum) return { entity, distance: hit.distance, point: hit.point };
    }
    return null;
  }

  nearestPickup(radius = 6.5) {
    return this.pickups.map((pickup) => ({ pickup, distance: pickup.position.distanceTo(this.player.position) })).filter((entry) => entry.distance <= radius).sort((a, b) => a.distance - b.distance)[0]?.pickup ?? null;
  }

  interact() {
    if (this.panelOpen || this.paused) return;
    const aimed = this.aimEntity()?.entity;
    const nearbyPickup = this.nearestPickup();
    if (nearbyPickup) {
      const nearby = [...this.pickups].filter((pickup) => pickup.position.distanceTo(this.player.position) < 6.5);
      let count = 0;
      for (const pickup of nearby) if (pickup.collect()) count += 1;
      if (count) {
        this.state.stats.gathered += count;
        this.toast(`Collected ${count} loose supplies.`);
        this.updateAllUi(true);
      }
      return;
    }
    if (aimed?.kind === 'structure') {
      if (aimed.type === 'storage_bin') this.openPanel('work-panel');
      else if (aimed.type === 'nursery') this.openPanel('nursery-panel');
      else if (aimed.type === 'feeder') this.feedTrough();
      else this.toast(`${STRUCTURE_DEFINITIONS[aimed.type].name} is operating.`);
      return;
    }
    if (aimed?.kind === 'kin' && aimed.data.assignment === 'worker' && aimed.speciesId === 'burramble' && aimed.directHarvestReady) {
      const result = addInventoryItem(this.state.inventory, 'fiber', 1);
      if (!result.accepted) { this.toast('Your pack is full.'); return; }
      this.state.inventory = result.inventory;
      aimed.directHarvestReady = false;
      aimed.data.directHarvestReady = false;
      this.toast(`Brushed one bundle of Twistgrass directly from ${creatureDisplayName(aimed.data)}.`);
      this.audio.worker();
      this.markDirty();
      this.updateAllUi(true);
      return;
    }
    const beaconDistance = this.player.position.distanceTo(BEACON_POSITION);
    if ((aimed?.kind === 'beacon' || beaconDistance < 10) && this.state.guardian.defeated) {
      this.activateBeacon();
      return;
    }
    if (aimed?.kind === 'beacon' || beaconDistance < 10) this.toast('The Wayfarer Beacon needs Stormhollow’s released chime-core.');
  }

  feedTrough() {
    if (inventoryCount(this.state.inventory, 'food') < 1) { this.toast('Bring Sunfruit to stock the Nibble Trough.'); return; }
    this.state.inventory = removeInventoryItems(this.state.inventory, { food: 1 }).inventory;
    this.state.feederFood += 1;
    this.audio.eat();
    this.toast(`Nibble Trough stocked · ${this.state.feederFood} Sunfruit ready.`);
    this.markDirty();
    this.updateAllUi(true);
  }

  activateBeacon() {
    if (this.state.victory) return;
    this.state.victory = true;
    activateBeacon(this.world.beacon);
    this.progress({ type: 'activate-beacon' });
    this.audio.victory();
    this.emitMotes(BEACON_POSITION.clone().setY(15), '#f2b64b', 60);
    this.markDirty();
    this.save();
    setTimeout(() => this.showVictory(), 700);
  }

  showVictory() {
    this.paused = true;
    document.exitPointerLock?.();
    const seconds = Math.floor(this.elapsed);
    document.querySelector('#victory-copy').textContent = `You arrived with empty hands. ${this.state.creatures.length} Wildkin, a working camp, and a new generation brought the island’s old song home.`;
    const stats = [
      [formatTime(seconds), 'trail time'],
      [this.state.stats.gathered, 'supplies gathered'],
      [this.state.stats.captures, 'bonds formed'],
      [this.state.stats.workerDeposits, 'worker goods']
    ];
    document.querySelector('#victory-stats').innerHTML = stats.map(([value, label]) => `<div class="victory-stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
    this.openPanel('victory-panel', { modal: true });
  }

  continueSandbox() {
    this.closePanel('victory-panel');
    this.paused = false;
    this.canvas.focus({ preventScroll: true });
    this.toast('Sandbox trail open: keep building, bonding, working, and breeding.');
  }

  selectedAction() { return HOTBAR_BASE[this.selectedSlot] ?? HOTBAR_BASE[0]; }

  primaryAction() {
    if (this.buildMode && this.placeBuild()) return;
    const selected = this.selectedAction();
    if (selected.kind === 'food') { this.eatFood(); return; }
    if (selected.kind === 'build') { this.togglePanel('build-panel'); return; }
    if (selected.kind === 'party') {
      this.openPanel('inventory-panel');
      this.switchInventoryTab('kin');
      return;
    }
    if (selected.kind === 'weapon') {
      if (!this.hasWeapon(selected.id)) { this.toast(`Craft the ${selected.label} first.`); return; }
      this.fireWeapon(selected.id);
      return;
    }
    const aimed = this.aimEntity()?.entity;
    if (aimed?.kind === 'resource') aimed.hit(1);
    else if (aimed?.kind === 'wildkin' && aimed.position.distanceTo(this.player.position) < 4.5) aimed.takeDamage(5);
    else if (aimed?.kind === 'guardian') aimed.takeDamage(4, true);
  }

  updatePrimaryHold() {
    if (!this.mousePrimaryHeld || this.mousePressWasFirstEngagement || this.mouseDragDistance >= 6
      || this.paused || this.panelOpen || performance.now() - this.mousePressStartedAt < 140) return;
    const selected = this.selectedAction();
    if (selected.kind !== 'weapon' || selected.id !== 'steel_repeater' || !this.hasWeapon(selected.id)) return;
    this.primaryAction();
    this.mouseHoldActed = true;
  }

  eatFood() {
    if (inventoryCount(this.state.inventory, 'food') < 1) { this.toast('Gather Sunfruit from the gold-dotted bushes.'); return; }
    if (this.state.player.hunger > 96) { this.toast('You are already well fed. Save that Sunfruit for the trough or Nestbloom.'); return; }
    this.state.inventory = removeInventoryItems(this.state.inventory, { food: 1 }).inventory;
    this.state.player.hunger = clamp(this.state.player.hunger + 34, 0, 100);
    this.state.player.health = clamp(this.state.player.health + 6, 0, 100);
    this.audio.eat();
    this.toast('Sunfruit eaten · hunger and heart restored.');
    this.markDirty();
    this.updateAllUi(true);
  }

  fireWeapon(weaponId) {
    const definition = weaponById(weaponId);
    if (!definition) return;
    const now = this.elapsed * 1000;
    if (now - this.lastShotAt < definition.cadenceMs) return;
    this.lastShotAt = now;
    this.state.equippedWeapon = weaponId;
    this.state.stats.shots += 1;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const position = this.camera.position.clone().addScaledVector(direction, 2.2).add(new THREE.Vector3(0, -.25, 0));
    this.projectiles.push(new Projectile(this, {
      position,
      direction,
      speed: weaponId === 'steel_repeater' ? 48 : weaponId === 'stonebolt_launcher' ? 35 : 29,
      damage: definition.damage,
      weaponId,
      life: definition.range / (weaponId === 'steel_repeater' ? 48 : weaponId === 'stonebolt_launcher' ? 35 : 29)
    }));
    this.audio.shoot(definition.tier);
    this.emitMotes(position, weaponId === 'steel_repeater' ? '#f2b64b' : weaponId === 'stonebolt_launcher' ? '#6f7f86' : '#9bc76b', 4);
    this.markDirty();
  }

  updateCapture(delta) {
    const holding = this.keys.has('KeyC') && this.playing && !this.paused && !this.panelOpen && !this.buildMode;
    const aimed = holding ? this.aimEntity()?.entity : null;
    if (!holding || aimed?.kind !== 'wildkin') {
      this.captureProgress = 0;
      this.captureKnot = 0;
      this.captureTarget = null;
      this.glimmerline.visible = false;
      document.querySelector('#capture-card').classList.add('is-hidden');
      return;
    }
    if (inventoryCount(this.state.inventory, 'tool:lumen_tether') < 1) {
      this.glimmerline.visible = false;
      this.captureProgress = 0;
      document.querySelector('#capture-card').classList.add('is-hidden');
      if (!this.captureMissingToastAt || this.elapsed - this.captureMissingToastAt > 2) {
        this.captureMissingToastAt = this.elapsed;
        this.toast('Craft a Glimmerline spool in your pack first.');
      }
      return;
    }
    if (this.captureTarget !== aimed) {
      this.captureTarget = aimed;
      this.captureProgress = 0;
      this.captureKnot = 0;
    }
    const healthRatio = aimed.health / aimed.maxHealth;
    const resistance = .45 + healthRatio * .8;
    this.captureProgress += delta / resistance;
    const required = 2.2;
    const knot = Math.min(3, Math.floor(this.captureProgress / (required / 4)));
    if (knot > this.captureKnot) {
      this.captureKnot = knot;
      this.audio.tether(knot);
      this.emitMotes(aimed.position.clone().setY(2.5), knot % 2 ? '#4aa4ac' : '#f2b64b', 5);
    }
    const start = this.player.position.clone().setY(3.25);
    const end = aimed.position.clone().setY(2.2);
    setGlimmerline(this.glimmerline, start, end, this.elapsed);
    const chance = captureChance({
      speciesId: aimed.speciesId,
      currentHealth: aimed.health,
      maxHealth: aimed.maxHealth,
      tetherPower: 1,
      attempt: aimed.captureAttempts + 1,
      calmBonus: this.state.creatures.length === 0 ? .06 : 0
    });
    const card = document.querySelector('#capture-card');
    card.classList.remove('is-hidden');
    document.querySelector('#capture-chance').textContent = `${Math.round(chance * 100)}%`;
    document.querySelector('#capture-fill').style.width = `${clamp(this.captureProgress / required, 0, 1) * 100}%`;
    document.querySelector('#capture-modifiers').textContent = healthRatio <= .35 ? 'Low heart · line settling quickly' : healthRatio <= .65 ? 'Tiring · bond is possible' : 'Strong resistance · weaken first';
    if (this.captureProgress >= required) this.resolveBond(aimed);
  }

  resolveBond(target) {
    target.captureAttempts += 1;
    target.persistPosition();
    this.state.inventory = removeInventoryItems(this.state.inventory, { 'tool:lumen_tether': 1 }).inventory;
    const result = resolveCapture({
      speciesId: target.speciesId,
      currentHealth: target.health,
      maxHealth: target.maxHealth,
      tetherPower: 1,
      attempt: target.captureAttempts,
      seed: this.state.seed,
      creatureId: target.id,
      tutorialMode: true,
      hasCapturedAny: this.state.creatures.length > 0,
      calmBonus: this.state.creatures.length === 0 ? .06 : 0
    });
    this.captureProgress = 0;
    this.captureKnot = 0;
    this.captureTarget = null;
    this.glimmerline.visible = false;
    if (!result.success) {
      this.toast(`The braid slipped at ${Math.round(result.chance * 100)}%. The next attempt gains familiarity.`);
      this.emitMotes(target.position.clone().setY(2), '#d96f50', 12);
      this.updateAllUi(true);
      return;
    }
    const species = SPECIES_DEFINITIONS[target.speciesId];
    const data = {
      id: target.id,
      speciesId: target.speciesId,
      name: species.name,
      sex: target.data.sex,
      color: target.data.color ?? SPECIES_COLORS[target.speciesId],
      health: target.maxHealth,
      maxHealth: target.maxHealth,
      stats: {
        power: 42 + Math.floor(seededValue(this.state.seed, target.id.length + 4) * 24),
        work: 45 + Math.floor(seededValue(this.state.seed, target.id.length + 17) * 24),
        heart: 48 + Math.floor(seededValue(this.state.seed, target.id.length + 29) * 24)
      },
      workSkill: species.work.skill,
      temperament: species.temperament,
      ageStage: 'adult',
      ageMs: 0,
      maturityDurationMs: 45000,
      scale: 1,
      assignment: this.state.creatures.filter((creature) => creature.assignment === 'party').length < 2 ? 'party' : 'roster',
      position: { x: target.position.x, z: target.position.z }
    };
    this.state.capturedWildIds.push(target.id);
    this.state.creatures.push(data);
    this.disposeTransient(target.mesh);
    this.wildKin = this.wildKin.filter((kin) => kin !== target);
    this.kin.push(new KinEntity(this, data, 'captured'));
    this.state.stats.captures += 1;
    this.progress({ type: 'capture' });
    this.audio.bond();
    this.audio.creature(target.speciesId, 'bond');
    this.emitMotes(target.position.clone().setY(2.3), data.color, 24);
    this.toast(`${species.name} chose the trail · ${data.sex} · aptitude: ${data.workSkill}.`);
    this.markDirty();
    this.updateAllUi(true);
  }

  dodge() {
    if (this.elapsed - this.lastDodgeAt < .85 || this.state.player.stamina < 22) return;
    this.lastDodgeAt = this.elapsed;
    this.state.player.stamina -= 22;
    const forward = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    const right = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw));
    const move = new THREE.Vector3();
    if (this.keys.has('KeyW')) move.add(forward);
    if (this.keys.has('KeyS')) move.sub(forward);
    if (this.keys.has('KeyD')) move.add(right);
    if (this.keys.has('KeyA')) move.sub(right);
    if (!move.lengthSq()) move.copy(forward);
    this.player.dodgeVelocity.copy(move.normalize().multiplyScalar(18));
    this.emitMotes(this.player.position.clone().setY(.4), '#f4e8c8', 8);
  }

  damagePlayer(amount, message = 'The frontier struck back') {
    if (this.state.victory || this.elapsed - (this.lastDamageAt ?? -99) < .32) return;
    this.lastDamageAt = this.elapsed;
    this.state.player.health = Math.max(0, this.state.player.health - amount);
    this.audio.hurt();
    const vignette = document.querySelector('#damage-vignette');
    vignette.classList.add('is-hit');
    setTimeout(() => vignette.classList.remove('is-hit'), 150);
    this.toast(message);
    if (this.state.player.health <= 0) this.respawn();
  }

  respawn() {
    this.state.stats.respawns += 1;
    this.state.player.health = 100;
    this.state.player.stamina = 100;
    this.state.player.hunger = Math.max(35, this.state.player.hunger);
    this.player.position.set(0, 0, 38);
    this.player.velocity.set(0, 0, 0);
    this.toast('You wake beside the camp pennant. Nothing was lost.');
    this.markDirty();
  }

  updatePlayer(delta) {
    if (!this.playing || this.paused || this.panelOpen) {
      this.player.moveAmount = 0;
      return;
    }
    const forward = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    const right = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw));
    const movement = new THREE.Vector3();
    if (this.keys.has('KeyW')) movement.add(forward);
    if (this.keys.has('KeyS')) movement.sub(forward);
    if (this.keys.has('KeyD')) movement.add(right);
    if (this.keys.has('KeyA')) movement.sub(right);
    if (movement.lengthSq()) movement.normalize();
    const sprinting = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && movement.lengthSq() && this.state.player.stamina > 2;
    const speed = sprinting ? SPRINT_SPEED : BASE_MOVE_SPEED;
    if (sprinting) this.state.player.stamina = Math.max(0, this.state.player.stamina - delta * 18);
    else this.state.player.stamina = Math.min(100, this.state.player.stamina + delta * 13);
    this.player.moveAmount = movement.length();
    const desired = movement.multiplyScalar(speed);
    this.player.velocity.x = THREE.MathUtils.damp(this.player.velocity.x, desired.x + this.player.dodgeVelocity.x, 9, delta);
    this.player.velocity.z = THREE.MathUtils.damp(this.player.velocity.z, desired.z + this.player.dodgeVelocity.z, 9, delta);
    this.player.dodgeVelocity.multiplyScalar(Math.max(0, 1 - delta * 7));
    this.player.velocity.y -= GRAVITY * delta;
    if (this.keys.has('Space') && this.player.onGround) {
      this.player.velocity.y = JUMP_SPEED;
      this.player.onGround = false;
    }
    this.player.position.addScaledVector(this.player.velocity, delta);
    if (this.player.position.y <= 0) {
      this.player.position.y = 0;
      this.player.velocity.y = 0;
      this.player.onGround = true;
    }
    const horizontal = new THREE.Vector2(this.player.position.x, this.player.position.z);
    if (horizontal.length() > WORLD_RADIUS - 7) {
      horizontal.setLength(WORLD_RADIUS - 7);
      this.player.position.x = horizontal.x;
      this.player.position.z = horizontal.y;
      this.player.velocity.x *= -.15;
      this.player.velocity.z *= -.15;
    }
    this.state.player.hunger = Math.max(0, this.state.player.hunger - delta * .085);
    if (this.state.player.hunger <= 0) this.state.player.health = Math.max(1, this.state.player.health - delta * .9);
    else if (this.state.player.hunger > 42 && this.state.player.health < 100) this.state.player.health = Math.min(100, this.state.player.health + delta * .18);
    const stormscar = this.player.position.z < -62 && this.player.position.x > -38 && !this.state.victory;
    if (stormscar) this.state.player.stamina = Math.max(0, this.state.player.stamina - delta * 2.2);
    this.playerMesh.position.copy(this.player.position);
    if (movement.lengthSq()) this.playerMesh.rotation.y = lerpAngle(this.playerMesh.rotation.y, Math.atan2(movement.x, movement.z), delta * 10);
    const legs = this.playerMesh.userData.legs;
    const stride = Math.sin(this.elapsed * (sprinting ? 13 : 9)) * this.player.moveAmount * .48;
    legs[0].rotation.x = stride;
    legs[1].rotation.x = -stride;
    this.playerMesh.rotation.z = this.state.settings.reducedMotion ? 0 : Math.sin(this.elapsed * 6) * this.player.moveAmount * .015;
  }

  updateCamera(delta) {
    const forward = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    const right = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw));
    const desired = this.player.position.clone()
      .addScaledVector(forward, -12.4)
      .addScaledVector(right, 3.2)
      .add(new THREE.Vector3(0, 6.2 + Math.sin(-this.player.pitch) * 2.5, 0));
    const responsiveness = this.state.settings.reducedMotion ? 1 : 1 - Math.exp(-delta * 10);
    this.camera.position.lerp(desired, responsiveness);
    const look = this.player.position.clone()
      .addScaledVector(forward, 8.5)
      .addScaledVector(right, .8)
      .add(new THREE.Vector3(0, 3.1 + this.player.pitch * 6.5, 0));
    this.camera.lookAt(look);
  }

  updateLighting() {
    const hour = (8 + this.elapsed / 15) % 24;
    const angle = ((hour - 6) / 24) * Math.PI * 2;
    const daylight = clamp(Math.sin(angle) * .9 + .18, .06, 1);
    this.sun.position.set(Math.cos(angle) * 110, 35 + Math.max(0, Math.sin(angle)) * 115, 62);
    this.sun.intensity = .35 + daylight * 3.3;
    this.rim.intensity = .75 + (1 - daylight) * 1.3;
    const sky = new THREE.Color().lerpColors(new THREE.Color(0x142b3e), new THREE.Color(0x8bbab0), daylight);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    this.renderer.toneMappingExposure = .72 + daylight * .4;
    const total = Math.floor(hour * 60);
    const display = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    const day = Math.floor(this.elapsed / 360) + 1;
    document.querySelector('#time-readout').textContent = `DAY ${String(day).padStart(2, '0')} · ${display}`;
  }

  updateWorkers(delta) {
    for (let index = 0; index < this.state.workers.length; index += 1) {
      const worker = this.state.workers[index];
      const creature = this.kin.find((entry) => entry.id === worker.creatureId);
      if (!creature) continue;
      const result = advanceWorker(worker, delta * 1000, {
        travelMs: 1500,
        feederTravelMs: 1500,
        eatingMs: 850,
        cycleMs: 5600 + index * 450,
        depositMs: 420,
        stationOperational: Boolean(this.structures.find((structure) => structure.id === worker.stationId)),
        storageHasSpace: true,
        feederFood: this.state.feederFood,
        hungerPerSecond: 1.75,
        foodRestore: 70
      });
      this.state.workers[index] = result.worker;
      for (const event of result.events) {
        if (event.type === 'worker-seeking-food') this.toast(`${creatureDisplayName(creature.data)} is walking to the Nibble Trough.`);
        if (event.type === 'worker-arrived-job') {
          const station = this.structures.find((entry) => entry.id === worker.stationId);
          if (station) creature.position.copy(station.position).add(new THREE.Vector3(1.8, 0, 0));
        }
        if (event.type === 'worker-arrived-storage') {
          const storage = this.structureByType('storage_bin');
          if (storage) creature.position.copy(storage.position).add(new THREE.Vector3(-1.8, 0, 0));
        }
        if (event.type === 'worker-arrived-feeder') {
          const feeder = this.structureByType('feeder');
          if (feeder) creature.position.copy(feeder.position).add(new THREE.Vector3(0, 0, 1.8));
        }
        if (event.type === 'worker-ate') {
          this.state.feederFood = Math.max(0, this.state.feederFood - 1);
          this.audio.eat();
          this.toast(`${creatureDisplayName(creature.data)} ate from the Nibble Trough.`);
        }
        if (event.type === 'worker-produced') {
          creature.setCarried(Object.keys(event.items)[0]);
          if (creature.speciesId === 'burramble') {
            creature.directHarvestReady = true;
            creature.data.directHarvestReady = true;
          }
          this.audio.worker();
        }
        if (event.type === 'worker-deposit') {
          creature.setCarried(null);
          for (const [resourceId, amount] of Object.entries(event.items)) this.state.baseStorage[resourceId] = (this.state.baseStorage[resourceId] ?? 0) + amount;
          this.audio.deposit();
          this.emitMotes(this.structureByType('storage_bin')?.position.clone().setY(2.3) ?? CAMP_CENTER.clone().setY(2), '#f2b64b', 7);
          this.markDirty();
        }
      }
    }
  }

  updateBreeding(delta) {
    for (let index = 0; index < this.state.breedingSessions.length; index += 1) {
      const session = this.state.breedingSessions[index];
      if (session.status !== 'incubating') continue;
      const parentA = this.state.creatures.find((creature) => creature.id === session.parentIds[0]);
      const parentB = this.state.creatures.find((creature) => creature.id === session.parentIds[1]);
      if (!parentA || !parentB) continue;
      const result = advanceBreeding(session, delta * 1000, { parentA, parentB, babyId: `${session.id}-baby` });
      this.state.breedingSessions[index] = result.session;
      if (result.baby) this.hatchBaby(result.baby, parentA, parentB);
    }
    for (const creature of this.state.creatures) {
      if (creature.ageStage !== 'baby') continue;
      const before = creature.ageStage;
      Object.assign(creature, advanceCreatureGrowth(creature, delta * 1000));
      const entity = this.kin.find((entry) => entry.id === creature.id);
      if (entity) entity.data = creature;
      if (before === 'baby' && creature.ageStage === 'adult') {
        this.toast(`${creatureDisplayName(creature)} is work-ready now.`);
        this.audio.bond();
        this.markDirty();
      }
    }
  }

  spawnPickup(type, position, source = 'gather') { this.pickups.push(new Pickup(this, type, position, source)); }

  emitMotes(position, color, count = 8) {
    if (this.state.settings.reducedMotion) count = Math.min(count, 3);
    const resolved = hexToNumber(color, COLORS.sun);
    for (let index = 0; index < count; index += 1) {
      const mote = new THREE.Mesh(new THREE.OctahedronGeometry(.08 + Math.random() * .12, 0), material(resolved, { emissive: resolved, emissiveIntensity: .35, castShadow: false }));
      mote.position.copy(position);
      const velocity = new THREE.Vector3((Math.random() - .5) * 4.5, 1.2 + Math.random() * 4.2, (Math.random() - .5) * 4.5);
      this.scene.add(mote);
      this.motes.push({ mesh: mote, velocity, life: .55 + Math.random() * .7 });
    }
  }

  updateEffects(delta) {
    for (const effect of [...this.effects]) {
      effect.life -= delta;
      if (effect.kind === 'guardian-fade') {
        effect.target.scale.multiplyScalar(Math.max(.88, 1 - delta * .7));
        effect.target.rotation.y += delta * 1.8;
      }
      if (effect.life <= 0) {
        if (effect.kind === 'scale-reset') effect.target.scale.setScalar(effect.base ?? 1);
        if (effect.kind === 'guardian-fade') effect.target.visible = false;
        this.effects = this.effects.filter((entry) => entry !== effect);
      }
    }
    for (const mote of [...this.motes]) {
      mote.life -= delta;
      mote.velocity.y -= delta * 5;
      mote.mesh.position.addScaledVector(mote.velocity, delta);
      mote.mesh.rotation.x += delta * 5;
      mote.mesh.scale.setScalar(clamp(mote.life * 1.5, 0, 1));
      if (mote.life <= 0) {
        this.disposeTransient(mote.mesh);
        this.motes = this.motes.filter((entry) => entry !== mote);
      }
    }
  }

  updateBuildGhost() {
    if (!this.buildGhost) return;
    const position = this.buildPosition();
    this.buildGhost.position.copy(position);
    this.buildGhost.rotation.y = this.buildRotation;
    const valid = this.buildIsValid(position);
    this.buildGhost.traverse((child) => {
      if (!child.isMesh) return;
      child.material.opacity = valid ? .46 : .28;
      child.material.emissive?.setHex(valid ? 0x174f48 : 0x5d130a);
      child.material.emissiveIntensity = .6;
    });
  }

  updateEntities(delta) {
    this.resources.forEach((resource) => resource.update(delta));
    this.pickups.forEach((pickup) => pickup.update(delta));
    this.wildKin.forEach((kin, index) => kin.update(delta, index));
    this.kin.forEach((kin, index) => kin.update(delta, index));
    this.structures.forEach((structure) => structure.update(delta));
    [...this.projectiles].forEach((projectile) => projectile.update(delta));
    this.guardian?.update(delta);
    this.updateWorkers(delta);
    this.updateBreeding(delta);
    this.updateEffects(delta);
    this.updateBuildGhost();
  }

  updateQuest() {
    const snapshot = questSnapshot(this.state.progress);
    const completed = this.state.progress.completedQuestIds.length;
    const total = QUEST_DEFINITIONS.length;
    if (snapshot.complete) {
      document.querySelector('#quest-step').textContent = `TRAIL ${String(total).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
      document.querySelector('#quest-title').textContent = 'The frontier is yours';
      document.querySelector('#quest-copy').textContent = 'Keep bonding, building, working, and raising Wildkin in sandbox.';
      document.querySelector('#quest-trail-fill').style.height = '100%';
      return;
    }
    const objectiveProgress = snapshot.objectives.length
      ? snapshot.objectives.reduce((sum, objective) => sum + clamp(objective.current / objective.amount, 0, 1), 0) / snapshot.objectives.length
      : 0;
    const nextObjective = snapshot.objectives.find((objective) => !objective.complete);
    const counter = nextObjective ? ` · ${Math.min(nextObjective.current, nextObjective.amount)} / ${nextObjective.amount}` : '';
    document.querySelector('#quest-step').textContent = `TRAIL ${String(completed + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    document.querySelector('#quest-title').textContent = snapshot.quest.title;
    document.querySelector('#quest-copy').textContent = `${snapshot.quest.hint}${counter}`;
    document.querySelector('#quest-trail-fill').style.height = `${((completed + objectiveProgress) / total) * 100}%`;
  }

  updateHotbar() {
    const hotbar = document.querySelector('#hotbar');
    hotbar.innerHTML = '';
    HOTBAR_BASE.forEach((action, index) => {
      let count = '';
      let available = true;
      if (action.kind === 'weapon') {
        available = this.hasWeapon(action.id);
        count = available ? '✓' : '—';
      } else if (action.kind === 'tether') {
        count = inventoryCount(this.state.inventory, 'tool:lumen_tether');
        available = count > 0;
      } else if (action.kind === 'food') {
        count = inventoryCount(this.state.inventory, 'food');
        available = count > 0;
      } else if (action.kind === 'build') {
        count = Object.keys(STRUCTURE_DEFINITIONS).reduce((sum, id) => sum + inventoryCount(this.state.inventory, `structure:${id}`), 0);
      } else if (action.kind === 'party') {
        count = this.state.creatures.filter((creature) => creature.assignment === 'party').length;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `hotbar-slot ${index === this.selectedSlot ? 'is-selected' : ''}`;
      button.style.opacity = available || ['hands', 'build', 'party'].includes(action.kind) ? '1' : '.48';
      button.title = `${index + 1} · ${action.label}`;
      button.setAttribute('aria-label', `${index + 1}: ${action.label}${available ? '' : ', not yet available'}`);
      button.innerHTML = `<span class="hotbar-slot__key">${index + 1}</span><i class="hotbar-slot__glyph" style="--slot-color:${action.color}"></i><span class="hotbar-slot__count">${count}</span>`;
      button.addEventListener('click', () => {
        this.selectedSlot = index;
        this.updateHotbar();
      });
      hotbar.appendChild(button);
    });

    const selected = this.selectedAction();
    document.querySelector('#weapon-label').textContent = selected.label.toUpperCase();
    let readout = 'READY';
    if (selected.kind === 'hands') readout = 'NO TOOL';
    else if (selected.kind === 'weapon') {
      const weapon = weaponById(selected.id);
      readout = this.hasWeapon(selected.id) ? `${weapon.damage} × ${(1000 / weapon.cadenceMs).toFixed(1)}/S` : 'NOT CRAFTED';
    } else if (selected.kind === 'tether') readout = `${inventoryCount(this.state.inventory, 'tool:lumen_tether')} SPOOLS`;
    else if (selected.kind === 'food') readout = `${inventoryCount(this.state.inventory, 'food')} FRUIT`;
    else if (selected.kind === 'build') readout = 'OPEN PLANS';
    else if (selected.kind === 'party') readout = `${this.state.creatures.filter((creature) => creature.assignment === 'party').length} FOLLOWING`;
    document.querySelector('#ammo-readout').textContent = readout;
  }

  updatePartyUi() {
    const strip = document.querySelector('#party-strip');
    const party = this.state.creatures.filter((creature) => creature.assignment === 'party');
    const workers = this.state.creatures.filter((creature) => creature.assignment === 'worker');
    const babies = this.state.creatures.filter((creature) => creature.ageStage === 'baby');
    document.querySelector('#roster-count').textContent = `${party.length} / 2 · ${this.state.creatures.length} BONDED`;
    strip.innerHTML = '';
    const visible = [...party, ...workers.filter((creature) => !party.includes(creature)), ...babies.filter((creature) => !party.includes(creature) && !workers.includes(creature))].slice(0, 6);
    if (!visible.length) {
      strip.innerHTML = '<span class="party-empty">No Wildkin bonded</span>';
      return;
    }
    for (const creature of visible) {
      const token = document.createElement('span');
      token.className = `party-token ${creature.ageStage === 'baby' ? 'is-baby' : ''} ${creature.assignment === 'worker' ? 'is-worker' : ''}`;
      token.style.setProperty('--token-color', creature.color ?? SPECIES_COLORS[creature.speciesId]);
      token.title = `${creatureDisplayName(creature)} · ${creature.ageStage === 'baby' ? 'baby' : creature.assignment}`;
      strip.appendChild(token);
    }
  }

  updateVitals() {
    const vitals = [
      ['health', '#health-fill', '#health-value'],
      ['stamina', '#stamina-fill', '#stamina-value'],
      ['hunger', '#hunger-fill', '#hunger-value']
    ];
    for (const [key, fillId, valueId] of vitals) {
      const value = clamp(this.state.player[key] ?? 0, 0, 100);
      document.querySelector(fillId).style.width = `${value}%`;
      document.querySelector(valueId).textContent = String(Math.round(value));
    }
    document.querySelector('#region-readout').textContent = this.regionAt(this.player.position).toUpperCase();
  }

  updateTargetUi() {
    const aimed = this.aimEntity();
    const entity = aimed?.entity ?? null;
    this.targetEntity = entity;
    const targetCard = document.querySelector('#target-card');
    const prompt = document.querySelector('#interaction-prompt');
    let promptCopy = '';

    if (entity?.kind === 'wildkin') {
      const species = SPECIES_DEFINITIONS[entity.speciesId];
      targetCard.classList.remove('is-hidden');
      document.querySelector('#target-kind').textContent = `WILD · ${species.temperament.toUpperCase()}`;
      document.querySelector('#target-name').textContent = species.name;
      document.querySelector('#target-health-fill').style.width = `${entity.health / entity.maxHealth * 100}%`;
      document.querySelector('#target-hint').textContent = entity.health / entity.maxHealth <= .35 ? 'Hold C · excellent Glimmerline odds' : 'LMB to weaken · hold C to bond';
    } else if (entity?.kind === 'guardian') {
      targetCard.classList.remove('is-hidden');
      document.querySelector('#target-kind').textContent = entity.active ? 'GUARDIAN · RING-BODY' : 'GUARDIAN · DORMANT';
      document.querySelector('#target-name').textContent = 'Stormhollow';
      document.querySelector('#target-health-fill').style.width = `${entity.health / entity.maxHealth * 100}%`;
      document.querySelector('#target-hint').textContent = entity.active ? 'Fire between the expanding wind rings' : 'Raise a baby · forge the Steel Repeater';
    } else if (entity?.kind === 'resource') {
      targetCard.classList.remove('is-hidden');
      document.querySelector('#target-kind').textContent = 'GATHERABLE';
      document.querySelector('#target-name').textContent = RESOURCE_DEFINITIONS[entity.type].name;
      document.querySelector('#target-health-fill').style.width = `${entity.health / entity.maxHealth * 100}%`;
      document.querySelector('#target-hint').textContent = 'LMB to gather · E collects loose drops';
    } else {
      targetCard.classList.add('is-hidden');
    }

    const nearby = this.nearestPickup();
    if (nearby) promptCopy = `<kbd>E</kbd> Collect nearby ${RESOURCE_DEFINITIONS[nearby.type]?.name ?? 'supply'} drops`;
    else if (entity?.kind === 'structure') {
      if (entity.type === 'storage_bin') promptCopy = '<kbd>E</kbd> Open worker deposits';
      else if (entity.type === 'nursery') promptCopy = '<kbd>E</kbd> Tend the Nestbloom';
      else if (entity.type === 'feeder') promptCopy = `<kbd>E</kbd> Stock Nibble Trough · ${this.state.feederFood} ready`;
      else promptCopy = `<kbd>E</kbd> Inspect ${STRUCTURE_DEFINITIONS[entity.type].name}`;
    } else if (entity?.kind === 'kin' && entity.data.assignment === 'worker' && entity.speciesId === 'burramble' && entity.directHarvestReady) {
      promptCopy = `<kbd>E</kbd> Brush Twistgrass from ${creatureDisplayName(entity.data)}`;
    } else if ((entity?.kind === 'beacon' || this.player.position.distanceTo(BEACON_POSITION) < 10)) {
      promptCopy = this.state.guardian.defeated ? '<kbd>E</kbd> Return the chime-core to the Beacon' : 'The Wayfarer Beacon is silent';
    }
    prompt.innerHTML = promptCopy;
    prompt.classList.toggle('is-hidden', !promptCopy);
  }

  updateAllUi(force = false) {
    this.updateQuest();
    this.updateHotbar();
    this.updatePartyUi();
    this.updateVitals();
    this.updateTargetUi();
    if (force) {
      this.renderPack();
      if (this.panelOpen === 'inventory-panel') this.renderInventoryPanel();
      if (this.panelOpen === 'work-panel') this.renderCache();
      if (this.panelOpen === 'nursery-panel' && this.state.breedingSessions.some((session) => session.status === 'incubating')) this.renderNursery();
    }
  }

  toast(message) {
    const toast = document.querySelector('#toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('is-visible'), this.state.settings.reducedMotion ? 2600 : 3400);
  }

  regionAt(position) {
    if (position.z < -62 && position.x > -38) return 'Stormscar';
    if (position.x < -32 || (position.x < 18 && position.z < -25)) return 'Flintwash';
    return 'Sunmeadow';
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = clamp(this.clock.getDelta(), 0, .05);
    if (this.playing && !this.paused) {
      this.elapsed += delta;
      this.state.elapsedMs = Math.floor(this.elapsed * 1000);
      this.updatePrimaryHold();
      this.updatePlayer(delta);
      this.updateCamera(delta);
      this.updateEntities(delta);
      this.updateCapture(delta);
      this.autosaveTimer += delta;
      if (this.autosaveTimer >= AUTOSAVE_SECONDS) {
        this.autosaveTimer = 0;
        this.save();
      }
    } else {
      this.updateCamera(delta);
      if (!this.playing && !this.state.settings.reducedMotion) {
        this.world.water.rotation.z += delta * .012;
        this.world.campMarker.rotation.y = Math.sin(performance.now() * .00025) * .08;
      }
    }
    this.updateLighting();
    this.uiTimer += delta;
    if (this.uiTimer >= .1) {
      this.uiTimer = 0;
      this.updateVitals();
      this.updateTargetUi();
      if (this.panelOpen === 'nursery-panel') this.renderNursery();
    }
    this.renderer.render(this.scene, this.camera);
  }
}

new WildkinGame();
