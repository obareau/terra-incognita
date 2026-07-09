// Sérialisation : MapData ↔ JSON rechargeable, et rendu texte ASCII.

import type { MapData } from "../shared/types";
import { TILESET } from "./tiles/tileset";

interface MapJson {
  version: 1;
  scale: MapData["scale"];
  seed: string;
  params: MapData["params"];
  w: number;
  h: number;
  layers: { ground: number[]; structure: number[]; overlay: number[] };
  pois: MapData["pois"];
  atlasRef?: MapData["atlasRef"];
  stars?: MapData["stars"];
  weather?: MapData["weather"];
}

export function toJson(map: MapData): string {
  const out: MapJson = {
    version: 1,
    scale: map.scale,
    seed: map.seed,
    params: map.params,
    w: map.w,
    h: map.h,
    layers: {
      ground: Array.from(map.layers.ground),
      structure: Array.from(map.layers.structure),
      overlay: Array.from(map.layers.overlay),
    },
    pois: map.pois,
    atlasRef: map.atlasRef,
    stars: map.stars,
    weather: map.weather,
  };
  return JSON.stringify(out);
}

export function fromJson(json: string): MapData {
  const raw = JSON.parse(json) as MapJson;
  if (raw.version !== 1) throw new Error(`Version de carte inconnue : ${raw.version}`);
  const size = raw.w * raw.h;
  for (const key of ["ground", "structure", "overlay"] as const) {
    if (raw.layers[key].length !== size) throw new Error(`Calque ${key} corrompu`);
  }
  return {
    version: 1,
    scale: raw.scale,
    seed: raw.seed,
    params: raw.params,
    w: raw.w,
    h: raw.h,
    layers: {
      ground: Uint16Array.from(raw.layers.ground),
      structure: Uint16Array.from(raw.layers.structure),
      overlay: Uint16Array.from(raw.layers.overlay),
    },
    pois: raw.pois,
    atlasRef: raw.atlasRef,
    stars: raw.stars,
    weather: raw.weather,
  };
}

/** Rendu texte : le glyphe le plus haut (overlay > structure > sol) gagne. */
export function toAscii(map: MapData): string {
  const rows: string[] = [];
  for (let y = 0; y < map.h; y++) {
    let row = "";
    for (let x = 0; x < map.w; x++) {
      const i = y * map.w + x;
      const id = map.layers.overlay[i] || map.layers.structure[i] || map.layers.ground[i];
      row += TILESET.get(id)?.glyph ?? "?";
    }
    rows.push(row);
  }
  return rows.join("\n");
}
