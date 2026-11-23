// Solara Bay — the debug API the play-test drives (window.__solara).
// Exact contract: state(), teleport(x, z, heading), damageCar(n),
// repairCar(), givePistol(), faceNearestParkedCar(), faceNearestEnemy(),
// click(), heal().

import { parkedCount } from './traffic.js';
import { faceNearest, shoot } from './combat.js';
import { damageCar, repairCar } from './vehicles.js';

export function initDebug(G) {
  window.__solara = {
    state() {
      const p = G.player;
      const car = p.inCar ? p.car : null;
      return {
        state: G.state,
        mission: G.mission,
        cash: G.cash,
        wanted: G.wanted,
        health: G.health,
        inCar: p.inCar,
        stage: G.stage,
        carHealth: car ? car.health : null,
        speedKmh: car ? Math.abs(car.speed) * 3.6 : Math.abs(p.speed || 0) * 3.6,
        x: p.x,
        z: p.z,
        radio: G.audio ? G.audio.stationName() : 'VICE 101',
        mapZoom: G.mapZoom,
        enemies: G.enemies.length,
        parkedCars: parkedCount(G),
        hasPistol: p.hasPistol,
        weapon: p.weapon,
        elapsed: G.elapsed,
      };
    },
    teleport(x, z, heading) {
      const p = G.player;
      if (p.inCar && p.car) {
        const car = p.car;
        car.x = x;
        car.z = z;
        car.heading = heading;
        car.speed = 0;
        car.mesh.position.set(x, 0, z);
        car.mesh.rotation.y = heading;
      }
      p.x = x;
      p.z = z;
      p.heading = heading;
      p.speed = 0;
      if (p.mesh) {
        p.mesh.position.set(x, 0, p.z);
        p.mesh.rotation.y = heading;
      }
      G.orbit = 0;
    },
    damageCar(n) {
      if (G.player.car) damageCar(G, G.player.car, n);
    },
    repairCar() {
      if (G.player.car) repairCar(G, G.player.car);
    },
    givePistol() {
      G.player.hasPistol = true;
      G.player.weapon = 'pistol';
    },
    faceNearestParkedCar() {
      const alive = G.parked.filter((c) => !c.wrecked);
      faceNearest(G, alive);
      if (G.player.inCar && G.player.car) G.player.car.heading = G.player.heading;
    },
    faceNearestEnemy() {
      faceNearest(G, G.enemies);
    },
    click() {
      shoot(G);
    },
    heal() {
      G.health = 100;
    },
  };
}
