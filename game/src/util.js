// Solara Bay — seeded RNG and math helpers (deterministic world generation).
// Every random choice in the game comes from one seeded generator so two
// runs of the same build produce the same city, traffic and pedestrians.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Shortest-arc interpolation between two headings (radians).
export function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function rand(rng, a, b) {
  return a + rng() * (b - a);
}

export function randInt(rng, a, b) {
  return Math.floor(rand(rng, a, b + 1));
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Forward vector for a heading: heading 0 faces +z (south), PI faces -z (north),
// PI/2 faces +x (east), -PI/2 faces -x (west).
export function forwardOf(heading) {
  return { x: Math.sin(heading), z: Math.cos(heading) };
}

export const WORLD = {
  MIN: -180,
  MAX: 180,
  CITY: 168, // city ground extends to +-168; ocean shows beyond it
  ROADS: [-160, -120, -80, -40, 0, 40, 80, 120, 160],
  ROAD_W: 12,
};

// Mission-critical coordinates (exact — the play-test asserts them).
export const SPOTS = {
  coupe: { x: 24, z: 26 },
  garage: { x: -118, z: 116 },
  pier: { x: 158, z: -40 },
  coral: { x: 78, z: 116 },
  marina: { x: 100, z: 36 },
  bank: { x: -40, z: -80 },
  vault: { x: -40, z: -80 },
  getaway: { x: -46, z: 8 },
  safehouse: { x: 138, z: 76 },
  bossCoupe: { x: 126, z: 48 },
  parked: [
    { x: 44, z: 124 },
    { x: 86, z: -46 },
    { x: -124, z: 44 },
    { x: 124, z: -84 },
    { x: -84, z: -124 },
    { x: 4, z: 84 },
  ],
};
