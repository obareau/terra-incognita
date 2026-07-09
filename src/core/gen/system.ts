// Génération de système stellaire — échelle au-dessus de planète. Pas de
// grille de tuiles : une scène orbitale (étoile(s) + planètes), rendue par
// systemView.ts (canvas dédié, pas le pipeline tileart/canvasView).
//
// Nomenclature : système simple → nom de la seed tel quel ("Sigma-7").
// Double/triple → suffixe A/B/C (convention astronomique réelle, ex. Alpha
// Centauri A/B/C). Planètes → chiffres romains par distance croissante à
// l'étoile (ex. "Sigma-7 III"), même convention que les systèmes classiques.

import type { GenParams, MapData } from "../../shared/types";
import { createMap } from "../mapdata";
import type { PlanetTypeId } from "../planet/types";
import { deriveSeed, int, pick, rngFor, weighted } from "../rng";

export const SYSTEM_W = 480;
export const SYSTEM_H = 480;

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const SPECTRAL_TYPES = ["naine-rouge", "jaune", "blanche", "geante-bleue"] as const;
const PLANET_TYPE_IDS: PlanetTypeId[] = ["tellurique", "oceanique", "glaciale", "gazeuse"];

function properName(seed: string): string {
  // "sigma-7" → "Sigma-7" (garde la forme lisible de la seed).
  return seed.replace(/(^|-)([a-z])/g, (_, sep, c) => sep + c.toUpperCase());
}

export function generateSystem(seed: string, params: GenParams, w = SYSTEM_W, h = SYSTEM_H): MapData {
  const rng = rngFor(seed, "system");
  const map = createMap("system", seed, params, w, h);
  const baseName = properName(seed);
  const cx = w / 2;
  const cy = h / 2;

  // ── Étoile(s) : 70% simple, 22% double, 8% triple ──────────────────
  const starCount = [1, 2, 3][weighted(rng, [0.7, 0.22, 0.08])];
  const suffixes = ["A", "B", "C"];
  map.stars = [];
  for (let i = 0; i < starCount; i++) {
    const spectralType = pick(rng, SPECTRAL_TYPES);
    const radiusPx = spectralType === "geante-bleue" ? int(rng, 22, 28)
      : spectralType === "naine-rouge" ? int(rng, 8, 12)
      : int(rng, 14, 20);
    map.stars.push({
      name: starCount === 1 ? baseName : `${baseName} ${suffixes[i]}`,
      spectralType,
      radiusPx,
    });
  }

  // ── Planètes en orbite (POI, x/y = position dans le plan w×h) ──────
  const planetCount = int(rng, 3, 7);
  const minOrbit = 16 + (map.stars[0]?.radiusPx ?? 16) + starCount * 14; // dégage les étoiles/leur écart
  const maxOrbit = Math.min(w, h) / 2 - 24;
  const orbitStep = (maxOrbit - minOrbit) / planetCount;
  for (let i = 0; i < planetCount; i++) {
    const orbitRadius = Math.round(minOrbit + orbitStep * (i + 0.5) + int(rng, -6, 6));
    const angle = rng() * Math.PI * 2;
    const x = Math.round(cx + Math.cos(angle) * orbitRadius);
    const y = Math.round(cy + Math.sin(angle) * orbitRadius);
    const planetType = pick(rng, PLANET_TYPE_IDS);
    map.pois.push({
      x, y, kind: "planete", label: `${baseName} ${ROMAN[i] ?? i + 1}`,
      childSeed: deriveSeed(seed, "planete", i),
      params: { planetType },
    });
  }

  return map;
}
