// Prefabs militaires du C.G.U. — la présence martiale sur les cartes.

import { T } from "../tiles/tileset";
import type { Macro, MacroCell } from "./index";

const F: MacroCell = { ground: T.FLOOR_CONC };
const legendCgu: Record<string, MacroCell> = {
  ".": F,
  "▓": { ...F, structure: T.WALL_METAL },
  "█": { ...F, structure: T.WALL },
  "=": { ...F, structure: T.GATE },
  "+": { ...F, structure: T.DOOR },
  "M": { ...F, structure: T.MIRADOR },
  "b": { ...F, structure: T.BUNK },
  "n": { ...F, structure: T.TABLE },
  "T": { ...F, structure: T.TURRET },
  "G": { ...F, structure: T.GENERATOR },
  "&": { ...F, structure: T.MACHINE },
  "|": { ...F, structure: T.CELL_BARS },
  "x": { ...F, structure: T.CRATE },
  "/": { ...F, structure: T.BARRIER },
  "!": { ...F, structure: T.LAMP },
  "¶": { ...F, overlay: T.PROPAGANDA },
  "†": { ...F, overlay: T.BANNER_CGU },
  "░": { ground: T.ROAD },
  "▒": { ground: T.PLAZA },
};

/** Caserne : enceinte métal, miradors aux angles, dortoirs, portail sud. */
export const caserne: Macro = {
  id: "cgu.caserne",
  tags: ["cgu", "militaire"],
  legend: legendCgu,
  grid: [
    "M▓▓▓▓▓▓▓▓▓M",
    "▓b.b.b.b.b▓",
    "▓.........▓",
    "▓b.b.b.b.b▓",
    "▓....n....▓",
    "▓x......G.▓",
    "M▓▓▓==▓▓▓▓M",
    "†...▒▒...¶ ",
  ],
};

/** Checkpoint : guérite + herses en travers d'un axe nord-sud. */
export const checkpoint: Macro = {
  id: "cgu.checkpoint",
  tags: ["cgu", "militaire", "route"],
  legend: legendCgu,
  grid: [
    "▓▓.░░",
    "▓n+░░",
    "▓▓.//",
    "†..░░",
  ],
};

/** Quartier général : bâtiment massif, tourelles, esplanade de parade. */
export const qgCgu: Macro = {
  id: "cgu.qg",
  tags: ["cgu", "militaire", "qg"],
  legend: legendCgu,
  grid: [
    "T█████████████T",
    "█&..n.....n..&█",
    "█.............█",
    "█|||.......|||█",
    "█.............█",
    "█G....n......x█",
    "T█████===█████T",
    "†▒▒▒▒▒▒▒▒▒▒▒▒▒†",
    "¶▒▒▒▒▒▒▒▒▒▒▒▒▒¶",
  ],
};

/** Poste de garde compact (pour intérieurs et petites rues). */
export const posteGarde: Macro = {
  id: "cgu.poste-garde",
  tags: ["cgu", "militaire", "interieur"],
  legend: legendCgu,
  grid: [
    "▓▓+▓",
    "▓n.▓",
    "▓b.▓",
    "▓▓▓▓",
  ],
};

/** Bloc cellulaire (prison C.G.U.). */
export const blocCellules: Macro = {
  id: "cgu.cellules",
  tags: ["cgu", "militaire", "interieur", "prison"],
  legend: legendCgu,
  grid: [
    "█|█|█|█",
    "█b█b█b█",
    "█|█|█|█",
    ".......",
  ],
};

/** Dépôt logistique : caisses sous grillage. */
export const depot: Macro = {
  id: "cgu.depot",
  tags: ["cgu", "logistique"],
  legend: { ...legendCgu, "#": { ...F, structure: T.FENCE } },
  grid: [
    "#######",
    "#xx.xx#",
    "#..x..#",
    "#xx.x.#",
    "###.###",
  ],
};

export const MACROS_CGU = [caserne, checkpoint, qgCgu, posteGarde, blocCellules, depot];
