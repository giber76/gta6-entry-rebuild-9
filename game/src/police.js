// Solara Bay — police: patrol the ring road when calm, chase Marlo when
// the wanted level is above 0, ram his car, and bust him on foot.
// Busted only on foot: a police car within 3 m for 2 continuous seconds,
// or Marlo's health reaching 0.

import { clamp } from './util.js';
import { createCar, damageCar } from './vehicles.js';
import { isBlocked } from './city.js';

const CHASE_SPEED = 40; // slightly faster than the player's 38 m/s top speed

export function initPolice(G) {
  G.police = [];
  for (let i = 0; i < 2; i++) {
    const car = createCar(G, 'police', 160 - i * 12, 160, -Math.PI / 2, 0x1a1a22);
    car.patrolIdx = 0;
    car.patrol = [[160, 160], [-160, 160], [-160, -160], [160, -160]];
    G.police.push(car);
  }
}

function steerToward(car, tx, tz, dt, maxTurn) {
  const want = Math.atan2(tx - car.x, tz - car.z);
  let d = want - car.heading;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  car.heading += clamp(d, -maxTurn * dt, maxTurn * dt);
}

export function updatePolice(G, dt) {
  const p = G.player;
  for (const car of G.police) {
    if (car.wrecked) continue;
    car.ramCooldown = Math.max(0, car.ramCooldown - dt);
    if (G.wanted > 0) {
      // Chase: steer at Marlo, close in, ram his car.
      steerToward(car, p.x, p.z, dt, 2.6);
      const dx = p.x - car.x;
      const dz = p.z - car.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      car.speed += clamp(CHASE_SPEED - car.speed, -16 * dt, 14 * dt);
      const fx = Math.sin(car.heading);
      const fz = Math.cos(car.heading);
      const nx = car.x + fx * car.speed * dt;
      const nz = car.z + fz * car.speed * dt;
      if (!isBlocked(G, nx, nz, 1.7)) {
        car.x = clamp(nx, -178, 178);
        car.z = clamp(nz, -178, 178);
      } else {
        car.speed *= 0.5;
      }
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
      // Ram: close to the player's car, cooldown-gated.
      if (p.inCar && p.car && d < 4.2 && car.ramCooldown <= 0) {
        damageCar(G, p.car, 6);
        car.ramCooldown = 1.2;
        p.car.speed *= 0.92;
      }
    } else {
      // Patrol the outer ring road.
      const target = car.patrol[car.patrolIdx];
      const dx = target[0] - car.x;
      const dz = target[1] - car.z;
      if (Math.sqrt(dx * dx + dz * dz) < 4) {
        car.patrolIdx = (car.patrolIdx + 1) % car.patrol.length;
        continue;
      }
      steerToward(car, target[0], target[1], dt, 2.2);
      car.speed += clamp(16 - car.speed, -12 * dt, 8 * dt);
      const fx = Math.sin(car.heading);
      const fz = Math.cos(car.heading);
      car.x = clamp(car.x + fx * car.speed * dt, -178, 178);
      car.z = clamp(car.z + fz * car.speed * dt, -178, 178);
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
    }
  }
  // A third unit joins the chase at wanted 3.
  if (G.wanted >= 3 && G.police.length < 3) {
    const car = createCar(G, 'police', -160, -160, 0, 0x1a1a22);
    car.patrolIdx = 0;
    car.patrol = [[160, 160], [-160, 160], [-160, -160], [160, -160]];
    G.police.push(car);
  }
  // Busted check: on foot, wanted, a police car within 3 m for 2 s.
  if (!p.inCar && G.wanted > 0 && G.state === 'playing') {
    let near = false;
    for (const car of G.police) {
      if (car.wrecked) continue;
      const dx = p.x - car.x;
      const dz = p.z - car.z;
      if (Math.sqrt(dx * dx + dz * dz) < 3) { near = true; break; }
    }
    if (near) {
      G.bustTimer += dt;
      if (G.bustTimer >= 2) {
        G.state = 'busted';
        if (G.audio) G.audio.playBusted();
      }
    } else {
      G.bustTimer = 0;
    }
  } else {
    G.bustTimer = 0;
  }
}
