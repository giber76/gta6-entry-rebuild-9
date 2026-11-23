// Solara Bay — pedestrians walking the sidewalks (|coord| <= 150).
// They stroll between waypoints on the sidewalk strips and scatter when
// an explosion goes off nearby.

import { mulberry32, rand, clamp } from './util.js';

export function initPeds(G) {
  const THREE = window.THREE;
  const rng = mulberry32(777);
  G.peds = [];
  const shirts = [0xd8d8d8, 0xe8b8b8, 0xb8d8e8, 0xd8e8b8, 0xe8d8a8, 0xc8b8e8];
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.0, 0.35),
      new THREE.MeshLambertMaterial({ color: shirts[i % shirts.length] }),
    );
    body.position.y = 1.0;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xd8a878 }),
    );
    head.position.y = 1.75;
    g.add(head);
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.55, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x2a2f36 }),
    );
    legs.position.y = 0.28;
    g.add(legs);
    // Start on a sidewalk: beside a road, within |coord| 150.
    const road = [-120, -80, -40, 0, 40, 80, 120][Math.floor(rng() * 7)];
    const along = rand(rng, -140, 140);
    const side = rng() > 0.5 ? 1 : -1;
    let x;
    let z;
    if (rng() > 0.5) { x = road + side * 7.5; z = along; }
    else { x = along; z = road + side * 7.5; }
    g.position.set(x, 0, z);
    G.scene.add(g);
    G.peds.push({
      mesh: g, x, z, heading: rand(rng, 0, Math.PI * 2),
      speed: rand(rng, 1.2, 1.9), target: null, scatter: 0, scatterX: 0, scatterZ: 0,
    });
  }
}

function pickTarget(G, ped) {
  // A new sidewalk waypoint near the current spot.
  const road = [-120, -80, -40, 0, 40, 80, 120][Math.floor(Math.random() * 7)];
  const along = ped.z + (Math.random() - 0.5) * 80;
  if (Math.random() > 0.5) return { x: road + (Math.random() > 0.5 ? 7.5 : -7.5), z: clamp(along, -148, 148) };
  return { x: clamp(ped.x + (Math.random() - 0.5) * 80, -148, 148), z: road + (Math.random() > 0.5 ? 7.5 : -7.5) };
}

export function updatePeds(G, dt) {
  for (const ped of G.peds) {
    if (ped.scatter > 0) {
      ped.scatter -= dt;
      ped.x = clamp(ped.x + ped.scatterX * 5 * dt, -178, 178);
      ped.z = clamp(ped.z + ped.scatterZ * 5 * dt, -178, 178);
      ped.heading = Math.atan2(ped.scatterX, ped.scatterZ);
    } else {
      if (!ped.target) ped.target = pickTarget(G, ped);
      const dx = ped.target.x - ped.x;
      const dz = ped.target.z - ped.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < 1.5) {
        ped.target = null;
        continue;
      }
      const want = Math.atan2(dx, dz);
      let diff = want - ped.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ped.heading += clamp(diff, -2.5 * dt, 2.5 * dt);
      ped.x = clamp(ped.x + Math.sin(ped.heading) * ped.speed * dt, -178, 178);
      ped.z = clamp(ped.z + Math.cos(ped.heading) * ped.speed * dt, -178, 178);
    }
    ped.mesh.position.set(ped.x, 0, ped.z);
    ped.mesh.rotation.y = ped.heading;
  }
}
