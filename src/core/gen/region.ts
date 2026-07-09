// Génération de région — bruit de valeur fBm maison (zéro dépendance),
// biomes par seuils, POI (villes, bases C.G.U., ruines) reliés par routes.

import type { GenParams, MapData } from "../../shared/types";
import { chance, deriveSeed, int, pick, rngFor, type Rng } from "../rng";
import { createMap, groundAt, setGround, setOverlay, setStructure, structureAt } from "../mapdata";
import { T } from "../tiles/tileset";
import { stampMacro } from "../macros/index";
import { cromlech, pyramideRuine } from "../macros/mysteres";
import { makeValueNoise, fbm } from "../noise";
import { resolvePlanetType, biomeTileAt, type PlanetType } from "../planet/types";
import { weatherFor } from "../planet/weather";

export const REGION_W = 128;
export const REGION_H = 96;

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

type MystereKind = "crop-circle" | "nazca" | "cromlech" | "pyramide";

const MYSTERE_LABELS: Record<MystereKind, string> = {
  "crop-circle": "Cercle de culture",
  "nazca": "Géoglyphe",
  "cromlech": "Cromlech",
  "pyramide": "Pyramide en ruine",
};

/** Efface les structures (arbres…) dans un rayon — terrain dégagé pour le site. */
function clearArea(map: MapData, cx: number, cy: number, r: number): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (structureAt(map, x, y) !== 0) setStructure(map, x, y, 0);
    }
  }
}

/** Anneaux concentriques aplatis dans les cultures. */
function drawCropCircle(map: MapData, cx: number, cy: number): void {
  clearArea(map, cx, cy, 7);
  for (const r of [2, 4, 6]) {
    for (let y = cy - 7; y <= cy + 7; y++) {
      for (let x = cx - 7; x <= cx + 7; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (Math.abs(d - r) < 0.65) {
          setGround(map, x, y, groundAt(map, x, y) === T.GRASS ? T.DIRT : T.GRASS);
        }
      }
    }
  }
}

/** Spirale géoglyphique tracée dans la cendre, façon lignes de Nazca. */
function drawNazca(map: MapData, cx: number, cy: number): void {
  clearArea(map, cx, cy, 8);
  for (let t = 0; t < Math.PI * 7; t += 0.12) {
    const r = 0.9 + t * 0.33;
    setGround(map, Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), T.ASH);
  }
  // Rayons solaires autour de la spirale.
  for (let p = 0; p < 8; p++) {
    const th = (p / 8) * Math.PI * 2;
    for (let r = 8; r < 11; r++) {
      setGround(map, Math.round(cx + Math.cos(th) * r), Math.round(cy + Math.sin(th) * r), T.ASH);
    }
  }
}

/** Sème 1 à 3 sites mystérieux sur les terres dégagées. */
function addMysteres(map: MapData, rng: Rng, seed: string, params: GenParams, planet: PlanetType): void {
  const count = 1 + (params.ruin > 0.3 ? 1 : 0) + (chance(rng, 0.5) ? 1 : 0);
  const kinds: MystereKind[] = ["crop-circle", "nazca", "cromlech", "pyramide"];
  for (let i = 0; i < count; i++) {
    const kind = pick(rng, kinds);
    for (let tries = 0; tries < 50; tries++) {
      const x = int(rng, 10, map.w - 11);
      const y = int(rng, 10, map.h - 11);
      const g = groundAt(map, x, y);
      if (g === planet.water || g === planet.rock || g === T.ROAD) continue;
      if (map.pois.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < 14)) continue;
      if (kind === "crop-circle") drawCropCircle(map, x, y);
      else if (kind === "nazca") drawNazca(map, x, y);
      else if (kind === "cromlech") { clearArea(map, x, y, 5); stampMacro(map, cromlech, x - 4, y - 4); }
      else { clearArea(map, x, y, 4); stampMacro(map, pyramideRuine, x - 3, y - 3); }
      map.pois.push({
        x, y, kind: "mystere", label: MYSTERE_LABELS[kind],
        childSeed: deriveSeed(seed, "mystere", x, y),
      });
      break;
    }
  }
}

export function generateRegion(seed: string, params: GenParams, w = REGION_W, h = REGION_H): MapData {
  const rng = rngFor(seed, "region");
  const map = createMap("region", seed, params, w, h);
  const elevation = makeValueNoise(rng, 16);
  const humidity = makeValueNoise(rng, 16);
  const decay = makeValueNoise(rng, 16);

  const planet = resolvePlanetType(params);
  map.weather = weatherFor(seed, planet.id);
  const fE = 6 / Math.max(w, h);
  const elev = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const e = fbm(elevation, x * fE, y * fE, 3);
      elev[y * w + x] = e;
      const hu = fbm(humidity, x * fE * 1.7 + 40, y * fE * 1.7 + 40, 2);
      const d = fbm(decay, x * fE * 2.3 + 80, y * fE * 2.3 + 80, 2);
      const tile = biomeTileAt(planet, e, hu, d, params.ruin);
      setGround(map, x, y, tile);
      // Forêts sur les herbages humides (densité modulée par le climat).
      if (tile === planet.groundWet && hu > 0.62 && chance(rng, 0.35 * planet.vegetationDensity)) {
        setStructure(map, x, y, T.TREE);
      }
    }
  }

  // ── Courbes de niveau topographiques (relief lisible, look état-major) ──
  const CONTOUR_STEP = 0.08; // ~5 niveaux sur les terres émergées
  const level = (i: number): number => Math.floor(elev[i] / CONTOUR_STEP);
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const i = y * w + x;
      const g = map.layers.ground[i];
      if (g === planet.water || g === planet.beach) continue; // pas d'isohypses en mer ni sur l'estran
      if (level(i) !== level(i + 1) || level(i) !== level(i + w)) {
        map.layers.overlay[i] = T.CONTOUR;
      }
    }
  }

  // ── POI : villes, bases C.G.U., ruines ─────────────────────────────
  // Comptes biaisés LOCALEMENT par le climat (habitabilité/cgu/ruin) —
  // params.cguDensity/ruin eux-mêmes ne sont jamais mutés.
  const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
  const localCgu = clamp01(params.cguDensity + planet.cguBias);
  const localRuin = clamp01(params.ruin + planet.ruinBias);
  const pois: RegionPoi[] = [];
  const wanted: [RegionPoi["kind"], number][] = [
    ["city", Math.round(int(rng, 4, 6) * planet.habitability)],
    ["base", Math.max(1, Math.round(localCgu * 5))],
    ["ruin", Math.round(localRuin * 5)],
  ];
  const minDist = 14;
  for (const [kind, count] of wanted) {
    for (let i = 0; i < count; i++) {
      // Tirage avec rejet : terre ferme + distance minimale aux autres POI.
      for (let tries = 0; tries < 60; tries++) {
        const x = int(rng, 4, w - 5);
        const y = int(rng, 4, h - 5);
        const g = groundAt(map, x, y);
        if (g === planet.water || g === planet.rock) continue;
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

  // ── Sites mystérieux : vestiges d'avant la Rectitude ───────────────
  addMysteres(map, rng, seed, params, planet);

  // Zones contestées entre factions rivales.
  if (params.factions.length > 1) {
    for (let i = 0; i < 4; i++) {
      const x = int(rng, 4, w - 5);
      const y = int(rng, 4, h - 5);
      if (structureAt(map, x, y) === 0 && groundAt(map, x, y) !== planet.water) setOverlay(map, x, y, T.CONTESTED);
    }
  }

  return map;
}
