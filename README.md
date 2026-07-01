# Terra-Incognita

> **Générateur de cartes procédural rétrofuturiste** pour l'univers **ROBOTARIIS**.
> Une seed + le lore de l'Atlas → une carte pixel art 1940-1960 sous contrôle martial du C.G.U.

![Status](https://img.shields.io/badge/status-MVP-brightgreen)
![Platform](https://img.shields.io/badge/platform-Electron%20%7C%20Linux%20|%20Windows%20|%20macOS-blueviolet)
![License](https://img.shields.io/badge/license-MIT-green)

Terra-Incognita génère des cartes **entièrement procédurales** à trois échelles, dans une esthétique
Game Boy / écran radar : tiles pixel art 16×16 **dessinés par le code** (zéro asset externe),
macros « Lego » (caserne C.G.U., checkpoint, marché noir…), vue ASCII/TUI, chiptune génératif,
et ancrage sur l'**Atlas** ([robotariis-graph](https://github.com/obareau/robotariis-graph)) pour
que le canon du lore pilote la génération.

![Terra-Incognita — ville sous contrôle C.G.U., palette phosphore](assets/screenshots/hero-city.png)

| Vue ASCII/TUI (même carte) | Région, palette blueprint |
|---|---|
| ![Vue ASCII](assets/screenshots/ascii-view.png) | ![Région blueprint](assets/screenshots/region-blueprint.png) |

La même carte s'exporte en pixel art PNG, en JSON rechargeable, ou en ASCII brut :

```
█,,,,,,,,,,,,,,,░░,,M▓▓▓▓▓▓▓▓▓M,░░,,,,,,¶,,,,,,,,,,,░░,,%%;;;,,█
█⌂⌂⌂⌂⌂⌂⌂,,,,,,,,░░,,▓b.b.b.b.b▓,░░,,,,,,,⌂⌂⌂⌂⌂⌂,,,,,░░,;,,,,,;,█
█,⌂⌂⌂⌂⌂⌂⌂,,,,,,,░░,,▓....n....▓,░░,,⌂⌂⌂⌂⌂⌂⌂⌂,,,,,,,,░░,,;;,,,,,█
█,⌂⌂⌂⌂⌂⌂⌂,,,,,,!░░,,▓▪......G.▓!░░,,⌂⌂⌂⌂⌂⌂⌂⌂,,,,,,,!░░,,;;;,;,;█
█,⌂⌂⌂⌂⌂⌂⌂,,,,,,,░░,,M▓▓▓==▓▓▓▓M,░░,,,,,,,,,,,,,,,,,,░░,;;;,,,,;█
█,⌂⌂⌂⌂⌂⌂⌂,,,,,,,░░,,†...▒▒...¶,,░░,,,,⌂⌂⌂⌂,,,,,,,,,,░░,,;,;%,,;█
=░░░░░░░░░░░░░▓▓░//░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░=
```
*(caserne C.G.U. avec miradors `M`, couchettes `b` et portail `==` ; immeubles `⌂` ;
checkpoint `//` sur l'avenue ; bannières `†` et propagande `¶` ; ruines `;%`)*

---

## Lancer

```bash
npm install
npm start          # build esbuild + Electron
npm test           # invariants : déterminisme, connexité BSP, mapping Atlas…
npm run package    # binaire portable (electron-builder)
```

L'intégration Atlas est optionnelle : si `robotariis-graph` tourne (port 5557), le sélecteur
« Lieu canonique » se remplit ; sinon l'app retombe sur son cache disque, puis sur le mode libre.

```bash
# Pour l'Atlas :
cd ../robotariis-graph && uv run app.py    # http://localhost:5557
```

## Utilisation

| Action | Effet |
|---|---|
| **Seed + GÉNÉRER** | même seed = même carte, toujours |
| **GÉNÉRER DEPUIS L'ATLAS** | le nœud choisi (Sigma-7, Terre…) fixe seed, échelle et paramètres depuis ses tags/relations |
| Clic sur un **POI encadré** | descend d'échelle : région → ville → intérieur (seed dérivée, déterministe) |
| `R` / `V` / `F` / `Backspace` | régénérer / basculer pixel↔ASCII / cadrer / remonter |
| Molette / glisser | zoom (0.25×–4×) / déplacer |
| **PNG / TXT / JSON** | export image, ASCII brut, sauvegarde rechargeable |

Paramètres de génération : **Présence C.G.U.** (0 = absent, 1 = état de siège : enceinte,
checkpoints, miradors, propagande), **Délabrement** (friches, ruines, cendres), **Ambiance**
(neutre, militaire, industriel, clandestin, ruine), **Palette** (phosphore, sépia, blueprint).

## Architecture

```
src/
├── core/            # logique PURE (zéro DOM/Electron, zéro Math.random) → testée par jest
│   ├── rng.ts       # sfc32 seedé, sous-seeds par domaine, childSeed des POI
│   ├── palettes.ts  # 3 palettes 4 tons
│   ├── tiles/       # registre des tiles + recettes de pixel art procédural
│   ├── autotile.ts  # bitmask 4 voisins (routes, murs, toits)
│   ├── macros/      # prefabs ASCII : caserne, checkpoint, QG, marché, parc…
│   ├── gen/         # region (fBm+POI), city (blocs→zonage→macros), interior (BSP)
│   ├── atlas/       # mapping tags/relations Atlas → GenParams
│   └── serialize.ts # JSON ↔ MapData, export ASCII
├── atlas/client.ts  # fetch /api/graph (main process), cache userData, fallback
├── main.ts          # fenêtre, IPC (atlas, exports), mode --screenshot=x.png
├── preload.ts       # contextBridge → window.terra
└── renderer/        # UI, vue pixel (canvas), vue ASCII, chiptune WebAudio
```

Le lien lore→carte se fait dans `core/atlas/mapping.ts` : un lieu `membre` du C.G.U. hérite
d'une densité militaire élevée ; un tag `voile-ombre` bascule en ambiance clandestine ;
une `planete` s'ouvre à l'échelle région ; des relations `ennemi` sèment des zones contestées.

## Documents

- [ROADMAP.md](ROADMAP.md) — phases, jalons, idées post-v1
- [DECISIONS.md](DECISIONS.md) — choix retenus, **options écartées et pièges rencontrés**

Fait partie de l'écosystème **ROBOTARIIS** (Atlas robotariis-graph, timeline, radio…).
