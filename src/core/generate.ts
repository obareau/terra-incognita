// Point d'entrée de la génération : une seed, des params, une échelle.

import type { GenParams, MapData, Scale } from "../shared/types";
import { generateCity } from "./gen/city";
import { generateInterior } from "./gen/interior";
import { generatePlanet } from "./gen/planet";
import { generateRegion } from "./gen/region";

export const DEFAULT_PARAMS: GenParams = {
  cguDensity: 0.5,
  factions: ["cgu-rectitude"],
  ambiance: "neutre",
  ruin: 0.2,
};

export function generate(scale: Scale, seed: string, params: GenParams): MapData {
  switch (scale) {
    case "planet": return generatePlanet(seed, params);
    case "region": return generateRegion(seed, params);
    case "city": return generateCity(seed, params);
    case "interior": return generateInterior(seed, params);
  }
}

/** Échelle enfant lors d'un clic sur un POI. */
export function childScale(scale: Scale, poiKind: string): Scale | null {
  // Les sites mystérieux et mémoriaux se contemplent — pas de descente.
  if (poiKind === "mystere" || poiKind === "memorial") return null;
  if (scale === "planet") {
    return poiKind === "avant-poste" ? "interior" : "region";
  }
  if (scale === "region") {
    return poiKind === "base" ? "interior" : "city";
  }
  if (scale === "city") return "interior";
  return null;
}
