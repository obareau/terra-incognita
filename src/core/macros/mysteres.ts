// Monuments mystérieux — vestiges d'avant la Rectitude, ou d'ailleurs.
// Cromlech mégalithique, pyramide en ruine ; les géoglyphes (crop circles,
// tracés de Nazca) sont dessinés au sol par gen/region.ts.

import { T } from "../tiles/tileset";
import type { Macro, MacroCell } from "./index";

const legendMystere: Record<string, MacroCell> = {
  "g": { ground: T.GRASS },
  ",": { ground: T.DIRT },
  ";": { ground: T.RUBBLE },
  "Ω": { structure: T.MENHIR },
  "▲": { ground: T.DIRT, structure: T.SPOMENIK },
  "%": { ground: T.RUBBLE, structure: T.RUIN_WALL },
  "█": { ground: T.RUBBLE, structure: T.WALL },
};

/** Cromlech : cercle de pierres levées, façon Stonehenge. */
export const cromlech: Macro = {
  id: "mystere.cromlech",
  tags: ["mystere", "megalithe"],
  legend: legendMystere,
  grid: [
    "  Ω Ω Ω  ",
    "         ",
    "Ω       Ω",
    "         ",
    "Ω   ;   Ω",
    "         ",
    "Ω       Ω",
    "         ",
    "  Ω Ω Ω  ",
  ],
};

/** Pyramide en ruine : gradins effondrés autour d'une chambre ouverte. */
export const pyramideRuine: Macro = {
  id: "mystere.pyramide",
  tags: ["mystere", "ruine"],
  legend: legendMystere,
  grid: [
    "%%%% %%",
    "%,,,,,%",
    "%,███,%",
    "%,█;█,%",
    "%,█,█,%",
    "%,,,,,%",
    "%%%%%% ",
  ],
};

export const MACROS_MYSTERES = [cromlech, pyramideRuine];
