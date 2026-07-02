// Génération de région — bruit de valeur fBm maison (zéro dépendance),
// biomes par seuils, POI (villes, bases C.G.U., ruines) reliés par routes.

import type { GenParams, MapData } from "../../shared/types";
import { chance, deriveSeed, int, rngFor, type Rng } from "../rng";
import { createMap, groundAt, setGround, setOverlay, setStructure, structureAt } from "../mapdata";
import { T } from "../tiles/tileset";

export const REGION_W = 128;
export const REGION_H = 96;

/** Bruit de valeur : grille de gradients aléatoires + interpolation lissée. */
function makeValueNoise(rng: Rng, gridSize: number): (x: number, y: number) => number {
  const values = new Float32Array(gridSize * gridSize);
  for (let i = 0; i < values.length; i++) values[i] = rng();
  const at = (gx: number, gy: number): number =>
    values[((gy % gridSize + gridSize) % gridSize) * gridSize + ((gx % gridSize + gridSize) % gridSize)];
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    const fx = smooth(x - gx);
    const fy = smooth(y - gy);
    const a = at(gx, gy) * (1 - fx) + at(gx + 1, gy) * fx;
    const b = at(gx, gy + 1) * (1 - fx) + at(gx + 1, gy + 1) * fx;
    return a * (1 - fy) + b * fy;
  };
}

/** fBm : superposition d'octaves de bruit de valeur. */
function fbm(noise: (x: number, y: number) => number, x: number, y: number, octaves: number): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * f, y * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

interface RegionPoi {
  x: number;
  y: number;
  kind: "city" | "base" | "ruin";
}

/** Trace une route en L entre deux points (ponts par-dessus l'eau). */
function drawRoad(map: MapData, x0: number, y0: number, x1: number, y1: number): void {
  const stepX = x1 > x0 ? 1 : -1;
  for (let x = x0; x !== x1; x += stepX) setGround(map, x, y0, T.ROAD);
  const stepY = y1 > y0 ? 1 : -1;
  for (let y = y0; y !== y1 + stepY; y += stepY) setGround(map, x1, y, T.ROAD);
}

export function generateRegion(seed: string, params: GenParams, w = REGION_W, h = REGION_H): MapData {
  const rng = rngFor(seed, "region");
  const map = createMap("region", seed, params, w, h);
  const elevation = makeValueNoise(rng, 16);
  const humidity = makeValueNoise(rng, 16);
  const decay = makeValueNoise(rng, 16);

  const fE = 6 / Math.max(w, h);
  const elev = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const e = fbm(elevation, x * fE, y * fE, 3);
      elev[y * w + x] = e;
      const hu = fbm(humidity, x * fE * 1.7 + 40, y * fE * 1.7 + 40, 2);
      const d = fbm(decay, x * fE * 2.3 + 80, y * fE * 2.3 + 80, 2);
      let tile: number;
      if (e < 0.38) tile = T.WATER;
      else if (e < 0.42) tile = T.SAND;
      else if (e > 0.74) tile = T.ROCK;
      else if (d < params.ruin * 0.55) tile = d < params.ruin * 0.3 ? T.ASH : T.WASTE;
      else if (hu > 0.52) tile = T.GRASS;
      else tile = T.DIRT;
      setGround(map, x, y, tile);
      // Forêts sur les herbages humides.
      if (tile === T.GRASS && hu > 0.62 && chance(rng, 0.35)) setStructure(map, x, y, T.TREE);
    }
  }

  // ── Courbes de niveau topographiques (relief lisible, look état-major) ──
  const CONTOUR_STEP = 0.08; // ~5 niveaux sur les terres émergées
  const level = (i: number): number => Math.floor(elev[i] / CONTOUR_STEP);
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const i = y * w + x;
      const g = map.layers.ground[i];
      if (g === T.WATER || g === T.SAND) continue; // pas d'isohypses en mer ni sur l'estran
      if (level(i) !== level(i + 1) || level(i) !== level(i + w)) {
        map.layers.overlay[i] = T.CONTOUR;
      }
    }
  }

  // ── POI : villes, bases C.G.U., ruines ─────────────────────────────
  const pois: RegionPoi[] = [];
  const wanted: [RegionPoi["kind"], number][] = [
    ["city", int(rng, 4, 6)],
    ["base", Math.max(1, Math.round(params.cguDensity * 5))],
    ["ruin", Math.round(params.ruin * 5)],
  ];
  const minDist = 14;
  for (const [kind, count] of wanted) {
    for (let i = 0; i < count; i++) {
      // Tirage avec rejet : terre ferme + distance minimale aux autres POI.
      for (let tries = 0; tries < 60; tries++) {
        const x = int(rng, 4, w - 5);
        const y = int(rng, 4, h - 5);
        const g = groundAt(map, x, y);
        if (g === T.WATER || g === T.ROCK) continue;
        if (pois.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < minDist)) continue;
        pois.push({ x, y, kind });
        break;
      }
    }
  }

  // Routes : chaque POI rejoint son voisin le plus proche déjà placé.
  for (let i = 1; i < pois.length; i++) {
    const p = pois[i];
    let best = pois[0];
    let bestD = Infinity;
    for (let j = 0; j < i; j++) {
      const d = Math.abs(pois[j].x - p.x) + Math.abs(pois[j].y - p.y);
      if (d < bestD) { bestD = d; best = pois[j]; }
    }
    drawRoad(map, p.x, p.y, best.x, best.y);
  }

  // Marqueurs + POI navigables (childSeed → carte enfant).
  const markers = { city: T.POI_CITY, base: T.POI_BASE, ruin: T.POI_RUIN } as const;
  const labels = { city: "Ville", base: "Base C.G.U.", ruin: "Ruines" } as const;
  for (const p of pois) {
    setStructure(map, p.x, p.y, 0);
    setOverlay(map, p.x, p.y, markers[p.kind]);
    map.pois.push({
      x: p.x, y: p.y, kind: p.kind, label: labels[p.kind],
      childSeed: deriveSeed(seed, p.kind, p.x, p.y),
    });
  }

  // Zones contestées entre factions rivales.
  if (params.factions.length > 1) {
    for (let i = 0; i < 4; i++) {
      const x = int(rng, 4, w - 5);
      const y = int(rng, 4, h - 5);
      if (structureAt(map, x, y) === 0 && groundAt(map, x, y) !== T.WATER) setOverlay(map, x, y, T.CONTESTED);
    }
  }

  return map;
}
