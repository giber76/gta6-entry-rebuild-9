// Solara Bay — the minimap: a HUD-corner canvas centred on Marlo.
// Zoom cycles with Z (in) and X (out) across 1x / 2x / 4x. The ocean
// renders on the minimap (the ground canvas carries it, never painted over).

import { SPOTS } from './util.js';

const SIZE = 180;

export function drawMinimap(G) {
  const canvas = document.getElementById('minimap');
  if (!canvas || !G.groundCanvas) return;
  const g = canvas.getContext('2d');
  const zoom = G.mapZoom;
  // World metres shown across the canvas: 360 at 1x, 180 at 2x, 90 at 4x.
  const span = 360 / zoom;
  const scale = SIZE / span;
  const px = G.player.x;
  const pz = G.player.z;
  // Ground: draw the world canvas cropped around Marlo.
  // Ground canvas: 1024 px for 360 m, x right, z DOWN the canvas (+z = down).
  const gc = G.groundCanvas;
  const srcSpan = (span / 360) * 1024;
  const srcX = ((px + 180) / 360) * 1024 - srcSpan / 2;
  const srcY = ((pz + 180) / 360) * 1024 - srcSpan / 2;
  g.clearRect(0, 0, SIZE, SIZE);
  g.drawImage(gc, srcX, srcY, srcSpan, srcSpan, 0, 0, SIZE, SIZE);

  const toMap = (x, z) => [(x - px) * scale + SIZE / 2, (z - pz) * scale + SIZE / 2];

  // Mission objective marker (gold diamond).
  const spots = [SPOTS.garage, SPOTS.pier, SPOTS.coral, SPOTS.bank, SPOTS.safehouse, SPOTS.bossCoupe];
  const target = G.mission < 6 ? spots[Math.min(G.mission, spots.length - 1)] : null;
  if (target) {
    const [mx, my] = toMap(target.x, target.z);
    g.fillStyle = '#ffd75e';
    g.beginPath();
    g.moveTo(mx, my - 7);
    g.lineTo(mx + 6, my);
    g.lineTo(mx, my + 7);
    g.lineTo(mx - 6, my);
    g.closePath();
    g.fill();
    g.strokeStyle = '#7a5c00';
    g.stroke();
  }
  // Traffic (white), police (blue), parked (grey), enemies (red).
  function dot(x, z, color, r) {
    const [mx, my] = toMap(x, z);
    if (mx < -4 || mx > SIZE + 4 || my < -4 || my > SIZE + 4) return;
    g.fillStyle = color;
    g.beginPath();
    g.arc(mx, my, r, 0, Math.PI * 2);
    g.fill();
  }
  for (const car of G.traffic) if (!car.wrecked) dot(car.x, car.z, '#ffffff', 2.5);
  for (const car of G.parked) if (!car.wrecked) dot(car.x, car.z, '#aaaaaa', 2.5);
  for (const car of G.police) if (!car.wrecked) dot(car.x, car.z, '#3a86ff', 3);
  for (const e of G.enemies) dot(e.x, e.z, '#ff3333', 3);
  for (const ped of G.peds) dot(ped.x, ped.z, '#dddddd', 1.5);
  // Marlo: green arrow at the centre, pointing along his heading.
  // Map space is x right, z down; forward (sin h, cos h) needs rotation PI - h.
  g.save();
  g.translate(SIZE / 2, SIZE / 2);
  g.rotate(Math.PI - G.player.heading);
  g.fillStyle = '#37c837';
  g.beginPath();
  g.moveTo(0, -8);
  g.lineTo(6, 6);
  g.lineTo(-6, 6);
  g.closePath();
  g.fill();
  g.restore();
  // Border.
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.lineWidth = 2;
  g.strokeRect(1, 1, SIZE - 2, SIZE - 2);
}
