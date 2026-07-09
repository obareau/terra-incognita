// Météo courante — dérivée du type de planète + de la seed (déterministe :
// même seed → même météo, comme tout le reste du générateur). Statique
// (pas d'animation, aucune primitive de ce type n'existe dans le rendu) :
// affichée en texte + un léger overlay visuel sur la carte.

import type { WeatherInfo } from "../../shared/types";
import { deriveSeed, rngFor, weighted } from "../rng";
import type { PlanetTypeId } from "./types";

interface WeatherOption { weight: number; info: WeatherInfo }

const WEATHER_BY_TYPE: Record<PlanetTypeId, WeatherOption[]> = {
  tellurique: [
    { weight: 0.5, info: { label: "Ciel dégagé", glyph: "☀", overlay: "clair", intensity: 0 } },
    { weight: 0.25, info: { label: "Brume matinale", glyph: "〜", overlay: "brume", intensity: 0.2 } },
    { weight: 0.2, info: { label: "Pluie légère", glyph: "☂", overlay: "pluie", intensity: 0.3 } },
    { weight: 0.05, info: { label: "Vent de poussière", glyph: "☴", overlay: "poussiere", intensity: 0.35 } },
  ],
  oceanique: [
    { weight: 0.4, info: { label: "Pluie battante", glyph: "☂", overlay: "pluie", intensity: 0.55 } },
    { weight: 0.3, info: { label: "Brume côtière", glyph: "〜", overlay: "brume", intensity: 0.4 } },
    { weight: 0.2, info: { label: "Ciel dégagé", glyph: "☀", overlay: "clair", intensity: 0 } },
    { weight: 0.1, info: { label: "Tempête tropicale", glyph: "🌀", overlay: "pluie", intensity: 0.8 } },
  ],
  glaciale: [
    { weight: 0.45, info: { label: "Neige continue", glyph: "❄", overlay: "neige", intensity: 0.45 } },
    { weight: 0.25, info: { label: "Blizzard", glyph: "❄", overlay: "neige", intensity: 0.85 } },
    { weight: 0.3, info: { label: "Ciel clair et glacial", glyph: "❆", overlay: "clair", intensity: 0 } },
  ],
  gazeuse: [
    { weight: 0.5, info: { label: "Bandes de tempête ionique", glyph: "⚡", overlay: "orage-ionique", intensity: 0.6 } },
    { weight: 0.3, info: { label: "Éclairs statiques", glyph: "⚡", overlay: "orage-ionique", intensity: 0.35 } },
    { weight: 0.2, info: { label: "Accalmie relative", glyph: "☁", overlay: "brume", intensity: 0.25 } },
  ],
};

export function weatherFor(seed: string, planetType: PlanetTypeId): WeatherInfo {
  const rng = rngFor(deriveSeed(seed, "weather"), "weather");
  const options = WEATHER_BY_TYPE[planetType];
  const idx = weighted(rng, options.map((o) => o.weight));
  return options[idx].info;
}
