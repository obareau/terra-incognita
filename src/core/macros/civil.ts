// Prefabs civils : habitat, marché, industrie, parc.

import { T } from "../tiles/tileset";
import type { Macro, MacroCell } from "./index";

const legendCivil: Record<string, MacroCell> = {
  ".": { ground: T.PLAZA },
  ",": { ground: T.DIRT },
  "g": { ground: T.GRASS },
  "⌂": { structure: T.ROOF_HAB },
  "≡": { structure: T.ROOF_IND },
  "S": { ground: T.PLAZA, structure: T.STALL },
  "♣": { ground: T.GRASS, structure: T.TREE },
  "x": { ground: T.DIRT, structure: T.CRATE },
  "&": { ground: T.FLOOR_CONC, structure: T.MACHINE },
  "!": { ground: T.PLAZA, structure: T.LAMP },
  "\"": { ground: T.PLAZA, overlay: T.GRAFFITI },
};

/** Marché couvert : rangées d'étals sur esplanade. */
export const marche: Macro = {
  id: "civil.marche",
  tags: ["civil", "commerce"],
  legend: legendCivil,
  grid: [
    "!.......!",
    ".S.S.S.S.",
    ".........",
    ".S.S.S.S.",
    "!.......!",
  ],
};

/** Marché noir : étals serrés, graffitis, pas de lampadaires. */
export const marcheNoir: Macro = {
  id: "civil.marche-noir",
  tags: ["clandestin", "commerce"],
  legend: legendCivil,
  grid: [
    "\"SS.SS\"",
    ".......",
    "xSS.SSx",
  ],
};

/** Square : verdure encadrée. */
export const parc: Macro = {
  id: "civil.parc",
  tags: ["civil", "vert"],
  legend: legendCivil,
  grid: [
    "♣gg♣gg♣",
    "gg♣ggg♣",
    "♣ggg♣gg",
    "g♣gg♣g♣",
  ],
};

/** Cour d'usine : machines et caisses. */
export const courUsine: Macro = {
  id: "civil.cour-usine",
  tags: ["industriel"],
  legend: legendCivil,
  grid: [
    "≡≡≡≡≡,x",
    "≡≡≡≡≡,,",
    "&,,&,,x",
    "x,,,,x,",
  ],
};

export const MACROS_CIVIL = [marche, marcheNoir, parc, courUsine];
