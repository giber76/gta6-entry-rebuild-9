// Solara Bay — the coastal city: ground, ocean, roads, buildings, props.
// The ground is one canvas texture (ocean, city base, roads, sidewalks,
// lane markings, parks, pier) so the whole city floor is a single draw call.
// Buildings are one InstancedMesh; their footprints are kept as AABBs for
// collision. Blocks holding mission spots stay open plazas.

import { WORLD, SPOTS, mulberry32, rand } from './util.js';

const ROADS = WORLD.ROADS;
const HALF = 180; // texture covers [-180, 180] in both axes
const TEX = 1024;

// Blocks that must stay open (mission cars, combat areas, lots).
const OPEN_BLOCKS = [
  { x: 24, z: 26 }, // M1 coupe lot
  { x: 100, z: 36 }, // Marina East combat plaza
  { x: 126, z: 48 }, // boss coupe lot
  { x: -46, z: 8 }, // getaway car lot
];

function blockHasPoint(bx0, bz0, bx1, bz1, px, pz) {
  return px > bx0 + 2 && px < bx1 - 2 && pz > bz0 + 2 && pz < bz1 - 2;
}

function drawGround() {
  const c = document.createElement('canvas');
  c.width = TEX;
  c.height = TEX;
  const g = c.getContext('2d');
  const px = (v) => ((v + HALF) / (HALF * 2)) * TEX;
  const m = (v) => (v / (HALF * 2)) * TEX; // metres -> pixels

  // Ocean everywhere first; the city ground must never paint over the sea.
  const sea = g.createLinearGradient(0, 0, TEX, TEX);
  sea.addColorStop(0, '#1b7fc4');
  sea.addColorStop(0.5, '#1570ad');
  sea.addColorStop(1, '#0f5f96');
  g.fillStyle = sea;
  g.fillRect(0, 0, TEX, TEX);
  // Gentle wave streaks on the water.
  g.strokeStyle = 'rgba(255,255,255,0.10)';
  g.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const y = ((i * 97) % TEX) + 10;
    const x = ((i * 173) % TEX) + 10;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 40 + (i % 5) * 8, y);
    g.stroke();
  }
  // Sand rim where the city meets the sea.
  g.fillStyle = '#e8d5a4';
  g.fillRect(px(-HALF), px(-HALF), TEX, m(12));
  g.fillRect(px(-HALF), px(HALF - 12), TEX, m(12));
  g.fillRect(px(-HALF), px(-HALF), m(12), TEX);
  g.fillRect(px(HALF - 12), px(-HALF), m(12), TEX);

  // City base.
  g.fillStyle = '#9aa0a3';
  g.fillRect(px(-WORLD.CITY), px(-WORLD.CITY), m(WORLD.CITY * 2), m(WORLD.CITY * 2));

  // Sidewalks: light strips flanking every road.
  g.fillStyle = '#c4c9cc';
  for (const r of ROADS) {
    g.fillRect(px(-HALF), px(r - 9), TEX, m(18));
    g.fillRect(px(r - 9), px(-HALF), m(18), TEX);
  }
  // Roads: dark asphalt.
  g.fillStyle = '#33373b';
  for (const r of ROADS) {
    g.fillRect(px(-HALF), px(r - 6), TEX, m(12));
    g.fillRect(px(r - 6), px(-HALF), m(12), TEX);
  }
  // Lane dashes down the middle of every road.
  g.fillStyle = '#e8c832';
  for (const r of ROADS) {
    for (let d = -HALF + 8; d < HALF - 8; d += 16) {
      g.fillRect(px(d), px(r - 0.6), m(7), m(1.2));
      g.fillRect(px(r - 0.6), px(d), m(1.2), m(7));
    }
  }
  // Two parks.
  g.fillStyle = '#5d8a4a';
  g.fillRect(px(46), px(-114), m(28), m(28));
  g.fillRect(px(-114), px(46), m(28), m(28));
  g.fillStyle = '#6f9e57';
  g.beginPath();
  g.arc(px(60), px(-100), m(9), 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(px(-100), px(60), m(9), 0, Math.PI * 2);
  g.fill();
  // The pier: wooden deck reaching east from the ring road at (158, -40).
  g.fillStyle = '#8a6b46';
  g.fillRect(px(158), px(-46), m(22), m(12));
  g.fillStyle = '#6e5236';
  for (let x = 160; x < 180; x += 4) g.fillRect(px(x), px(-46), m(1), m(12));
  // Marina East plaza tint.
  g.fillStyle = '#b8a88a';
  g.fillRect(px(86), px(6), m(28), m(28));
  return c;
}

export function buildCity(G) {
  const THREE = window.THREE;
  const rng = mulberry32(1337);

  // Ground: one textured plane; water plane underneath, slightly lower.
  const canvas = drawGround();
  G.groundCanvas = canvas;
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF * 2, HALF * 2),
    new THREE.MeshLambertMaterial({ map: tex }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  G.scene.add(ground);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshLambertMaterial({ color: 0x1570ad, transparent: true, opacity: 0.9 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.25;
  G.scene.add(water);

  // Buildings: one InstancedMesh. Blocks sit between roads (28 m wide).
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const placements = [];
  const palette = [0xd8c9a8, 0xc9b8a0, 0xe0d6c0, 0xb8c4cc, 0xd0b0a0, 0xa8b8a0, 0xe8e0d0, 0xc0b8b0];
  for (let ix = 0; ix < ROADS.length - 1; ix++) {
    for (let iz = 0; iz < ROADS.length - 1; iz++) {
      const bx0 = ROADS[ix] + 6;
      const bx1 = ROADS[ix + 1] - 6;
      const bz0 = ROADS[iz] + 6;
      const bz1 = ROADS[iz + 1] - 6;
      if (bx1 - bx0 < 10 || bz1 - bz0 < 10) continue;
      let open = false;
      for (const p of OPEN_BLOCKS) {
        if (blockHasPoint(bx0, bz0, bx1, bz1, p.x, p.z)) { open = true; break; }
      }
      // The two parks stay open too.
      if (blockHasPoint(bx0, bz0, bx1, bz1, 60, -100) || blockHasPoint(bx0, bz0, bx1, bz1, -100, 60)) open = true;
      if (open) continue;
      const cx = (bx0 + bx1) / 2 + rand(rng, -2, 2);
      const cz = (bz0 + bz1) / 2 + rand(rng, -2, 2);
      const w = rand(rng, 12, Math.min(20, bx1 - bx0 - 2));
      const d = rand(rng, 12, Math.min(20, bz1 - bz0 - 2));
      const h = rand(rng, 8, 30);
      placements.push({ x: cx, z: cz, w, d, h, color: palette[Math.floor(rng() * palette.length)] });
    }
  }
  // A few towers near the marina for the skyline.
  placements.push({ x: 140, z: 100, w: 18, d: 18, h: 46, color: 0x9fb8cc });
  placements.push({ x: -140, z: -100, w: 16, d: 16, h: 38, color: 0xd8c9a8 });
  placements.push({ x: 100, z: -140, w: 16, d: 16, h: 34, color: 0xc9b8a0 });

  const inst = new THREE.InstancedMesh(geo, mat, placements.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const col = new THREE.Color();
  G.buildings = [];
  placements.forEach((b, i) => {
    p.set(b.x, b.h / 2, b.z);
    s.set(b.w, b.h, b.d);
    m4.compose(p, q, s);
    inst.setMatrixAt(i, m4);
    col.setHex(b.color);
    inst.setColorAt(i, col);
    G.buildings.push({ minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2 });
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  G.scene.add(inst);

  // Rooftop beacons on the two towers (visible in the combat screenshot).
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
  for (const b of placements.filter((x) => x.h > 34)) {
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), beaconMat);
    beacon.position.set(b.x, b.h + 1.2, b.z);
    G.scene.add(beacon);
    G.beacons = G.beacons || [];
    G.beacons.push(beacon);
  }

  // Landmark blocks: Rico's Garage (gold), the bank (marble), the safehouse (teal).
  function landmark(x, z, w, d, h, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, h / 2, z);
    G.scene.add(m);
    G.buildings.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }
  landmark(-104, 128, 16, 10, 7, 0xc9a227); // Rico's Garage block
  landmark(-52, -92, 14, 10, 12, 0xe8e4da); // the bank block
  landmark(150, 64, 12, 10, 8, 0x2e8b8b); // safehouse block

  // Palm trees along the marina and pier (trunk + fronds, instanced).
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 6, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b46 });
  const leafGeo = new THREE.ConeGeometry(2.6, 2.2, 7);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f7d3a });
  const palmSpots = [];
  for (let i = 0; i < 10; i++) palmSpots.push({ x: 84 + i * 4, z: 44 + (i % 2) * 6 });
  for (let i = 0; i < 6; i++) palmSpots.push({ x: 150 + i * 5, z: -52 + (i % 2) * 4 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmSpots.length);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, palmSpots.length);
  palmSpots.forEach((pt, i) => {
    p.set(pt.x, 3, pt.z); s.set(1, 1, 1); m4.compose(p, q, s); trunks.setMatrixAt(i, m4);
    p.set(pt.x, 7, pt.z); m4.compose(p, q, s); leaves.setMatrixAt(i, m4);
  });
  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  G.scene.add(trunks);
  G.scene.add(leaves);
}

// Circle (radius r) vs building AABBs: true when the circle overlaps one.
export function isBlocked(G, x, z, r) {
  for (const b of G.buildings) {
    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < r * r) return b;
  }
  return null;
}
