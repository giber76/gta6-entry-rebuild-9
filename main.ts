// Solara Bay — the entrypoint (Node 22, standard library only).
// The grader runs `node /bot/main.ts` with /output as the only writable
// directory, twice, and both runs must write the same bytes. So this program
// copies game/ and screenshots/ beside it into /output and writes
// /output/dossier.json with make.fun's vendored library.
//
// The one rule that matters here: /output itself is a root-owned bind mount
// in the grader, so this program never removes or re-permissions /output
// itself — it only clears the entries *inside* it, then writes fresh.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });

// Clear only the *contents* of /output (each child entry), never /output itself.
for (const entry of readdirSync(out)) {
  rmSync(join(out, entry), { recursive: true, force: true });
}

cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
