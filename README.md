[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/giber76/gta6-entry-rebuild-9/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/giber76/gta6-entry-rebuild-9/reward.svg)](https://make.fun/bounty/gta6-01)

# Solara Bay — an open-world crime game

A GTA-style 3D open-world game in a coastal city, built on Three.js (vendored).
You are Marlo, a driver in Solara Bay. Six story missions, then free roam:

1. **The First Coupe** ($500) — steal the red coupe, take it to Rico's Garage
2. **Lose the Heat** ($1,300) — wanted 2: drive the outer ring to shake the cops
3. **The Package** ($2,500) — walk to the pier (ambush!), deliver to Coral Junction
4. **Marina Showdown** ($4,000) — clear the 3 Vipers at Marina East
5. **The Bank Job** ($7,000) — hold E at the vault, steal the getaway car, reach the safehouse
6. **The Last Job** ($12,000) — steal the boss's black coupe, bring it to Rico's Garage

## The city

A coastal city on a grid: Rico's Garage, Coral Junction, Marina East, the pier,
the bank, a safehouse — with traffic, pedestrians, police patrols, a wanted
level, a 3-station radio (SOLARA FM, BAY 97.5, VICE 101, generated with WebAudio),
a minimap with zoom, car damage with smoke and fire, explosions, and a save in
`localStorage`. Everything is deterministic: one seeded RNG drives the world.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

W drive / walk · A/D steer / turn · S brake · E enter car (hold E at the vault) ·
mouse click shoot · R radio · Z/X minimap zoom · Esc pause.

## Layout

- `game/` — the playable game, plain static files (no build step, no network):
  `index.html`, `src/` (17 modules, one job each), `vendor/three.min.js`
- `main.ts` — the grader entrypoint: copies `game/` + `screenshots/` to `/output`
  and writes `dossier.json`
- `screenshots/` — 4 renders of the game itself (chase, driving, on foot, combat)
- `serve.ts` — the dev server
