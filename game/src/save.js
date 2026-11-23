// Solara Bay — saving to localStorage under key `solara-bay-save-v1`.
// Written on the win and on entering free roam; loaded at boot (best
// effort — a missing or blocked storage never breaks the game).

export const SAVE_KEY = 'solara-bay-save-v1';

export function saveGame(G) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: G.cash,
      mission: G.mission,
      state: G.state,
      elapsed: Math.round(G.elapsed),
      savedAt: new Date().toISOString(),
    }));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
