// Solara Bay — combat: the pistol, Vipers, and the shooting rules.
// Pistol: 15 damage a round, 70 m range, 0.3 s cooldown (ticks while
// driving, so drive-bys can fire repeatedly). The raycast skips Marlo's
// own car. Vipers hold at ~15 m, strafe, and back off when Marlo closes in.

import { clamp, dist2 } from './util.js';
import { damageCar } from './vehicles.js';
import { damageFlash } from './effects.js';

const PISTOL_DAMAGE = 15;
const PISTOL_RANGE = 70;
const PISTOL_COOLDOWN = 0.3;
const VIPER_HEALTH = 45;

export function spawnEnemy(G, x, z) {
  const THREE = window.THREE;
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.1, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x8a1a1a }),
  );
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 10),
    new THREE.MeshLambertMaterial({ color: 0xc8a878 }),
  );
  head.position.y = 1.85;
  g.add(head);
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.12, 0.6),
    new THREE.MeshBasicMaterial({ color: 0xff2222 }),
  );
  band.position.y = 1.95;
  g.add(band);
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x222222 }),
  );
  gun.position.set(0.3, 1.2, 0.5);
  g.add(gun);
  g.position.set(x, 0, z);
  G.scene.add(g);
  const e = { mesh: g, x, z, heading: 0, health: VIPER_HEALTH, shootTimer: 1 + Math.random(), strafeDir: Math.random() > 0.5 ? 1 : -1, strafeTimer: 0 };
  G.enemies.push(e);
  return e;
}

export function removeEnemy(G, e) {
  G.scene.remove(e.mesh);
  const i = G.enemies.indexOf(e);
  if (i >= 0) G.enemies.splice(i, 1);
}

export function enemiesAlive(G) {
  return G.enemies.length;
}

// Face Marlo (and the camera) at the nearest target in `list`.
export function faceNearest(G, list) {
  if (list.length === 0) return;
  let best = null;
  let bestD = Infinity;
  for (const t of list) {
    const d = dist2(G.player.x, G.player.z, t.x, t.z);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  if (!best) return;
  G.player.heading = Math.atan2(best.x - G.player.x, best.z - G.player.z);
  G.orbit = 0;
}

// Fire the pistol once, along the camera's aim.
export function shoot(G) {
  const p = G.player;
  if (!p.hasPistol) return false;
  if (G.shootCooldown > 0) return false;
  G.shootCooldown = PISTOL_COOLDOWN;
  if (G.audio) G.audio.playShoot();
  // Aim from Marlo along the camera's horizontal forward: the camera
  // looks down at Marlo, so its raw forward ray dives into the ground
  // a few metres ahead and can never reach a Viper holding at ~15 m.
  // Projecting the camera forward onto the horizontal plane and firing
  // from Marlo's chest height keeps the ray on target at any range.
  const cam = G.camera;
  const cdir = new window.THREE.Vector3();
  cam.getWorldDirection(cdir);
  const hl = Math.hypot(cdir.x, cdir.z);
  let dx, dz;
  if (hl > 0.001) {
    dx = cdir.x / hl;
    dz = cdir.z / hl;
  } else {
    dx = Math.sin(p.heading);
    dz = Math.cos(p.heading);
  }
  const dir = new window.THREE.Vector3(dx, 0, dz);
  const ox = p.x;
  const oy = 1.3;
  const oz = p.z;
  let bestT = null;
  let bestD = PISTOL_RANGE;
  let bestKind = null;
  function consider(tx, ty, tz, radius, target, kind) {
    const vx = tx - ox;
    const vy = ty - oy;
    const vz = tz - oz;
    const d = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (d > PISTOL_RANGE || d < 0.5) return;
    const dot = (vx * dir.x + vy * dir.y + vz * dir.z) / d;
    const ang = Math.acos(clamp(dot, -1, 1));
    const need = Math.max(0.045, radius / d);
    if (ang < need && d < bestD) {
      bestD = d;
      bestT = target;
      bestKind = kind;
    }
  }
  for (const e of G.enemies) consider(e.x, 1.3, e.z, 0.9, e, 'enemy');
  for (const car of G.cars) {
    if (car.wrecked) continue;
    if (p.car && car === p.car) continue; // the ray skips Marlo's own car
    consider(car.x, 0.9, car.z, 2.2, car, 'car');
  }
  if (bestKind === 'enemy' && bestT) {
    bestT.health -= PISTOL_DAMAGE;
    if (bestT.health <= 0) removeEnemy(G, bestT);
  } else if (bestKind === 'car' && bestT) {
    damageCar(G, bestT, PISTOL_DAMAGE);
  }
  return true;
}

export function updateEnemies(G, dt) {
  const p = G.player;
  for (const e of [...G.enemies]) {
    const d = dist2(e.x, e.z, p.x, p.z);
    // Hold at ~15 m: back off closer than 12, close in beyond 18, strafe.
    e.strafeTimer -= dt;
    if (e.strafeTimer <= 0) {
      e.strafeDir = Math.random() > 0.5 ? 1 : -1;
      e.strafeTimer = 1 + Math.random() * 1.5;
    }
    let mx = 0;
    let mz = 0;
    const away = { x: (e.x - p.x) / (d || 1), z: (e.z - p.z) / (d || 1) };
    if (d < 12) {
      mx += away.x * 3.2;
      mz += away.z * 3.2;
    } else if (d > 18) {
      mx -= away.x * 2.4;
      mz -= away.z * 2.4;
    }
    mx += -away.z * e.strafeDir * 1.6;
    mz += away.x * e.strafeDir * 1.6;
    e.x = clamp(e.x + mx * dt, -178, 178);
    e.z = clamp(e.z + mz * dt, -178, 178);
    e.heading = Math.atan2(p.x - e.x, p.z - e.z);
    e.mesh.position.set(e.x, 0, e.z);
    e.mesh.rotation.y = e.heading;
    // Return fire: slow, so the player can win the standoff.
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && d < 40 && G.state === 'playing') {
      e.shootTimer = 1.2 + Math.random() * 0.6;
      G.health = Math.max(0, G.health - 2);
      damageFlash(G);
      if (G.health <= 0) G.state = 'busted';
    }
  }
}
