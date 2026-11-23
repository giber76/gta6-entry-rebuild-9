// Solara Bay — keyboard and mouse input.
// Keys are tracked live (G.keys) with an edge set (G.pressed) for one-shot
// actions. Mouse drag orbits the camera; a click fires the pistol.

import { pressE } from './player.js';
import { shoot } from './combat.js';

export function initInput(G) {
  G.keys = {};
  G.pressed = {};
  G.orbit = 0;
  let dragging = false;
  let lastX = 0;

  window.addEventListener('keydown', (ev) => {
    const k = ev.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'e', 'r', 'z', 'x', 'escape', ' '].includes(k)) ev.preventDefault();
    if (!ev.repeat) {
      G.pressed[k] = true;
      if (k === 'e') {
        // E: enter/exit a car, or (held at the vault) the M5 hold — the
        // hold reads the live key state; the press handles cars.
        if (G.state === 'playing') {
          const res = pressE(G);
          if (res && res !== 'exit' && G.audio) G.audio.playClick();
        }
      }
      if (k === 'r' && G.state === 'playing') {
        if (G.audio) G.audio.cycleStation();
      }
      if (k === 'z' && G.state === 'playing') {
        G.mapZoom = G.mapZoom === 1 ? 2 : 4;
      }
      if (k === 'x' && G.state === 'playing') {
        G.mapZoom = G.mapZoom === 4 ? 2 : 1;
      }
      if (k === 'escape') {
        if (G.state === 'playing') G.state = 'paused';
        else if (G.state === 'paused') G.state = 'playing';
      }
    }
    G.keys[k] = true;
  });
  window.addEventListener('keyup', (ev) => {
    G.keys[ev.key.toLowerCase()] = false;
  });
  window.addEventListener('blur', () => {
    G.keys = {};
  });

  const canvas = document.getElementById('game-canvas');
  if (canvas) {
    canvas.addEventListener('mousedown', (ev) => {
      dragging = true;
      lastX = ev.clientX;
      if (G.state === 'playing') shoot(G);
    });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', (ev) => {
      if (!dragging) return;
      const dx = ev.clientX - lastX;
      lastX = ev.clientX;
      G.orbit += dx * 0.005;
    });
  }
}

// Called once per frame: clears the one-shot edge set.
export function endFrameInput(G) {
  G.pressed = {};
}
