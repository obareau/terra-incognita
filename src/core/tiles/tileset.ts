// Registre des tiles : identité, calque, glyphe ASCII, recette de pixel art.

import type { ArtRecipe } from "./tileart";
import * as art from "./tileart";

export type TileLayer = "ground" | "structure" | "overlay";

export interface TileDef {
  id: number;
  name: string;
  layer: TileLayer;
  walkable: boolean;
  /** Glyphe pour la vue ASCII/TUI. */
  glyph: string;
  /** Ton de palette du glyphe (0–3). */
  colorRole: 0 | 1 | 2 | 3;
  /** true → 16 variantes par bitmask de voisins (N=1,E=2,S=4,W=8). */
  autotile?: boolean;
  /** Groupe de connexion autotile (des tiles du même groupe se lient). */
  connects?: string;
  /** Nombre de variantes décoratives (par hash de position). */
  variants?: number;
  art: ArtRecipe;
}

/** IDs stables — ne jamais réordonner (sérialisés dans les cartes). */
export const T = {
  VOID: 0,
  // Sols
  GRASS: 1, DIRT: 2, SAND: 3, WATER: 4, ROCK: 5, WASTE: 6, ASH: 7,
  ROAD: 8, PLAZA: 9, FLOOR_CONC: 10, FLOOR_METAL: 11, RUBBLE: 12,
  // Structures
  WALL: 20, WALL_METAL: 21, FENCE: 22, DOOR: 23, GATE: 24,
  ROOF_HAB: 25, ROOF_IND: 26, MIRADOR: 27, BARRIER: 28,
  TREE: 29, LAMP: 30, CRATE: 31, MACHINE: 32, GENERATOR: 33,
  BUNK: 34, TABLE: 35, CELL_BARS: 36, STALL: 37, TURRET: 38, RUIN_WALL: 39,
  // Overlay
  PROPAGANDA: 50, GRAFFITI: 51, BANNER_CGU: 52,
  POI_CITY: 53, POI_BASE: 54, POI_RUIN: 55, CONTESTED: 56,
} as const;

const defs: TileDef[] = [
  { id: T.VOID, name: "vide", layer: "ground", walkable: false, glyph: " ", colorRole: 0, art: () => art.buf(0) },

  { id: T.GRASS, name: "herbe", layer: "ground", walkable: true, glyph: ".", colorRole: 1, variants: 4, art: art.artGrass },
  { id: T.DIRT, name: "terre", layer: "ground", walkable: true, glyph: ",", colorRole: 1, variants: 4, art: art.artDirt },
  { id: T.SAND, name: "sable", layer: "ground", walkable: true, glyph: "~", colorRole: 2, variants: 3, art: art.artSand },
  { id: T.WATER, name: "eau", layer: "ground", walkable: false, glyph: "≈", colorRole: 1, variants: 4, art: art.artWater },
  { id: T.ROCK, name: "roche", layer: "ground", walkable: false, glyph: "^", colorRole: 2, variants: 4, art: art.artRock },
  { id: T.WASTE, name: "friche", layer: "ground", walkable: true, glyph: "%", colorRole: 1, variants: 4, art: art.artWaste },
  { id: T.ASH, name: "cendre", layer: "ground", walkable: true, glyph: "\"", colorRole: 1, variants: 3, art: art.artAsh },
  { id: T.ROAD, name: "route", layer: "ground", walkable: true, glyph: "░", colorRole: 2, autotile: true, connects: "road", art: art.artRoad },
  { id: T.PLAZA, name: "esplanade", layer: "ground", walkable: true, glyph: "▒", colorRole: 1, art: art.artPlaza },
  { id: T.FLOOR_CONC, name: "sol béton", layer: "ground", walkable: true, glyph: ".", colorRole: 1, variants: 3, art: art.artFloorConc },
  { id: T.FLOOR_METAL, name: "sol métal", layer: "ground", walkable: true, glyph: "_", colorRole: 1, art: art.artFloorMetal },
  { id: T.RUBBLE, name: "gravats", layer: "ground", walkable: true, glyph: ";", colorRole: 1, variants: 4, art: art.artRubble },

  { id: T.WALL, name: "mur", layer: "structure", walkable: false, glyph: "█", colorRole: 2, autotile: true, connects: "wall", art: art.artWall },
  { id: T.WALL_METAL, name: "mur métal", layer: "structure", walkable: false, glyph: "▓", colorRole: 2, autotile: true, connects: "wall", art: art.artWallMetal },
  { id: T.FENCE, name: "grillage", layer: "structure", walkable: false, glyph: "#", colorRole: 1, autotile: true, connects: "fence", art: art.artFence },
  { id: T.DOOR, name: "porte", layer: "structure", walkable: true, glyph: "+", colorRole: 2, connects: "wall", art: art.artDoor },
  { id: T.GATE, name: "porte blindée", layer: "structure", walkable: true, glyph: "=", colorRole: 3, connects: "wall", art: art.artGate },
  { id: T.ROOF_HAB, name: "immeuble", layer: "structure", walkable: false, glyph: "⌂", colorRole: 2, autotile: true, connects: "hab", art: art.artRoofHab },
  { id: T.ROOF_IND, name: "usine", layer: "structure", walkable: false, glyph: "≡", colorRole: 1, autotile: true, connects: "ind", art: art.artRoofInd },
  { id: T.MIRADOR, name: "mirador", layer: "structure", walkable: false, glyph: "M", colorRole: 3, art: art.artMirador },
  { id: T.BARRIER, name: "checkpoint", layer: "structure", walkable: true, glyph: "/", colorRole: 3, art: art.artBarrier },
  { id: T.TREE, name: "arbre", layer: "structure", walkable: false, glyph: "♣", colorRole: 1, variants: 4, art: art.artTree },
  { id: T.LAMP, name: "lampadaire", layer: "structure", walkable: false, glyph: "!", colorRole: 3, art: art.artLamp },
  { id: T.CRATE, name: "caisse", layer: "structure", walkable: false, glyph: "▪", colorRole: 2, art: art.artCrate },
  { id: T.MACHINE, name: "machine", layer: "structure", walkable: false, glyph: "&", colorRole: 2, variants: 3, art: art.artMachine },
  { id: T.GENERATOR, name: "générateur", layer: "structure", walkable: false, glyph: "G", colorRole: 2, art: art.artGenerator },
  { id: T.BUNK, name: "couchette", layer: "structure", walkable: false, glyph: "b", colorRole: 2, art: art.artBunk },
  { id: T.TABLE, name: "table", layer: "structure", walkable: false, glyph: "n", colorRole: 2, art: art.artTable },
  { id: T.CELL_BARS, name: "barreaux", layer: "structure", walkable: false, glyph: "|", colorRole: 2, art: art.artCellBars },
  { id: T.STALL, name: "étal", layer: "structure", walkable: false, glyph: "S", colorRole: 3, variants: 3, art: art.artStall },
  { id: T.TURRET, name: "tourelle", layer: "structure", walkable: false, glyph: "T", colorRole: 3, art: art.artTurret },
  { id: T.RUIN_WALL, name: "mur effondré", layer: "structure", walkable: false, glyph: "%", colorRole: 2, variants: 4, art: art.artRuinWall },

  { id: T.PROPAGANDA, name: "affiche C.G.U.", layer: "overlay", walkable: true, glyph: "¶", colorRole: 3, variants: 3, art: art.artPropaganda },
  { id: T.GRAFFITI, name: "graffiti", layer: "overlay", walkable: true, glyph: "\"", colorRole: 3, variants: 4, art: art.artGraffiti },
  { id: T.BANNER_CGU, name: "bannière C.G.U.", layer: "overlay", walkable: true, glyph: "†", colorRole: 3, art: art.artBannerCgu },
  { id: T.POI_CITY, name: "ville", layer: "overlay", walkable: true, glyph: "@", colorRole: 3, art: art.artPoiCity },
  { id: T.POI_BASE, name: "base C.G.U.", layer: "overlay", walkable: true, glyph: "*", colorRole: 3, art: art.artPoiBase },
  { id: T.POI_RUIN, name: "ruines", layer: "overlay", walkable: true, glyph: "x", colorRole: 2, art: art.artPoiRuin },
  { id: T.CONTESTED, name: "zone contestée", layer: "overlay", walkable: true, glyph: "X", colorRole: 3, art: art.artContested },
];

export const TILESET: ReadonlyMap<number, TileDef> = new Map(defs.map((d) => [d.id, d]));

export function tileDef(id: number): TileDef {
  const d = TILESET.get(id);
  if (!d) throw new Error(`Tile inconnu : ${id}`);
  return d;
}

/** Nombre de variantes d'art à pré-rendre pour un tile. */
export function variantCount(def: TileDef): number {
  if (def.autotile) return 16;
  return def.variants ?? 1;
}
