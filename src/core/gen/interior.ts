// Génération d'intérieur — BSP : tout en mur, on creuse salles et couloirs,
// puis mobilier par ambiance (poste de garde, cellules, machines…).

import type { GenParams, MapData } from "../../shared/types";
import { chance, int, rngFor, type Rng } from "../rng";
import { createMap, paintStructure, setStructure, structureAt } from "../mapdata";
import { T } from "../tiles/tileset";
import { stampMacro } from "../macros/index";
import { blocCellules, posteGarde } from "../macros/cgu";

export const INTERIOR_W = 48;
export const INTERIOR_H = 36;

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BspNode {
  x: number;
  y: number;
  w: number;
  h: number;
  a?: BspNode;
  b?: BspNode;
  room?: Room;
}

const MIN_LEAF = 9;

function split(rng: Rng, node: BspNode, depth: number): void {
  if (depth <= 0 || (node.w < MIN_LEAF * 2 && node.h < MIN_LEAF * 2)) return;
  const horizontal = node.w === node.h ? chance(rng, 0.5) : node.w < node.h;
  if (horizontal && node.h >= MIN_LEAF * 2) {
    const cut = int(rng, MIN_LEAF, node.h - MIN_LEAF);
    node.a = { x: node.x, y: node.y, w: node.w, h: cut };
    node.b = { x: node.x, y: node.y + cut, w: node.w, h: node.h - cut };
  } else if (!horizontal && node.w >= MIN_LEAF * 2) {
    const cut = int(rng, MIN_LEAF, node.w - MIN_LEAF);
    node.a = { x: node.x, y: node.y, w: cut, h: node.h };
    node.b = { x: node.x + cut, y: node.y, w: node.w - cut, h: node.h };
  } else {
    return;
  }
  split(rng, node.a, depth - 1);
  split(rng, node.b, depth - 1);
}

function carveRoom(map: MapData, rng: Rng, leaf: BspNode): Room {
  const w = int(rng, Math.max(4, leaf.w - 4), leaf.w - 2);
  const h = int(rng, Math.max(4, leaf.h - 4), leaf.h - 2);
  const x = leaf.x + int(rng, 1, leaf.w - w - 1);
  const y = leaf.y + int(rng, 1, leaf.h - h - 1);
  const room = { x, y, w, h };
  paintStructure(map, x, y, w, h, 0);
  return room;
}

function center(r: Room): { x: number; y: number } {
  return { x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) };
}

/** Creuse un couloir en L ; pose une porte à chaque percement de mur. */
function carveCorridor(map: MapData, x0: number, y0: number, x1: number, y1: number): void {
  const carve = (x: number, y: number): void => {
    if (x <= 0 || y <= 0 || x >= map.w - 1 || y >= map.h - 1) return;
    const s = structureAt(map, x, y);
    if (s === T.WALL || s === T.WALL_METAL) {
      // Percement : porte si le mur est fin (couloir des deux côtés après carve).
      setStructure(map, x, y, 0);
    } else if (s !== 0 && s !== T.DOOR) {
      setStructure(map, x, y, 0);
    }
  };
  const stepX = x1 >= x0 ? 1 : -1;
  for (let x = x0; x !== x1 + stepX; x += stepX) carve(x, y0);
  const stepY = y1 >= y0 ? 1 : -1;
  for (let y = y0; y !== y1 + stepY; y += stepY) carve(x1, y);
}

/** Relie récursivement les enfants du BSP (les salles restent connexes). */
function connect(map: MapData, node: BspNode): Room | undefined {
  if (!node.a || !node.b) return node.room;
  const ra = connect(map, node.a);
  const rb = connect(map, node.b);
  if (ra && rb) {
    const ca = center(ra);
    const cb = center(rb);
    carveCorridor(map, ca.x, ca.y, cb.x, cb.y);
  }
  return ra ?? rb;
}

function collectLeaves(node: BspNode, out: BspNode[]): void {
  if (!node.a || !node.b) { out.push(node); return; }
  collectLeaves(node.a, out);
  collectLeaves(node.b, out);
}

/** Portes : cellule creusée coincée entre deux murs opposés = passage. */
function placeDoors(map: MapData, rng: Rng): void {
  const isWall = (x: number, y: number): boolean => {
    const s = structureAt(map, x, y);
    return s === T.WALL || s === T.WALL_METAL;
  };
  for (let y = 1; y < map.h - 1; y++) {
    for (let x = 1; x < map.w - 1; x++) {
      if (structureAt(map, x, y) !== 0) continue;
      const ns = isWall(x, y - 1) && isWall(x, y + 1);
      const ew = isWall(x - 1, y) && isWall(x + 1, y);
      if ((ns || ew) && chance(rng, 0.35)) setStructure(map, x, y, T.DOOR);
    }
  }
}

function furnishRoom(map: MapData, rng: Rng, room: Room, params: GenParams, index: number): void {
  const kind = params.ambiance;
  // Première salle militaire : poste de garde ; grande salle : cellules.
  if (kind === "militaire" && index === 0 && room.w >= 6 && room.h >= 6) {
    stampMacro(map, posteGarde, room.x + 1, room.y + 1);
    return;
  }
  if (kind === "militaire" && room.w >= 9 && room.h >= 6 && chance(rng, 0.5)) {
    stampMacro(map, blocCellules, room.x + 1, room.y + 1);
    return;
  }
  const picks: number[] =
    kind === "militaire" ? [T.BUNK, T.BUNK, T.CRATE, T.TABLE, T.GENERATOR]
    : kind === "industriel" ? [T.MACHINE, T.MACHINE, T.CRATE, T.GENERATOR]
    : kind === "clandestin" ? [T.CRATE, T.STALL, T.TABLE]
    : [T.TABLE, T.BUNK, T.CRATE];
  const n = int(rng, 1, Math.max(1, Math.floor((room.w * room.h) / 14)));
  for (let i = 0; i < n; i++) {
    const x = room.x + int(rng, 0, room.w - 1);
    const y = room.y + int(rng, 0, room.h - 1);
    // Ne bloque jamais un seuil : rester à l'écart des bords de salle.
    if (x <= room.x || y <= room.y || x >= room.x + room.w - 1 || y >= room.y + room.h - 1) continue;
    if (structureAt(map, x, y) === 0) setStructure(map, x, y, picks[int(rng, 0, picks.length - 1)]);
  }
}

export function generateInterior(seed: string, params: GenParams, w = INTERIOR_W, h = INTERIOR_H): MapData {
  const rng = rngFor(seed, "interior");
  const map = createMap("interior", seed, params, w, h);

  const militaire = params.ambiance === "militaire" || params.cguDensity > 0.6;
  const wallTile = militaire ? T.WALL_METAL : T.WALL;
  map.layers.ground.fill(militaire ? T.FLOOR_METAL : T.FLOOR_CONC);
  map.layers.structure.fill(wallTile);

  const root: BspNode = { x: 0, y: 0, w, h };
  split(rng, root, 4);
  const leaves: BspNode[] = [];
  collectLeaves(root, leaves);
  for (const leaf of leaves) leaf.room = carveRoom(map, rng, leaf);
  connect(map, root);
  placeDoors(map, rng);

  // Entrée : porte blindée percée au milieu du mur sud.
  const entryX = Math.floor(w / 2);
  for (let y = h - 1; y > 0; y--) {
    if (structureAt(map, entryX, y) === 0) break;
    setStructure(map, entryX, y, y === h - 1 ? T.GATE : 0);
  }

  leaves.forEach((leaf, i) => {
    if (leaf.room) furnishRoom(map, rng, leaf.room, params, i);
  });

  // Propagande sur les murs des couloirs militaires.
  if (militaire) {
    for (let i = 0; i < 6; i++) {
      const x = int(rng, 1, w - 2);
      const y = int(rng, 1, h - 2);
      if (structureAt(map, x, y) === 0 && structureAt(map, x, y - 1) === wallTile) {
        map.layers.overlay[y * w + x] = T.PROPAGANDA;
      }
    }
  }

  return map;
}
