# Terra-Incognita — Roadmap

> Générateur de cartes procédural rétrofuturiste (1940-1960) pour l'univers **ROBOTARIIS**.
> Seed + lore Atlas → carte pixel art / ASCII, avec présence martiale du C.G.U.

## Vision

- **Full procédural** : une seed et des paramètres (`cguDensity`, factions, ambiance, ruine) génèrent une carte complète.
- **4 échelles** : planète/monde (climat) → région/continent (état-major) → ville/quartier (style Zelda GB) → intérieur/tactique (BSP). Descente d'échelle déterministe par `childSeed`.
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

| 9 | **Styles d'architecture par faction** : 6 archétypes ancrés dans les fiches canon (martial, liturgique, clandestin, organique, industriel, civique), faction dominante → style, override UI | ville organique ≠ ville martiale à seed égale | ✅ 2026-07-02 |
| 10 | **Monuments** : 8 spomeniks (crâne, chauve-souris, pyramide en ruine…), mémoriaux en ville, sites mystérieux en région (crop circles, Nazca, cromlech), publiables vers l'Atlas | visibles + déterministes | ✅ 2026-07-02 |
| 11 | **Lisibilité** : contraste des palettes renforcé, scanlines allégées, courbes de niveau topographiques en région | relief lisible façon état-major | ✅ 2026-07-02 |
| 12 | **Démo web GitHub Pages** : shim navigateur (exports, mode libre), déploiement auto sur push | https://obareau.github.io/terra-incognita/ | ✅ 2026-07-02 |
| 13 | **Jukebox chiptune** : 6 genres (marche, hymne, blues, berceuse, drone, requiem), 5 morceaux/carte, structure couplet/refrain | requiem validé par Olivier | ✅ 2026-07-02 |
| 14 | **Radio Robotariis** (side project, /radio/) : onde unique par TUNE IN (anniversaire × instant, salée à la seconde), grille horaire, speakerine Web Speech, annonces par grammaire combinatoire lore, compteur de lignes auto | https://obareau.github.io/terra-incognita/radio/ | ✅ 2026-07-02 |
| 15 | **Échelle planète + climat/météo par type** : 4ᵉ échelle au-dessus de région (planet.ts, carte du monde grossière, POI continent→région / avant-poste→intérieur direct) ; `PlanetType` (tellurique/océanique/glaciale/gazeuse) mirror du pattern `ArchStyle`, cascade sur région (seuils/tuiles/densité végétale/POI) et ville (arbres/parcs) ; nouvelle tuile `T.SNOW` ; routing Atlas `planete`→`planet` (`systeme` reste sur `region`, hors périmètre) | déterminisme testé par type, `tellurique` = comportement historique inchangé bit à bit, cascade climat visible en descendant continent→région | ✅ 2026-07-09 |
| 16 | **Lisibilité (2e passe)** : toits industriels/murs métalliques relevés au ton 3 (fondaient dans l'herbe au ton 1 identique) ; mouchetis herbe/terre réduit (~40%, moins de bruit visuel) ; marqueurs POI (ville/base/ruine) fond opaque au lieu de transparent — restent lisibles sur n'importe quel terrain dessous | contraste bâti/sol net à distance de vue normale, POI visibles au premier coup d'œil | ✅ 2026-07-09 |

**MVP = phases 0–2 — atteint. v0.3.0 : styles de faction, monuments, web + radio. v0.4 (en cours) : planète + climat.**
68 tests jest verts. Chiptune : requiem validé à l'oreille ; les 5 autres genres restent à écouter.

## Après v1 (idées)

- **Échelle système** (au-dessus de planète) + étoiles doubles/triples et leur
  nomenclature — explicitement hors périmètre de la phase 15, `systeme`
  continue de router vers `region` sans changement pour l'instant.
- WFC pour le remplissage organique des blocs de ville (v1.5)
- Enrichissement par frontmatter du vault (`04-LIEUX/*.md` : population, contrôle)
- Annotations manuelles légères (labels, flèches d'état-major)
- Publier aussi les relations spatiales entre POI (routes → `connecte`)
- Publier une fiche vault stub par POI (boucle lore↔carte complète des deux côtés, compatible avec la routine de cohérence nocturne)

## Références

- Choix retenus/écartés et échecs : [DECISIONS.md](DECISIONS.md)
- L'Atlas (base de lore) est un outil local privé — API `GET /api/graph`, port 5557, surchargeable via `ATLAS_URL`.
