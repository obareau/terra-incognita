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

## 2026-07-02 — Lien Atlas bidirectionnel (v0.2.0)

### Retenu
- **Publication explicite uniquement** (bouton PUBLIER VERS L'ATLAS) : jamais d'écriture automatique dans le canon. Les nœuds créés sont tagués `terra-incognita`, reliés en `membre` au lieu parent, plafonnés à 12 POI par carte.
- **Marqueur canonique** `[terra-incognita] {seed, scale, params}` dans les notes du nœud parent : l'Atlas devient la source d'autorité des cartes. À la génération, le marqueur (⚓) prime sur le mapping heuristique.
- **Ids stables** `<parent>-ti-<genre>-<n>` : la publication est idempotente (re-publier ne crée rien ; l'API dédoublonne les relations).
- Tests e2e sur une **copie sandbox de la base** (`GRAPH_DB=copie uv run --with flask python -c "from app import app; app.run(port=5599)"`) — le canon n'est jamais touché par les tests.

### Écarté
| Option | Raison du rejet |
|---|---|
| Champ/table dédié côté Atlas pour stocker les cartes | Aurait exigé de modifier le schéma d'Atlas ; le marqueur dans `notes` est non intrusif et lisible par un humain. |
| Publication automatique à chaque génération | Pollution du canon garantie (chaque seed testée créerait des nœuds). |
| Renommer les nœuds existants lors d'une re-publication | Risque d'écraser des éditions manuelles d'Olivier ; on skippe les ids existants. |

### Retenu (styles d'architecture, 2026-07-02)
- **6 archétypes** plutôt que 38 styles individuels : martial, liturgique, clandestin, organique, industriel, civique — chaque faction canon est assignée à un archétype d'après sa fiche `02-FACTIONS/*.md` (ex. Pasteurs = « architecture sacrée-technologique » → liturgique). Un style par faction aurait été ingérable et visuellement illisible.
- La **faction dominante** (tri par poids de relation : membre/parent > allié > connecté > ennemi) impose le style ; override manuel possible dans l'UI (`GenParams.archStyle`).

## 2026-07-02 — Radio Robotariis (v0.3.0)

### Retenu
- **Onde salée à l'instant du TUNE IN** (minute+seconde dans la seed) : demandé par Olivier après avoir constaté que relancer rejouait le même programme. On perd le « même date + même heure = même onde partagée » du concept initial au profit d'un « une seule fois dans votre vie » littéral.
- **Speakerine Web Speech API** (pitch 0.55) plutôt qu'un TTS pré-généré ou une API : 100 % navigateur, zéro asset, et le rendu synthétique colle à l'univers. Garde-fou : la musique reprend même si la synthèse échoue.
- **Annonces par grammaire combinatoire seedée** (gabarits + lexiques lore) plutôt que phrases fixes : des dizaines de milliers de variantes en ~60 lignes. Élision française post-traitement (de les → des).
- **Compteur de lignes injecté au build** ({{RADIO_LOC}}) : le descriptif ne peut pas mentir.

### Écarté
| Option | Raison du rejet |
|---|---|
| Repo séparé pour la radio | Réutilise le moteur chiptune de T-I ; une page de plus dans le même déploiement Pages suffit. |
| TTS de qualité (API cloud, voix pré-générées) | Casserait le « tout est calculé dans votre navigateur » ; à reconsidérer si la voix système déçoit. |

### Échecs / pièges rencontrés (v0.3)
- **GitHub Pages `deploy-pages` échoue par intermittence** (« Deployment failed, try again later ») : trois occurrences le 2026-07-02 — un simple re-run suffit. Les scripts de vérification post-push font maintenant un rerun automatique.
- **Grammaire française** : les gabarits à trous produisent « de les Briseurs » → élision en post-traitement dans `expand()`.
- **Vérifier un déploiement en greppant le bundle minifié** : esbuild `--production` échappe les non-ASCII (`é` → `\xE9`) et renomme les identifiants — grepper un nom de fonction ou une chaîne accentuée renvoie 0 à tort. Utiliser un fragment de chaîne **ASCII pur** (ex. `quences mortes`).
- **Mobile : AudioContext verrouillé hors geste utilisateur** (2026-07-03) : la speakerine parlait (speechSynthesis appelée dans le tap) mais la musique, démarrée au callback de fin de voix, restait muette sur iOS/Android. Fix : `chiptune.unlock()` (création + resume + buffer muet) appelé DANS les handlers de tap, + réveil sur `visibilitychange`. Les hats étaient aussi mangés par le lowpass cassette 2400 Hz → percussions routées sur le master.

## 2026-07-02 — Lien Atlas bidirectionnel (v0.2.0), suite

### Échecs / pièges rencontrés
- **Plafond MAX_POIS sur les nœuds créés** (2026-07-02) : comptait les créations au lieu des POI traités → une re-publication créait un 13ᵉ nœud. Corrigé : le plafond porte sur les POI traités, sélection stable.
- **`uv run python -c` sans deps** : robotariis-graph n'a pas de pyproject → `--with flask` obligatoire pour lancer l'instance sandbox.
- **Electron SUID sandbox** (2026-07-01) : `electron .` crashe au lancement (`chrome-sandbox` pas setuid root sur cette machine). Contournement : `--no-sandbox` dans les scripts `start`/`dev` (dev local uniquement ; les binaires packagés ne sont pas concernés). Alternative propre si besoin : `sudo chown root node_modules/electron/dist/chrome-sandbox && sudo chmod 4755 …`.
- **ts-jest + globals** (2026-07-01) : `tests/` étant exclu du tsconfig racine, il faut passer `types: ["jest", "node"]` dans l'override ts-jest de `jest.config.js`, sinon `describe`/`test` sont inconnus.
