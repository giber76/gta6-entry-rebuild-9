// Solara Bay — traffic cars on road loops and the 6 parked cars.
// Traffic stays on inner roads (never the |coord|=160 ring, so the M2
// evasion run stays clear). A wrecked traffic car respawns after 8 s.
// Parked cars never respawn; wrecking one drops the parked count.

import { SPOTS, mulberry32, rand, clamp } from './util.js';
import { createCar, driveCar } from './vehicles.js';

// Rectangular loops on inner roads: [corners] in (x, z), driven clockwise.
const LOOPS = [
  [[-120, -120], [120, -120], [120, 120], [-120, 120]],
  [[-80, -80], [80, -80], [80, 80], [-80, 80]],
  [[-40, -120], [-40, 120], [40, 120], [40, -120]],
  [[-120, 40], [120, 40], [120, -40], [-120, -40]],
];

export function initTraffic(G) {
  const rng = mulberry32(20240);
  G.traffic = [];
  const colors = [0x8a8f94, 0xb0b5ba, 0x6a7d8a, 0x9a8a7a, 0x7a8a6a, 0x8a6a7a];
  for (let i = 0; i < 10; i++) {
    const loop = LOOPS[i % LOOPS.length];
    const corner = Math.floor(rand(rng, 0, loop.length));
    const t = rand(rng, 0, 1);
    const a = loop[corner];
    const b = loop[(corner + 1) % loop.length];
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[1] + (b[1] - a[1]) * t;
    const heading = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const car = createCar(G, 'traffic', x, z, heading, colors[i % colors.length]);
    car.loop = loop;
    car.loopIdx = (corner + 1) % loop.length;
    car.cruise = rand(rng, 10, 14);
    G.traffic.push(car);
  }
  // The 6 parked cars, including the two the spec names.
  G.parked = [];
  for (const spot of SPOTS.parked) {
    const heading = Math.abs(spot.x) > Math.abs(spot.z) ? Math.PI / 2 : 0;
    const car = createCar(G, 'parked', spot.x, spot.z, heading, 0x5a7d4a);
    G.parked.push(car);
  }
}

export function parkedCount(G) {
  let n = 0;
  for (const car of G.parked) if (!car.wrecked) n++;
  return n;
}

function steerToward(car, tx, tz, dt, maxTurn) {
  const want = Math.atan2(tx - car.x, tz - car.z);
  let d = want - car.heading;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const turn = clamp(d, -maxTurn * dt, maxTurn * dt);
  car.heading += turn;
  return Math.abs(d) < 0.2;
}

export function updateTraffic(G, dt) {
  for (const car of G.traffic) {
    if (car.wrecked) continue;
    const target = car.loop[car.loopIdx];
    const dx = target[0] - car.x;
    const dz = target[1] - car.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 3) {
      car.loopIdx = (car.loopIdx + 1) % car.loop.length;
      continue;
    }
    steerToward(car, target[0], target[1], dt, 2.2);
    // Ease into the cruise speed; slow for corners.
    const want = d < 12 ? car.cruise * 0.5 : car.cruise;
    car.speed += clamp(want - car.speed, -14 * dt, 8 * dt);
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    car.x = clamp(car.x + fx * car.speed * dt, -178, 178);
    car.z = clamp(car.z + fz * car.speed * dt, -178, 178);
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    // Gentle bump with the player's car.
    const pc = G.player.car;
    if (pc && pc !== car) {
      const pdx = pc.x - car.x;
      const pdz = pc.z - car.z;
      const pd = Math.sqrt(pdx * pdx + pdz * pdz);
      if (pd < 3.6 && pd > 0.01) {
        pc.x += (pdx / pd) * 0.6;
        pc.z += (pdz / pd) * 0.6;
        if (Math.abs(pc.speed) > 6) {
          pc.speed *= 0.85;
        }
      }
    }
  }
  // Parked cars sit still; nothing to update.
}
