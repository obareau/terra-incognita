// Types de planète — climat/météo dérivés du type, dans le même esprit que
// les styles d'architecture par faction (factions/styles.ts) : une table de
// lookup + un point de résolution unique (override manuel sinon défaut).
// "tellurique" reproduit EXACTEMENT les constantes historiques de region.ts
// (0.38/0.42/0.74, seuil humidité 0.52) — compatibilité ascendante garantie :
// toute carte générée sans `planetType` est inchangée bit à bit.

import { T } from "../tiles/tileset";

export type PlanetTypeId = "tellurique" | "oceanique" | "glaciale" | "gazeuse";

export interface PlanetType {
  id: PlanetTypeId;
  label: string;
  /** Seuils de génération (remplacent les constantes fixes de region.ts). */
  waterLevel: number;
  beachLevel: number;
  rockLevel: number;
  /** Ajouté au seuil d'humidité (0.52) avant comparaison herbe/terre. */
  humidityBias: number;
  /** Tuiles de sol par catégorie de terrain. */
  water: number;
  beach: number;
  groundWet: number;
  groundDry: number;
  rock: number;
  /** Multiplie la chance de forêt (région) et le poids végétal (ville). */
  vegetationDensity: number;
  /** 0..1, multiplie le nombre de POI habités (villes/continents). */
  habitability: number;
  /** Biais LOCAL sur le calcul du nombre de bases/ruines (ne mute jamais params.cguDensity/ruin). */
  cguBias: number;
  ruinBias: number;
}

export const PLANET_TYPES: Record<PlanetTypeId, PlanetType> = {
  tellurique: {
    id: "tellurique",
    label: "Tellurique / rocheuse",
    waterLevel: 0.38, beachLevel: 0.42, rockLevel: 0.74, humidityBias: 0,
    water: T.WATER, beach: T.SAND, groundWet: T.GRASS, groundDry: T.DIRT, rock: T.ROCK,
    vegetationDensity: 1.0, habitability: 1.0, cguBias: 0, ruinBias: 0,
  },
  oceanique: {
    id: "oceanique",
    label: "Océanique",
    waterLevel: 0.55, beachLevel: 0.58, rockLevel: 0.70, humidityBias: 0.15,
    water: T.WATER, beach: T.SAND, groundWet: T.GRASS, groundDry: T.DIRT, rock: T.ROCK,
    vegetationDensity: 1.3, habitability: 0.7, cguBias: 0, ruinBias: 0,
  },
  glaciale: {
    id: "glaciale",
    label: "Glaciale",
    waterLevel: 0.30, beachLevel: 0.32, rockLevel: 0.72, humidityBias: 0,
    water: T.WATER, beach: T.SNOW, groundWet: T.SNOW, groundDry: T.SNOW, rock: T.ROCK,
    vegetationDensity: 0.0, habitability: 0.35, cguBias: 0.15, ruinBias: 0.10,
  },
  gazeuse: {
    id: "gazeuse",
    label: "Gazeuse (géante)",
    // Seuils jamais atteints par un e/hu ∈ [0,1] : pas d'eau ni de roche,
    // uniquement des bandes nuageuses (ASH/WASTE réutilisées, aucune tuile neuve).
    waterLevel: -0.5, beachLevel: -0.4, rockLevel: 1.5, humidityBias: 0,
    water: T.ASH, beach: T.ASH, groundWet: T.ASH, groundDry: T.WASTE, rock: T.ASH,
    vegetationDensity: 0.0, habitability: 0.05, cguBias: 0, ruinBias: 0.20,
  },
};

/** Type effectif : override manuel (params.planetType) sinon tellurique par défaut. */
export function resolvePlanetType(params: { planetType?: string }): PlanetType {
  if (params.planetType && params.planetType in PLANET_TYPES) {
    return PLANET_TYPES[params.planetType as PlanetTypeId];
  }
  return PLANET_TYPES.tellurique;
}

/**
 * Décision seuil→tuile partagée entre region.ts et planet.ts — évite toute
 * divergence future entre les deux échelles sur la logique climatique.
 * `d`/`ruin` : délabrement, indépendant du climat (jamais touché par PlanetType).
 */
export function biomeTileAt(planet: PlanetType, e: number, hu: number, d: number, ruin: number): number {
  if (e < planet.waterLevel) return planet.water;
  if (e < planet.beachLevel) return planet.beach;
  if (e > planet.rockLevel) return planet.rock;
  if (d < ruin * 0.55) return d < ruin * 0.3 ? T.ASH : T.WASTE;
  if (hu > 0.52 + planet.humidityBias) return planet.groundWet;
  return planet.groundDry;
}
