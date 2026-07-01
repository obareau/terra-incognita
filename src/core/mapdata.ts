import type { GenParams, MapData, Scale } from "../shared/types";

export function createMap(scale: Scale, seed: string, params: GenParams, w: number, h: number): MapData {
  return {
    version: 1,
    scale,
    seed,
    params,
    w,
    h,
    layers: {
      ground: new Uint16Array(w * h),
      structure: new Uint16Array(w * h),
      overlay: new Uint16Array(w * h),
    },
    pois: [],
  };
}

export function fillGround(map: MapData, tileId: number): void {
  map.layers.ground.fill(tileId);
}

export function inBounds(map: MapData, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.w && y < map.h;
}

export function setGround(map: MapData, x: number, y: number, id: number): void {
  if (inBounds(map, x, y)) map.layers.ground[y * map.w + x] = id;
}

export function setStructure(map: MapData, x: number, y: number, id: number): void {
  if (inBounds(map, x, y)) map.layers.structure[y * map.w + x] = id;
}

export function setOverlay(map: MapData, x: number, y: number, id: number): void {
  if (inBounds(map, x, y)) map.layers.overlay[y * map.w + x] = id;
}

export function groundAt(map: MapData, x: number, y: number): number {
  return inBounds(map, x, y) ? map.layers.ground[y * map.w + x] : 0;
}

export function structureAt(map: MapData, x: number, y: number): number {
  return inBounds(map, x, y) ? map.layers.structure[y * map.w + x] : 0;
}

/** Rectangle de sol uni. */
export function paintGround(map: MapData, x0: number, y0: number, w: number, h: number, id: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setGround(map, x, y, id);
}

export function paintStructure(map: MapData, x0: number, y0: number, w: number, h: number, id: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setStructure(map, x, y, id);
}
