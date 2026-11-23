// Solara Bay — cars: factory, arcade physics, damage and wrecks.
// Every car has 100 health. Below 50 it smokes, below 25 it burns, at 0 it
// wrecks: explosion, driver ejected, and (traffic / police / boss coupe)
// a respawn after 8 seconds. Parked cars never respawn.

import { forwardOf, clamp } from './util.js';
import { isBlocked } from './city.js';
import { explode } from './effects.js';

const CAR_COLORS = {
  coupe: 0xd83232,
  boss: 0x14141a,
  getaway: 0x2e6fd8,
  traffic: 0x8a8f94,
  police: 0x1a1a22,
  parked: 0x5a7d4a,
};

export function makeCarMesh(color, kind) {
  const THREE = window.THREE;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2530 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.0), glassMat);
  cabin.position.set(0, 1.05, -0.2);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    g.add(w);
  }
  if (kind === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    bar.position.set(0, 1.42, -0.2);
    g.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar2.position.set(0, 1.42, 0.35);
    g.add(bar2);
  }
  if (kind === 'boss') {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 4.2), new THREE.MeshBasicMaterial({ color: 0xc9a227 }));
    stripe.position.set(0, 0.88, 0);
    g.add(stripe);
  }
  return g;
}

export function createCar(G, kind, x, z, heading, color) {
  const mesh = makeCarMesh(color ?? CAR_COLORS[kind] ?? 0x888888, kind);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  G.scene.add(mesh);
  const car = {
    kind, mesh, x, z, heading, speed: 0,
    health: 100, wrecked: false, respawnAt: 0, home: { x, z, heading },
    ramCooldown: 0, smokeTimer: 0, driver: null, steer: 0,
  };
  G.cars.push(car);
  return car;
}

export function removeCar(G, car) {
  G.scene.remove(car.mesh);
  const i = G.cars.indexOf(car);
  if (i >= 0) G.cars.splice(i, 1);
}

// Arcade driving: W accelerates, S brakes/reverses, A/D steer. Top speed
// 38 m/s (137 km/h); 0-100 km/h in ~1.7 s so the driving check clears.
export function driveCar(G, car, dt, input) {
  if (car.wrecked) return;
  const fwd = input.w ? 1 : input.s ? -1 : 0;
  if (fwd > 0) car.speed += 22 * dt;
  else if (fwd < 0) {
    if (car.speed > 0.5) car.speed -= 30 * dt;
    else car.speed -= 10 * dt;
  } else {
    car.speed -= car.speed * 0.8 * dt;
    if (Math.abs(car.speed) < 0.2) car.speed = 0;
  }
  car.speed = clamp(car.speed, -10, 38);
  const steer = (input.a ? 1 : 0) - (input.d ? 1 : 0);
  if (Math.abs(car.speed) > 0.5) {
    const grip = clamp(Math.abs(car.speed) / 12, 0.3, 1);
    car.heading += steer * 2.0 * dt * grip * (car.speed >= 0 ? 1 : -1);
  }
  const f = forwardOf(car.heading);
  const nx = car.x + f.x * car.speed * dt;
  const nz = car.z + f.z * car.speed * dt;
  const hit = isBlocked(G, nx, nz, 1.7);
  if (hit) {
    if (Math.abs(car.speed) > 8 && car.kind === 'player') damageCar(G, car, 5);
    car.speed *= 0.35;
  } else {
    car.x = clamp(nx, -178, 178);
    car.z = clamp(nz, -178, 178);
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  car.ramCooldown = Math.max(0, car.ramCooldown - dt);
}

export function damageCar(G, car, n) {
  if (!car || car.wrecked) return;
  car.health -= n;
  if (car.health <= 0) {
    car.health = 0;
    wreckCar(G, car);
  }
}

export function repairCar(G, car) {
  if (!car) return;
  car.health = 100;
  car.wrecked = false;
  car.mesh.visible = true;
}

function wreckCar(G, car) {
  car.wrecked = true;
  car.speed = 0;
  explode(G, car.x, car.z);
  if (G.audio) G.audio.playExplosion();
  // Eject the driver (Marlo) to the side of the wreck.
  if (car.driver === 'marlo') {
    const p = G.player;
    p.inCar = false;
    p.car = null;
    p.x = car.x + 3;
    p.z = car.z + 3;
    p.mesh.visible = true;
    p.mesh.position.set(p.x, 0, p.z);
    car.driver = null;
  }
  car.mesh.visible = false;
  car.respawnAt = G.elapsed + 8;
  if (car.kind === 'parked') {
    // Parked cars never come back; the parked count drops.
    return;
  }
  if (car.kind === 'police') {
    // A wrecked police car stays out of action for 8 s.
    return;
  }
}

// Respawn wrecked traffic / police / boss cars 8 s after the wreck.
export function updateWrecks(G) {
  for (const car of G.cars) {
    if (!car.wrecked || car.kind === 'parked') continue;
    if (G.elapsed < car.respawnAt) continue;
    if (car.kind === 'traffic') {
      car.x = car.home.x;
      car.z = car.home.z;
      car.heading = car.home.heading;
      car.health = 100;
      car.wrecked = false;
      car.mesh.visible = true;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
    } else if (car.kind === 'police') {
      // Back on patrol from the ring road.
      car.x = 160;
      car.z = 160;
      car.heading = -Math.PI / 2;
      car.health = 100;
      car.wrecked = false;
      car.mesh.visible = true;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
    } else if (car.kind === 'boss') {
      // The boss coupe re-deals: it comes back where it was stolen from.
      car.x = car.home.x;
      car.z = car.home.z;
      car.heading = car.home.heading;
      car.health = 100;
      car.wrecked = false;
      car.mesh.visible = true;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
    }
  }
}
