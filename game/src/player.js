// Solara Bay — Marlo on foot: walking, entering and exiting cars.
// On foot Marlo walks with W (hold) and turns with A/D or the mouse.
// E near a car enters it; E again exits. Health 100; at 0 he is busted.

import { forwardOf, clamp } from './util.js';
import { isBlocked } from './city.js';

const WALK_SPEED = 7; // m/s: holding W for 2 game-s moves ~14 m (>10 required)

export function createPlayer(G) {
  const THREE = window.THREE;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2e6fd8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.4), bodyMat);
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), new THREE.MeshLambertMaterial({ color: 0xd8a878 }));
  head.position.y = 1.85;
  g.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.35), new THREE.MeshLambertMaterial({ color: 0x222831 }));
  legs.position.y = 0.3;
  g.add(legs);
  g.position.set(G.player.x, 0, G.player.z);
  G.scene.add(g);
  G.player.mesh = g;
  return g;
}

export function updatePlayer(G, dt) {
  const p = G.player;
  if (p.inCar || !p.mesh) return;
  const input = G.keys;
  if (input.a) p.heading += 2.4 * dt;
  if (input.d) p.heading -= 2.4 * dt;
  let mx = 0;
  let mz = 0;
  if (input.w) {
    const f = forwardOf(p.heading);
    mx = f.x * WALK_SPEED;
    mz = f.z * WALK_SPEED;
  }
  if (input.s) {
    const f = forwardOf(p.heading);
    mx = -f.x * WALK_SPEED * 0.5;
    mz = -f.z * WALK_SPEED * 0.5;
  }
  const nx = p.x + mx * dt;
  const nz = p.z + mz * dt;
  if (!isBlocked(G, nx, nz, 0.6)) {
    p.x = clamp(nx, -178, 178);
    p.z = clamp(nz, -178, 178);
  }
  p.speed = Math.sqrt(mx * mx + mz * mz);
  p.mesh.position.set(p.x, 0, p.z);
  p.mesh.rotation.y = p.heading;
}

// Nearest drivable car within range of Marlo (skips wrecked cars).
export function nearestCar(G, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    if (car.wrecked) continue;
    const dx = car.x - G.player.x;
    const dz = car.z - G.player.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function enterCar(G, car) {
  const p = G.player;
  p.inCar = true;
  p.car = car;
  car.driver = 'marlo';
  p.mesh.visible = false;
  p.x = car.x;
  p.z = car.z;
  p.heading = car.heading;
  p.speed = 0;
}

export function exitCar(G) {
  const p = G.player;
  const car = p.car;
  if (!car) return;
  car.driver = null;
  p.inCar = false;
  p.car = null;
  // Step out to the driver's side.
  const f = forwardOf(car.heading);
  p.x = car.x - f.z * 2.4;
  p.z = car.z + f.x * 2.4;
  p.heading = car.heading;
  p.mesh.visible = true;
  p.mesh.position.set(p.x, 0, p.z);
  p.mesh.rotation.y = p.heading;
}

// E pressed: enter the nearest car (on foot) or exit (in a car).
export function pressE(G) {
  const p = G.player;
  if (p.inCar) {
    exitCar(G);
    return 'exit';
  }
  const car = nearestCar(G, 4.5);
  if (car) {
    enterCar(G, car);
    return car;
  }
  return null;
}
