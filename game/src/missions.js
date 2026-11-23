// Solara Bay — the six story missions (M1–M6) and the win.
// Cash is cumulative: 500 / 1,300 / 2,500 / 4,000 / 7,000 / 12,000.
// `mission` is the index of the NEXT mission (0 = M1 not started).

import { SPOTS, dist2 } from './util.js';
import { createCar } from './vehicles.js';
import { spawnEnemy, removeEnemy } from './combat.js';

const ARRIVE = 12; // arrival radius for deliveries

export const OBJECTIVES = [
  'M1 The First Coupe — steal the red coupe at (24, 26), take it to Rico\'s Garage',
  'M2 Lose the Heat — wanted 2: drive the outer ring to shake the cops',
  'M3 The Package — walk to the pier, then deliver to Coral Junction',
  'M4 Marina Showdown — clear the 3 Vipers at Marina East',
  'M5 The Bank Job — hold E at the vault, steal the getaway car, reach the safehouse',
  'M6 The Last Job — steal the boss\'s black coupe, bring it to Rico\'s Garage',
  'Free roam — Solara Bay is yours',
];

export function initMissions(G) {
  G.missionCars = {};
  // M1's coupe waits at (24, 26) from the start.
  G.missionCars.coupe = createCar(G, 'coupe', SPOTS.coupe.x, SPOTS.coupe.z, Math.PI / 2, 0xd83232);
  G.vaultHold = 0;
  G.m2 = { nw: false, sw: false, se: false, ne: false, decayTimer: 0 };
}

function arrive(G, spot) {
  return dist2(G.player.x, G.player.z, spot.x, spot.z) < ARRIVE;
}

export function updateMissions(G, dt) {
  const p = G.player;
  if (G.mission === 0) {
    // M1: enter the coupe, then deliver it to Rico's Garage.
    if (G.stage === 0 && p.inCar && p.car === G.missionCars.coupe) {
      G.stage = 1;
      G.hudMessage = 'Coupe stolen — take it to Rico\'s Garage';
    }
    if (G.stage === 1 && p.inCar && arrive(G, SPOTS.garage)) {
      G.mission = 1;
      G.stage = 0;
      G.cash = 500;
      G.wanted = 2;
      G.hudMessage = 'M1 done: $500 — M2 Lose the Heat: the cops are on you';
    }
  } else if (G.mission === 1) {
    // M2: drive the rectangle at |coord| = 160, then the heat dies down.
    if (p.x < -150 && p.z > 140) G.m2.nw = true;
    if (p.x < -140 && p.z < -150) G.m2.sw = true;
    if (p.x > 150 && p.z < -140) G.m2.se = true;
    if (p.x > 140 && p.z > 150) G.m2.ne = true;
    if (G.m2.nw && G.m2.sw && G.m2.se && G.m2.ne && G.wanted > 0) {
      G.m2.decayTimer += dt;
      if (G.m2.decayTimer >= 2.5) {
        G.m2.decayTimer = 0;
        G.wanted -= 1;
      }
    }
    if (G.wanted === 0 && G.m2.nw && G.m2.sw && G.m2.se && G.m2.ne) {
      G.mission = 2;
      G.stage = 0;
      G.cash = 1300;
      G.hudMessage = 'M2 done: $1,300 — M3 The Package: walk to the pier';
    }
  } else if (G.mission === 2) {
    // M3: walk to the pier — ambush — then deliver to Coral Junction.
    if (G.stage === 0 && !p.inCar && dist2(p.x, p.z, SPOTS.pier.x, SPOTS.pier.z) < 15) {
      G.stage = 1;
      spawnEnemy(G, 152, -36);
      spawnEnemy(G, 154, -46);
      G.hudMessage = 'Ambush! Two Vipers at the pier — run the package anyway';
    }
    if (G.stage === 1 && arrive(G, SPOTS.coral)) {
      for (const e of [...G.enemies]) removeEnemy(G, e);
      G.mission = 3;
      G.stage = 0;
      G.cash = 2500;
      p.hasPistol = true;
      p.weapon = 'pistol';
      spawnEnemy(G, 100, 36);
      spawnEnemy(G, 106, 40);
      spawnEnemy(G, 96, 44);
      G.hudMessage = 'M3 done: $2,500 — pistol issued. M4 Marina Showdown';
    }
  } else if (G.mission === 3) {
    // M4: shoot all 3 Marina Vipers.
    if (G.enemies.length === 0) {
      G.mission = 4;
      G.stage = 0;
      G.cash = 4000;
      G.missionCars.getaway = createCar(G, 'getaway', SPOTS.getaway.x, SPOTS.getaway.z, 0, 0x2e6fd8);
      G.hudMessage = 'M4 done: $4,000 — M5 The Bank Job: hold E at the vault';
    }
  } else if (G.mission === 4) {
    // M5: hold E within 6 m of the vault for 4 s, steal the getaway car,
    // escape to the safehouse.
    if (G.stage === 0) {
      if (!p.inCar && G.keys.e && dist2(p.x, p.z, SPOTS.vault.x, SPOTS.vault.z) < 6) {
        G.vaultHold += dt;
        if (G.vaultHold >= 4) {
          G.stage = 1;
          G.wanted = 3;
          G.hudMessage = 'Vault cracked — wanted 3! Grab the getaway car';
        }
      } else {
        G.vaultHold = 0;
      }
    }
    if (G.stage === 1 && p.inCar && arrive(G, SPOTS.safehouse)) {
      G.mission = 5;
      G.stage = 0;
      G.cash = 7000;
      spawnEnemy(G, 118, 44);
      spawnEnemy(G, 130, 52);
      G.missionCars.boss = createCar(G, 'boss', SPOTS.bossCoupe.x, SPOTS.bossCoupe.z, -Math.PI / 2, 0x14141a);
      G.hudMessage = 'M5 done: $7,000 — M6 The Last Job: steal the boss coupe';
    }
  } else if (G.mission === 5) {
    // M6: steal the boss coupe, deliver it to Rico's Garage.
    if (G.stage === 0 && p.inCar && p.car === G.missionCars.boss) {
      G.stage = 1;
      G.hudMessage = 'Boss coupe stolen — lose them and reach Rico\'s Garage';
    }
    if (G.stage === 1 && p.inCar && arrive(G, SPOTS.garage)) {
      G.mission = 6;
      G.cash = 12000;
      G.state = 'won';
      G.wanted = 0;
    }
  }
}
