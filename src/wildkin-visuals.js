import * as THREE from 'three';

export const WORLD_RADIUS = 142;
export const CAMP_CENTER = new THREE.Vector3(0, 0, 18);
export const BEACON_POSITION = new THREE.Vector3(0, 0, -118);
export const GUARDIAN_POSITION = new THREE.Vector3(0, 0, -91);

export const COLORS = Object.freeze({
  ink: 0x132733,
  parchment: 0xf4e8c8,
  leaf: 0x638e57,
  growth: 0x9bc76b,
  sun: 0xf2b64b,
  clay: 0xd96f50,
  river: 0x4aa4ac,
  slate: 0x6f7f86,
  steel: 0xb8c9c5,
  water: 0x397e8b,
  meadow: 0x789c61,
  flintwash: 0x75877f,
  stormscar: 0x334d4e,
  wood: 0x8a5f3e,
  darkWood: 0x3b4540,
  ember: 0xf07a45
});

const materials = new Map();

export function material(color, options = {}) {
  const key = `${color}-${options.emissive ?? 0}-${options.metalness ?? 0}-${options.opacity ?? 1}-${options.flatShading !== false}`;
  if (!materials.has(key)) {
    materials.set(key, new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.78,
      metalness: options.metalness ?? 0,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0.7,
      transparent: (options.opacity ?? 1) < 1,
      opacity: options.opacity ?? 1,
      flatShading: options.flatShading !== false,
      side: options.side ?? THREE.FrontSide
    }));
  }
  return materials.get(key);
}

function mesh(geometry, color, options = {}) {
  const result = new THREE.Mesh(geometry, material(color, options));
  result.castShadow = options.castShadow !== false;
  result.receiveShadow = options.receiveShadow !== false;
  return result;
}

export function shadowify(group) {
  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return group;
}

function seeded(seed) {
  let value = (seed >>> 0) || 1;
  return () => {
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function addGrassTuft(parent, x, z, color, scale = 1) {
  const tuft = new THREE.Group();
  for (let index = 0; index < 3; index += 1) {
    const blade = mesh(new THREE.ConeGeometry(.15 * scale, 1.5 * scale, 3), color, { castShadow: false });
    blade.position.set((index - 1) * .23 * scale, .7 * scale, Math.abs(index - 1) * .08);
    blade.rotation.z = (index - 1) * -.17;
    tuft.add(blade);
  }
  tuft.position.set(x, .15, z);
  parent.add(tuft);
}

function makeBeacon() {
  const group = new THREE.Group();
  group.name = 'wayfarer-beacon';
  const base = mesh(new THREE.CylinderGeometry(5.2, 6.4, 2.2, 8), COLORS.slate);
  base.position.y = 1;
  group.add(base);
  const mast = mesh(new THREE.CylinderGeometry(.7, 1.15, 16, 7), COLORS.darkWood);
  mast.position.y = 9;
  mast.rotation.z = .055;
  group.add(mast);
  const cradle = mesh(new THREE.TorusGeometry(4, .48, 6, 18, Math.PI * 1.6), COLORS.steel, { metalness: .25 });
  cradle.position.set(0, 15.1, 0);
  cradle.rotation.set(Math.PI / 2, 0, .7);
  group.add(cradle);
  const core = mesh(new THREE.IcosahedronGeometry(1.65, 1), COLORS.river, { emissive: 0x154d58, opacity: .45 });
  core.position.y = 15;
  core.visible = false;
  group.add(core);
  const beam = mesh(new THREE.CylinderGeometry(.38, 1.2, 42, 10, 1, true), COLORS.sun, { emissive: 0x8d4d12, opacity: .25, castShadow: false });
  beam.position.y = 37;
  beam.visible = false;
  group.add(beam);
  group.userData = { kind: 'beacon', core, beam, activated: false };
  return shadowify(group);
}

function makeBrokenArch() {
  const group = new THREE.Group();
  const pillarGeometry = new THREE.BoxGeometry(2.3, 11, 2.3);
  [-1, 1].forEach((side, index) => {
    const pillar = mesh(pillarGeometry, COLORS.slate);
    pillar.position.set(side * 5.3, 5.5 - index * 1.7, 0);
    pillar.rotation.z = side * .05;
    group.add(pillar);
  });
  const lintel = mesh(new THREE.BoxGeometry(9, 2, 2.4), COLORS.slate);
  lintel.position.set(-.8, 10.1, 0);
  lintel.rotation.z = -.12;
  group.add(lintel);
  return shadowify(group);
}

export function createWorld(scene, seed = 481516) {
  const root = new THREE.Group();
  root.name = 'wildkin-island';
  scene.add(root);

  const water = mesh(new THREE.CircleGeometry(560, 96), COLORS.water, { roughness: .28, metalness: .05, opacity: .92, castShadow: false });
  water.rotation.x = -Math.PI / 2;
  water.position.y = -5.1;
  root.add(water);

  const island = mesh(new THREE.CylinderGeometry(WORLD_RADIUS, WORLD_RADIUS + 8, 10, 56), COLORS.meadow);
  island.position.y = -5;
  root.add(island);

  const meadowPatch = mesh(new THREE.CircleGeometry(86, 42), 0x8daf6c, { castShadow: false });
  meadowPatch.rotation.x = -Math.PI / 2;
  meadowPatch.position.set(20, .07, 25);
  root.add(meadowPatch);

  const flintPatch = mesh(new THREE.CircleGeometry(67, 28), COLORS.flintwash, { castShadow: false });
  flintPatch.rotation.x = -Math.PI / 2;
  flintPatch.position.set(-69, .09, -27);
  flintPatch.scale.set(1.15, .82, 1);
  root.add(flintPatch);

  const stormPatch = mesh(new THREE.CircleGeometry(58, 32), COLORS.stormscar, { castShadow: false });
  stormPatch.rotation.x = -Math.PI / 2;
  stormPatch.position.set(24, .1, -89);
  stormPatch.scale.set(1.35, .82, 1);
  root.add(stormPatch);

  const shoreRing = mesh(new THREE.TorusGeometry(WORLD_RADIUS - 2, 3.5, 6, 64), 0xd7c58f, { castShadow: false });
  shoreRing.rotation.x = Math.PI / 2;
  shoreRing.position.y = -.35;
  root.add(shoreRing);

  const rng = seeded(seed);
  for (let index = 0; index < 105; index += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = 22 + rng() * (WORLD_RADIUS - 31);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (z < -63 && x > -38) continue;
    addGrassTuft(root, x, z, rng() > .45 ? 0xb5ca78 : 0x6f9a5c, .65 + rng() * .75);
  }

  for (let index = 0; index < 28; index += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = 35 + rng() * 95;
    const petal = mesh(new THREE.OctahedronGeometry(.18 + rng() * .1, 0), rng() > .5 ? COLORS.sun : COLORS.parchment, { castShadow: false });
    petal.position.set(Math.cos(angle) * radius, .35, Math.sin(angle) * radius);
    root.add(petal);
  }

  const arch = makeBrokenArch();
  arch.position.set(-74, 0, -22);
  arch.rotation.y = .55;
  root.add(arch);

  const watchStone = mesh(new THREE.CylinderGeometry(3.4, 5.2, 18, 7), 0x536b69);
  watchStone.position.set(67, 9, -62);
  watchStone.rotation.z = -.06;
  root.add(watchStone);

  const beacon = makeBeacon();
  beacon.position.copy(BEACON_POSITION);
  root.add(beacon);

  const campMarker = new THREE.Group();
  const post = mesh(new THREE.CylinderGeometry(.35, .5, 5.5, 6), COLORS.wood);
  post.position.y = 2.75;
  const pennantGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 5.1, 0), new THREE.Vector3(4, 4.1, 0), new THREE.Vector3(0, 3.45, 0)
  ]);
  pennantGeometry.setIndex([0, 1, 2]);
  pennantGeometry.computeVertexNormals();
  const pennant = mesh(pennantGeometry, COLORS.sun, { side: THREE.DoubleSide });
  campMarker.add(post, pennant);
  campMarker.position.copy(CAMP_CENTER);
  root.add(campMarker);

  return { root, water, island, beacon, campMarker };
}

export function createPlayerMesh() {
  const group = new THREE.Group();
  const coat = material(0xc9694d);
  const skin = material(0xb9805f);
  const boots = material(0x24363c);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 1.8, 4, 7), coat);
  torso.position.y = 2.65;
  torso.scale.z = .82;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.92, 1), skin);
  head.position.y = 4.65;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.35, .35, 7), material(COLORS.parchment));
  hat.position.y = 5.32;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, .1, 8), material(COLORS.parchment));
  brim.position.y = 5.14;
  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(.36, 1.2, 3, 6), boots);
  leftLeg.position.set(-.55, .8, 0);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = .55;
  const satchel = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.1, .55), material(COLORS.wood));
  satchel.position.set(-1.12, 2.35, .2);
  group.add(torso, head, hat, brim, leftLeg, rightLeg, satchel);
  group.userData = { legs: [leftLeg, rightLeg], torso, head };
  return shadowify(group);
}

function addEyes(group, positions, color = COLORS.sun) {
  for (const [x, y, z] of positions) {
    const eye = mesh(new THREE.SphereGeometry(.13, 6, 4), color, { emissive: 0x6a3d0a, castShadow: false });
    eye.position.set(x, y, z);
    group.add(eye);
  }
}

function createBurramble(primary) {
  const group = new THREE.Group();
  const body = mesh(new THREE.IcosahedronGeometry(1.65, 1), primary);
  body.scale.set(1.15, .72, 1);
  body.position.y = 1.7;
  group.add(body);
  for (let index = 0; index < 6; index += 1) {
    const leg = mesh(new THREE.CylinderGeometry(.14, .2, 1.25, 5), 0x684b36);
    const side = index < 3 ? -1 : 1;
    const lane = index % 3;
    leg.position.set(side * (1.15 - lane * .08), .65, (lane - 1) * .78);
    leg.rotation.z = side * .38;
    group.add(leg);
  }
  for (let index = -2; index <= 2; index += 1) {
    const rib = mesh(new THREE.TorusGeometry(1.85, .13, 5, 12, Math.PI * 1.15), 0xb48b58);
    rib.position.y = 1.85 + Math.abs(index) * .03;
    rib.rotation.set(Math.PI / 2, index * .18, -.55);
    group.add(rib);
  }
  addEyes(group, [[-.43, 2, 1.45], [.43, 2, 1.45]], COLORS.river);
  return group;
}

function createFlintusk(primary) {
  const group = new THREE.Group();
  const body = mesh(new THREE.ConeGeometry(2.1, 4.1, 4), primary);
  body.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  body.position.y = 1.65;
  body.scale.z = .78;
  group.add(body);
  for (let index = -1; index <= 1; index += 1) {
    const plate = mesh(new THREE.BoxGeometry(1.4, .35, 2.2), 0x9da9a2, { metalness: .05 });
    plate.position.set(index * 1.2, 2.6 - Math.abs(index) * .3, -.1);
    plate.rotation.y = index * -.13;
    group.add(plate);
  }
  for (const side of [-1, 1]) {
    const tusk = mesh(new THREE.CylinderGeometry(.12, .3, 2.5, 5), 0xd7d0a6);
    tusk.position.set(side * .78, 1.55, 2.1);
    tusk.rotation.x = -.72;
    tusk.rotation.z = side * .14;
    group.add(tusk);
    const prong = mesh(new THREE.CylinderGeometry(.09, .14, 1.05, 5), 0xd7d0a6);
    prong.position.set(side * 1.05, 2.2, 2.75);
    prong.rotation.z = side * .42;
    group.add(prong);
  }
  addEyes(group, [[-.42, 2.04, 1.62], [.42, 2.04, 1.62]]);
  return group;
}

function createCoaloon(primary) {
  const group = new THREE.Group();
  const body = mesh(new THREE.DodecahedronGeometry(1.9, 1), primary, { emissive: 0x3e160a, emissiveIntensity: .3 });
  body.position.y = 2.15;
  body.scale.set(1.1, 1.25, 1.05);
  group.add(body);
  for (let index = 0; index < 3; index += 1) {
    const leg = mesh(new THREE.CylinderGeometry(.2, .32, 1.8, 6), 0x4f4237);
    const angle = index * Math.PI * 2 / 3;
    leg.position.set(Math.cos(angle) * .88, .65, Math.sin(angle) * .88);
    leg.rotation.z = Math.cos(angle) * .24;
    group.add(leg);
  }
  const chimney = mesh(new THREE.CylinderGeometry(.42, .68, 1.8, 7), 0x4f5550);
  chimney.position.set(.25, 4.35, -.1);
  group.add(chimney);
  const ember = mesh(new THREE.OctahedronGeometry(.52, 0), COLORS.ember, { emissive: 0xb13b16, emissiveIntensity: 1.2 });
  ember.position.set(.25, 5.32, -.1);
  group.add(ember);
  addEyes(group, [[-.48, 2.46, 1.62], [.22, 2.52, 1.76]], COLORS.parchment);
  group.userData.ember = ember;
  return group;
}

function triangleGeometry(points) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();
  return geometry;
}

function createWickerwing(primary) {
  const group = new THREE.Group();
  const body = mesh(new THREE.CapsuleGeometry(.5, 2.2, 3, 7), primary);
  body.rotation.x = Math.PI / 2;
  body.position.y = 2.5;
  group.add(body);
  const wingMat = material(0xc6a667, { side: THREE.DoubleSide });
  const left = new THREE.Mesh(triangleGeometry([new THREE.Vector3(0,2.7,0), new THREE.Vector3(-4.3,2.25,-.6), new THREE.Vector3(-2.6,2.35,2)]), wingMat);
  const right = left.clone();
  right.scale.x = -1;
  group.add(left, right);
  const vane = mesh(new THREE.BoxGeometry(.18, 1.8, 3.1), 0x8f6b45);
  vane.position.set(1.4, 3.4, -.4);
  vane.rotation.z = -.78;
  group.add(vane);
  for (const side of [-1, 1]) {
    const foot = mesh(new THREE.ConeGeometry(.22, 1, 5), 0x554235);
    foot.position.set(side * .45, 1.25, .2);
    foot.rotation.z = side * .2;
    group.add(foot);
  }
  addEyes(group, [[-.24, 2.6, 1.45], [.24, 2.6, 1.45]], COLORS.river);
  group.userData.wings = [left, right];
  return group;
}

function createRippletail(primary) {
  const group = new THREE.Group();
  const bodyGeometry = new THREE.OctahedronGeometry(1.8, 0);
  const body = mesh(bodyGeometry, primary);
  body.position.y = 1.75;
  body.scale.set(1.45, .48, 1.05);
  group.add(body);
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * .35, 1.65, -1.25),
      new THREE.Vector3(side * 1.05, 1.4, -2.35),
      new THREE.Vector3(side * .7, 1.1, -3.45)
    ]);
    const tail = mesh(new THREE.TubeGeometry(curve, 8, .13, 5, false), side < 0 ? COLORS.river : 0x7cc6ba);
    group.add(tail);
  }
  for (const [x,z] of [[-1,0],[1,0],[-.65,-.9],[.65,-.9]]) {
    const foot = mesh(new THREE.SphereGeometry(.28, 6, 4), 0x385f62);
    foot.position.set(x, .55, z);
    group.add(foot);
  }
  addEyes(group, [[-.38, 2.02, 1.15], [.38, 2.02, 1.15]], COLORS.sun);
  return group;
}

const DEFAULT_CREATURE_COLORS = Object.freeze({
  burramble: 0x7b9d58,
  flintusk: 0x647b7b,
  coaloon: 0xb65c43,
  wickerwing: 0x8d7650,
  rippletail: 0x4b9fab
});

export function createWildkinMesh(speciesId, color, scale = 1) {
  const resolved = color ? new THREE.Color(color).getHex() : DEFAULT_CREATURE_COLORS[speciesId] ?? COLORS.growth;
  let group;
  if (speciesId === 'burramble') group = createBurramble(resolved);
  else if (speciesId === 'flintusk') group = createFlintusk(resolved);
  else if (speciesId === 'coaloon') group = createCoaloon(resolved);
  else if (speciesId === 'wickerwing') group = createWickerwing(resolved);
  else group = createRippletail(resolved);
  group.scale.setScalar(scale);
  group.userData.speciesId = speciesId;
  group.userData.baseScale = scale;
  return shadowify(group);
}

export function createResourceMesh(type, variant = 0) {
  const group = new THREE.Group();
  if (type === 'wood') {
    const trunk = mesh(new THREE.CylinderGeometry(.72, 1.05, 7.5, 7), COLORS.wood);
    trunk.position.y = 3.75;
    group.add(trunk);
    for (let index = 0; index < 3; index += 1) {
      const canopy = mesh(new THREE.DodecahedronGeometry(2.5 + index * .3, 1), index % 2 ? 0x628e56 : 0x7ea45f);
      canopy.position.set((index - 1) * 1.4, 7.3 + Math.abs(index - 1) * .8, (index % 2) * .6);
      group.add(canopy);
    }
  } else if (type === 'stone' || type === 'ore') {
    const rock = mesh(new THREE.DodecahedronGeometry(type === 'ore' ? 2.1 : 2.35, 0), type === 'ore' ? 0x667674 : COLORS.slate);
    rock.scale.set(1.25, .82, 1);
    rock.position.y = 1.55;
    rock.rotation.y = variant * .7;
    group.add(rock);
    if (type === 'ore') {
      for (let index = 0; index < 3; index += 1) {
        const crystal = mesh(new THREE.OctahedronGeometry(.52 + index * .08, 0), index === 1 ? COLORS.sun : 0xb7734f, { metalness: .2 });
        crystal.position.set((index - 1) * .65, 2.6 + index * .25, .3 - index * .22);
        crystal.scale.y = 1.8;
        group.add(crystal);
      }
    }
  } else if (type === 'fiber') {
    for (let index = 0; index < 8; index += 1) {
      const reed = mesh(new THREE.ConeGeometry(.18, 2.5 + (index % 3) * .45, 4), index % 2 ? 0xabc86c : COLORS.growth);
      const angle = index * Math.PI * 2 / 8;
      reed.position.set(Math.cos(angle) * .75, 1.25, Math.sin(angle) * .75);
      reed.rotation.z = Math.cos(angle) * .18;
      group.add(reed);
    }
  } else {
    const bush = mesh(new THREE.DodecahedronGeometry(1.8, 1), 0x5f8c54);
    bush.scale.y = .78;
    bush.position.y = 1.15;
    group.add(bush);
    for (let index = 0; index < 6; index += 1) {
      const fruit = mesh(new THREE.OctahedronGeometry(.33, 0), COLORS.sun, { emissive: 0x5c3a09, emissiveIntensity: .25 });
      const angle = index * Math.PI * 2 / 6;
      fruit.position.set(Math.cos(angle) * 1.25, 1.15 + (index % 2) * .65, Math.sin(angle) * 1.25);
      group.add(fruit);
    }
  }
  group.userData.resourceType = type;
  return shadowify(group);
}

export function createPickupMesh(type, carried = false) {
  const color = type === 'wood' ? COLORS.wood : type === 'stone' ? COLORS.slate : type === 'fiber' ? COLORS.growth : type === 'food' ? COLORS.sun : type === 'ore' ? 0xb8734b : COLORS.steel;
  const geometry = type === 'wood'
    ? new THREE.BoxGeometry(.55, .55, 1.25)
    : type === 'fiber'
      ? new THREE.ConeGeometry(.35, 1.1, 5)
      : new THREE.OctahedronGeometry(.48, 0);
  const item = mesh(geometry, color, { emissive: type === 'food' ? 0x4a2f05 : 0, castShadow: !carried });
  item.userData.resourceType = type;
  return item;
}

export function createStructureMesh(type, ghost = false) {
  const group = new THREE.Group();
  const wood = ghost ? 0x78cfc4 : COLORS.wood;
  const stone = ghost ? 0x78cfc4 : COLORS.slate;
  const alpha = ghost ? .42 : 1;
  const options = ghost ? { opacity: alpha, castShadow: false } : {};
  if (type === 'workbench') {
    const stump = mesh(new THREE.CylinderGeometry(2.3, 2.6, 2.3, 8), wood, options); stump.position.y = 1.15;
    const top = mesh(new THREE.BoxGeometry(5.8, .55, 3.2), 0xb38352, options); top.position.set(.6, 2.6, 0);
    const vise = mesh(new THREE.BoxGeometry(.65, 1.1, 1.2), stone, options); vise.position.set(2.4, 3.25, .55);
    group.add(stump, top, vise);
  } else if (type === 'storage_bin') {
    const box = mesh(new THREE.BoxGeometry(4.7, 2.5, 3.5), wood, options); box.position.y = 1.25;
    const lid = mesh(new THREE.BoxGeometry(4.9, .45, 3.6), 0xa87347, options); lid.position.set(0, 3.35, -1.05); lid.rotation.x = -.55;
    const counter = mesh(new THREE.BoxGeometry(1.2, .6, .22), COLORS.sun, options); counter.position.set(0, 1.2, 1.86);
    group.add(box, lid, counter);
  } else if (type === 'feeder') {
    const trough = mesh(new THREE.BoxGeometry(5, 1.3, 2.4), wood, options); trough.position.y = 1.25;
    const hollow = mesh(new THREE.BoxGeometry(4.35, .7, 1.65), COLORS.ink, options); hollow.position.y = 1.85;
    group.add(trough, hollow);
  } else if (type === 'farm') {
    for (let row = -1; row <= 1; row += 2) for (let column = -1; column <= 1; column += 2) {
      const bed = mesh(new THREE.BoxGeometry(3.5, .6, 2.4), row === column ? 0x76533a : 0x69472f, options);
      bed.position.set(column * 2, .35, row * 1.55);
      group.add(bed);
    }
    const wheel = mesh(new THREE.TorusGeometry(1.45, .18, 5, 12), COLORS.river, options); wheel.position.set(0, 2.2, -3.3); wheel.rotation.y = Math.PI / 2;
    group.add(wheel);
    group.userData.movingPart = wheel;
  } else if (type === 'forge') {
    const bell = mesh(new THREE.CylinderGeometry(1.8, 3.1, 5.4, 9), 0x9a553d, options); bell.position.y = 2.7;
    const mouth = mesh(new THREE.CylinderGeometry(1.15, 1.15, .5, 10), COLORS.ink, options); mouth.position.set(0, 2.1, 2.55); mouth.rotation.x = Math.PI / 2;
    const glow = mesh(new THREE.CircleGeometry(.88, 10), COLORS.ember, { ...options, emissive: 0x9b2c12, emissiveIntensity: 1.2 }); glow.position.set(0, 2.1, 2.83);
    const chimney = mesh(new THREE.CylinderGeometry(.8, 1.1, 2.8, 8), stone, options); chimney.position.y = 6.6;
    group.add(bell, mouth, glow, chimney);
    group.userData.glow = glow;
  } else if (type === 'nursery') {
    const base = mesh(new THREE.CylinderGeometry(4.5, 4.8, .65, 16), 0xb98d57, options); base.position.y = .33;
    group.add(base);
    for (const side of [-1, 1]) {
      const arch = mesh(new THREE.TorusGeometry(4.2, .18, 5, 16, Math.PI), side < 0 ? COLORS.growth : COLORS.sun, options);
      arch.position.y = .7;
      arch.rotation.set(0, side * Math.PI / 2, 0);
      group.add(arch);
    }
    const cradle = mesh(new THREE.IcosahedronGeometry(1.25, 1), COLORS.parchment, options); cradle.position.y = 1.3;
    group.add(cradle);
    group.userData.cradle = cradle;
  }
  group.userData.structureType = type;
  group.userData.ghost = ghost;
  return shadowify(group);
}

export function createGuardianMesh() {
  const group = new THREE.Group();
  const ring = mesh(new THREE.TorusGeometry(3.4, .7, 7, 20), 0x2d3b38);
  ring.position.y = 6.2;
  ring.rotation.y = .2;
  group.add(ring);
  const inner = mesh(new THREE.TorusGeometry(1.7, .32, 6, 16), COLORS.slate, { metalness: .15 });
  inner.position.y = 6.2;
  inner.rotation.y = -.35;
  group.add(inner);
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = mesh(new THREE.CylinderGeometry(.48, .8, 6.4, 6), COLORS.darkWood);
    leg.position.set(side * 2.1, 2.7, 0);
    leg.rotation.z = side * .15;
    group.add(leg);
    legs.push(leg);
  }
  const chimes = [];
  for (let index = 0; index < 5; index += 1) {
    const chime = mesh(new THREE.OctahedronGeometry(.7, 0), index === 0 ? COLORS.sun : COLORS.slate, { metalness: .25, emissive: index === 0 ? 0x513005 : 0 });
    chime.position.set(Math.cos(index * Math.PI * 2 / 5) * 5.1, 6.2 + Math.sin(index * Math.PI * 2 / 5) * 3.2, 0);
    group.add(chime);
    chimes.push(chime);
  }
  const core = mesh(new THREE.IcosahedronGeometry(.8, 1), COLORS.clay, { emissive: 0x711c0d, emissiveIntensity: 1 });
  core.position.y = 6.2;
  group.add(core);
  group.userData = { kind: 'guardian', ring, inner, legs, chimes, core };
  return shadowify(group);
}

export function createProjectileMesh(weaponId, hostile = false) {
  const wildColor = weaponId === 'rippletail-attack' ? COLORS.river : weaponId === 'wickerwing-attack' ? COLORS.sun : weaponId === 'coaloon-attack' ? COLORS.ember : COLORS.clay;
  const color = hostile ? wildColor : weaponId === 'steel_repeater' ? COLORS.sun : weaponId === 'stonebolt_launcher' ? COLORS.slate : COLORS.growth;
  const geometry = weaponId === 'coaloon-attack'
    ? new THREE.IcosahedronGeometry(.38, 0)
    : weaponId === 'rippletail-attack'
      ? new THREE.TorusGeometry(.32, .09, 4, 9)
      : weaponId === 'wickerwing-attack'
        ? new THREE.ConeGeometry(.22, 1.1, 4)
        : new THREE.CapsuleGeometry(.13, hostile ? .55 : .75, 2, 5);
  const projectile = mesh(geometry, color, { emissive: hostile ? wildColor : 0x234625, emissiveIntensity: .9, castShadow: false });
  projectile.rotation.x = Math.PI / 2;
  return projectile;
}

export function createGlimmerline() {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: COLORS.river, transparent: true, opacity: .85 }));
  const line2 = new THREE.Line(geometry.clone(), new THREE.LineBasicMaterial({ color: COLORS.sun, transparent: true, opacity: .6 }));
  const group = new THREE.Group();
  group.add(line, line2);
  group.visible = false;
  group.userData.lines = [line, line2];
  return group;
}

export function setGlimmerline(lineGroup, start, end, time = 0) {
  const offset = new THREE.Vector3(Math.sin(time * 8) * .1, Math.cos(time * 7) * .08, 0);
  lineGroup.userData.lines.forEach((line, index) => {
    const positions = line.geometry.attributes.position;
    positions.setXYZ(0, start.x + offset.x * index, start.y + offset.y * index, start.z);
    positions.setXYZ(1, end.x - offset.x * index, end.y - offset.y * index, end.z);
    positions.needsUpdate = true;
  });
  lineGroup.visible = true;
}

export function activateBeacon(beacon) {
  beacon.userData.activated = true;
  beacon.userData.core.visible = true;
  beacon.userData.beam.visible = true;
}

export function disposeObject(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose?.();
  });
}
