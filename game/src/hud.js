// Solara Bay — HUD: cash, wanted stars, health, radio, objective, speed,
// toasts, and the menu / win / busted screens.

import { OBJECTIVES } from './missions.js';

export function initHud(G) {
  G.hud = {
    cash: document.getElementById('hud-cash'),
    wanted: document.getElementById('hud-wanted'),
    healthFill: document.getElementById('hud-health-fill'),
    radio: document.getElementById('hud-radio'),
    objective: document.getElementById('hud-objective'),
    speed: document.getElementById('hud-speed'),
    message: document.getElementById('hud-message'),
    menu: document.getElementById('menu'),
    win: document.getElementById('win-screen'),
    busted: document.getElementById('busted-screen'),
    winCash: document.getElementById('win-cash'),
  };
  G.msgTimer = 0;
  document.getElementById('btn-new').addEventListener('click', () => {
    if (G.state === 'menu') {
      G.state = 'playing';
      G.hud.menu.style.display = 'none';
      if (G.audio) {
        G.audio.init();
        G.audio.resume();
      }
    }
  });
  document.getElementById('btn-freeroam').addEventListener('click', () => {
    G.state = 'playing';
    G.hud.win.style.display = 'none';
    saveNow(G);
  });
  document.getElementById('btn-retry').addEventListener('click', () => {
    window.location.reload();
  });
}

function saveNow(G) {
  try {
    localStorage.setItem('solara-bay-save-v1', JSON.stringify({
      cash: G.cash, mission: G.mission, state: G.state, elapsed: G.elapsed,
    }));
  } catch (e) { /* storage unavailable: the game still plays */ }
}

export function showMessage(G, text) {
  if (!G.hud || !G.hud.message) return;
  G.hud.message.textContent = text;
  G.hud.message.style.opacity = '1';
  G.msgTimer = 4;
}

export function updateHud(G, dt) {
  const h = G.hud;
  if (!h) return;
  if (G.hudMessage) {
    showMessage(G, G.hudMessage);
    G.hudMessage = null;
  }
  if (G.msgTimer > 0) {
    G.msgTimer -= dt;
    if (G.msgTimer <= 0) h.message.style.opacity = '0';
  }
  h.cash.textContent = '$' + G.cash.toLocaleString('en-US');
  h.wanted.textContent = '★'.repeat(G.wanted) + '☆'.repeat(3 - G.wanted);
  h.wanted.style.color = G.wanted > 0 ? '#ff4444' : '#ffd75e';
  h.healthFill.style.width = Math.max(0, G.health) + '%';
  h.healthFill.style.background = G.health > 50 ? '#37c837' : G.health > 25 ? '#e8a832' : '#e83232';
  h.radio.textContent = '♪ ' + (G.audio ? G.audio.stationName() : 'VICE 101');
  h.objective.textContent = OBJECTIVES[Math.min(G.mission, OBJECTIVES.length - 1)];
  const kmh = G.player.inCar && G.player.car ? Math.abs(G.player.car.speed) * 3.6 : Math.abs(G.player.speed || 0) * 3.6;
  h.speed.textContent = Math.round(kmh) + ' km/h';
  // Screens follow the state.
  if (G.state === 'won') {
    h.win.style.display = 'flex';
    h.winCash.textContent = '$' + G.cash.toLocaleString('en-US');
    saveNow(G);
  } else if (G.state === 'busted') {
    h.busted.style.display = 'flex';
  } else {
    h.win.style.display = 'none';
    h.busted.style.display = 'none';
  }
}
