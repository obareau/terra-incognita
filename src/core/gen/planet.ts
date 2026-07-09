// Génération de planète — échelle la plus large, au-dessus de région.
// Carte du monde grossière (grille de bruit plus large, moins d'octaves que
// region.ts pour bien lire comme "un cran plus dézoomé"), pas de routes ni de
// macros ni de sites mystérieux à cette échelle — délibérément minimal.
// Réutilise le même bruit (noise.ts) et la même décision seuil→tuile
// (planet/types.ts::biomeTileAt) que region.ts, pour que le climat de la
// planète et celui de ses continents ne divergent jamais.

import type { GenParams, MapData } from "../../shared/types";
import { deriveSeed, int, rngFor } from "../rng";
import { createMap, groundAt, setOverlay, setGround } from "../mapdata";
import { T } from "../tiles/tileset";
import { makeValueNoise, fbm } from "../noise";
import { biomeTileAt, resolvePlanetType } from "../planet/types";
import { weatherFor } from "../planet/weather";

export const PLANET_W = 96;
export const PLANET_H = 72;

interface PlanetPoi {
  x: number;
  y: number;
  kind: "continent" | "avant-poste";
}

export function generatePlanet(seed: string, params: GenParams, w = PLANET_W, h = PLANET_H): MapData {
  const rng = rngFor(seed, "planet");
  const map = createMap("planet", seed, params, w, h);
  const planet = resolvePlanetType(params);
  map.weather = weatherFor(seed, planet.id);

  // Bruit plus grossier que region.ts (grille 5 au lieu de 16, 2 octaves au
  // lieu de 3) : la carte doit lire comme un monde entier, pas une région
  // de plus à la même résolution visuelle.
  const elevation = makeValueNoise(rng, 5);
  const humidity = makeValueNoise(rng, 5);
  const fE = 3 / Math.max(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const e = fbm(elevation, x * fE, y * fE, 2);
      const hu = fbm(humidity, x * fE * 1.7 + 40, y * fE * 1.7 + 40, 2);
      // Pas de délabrement à l'échelle planète (d=0, ruin=0) : le calque de
      // cendre/friche est un phénomène régional/local, pas global.
      const tile = biomeTileAt(planet, e, hu, 0, 0);
      setGround(map, x, y, tile);
    }
  }

  // ── POI : continents (→ région) et avant-postes (→ intérieur direct) ──
  const pois: PlanetPoi[] = [];
  const minDist = 12;

  const continentCount = Math.max(0, Math.round(int(rng, 3, 5) * planet.habitability));
  for (let i = 0; i < continentCount; i++) {
    for (let tries = 0; tries < 60; tries++) {
      const x = int(rng, 3, w - 4);
      const y = int(rng, 3, h - 4);
      const g = groundAt(map, x, y);
      if (g === planet.water || g === planet.rock) continue;
      if (pois.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < minDist)) continue;
      pois.push({ x, y, kind: "continent" });
      break;
    }
  }

  // Avant-postes orbitaux/atmosphériques : peuvent se poser n'importe où,
  // y compris au-dessus des bandes nuageuses d'une géante gazeuse — au moins
  // 1 garanti même sur les planètes quasi inhabitables.
  const outpostCount = Math.max(
    planet.habitability < 0.1 ? 1 : 0,
    Math.round(params.cguDensity * 2),
  );
  for (let i = 0; i < outpostCount; i++) {
    for (let tries = 0; tries < 60; tries++) {
      const x = int(rng, 3, w - 4);
      const y = int(rng, 3, h - 4);
      if (pois.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < minDist)) continue;
      pois.push({ x, y, kind: "avant-poste" });
      break;
    }
  }

  const markers = { continent: T.POI_CITY, "avant-poste": T.POI_BASE } as const;
  const labels = { continent: "Continent", "avant-poste": "Avant-poste" } as const;
  for (const p of pois) {
    setOverlay(map, p.x, p.y, markers[p.kind]);
    map.pois.push({
      x: p.x, y: p.y, kind: p.kind, label: labels[p.kind],
      childSeed: deriveSeed(seed, p.kind, p.x, p.y),
    });
  }

  return map;
}
