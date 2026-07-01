# Terra-Incognita — Journal des décisions

> Trace les choix retenus, **les options écartées et les tentatives ratées**, avec leurs raisons.
> À tenir à jour à chaque bifurcation technique ou produit.

## 2026-07-01 — Cadrage initial

### Retenu
- **Electron + TypeScript** (choix d'Olivier), esbuild via `build.ts`, jest sur `src/core`.
- **Full procédural** : seed + params, édition minimale.
- **Tiles générés par le code** (16×16, indices de palette 0–3, palette appliquée au rendu).
- **3 échelles** : région / ville / intérieur, descente déterministe par `childSeed`.
- **Atlas via API REST** (`/api/graph` chargé en une fois puis indexé), cache disque en fallback.
- `src/core` = logique pure sans DOM/Electron, interdiction de `Math.random()`.

### Écarté
| Option | Raison du rejet |
|---|---|
| S'inspirer de **terminal-synth** comme modèle | Correction explicite d'Olivier : « terminal-synth n'a rien à voir là-dedans ». Setup indépendant. Le lien Atlas, lui, est confirmé. |
| App web Flask (façon robotariis-graph/timeline) ou TUI pur (Textual/ratatui) | Olivier a tranché pour Electron desktop. Le TUI pur limitait le rendu pixel lofi. |
| Procgen + retouche manuelle / éditeur d'abord | Olivier veut du full procédural. |
| Tilesets externes (Kenney 1-bit…) ou dessinés à la main | Zéro dépendance d'asset, style 100 % cohérent, extensible par code. |
| **WFC** pour la ville au MVP | Contradictions et debug coûteux ; 4 passes déterministes (blocs → zonage → macros → autotile) donnent un rendu « Zelda GB » contrôlable. WFC reste candidat v1.5 pour le remplissage des blocs. |
| Lecture **SQLite directe** de la base Atlas | Module natif (better-sqlite3) à recompiler pour Electron + risque de locks concurrents avec Flask. L'API REST est la surface stable. |
| `GET /api/nodes/<id>` de l'Atlas | N'existe pas (405 — seuls PUT/DELETE définis). On charge `/api/graph` une fois et on indexe côté app. |

### Échecs / pièges rencontrés
- **Electron SUID sandbox** (2026-07-01) : `electron .` crashe au lancement (`chrome-sandbox` pas setuid root sur cette machine). Contournement : `--no-sandbox` dans les scripts `start`/`dev` (dev local uniquement ; les binaires packagés ne sont pas concernés). Alternative propre si besoin : `sudo chown root node_modules/electron/dist/chrome-sandbox && sudo chmod 4755 …`.
- **ts-jest + globals** (2026-07-01) : `tests/` étant exclu du tsconfig racine, il faut passer `types: ["jest", "node"]` dans l'override ts-jest de `jest.config.js`, sinon `describe`/`test` sont inconnus.
