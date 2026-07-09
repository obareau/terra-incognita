// Génération de ville — 4 passes déterministes :
// 1. avenues sur grille, 2. zonage des blocs pondéré par cguDensity,
// 3. pose de macros sous contraintes, 4. décor (lampadaires, propagande).

import type { GenParams, MapData } from "../../shared/types";
import { chance, deriveSeed, int, rngFor, weighted, type Rng } from "../rng";
import { createMap, fillGround, groundAt, paintGround, paintStructure, setGround, setOverlay, setStructure, structureAt } from "../mapdata";
import { T } from "../tiles/tileset";
import { areaIsFree, macroSize, stampMacro, type Macro } from "../macros/index";
import { caserne, checkpoint, depot, grandMemorial, memorial, qgCgu } from "../macros/cgu";
import { courUsine, marche, marcheNoir, parc } from "../macros/civil";
import { resolveStyle, type ArchStyle } from "../factions/styles";
import { resolvePlanetType } from "../planet/types";

export const CITY_W = 96;
export const CITY_H = 96;

type Zone = "militaire" | "habitat" | "industrie" | "marche" | "parc" | "ruine";

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  zone: Zone;
}

const ROAD_W = 2;

/** Positions des avenues le long d'un axe (bandes de largeur 2). */
function avenuePositions(rng: Rng, size: number): number[] {
  const out: number[] = [];
  let x = int(rng, 8, 18);
  while (x < size - 10) {
    out.push(x);
    x += int(rng, 16, 26);
  }
  return out;
}

function zoneWeights(params: GenParams, style: ArchStyle): Record<Zone, number> {
  const vegetationDensity = resolvePlanetType(params).vegetationDensity;
  const base: Record<Zone, number> = {
    militaire: 0.5 + params.cguDensity * 4,
    habitat: 3,
    industrie: params.ambiance === "industriel" ? 4 : 1.5,
    marche: params.ambiance === "clandestin" ? 3 : 1.2,
    parc: (params.ambiance === "ruine" ? 0.2 : 0.8) * vegetationDensity,
    ruine: 0.2 + params.ruin * 4,
  };
  for (const z of Object.keys(base) as Zone[]) {
    base[z] *= style.zoneBias[z] ?? 1;
  }
  return base;
}

function fillHabitat(map: MapData, rng: Rng, b: Block, params: GenParams, style: ArchStyle): void {
  const n = int(rng, 2, 4);
  for (let i = 0; i < n; i++) {
    const bw = int(rng, 4, Math.min(8, b.w - 2));
    const bh = int(rng, 3, Math.min(6, b.h - 2));
    const x = b.x + int(rng, 0, Math.max(0, b.w - bw - 1));
    const y = b.y + int(rng, 0, Math.max(0, b.h - bh - 1));
    if (!areaIsFree(map, x, y, bw, bh)) continue;
    paintStructure(map, x, y, bw, bh, chance(rng, 0.72) ? style.roofPrimary : style.roofSecondary);
    // Affiche de propagande au pied de l'immeuble, côté rue.
    if (chance(rng, style.decor.propaganda * Math.max(0.3, params.cguDensity))) {
      setOverlay(map, x + int(rng, 0, bw - 1), y + bh, T.PROPAGANDA);
    }
    if (chance(rng, style.decor.graffiti * 0.6)) {
      setOverlay(map, x - 1, y + int(rng, 0, bh - 1), T.GRAFFITI);
    }
  }
}

function fillIndustrie(map: MapData, rng: Rng, b: Block): void {
  const bw = int(rng, 5, Math.min(10, b.w - 2));
  const bh = int(rng, 4, Math.min(7, b.h - 2));
  const x = b.x + int(rng, 0, Math.max(0, b.w - bw - 1));
  const y = b.y + int(rng, 0, Math.max(0, b.h - bh - 1));
  if (areaIsFree(map, x, y, bw, bh)) paintStructure(map, x, y, bw, bh, T.ROOF_IND);
  stampIfFits(map, rng, courUsine, b);
}

function fillRuine(map: MapData, rng: Rng, b: Block): void {
  for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) {
      if (chance(rng, 0.35)) setGround(map, x, y, T.RUBBLE);
      if (chance(rng, 0.12)) setStructure(map, x, y, T.RUIN_WALL);
    }
  }
}

function fillParc(map: MapData, rng: Rng, b: Block): void {
  paintGround(map, b.x, b.y, b.w, b.h, T.GRASS);
  stampIfFits(map, rng, parc, b);
  for (let i = 0; i < (b.w * b.h) / 12; i++) {
    const x = b.x + int(rng, 0, b.w - 1);
    const y = b.y + int(rng, 0, b.h - 1);
    if (structureAt(map, x, y) === 0 && chance(rng, 0.6)) setStructure(map, x, y, T.TREE);
  }
}

/** Tente de poser la macro centrée dans le bloc si elle rentre. */
function stampIfFits(map: MapData, rng: Rng, m: Macro, b: Block): boolean {
  const { w, h } = macroSize(m);
  if (w > b.w || h > b.h) return false;
  const x = b.x + Math.floor((b.w - w) / 2) + int(rng, -1, 1);
  const y = b.y + Math.floor((b.h - h) / 2) + int(rng, -1, 1);
  if (!areaIsFree(map, x, y, w, h)) return false;
  stampMacro(map, m, x, y);
  return true;
}

export function generateCity(seed: string, params: GenParams, w = CITY_W, h = CITY_H): MapData {
  const rng = rngFor(seed, "city");
  const map = createMap("city", seed, params, w, h);
  const style = resolveStyle(params);

  // Sol de base selon l'ambiance.
  fillGround(map, params.ambiance === "ruine" ? T.WASTE : T.DIRT);
  if (params.ruin > 0.5) {
    for (let i = 0; i < map.layers.ground.length; i++) {
      if (rng() < params.ruin * 0.15) map.layers.ground[i] = T.ASH;
    }
  }

  // ── Passe 1 : avenues ──────────────────────────────────────────────
  const vx = avenuePositions(rng, w);
  const hy = avenuePositions(rng, h);
  for (const x of vx) paintGround(map, x, 0, ROAD_W, h, T.ROAD);
  for (const y of hy) paintGround(map, 0, y, w, ROAD_W, T.ROAD);

  // ── Passe 2 : zonage des blocs ─────────────────────────────────────
  const xBounds = [0, ...vx.map((x) => x + ROAD_W), w];
  const yBounds = [0, ...hy.map((y) => y + ROAD_W), h];
  const weights = zoneWeights(params, style);
  const zoneNames = Object.keys(weights) as Zone[];
  const blocks: Block[] = [];
  for (let yi = 0; yi + 1 < yBounds.length; yi++) {
    for (let xi = 0; xi + 1 < xBounds.length; xi++) {
      const x = xBounds[xi] + 1;
      const y = yBounds[yi] + 1;
      const bw = (xBounds[xi + 1] - (xi + 1 < xBounds.length - 1 ? ROAD_W : 0)) - x - 1;
      const bh = (yBounds[yi + 1] - (yi + 1 < yBounds.length - 1 ? ROAD_W : 0)) - y - 1;
      if (bw < 6 || bh < 6) continue;
      const zone = zoneNames[weighted(rng, zoneNames.map((z) => weights[z]))];
      blocks.push({ x, y, w: bw, h: bh, zone });
    }
  }

  // ── Passe 3 : macros sous contraintes ──────────────────────────────
  let qgDone = false;
  for (const b of blocks) {
    switch (b.zone) {
      case "militaire": {
        // Un seul QG par ville, sur le plus grand bloc militaire venu en premier.
        if (!qgDone && params.cguDensity > 0.35 && stampIfFits(map, rng, qgCgu, b)) {
          qgDone = true;
          map.pois.push({
            x: b.x + Math.floor(b.w / 2), y: b.y + Math.floor(b.h / 2),
            kind: "qg", label: "Q.G. C.G.U.", childSeed: deriveSeed(seed, "qg", b.x, b.y),
          });
        } else if (stampIfFits(map, rng, chance(rng, 0.7) ? caserne : depot, b)) {
          map.pois.push({
            x: b.x + Math.floor(b.w / 2), y: b.y + Math.floor(b.h / 2),
            kind: "caserne", label: "Caserne C.G.U.", childSeed: deriveSeed(seed, "caserne", b.x, b.y),
          });
        }
        break;
      }
      case "habitat": fillHabitat(map, rng, b, params, style); break;
      case "industrie": {
        fillIndustrie(map, rng, b);
        map.pois.push({
          x: b.x + Math.floor(b.w / 2), y: b.y + Math.floor(b.h / 2),
          kind: "usine", label: "Complexe industriel", childSeed: deriveSeed(seed, "usine", b.x, b.y),
        });
        break;
      }
      case "marche": {
        const m = params.ambiance === "clandestin" ? marcheNoir : marche;
        if (stampIfFits(map, rng, m, b)) {
          map.pois.push({
            x: b.x + Math.floor(b.w / 2), y: b.y + Math.floor(b.h / 2),
            kind: "marche", label: params.ambiance === "clandestin" ? "Marché noir" : "Marché",
            childSeed: deriveSeed(seed, "marche", b.x, b.y),
          });
        }
        break;
      }
      case "parc": {
        // Sous la Rectitude, le square devient mémorial : spomenik sur esplanade.
        if (chance(rng, style.monumentChance)) {
          const m = b.w >= 12 && chance(rng, 0.4) ? grandMemorial : memorial;
          if (stampIfFits(map, rng, m, b)) {
            map.pois.push({
              x: b.x + Math.floor(b.w / 2), y: b.y + Math.floor(b.h / 2),
              kind: "memorial", label: "Mémorial C.G.U.", childSeed: deriveSeed(seed, "memorial", b.x, b.y),
            });
            break;
          }
        }
        fillParc(map, rng, b);
        break;
      }
      case "ruine": fillRuine(map, rng, b); break;
    }
  }

  // Checkpoints aux intersections d'avenues, proportionnels à la présence C.G.U.
  for (const x of vx) {
    for (const y of hy) {
      if (chance(rng, params.cguDensity * 0.8)) {
        stampMacro(map, checkpoint, x - 2, y - 2);
      }
    }
  }

  // ── Passe 4 : enceinte + décor (le style de la faction dominante) ──
  if (params.cguDensity > 0.6) {
    const wallT = style.wall;
    for (let x = 0; x < w; x++) { setStructure(map, x, 0, wallT); setStructure(map, x, h - 1, wallT); }
    for (let y = 0; y < h; y++) { setStructure(map, 0, y, wallT); setStructure(map, w - 1, y, wallT); }
    // Portes blindées là où les avenues percent l'enceinte.
    for (const x of vx) for (const dy of [0, h - 1]) { setStructure(map, x, dy, T.GATE); setStructure(map, x + 1, dy, T.GATE); }
    for (const y of hy) for (const dx of [0, w - 1]) { setStructure(map, dx, y, T.GATE); setStructure(map, dx, y + 1, T.GATE); }
    // Miradors d'angle et de courtine.
    for (const [x, y] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]] as const) setStructure(map, x, y, T.MIRADOR);
  }

  // Lampadaires le long des avenues (les styles clandestins restent sombres).
  for (const x of vx) {
    for (let y = 4; y < h - 4; y += 8) {
      if (structureAt(map, x - 1, y) === 0 && chance(rng, style.decor.lamp)) {
        setStructure(map, x - 1, y, T.LAMP);
      }
    }
  }
  // Bannières de faction, à la mesure du style et de la pression C.G.U.
  const banners = Math.round(14 * style.decor.banner * (0.4 + 0.6 * params.cguDensity));
  for (let i = 0; i < banners; i++) {
    const x = int(rng, 2, w - 3);
    const y = int(rng, 2, h - 3);
    if (structureAt(map, x, y) === 0) setOverlay(map, x, y, T.BANNER_CGU);
  }
  // Zones contestées si factions rivales présentes.
  if (params.factions.length > 1) {
    for (let i = 0; i < 5; i++) {
      setOverlay(map, int(rng, 2, w - 3), int(rng, 2, h - 3), T.CONTESTED);
    }
  }
  // Graffitis dissidents.
  const graffiti = Math.round(16 * style.decor.graffiti);
  for (let i = 0; i < graffiti; i++) {
    const x = int(rng, 1, w - 2);
    const y = int(rng, 1, h - 2);
    if (structureAt(map, x, y) === 0) setOverlay(map, x, y, T.GRAFFITI);
  }
  // Végétation urbaine (les Jardins verdissent tout ; climat glacial/gazeux = aucune).
  const trees = Math.round(50 * style.decor.tree * resolvePlanetType(params).vegetationDensity);
  for (let i = 0; i < trees; i++) {
    const x = int(rng, 1, w - 2);
    const y = int(rng, 1, h - 2);
    const g = groundAt(map, x, y);
    if (structureAt(map, x, y) === 0 && (g === T.DIRT || g === T.GRASS)) {
      setGround(map, x, y, T.GRASS);
      setStructure(map, x, y, T.TREE);
    }
  }

  // Intersections nettes : la route reprend le dessus sur les débords de macros.
  for (const x of vx) for (const y of hy) {
    for (let dy = 0; dy < ROAD_W; dy++) for (let dx = 0; dx < ROAD_W; dx++) {
      setGround(map, x + dx, y + dy, T.ROAD);
    }
  }

  return map;
}
