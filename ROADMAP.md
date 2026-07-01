# Terra-Incognita — Roadmap

> Générateur de cartes procédural rétrofuturiste (1940-1960) pour l'univers **ROBOTARIIS**.
> Seed + lore Atlas → carte pixel art / ASCII, avec présence martiale du C.G.U.

## Vision

- **Full procédural** : une seed et des paramètres (`cguDensity`, factions, ambiance, ruine) génèrent une carte complète.
- **3 échelles** : région/monde (état-major) → ville/quartier (style Zelda GB) → intérieur/tactique (BSP). Descente d'échelle déterministe par `childSeed`.
- **Tiles générés par le code** : pixel art 16×16, palette 4 tons (phosphore / sépia / blueprint). Zéro asset externe.
- **Macros** : prefabs déclarés en ASCII (caserne C.G.U., checkpoint, bloc d'habitation…) posés comme des Lego.
- **Rendus** : canvas pixel lofi, vue ASCII/TUI, chiptune génératif WebAudio.
- **Ancrage Atlas** (base de lore locale, API sur le port 5557) : les nœuds canoniques (Sigma-7, Port Alpha…) pilotent la génération via leurs tags et relations.

## Phases

| Phase | Contenu | Jalon | Statut |
|---|---|---|---|
| 0 | Squelette Electron (build esbuild, main, preload, IPC) | `npm run build` + fenêtre | ✅ 2026-07-01 |
| 1 | Tiles procéduraux + rendu canvas pixel | grille pixel art, déterminisme testé | ✅ 2026-07-01 |
| 2 | **Génération de ville (cœur MVP)** | seed fixe → ville identique, casernes/checkpoints | ✅ 2026-07-01 |
| 3 | Région + intérieur + navigation d'échelles | descente région→ville→intérieur | ✅ 2026-07-01 |
| 4 | Vue ASCII + exports PNG/JSON/TXT | bascule instantanée, JSON rechargeable | ✅ 2026-07-01 |
| 5 | Chiptune génératif | 2 seeds → 2 boucles, gamme par ambiance | ✅ 2026-07-02 (à écouter !) |
| 6 | Intégration Atlas (API + mapping lore→génération) | Sigma-7 cohérent, fallback cache | ✅ 2026-07-02 (vérifié en ligne + hors-ligne) |
| 7 | Polish (CRT, raccourcis, packaging) | binaire portable | ✅ 2026-07-02 (AppImage 103 Mo) |

| 8 | **Lien Atlas bidirectionnel** : PUBLIER VERS L'ATLAS (POI → nœuds `membre` + marqueur canonique dans les notes), lecture prioritaire de la carte canonique ⚓ | testé e2e sur sandbox (DB copiée, port 5599) : 12 nœuds créés, idempotent, carte canonique reproduite à l'identique | ✅ 2026-07-02 |

**MVP = phases 0–2 — atteint. v0.2.0 : Atlas bidirectionnel.**
29 tests jest verts. Reste à valider à l'oreille : le chiptune (bouton ▶ CHIPTUNE).

## Après v1 (idées)

- WFC pour le remplissage organique des blocs de ville (v1.5)
- Enrichissement par frontmatter du vault (`04-LIEUX/*.md` : population, contrôle)
- Annotations manuelles légères (labels, flèches d'état-major)
- Publier aussi les relations spatiales entre POI (routes → `connecte`)

## Références

- Choix retenus/écartés et échecs : [DECISIONS.md](DECISIONS.md)
- L'Atlas (base de lore) est un outil local privé — API `GET /api/graph`, port 5557, surchargeable via `ATLAS_URL`.
