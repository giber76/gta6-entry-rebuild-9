// Solara Bay — boot and the game loop.
// States: menu -> playing -> paused -> playing; won after M6; busted if
// caught or health hits 0. The in-game clock (elapsed) advances only while
// playing, and drives every timed wait in the play-test.

import { mulberry32 } from './util.js';
import { createAudio } from './audio.js';
import { buildCity } from './city.js';
import { createPlayer, updatePlayer } from './player.js';
import { driveCar, updateWrecks } from './vehicles.js';
import { initTraffic, updateTraffic } from './traffic.js';
import { initPeds, updatePeds } from './pedestrians.js';
import { initPolice, updatePolice } from './police.js';
import { updateEnemies } from './combat.js';
import { initMissions, updateMissions } from './missions.js';
import { initHud, updateHud } from './hud.js';
import { drawMinimap } from './minimap.js';
import { updateEffects, updateCarDamageFx } from './effects.js';
import { initInput, endFrameInput } from './input.js';
import { initDebug } from './debug.js';
import { forwardOf, clamp, lerp } from './util.js';

const G = {
  state: 'menu',
  mission: 0,
  stage: 0,
  cash: 0,
  wanted: 0,
  health: 100,
  elapsed: 0,
  time: 0,
  mapZoom: 1,
  shootCooldown: 0,
  vaultHold: 0,
  bustTimer: 0,
  shake: 0,
  orbit: 0,
  hudMessage: null,
  player: {
    x: 0, z: 120, heading: Math.PI,
    inCar: false, car: null, hasPistol: false, weapon: null,
    speed: 0, mesh: null,
  },
  cars: [], traffic: [], parked: [], police: [], peds: [], enemies: [],
  effects: [], buildings: [], beacons: [],
  keys: {}, pressed: {},
  rng: mulberry32(1337),
  audio: null, hud: null, groundCanvas: null,
  camera: null, scene: null, renderer: null,
  camPos: null,
};

function boot() {
  const THREE = window.THREE;
  const canvas = document.getElementById('game-canvas');
  G.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  G.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  G.renderer.setSize(window.innerWidth, window.innerHeight);
  G.scene = new THREE.Scene();
  G.scene.background = new THREE.Color(0x87bfe8);
  G.scene.fog = new THREE.Fog(0x9fc8e8, 130, 460);
  G.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1000);
  G.camera.position.set(0, 60, 200);
  G.camPos = G.camera.position.clone();

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.85);
  G.scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.15);
  sun.position.set(140, 200, 80);
  G.scene.add(sun);

  G.audio = createAudio();
  buildCity(G);
  createPlayer(G);
  initTraffic(G);
  initPeds(G);
  initPolice(G);
  initMissions(G);
  initHud(G);
  initInput(G);
  initDebug(G);

  window.addEventListener('resize', () => {
    G.camera.aspect = window.innerWidth / window.innerHeight;
    G.camera.updateProjectionMatrix();
    G.renderer.setSize(window.innerWidth, window.innerHeight);
  });

  G.renderer.setAnimationLoop(loop);
}

const clock = { last: performance.now() };

function loop() {
  const now = performance.now();
  const dt = Math.min((now - clock.last) / 1000, 0.1);
  clock.last = now;
  G.time += dt;
  G.shootCooldown = Math.max(0, G.shootCooldown - dt);

  if (G.state === 'playing') {
    G.elapsed += dt;
    const p = G.player;
    if (p.inCar && p.car) {
      driveCar(G, p.car, dt, G.keys);
      p.x = p.car.x;
      p.z = p.car.z;
      p.heading = p.car.heading;
      p.speed = p.car.speed;
    } else {
      updatePlayer(G, dt);
    }
    updateTraffic(G, dt);
    updatePeds(G, dt);
    updatePolice(G, dt);
    updateMissions(G, dt);
    updateEnemies(G, dt);
    updateWrecks(G);
    updateCarDamageFx(G, dt);
    if (G.audio) G.audio.update(dt, p.inCar && p.car ? Math.abs(p.car.speed) * 3.6 : 0, p.inCar);
  }
  updateEffects(G, dt);
  updateCamera(dt);
  updateHud(G, dt);
  drawMinimap(G);
  endFrameInput(G);
  G.renderer.render(G.scene, G.camera);
}

function updateCamera(dt) {
  const THREE = window.THREE;
  const p = G.player;
  if (G.state === 'menu') {
    // Slow orbit over the city behind the menu.
    const a = G.time * 0.05;
    const target = new THREE.Vector3(Math.sin(a) * 130, 55, Math.cos(a) * 130);
    G.camera.position.lerp(target, 1 - Math.exp(-1.5 * dt));
    G.camera.lookAt(0, 0, 0);
    return;
  }
  const f = forwardOf(p.heading);
  // Orbit offset from mouse drag, around the player.
  const ox = Math.sin(G.orbit);
  const oz = Math.cos(G.orbit);
  const dist = p.inCar ? 11 : 7;
  const height = p.inCar ? 5 : 3.5;
  // Camera sits behind the heading, rotated by the orbit angle.
  const backX = -(f.x * Math.cos(G.orbit) - f.z * Math.sin(G.orbit));
  const backZ = -(f.z * Math.cos(G.orbit) + f.x * Math.sin(G.orbit));
  void ox;
  void oz;
  const want = new THREE.Vector3(
    p.x + backX * dist,
    height,
    p.z + backZ * dist,
  );
  const k = 1 - Math.exp(-8 * dt);
  G.camera.position.lerp(want, k);
  if (G.shake > 0) {
    G.camera.position.x += (Math.random() - 0.5) * G.shake * 0.9;
    G.camera.position.y += (Math.random() - 0.5) * G.shake * 0.6;
    G.camera.position.z += (Math.random() - 0.5) * G.shake * 0.9;
  }
  const look = new THREE.Vector3(p.x + f.x * 4, 1.6, p.z + f.z * 4);
  G.camera.lookAt(look);
}

boot();
