// Autotiling par bitmask 4 voisins : N=1, E=2, S=4, W=8.
// Deux tiles se connectent s'ils partagent le même groupe `connects`.

import type { MapData } from "../shared/types";
import { hashXY } from "./rng";
import { tileDef, variantCount, type TileDef, type TileLayer } from "./tiles/tileset";

function connectGroup(id: number): string | undefined {
  if (id === 0) return undefined;
  return tileDef(id).connects;
}

function layerOf(map: MapData, layer: TileLayer): Uint16Array {
  return map.layers[layer];
}

/**
 * Variante d'un tile en (x,y) : bitmask de connexions pour les autotiles,
 * variante décorative stable (hash de position) sinon.
 */
export function variantAt(map: MapData, layer: TileLayer, x: number, y: number): number {
  const grid = layerOf(map, layer);
  const id = grid[y * map.w + x];
  if (id === 0) return 0;
  const def = tileDef(id);
  if (!def.autotile) {
    const n = variantCount(def);
    return n > 1 ? hashXY(x, y) % n : 0;
  }
  const group = def.connects;
  const linked = (nx: number, ny: number): boolean => {
    if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) return true; // le bord continue
    return connectGroup(grid[ny * map.w + nx]) === group;
  };
  let mask = 0;
  if (linked(x, y - 1)) mask |= 1;
  if (linked(x + 1, y)) mask |= 2;
  if (linked(x, y + 1)) mask |= 4;
  if (linked(x - 1, y)) mask |= 8;
  return mask;
}

export type { TileDef };
