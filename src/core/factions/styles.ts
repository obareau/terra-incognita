// Styles d'architecture par faction — dérivés des caractères canon du lore.
// Chaque faction connue est rattachée à un archétype ; la faction dominante
// d'un lieu (première de GenParams.factions) impose son style aux cartes.

import { T } from "../tiles/tileset";

export type ArchStyleId =
  | "martial"     // C.G.U. : ordre totalitaire, contrôle, peur
  | "liturgique"  // Pasteurs : pouvoir public, cérémonies, sacré-technologique
  | "clandestin"  // Voile d'Ombre : marché noir, discrétion, profit
  | "organique"   // Gardiens des Jardins : sanctuaires naturels
  | "industriel"  // Magnats : flux d'énergie, production, stabilité rentable
  | "civique";    // Archivistes : savoir, ordre civil sans doctrine

export interface ArchStyle {
  id: ArchStyleId;
  label: string;
  /** Tuile des enceintes et murs porteurs. */
  wall: number;
  /** Toits dominant / secondaire des blocs bâtis. */
  roofPrimary: number;
  roofSecondary: number;
  /** Probabilités de décor (0..1, consommées par les générateurs). */
  decor: {
    banner: number;      // bannières de faction
    propaganda: number;  // affiches
    graffiti: number;    // marquages dissidents
    lamp: number;        // éclairage public
    tree: number;        // végétation urbaine
  };
  /** Multiplicateurs des poids de zonage de la ville. */
  zoneBias: Record<string, number>;
  /** Probabilité qu'une zone verte devienne un mémorial (spomenik). */
  monumentChance: number;
}

export const ARCH_STYLES: Record<ArchStyleId, ArchStyle> = {
  martial: {
    id: "martial",
    label: "Martial C.G.U.",
    wall: T.WALL_METAL,
    roofPrimary: T.ROOF_HAB,
    roofSecondary: T.ROOF_IND,
    decor: { banner: 0.9, propaganda: 0.9, graffiti: 0.05, lamp: 0.8, tree: 0.1 },
    zoneBias: { militaire: 1.6, habitat: 1, industrie: 1, marche: 0.6, parc: 0.3, ruine: 1 },
    monumentChance: 0.85,
  },
  liturgique: {
    id: "liturgique",
    label: "Liturgique (Pasteurs)",
    wall: T.WALL,
    roofPrimary: T.ROOF_HAB,
    roofSecondary: T.ROOF_HAB,
    decor: { banner: 1, propaganda: 0.7, graffiti: 0.02, lamp: 1, tree: 0.3 },
    zoneBias: { militaire: 0.8, habitat: 1.2, industrie: 0.5, marche: 1, parc: 1.2, ruine: 0.6 },
    monumentChance: 1,
  },
  clandestin: {
    id: "clandestin",
    label: "Clandestin (Voile d'Ombre)",
    wall: T.WALL,
    roofPrimary: T.ROOF_HAB,
    roofSecondary: T.ROOF_IND,
    decor: { banner: 0.1, propaganda: 0.1, graffiti: 0.9, lamp: 0.15, tree: 0.15 },
    zoneBias: { militaire: 0.4, habitat: 1.2, industrie: 0.9, marche: 2.2, parc: 0.4, ruine: 1.4 },
    monumentChance: 0,
  },
  organique: {
    id: "organique",
    label: "Organique (Gardiens des Jardins)",
    wall: T.FENCE,
    roofPrimary: T.ROOF_HAB,
    roofSecondary: T.ROOF_HAB,
    decor: { banner: 0.15, propaganda: 0.05, graffiti: 0.15, lamp: 0.35, tree: 1 },
    zoneBias: { militaire: 0.3, habitat: 1, industrie: 0.25, marche: 0.9, parc: 3, ruine: 0.5 },
    monumentChance: 0,
  },
  industriel: {
    id: "industriel",
    label: "Industriel (Magnats)",
    wall: T.WALL_METAL,
    roofPrimary: T.ROOF_IND,
    roofSecondary: T.ROOF_HAB,
    decor: { banner: 0.3, propaganda: 0.3, graffiti: 0.25, lamp: 0.9, tree: 0.05 },
    zoneBias: { militaire: 0.7, habitat: 0.9, industrie: 2.4, marche: 1.1, parc: 0.3, ruine: 0.9 },
    monumentChance: 0.15,
  },
  civique: {
    id: "civique",
    label: "Civique (Archivistes)",
    wall: T.WALL,
    roofPrimary: T.ROOF_HAB,
    roofSecondary: T.ROOF_HAB,
    decor: { banner: 0.25, propaganda: 0.15, graffiti: 0.05, lamp: 0.9, tree: 0.5 },
    zoneBias: { militaire: 0.5, habitat: 1.4, industrie: 0.7, marche: 1.1, parc: 1.3, ruine: 0.5 },
    monumentChance: 0.25,
  },
};

/** Assignation faction → archétype, d'après les fiches canon (02-FACTIONS). */
export const FACTION_ARCH: Record<string, ArchStyleId> = {
  // Le régime et ses bras armés — ordre, hiérarchie, violence institutionnelle.
  "cgu-rectitude": "martial",
  "clipeati-unitas": "martial",
  "nonae-recta": "martial",
  "division-dark-umbrae": "martial",
  "purete-humaine": "martial",
  "briseurs-de-conscience": "martial",
  // Le bras doctrinal — pouvoir public, liturgique, hymnes d'État.
  "pasteurs-de-la-rectitude": "liturgique",
  "harmonie-synthetique": "liturgique",
  "illumines-de-la-singularite": "liturgique",
  "templiers-de-la-balance": "liturgique",
  "acolytes-de-nova-7": "liturgique",
  // Marché noir, résistance, inadaptés du système.
  "voile-ombre": "clandestin",
  "union-clandestine": "clandestin",
  "renegats": "clandestin",
  "fraternite-de-lombre": "clandestin",
  "fils-de-l-aube-du-miroir": "clandestin",
  "fractales-libres": "clandestin",
  "synthetiques-marginaux": "clandestin",
  // Préservateurs de la vie organique — sanctuaires, pas de béton.
  "gardiens-des-jardins": "organique",
  "protecteurs-verts": "organique",
  // Colonne vertébrale économique — production, flux, stabilité.
  "magnats-industriels": "industriel",
  "barons-technologiques": "industriel",
  "confrerie-mecanistes": "industriel",
  "architectes-du-flux": "industriel",
  "techno-obstetriciens": "industriel",
  // Savoir et ordre civil.
  "archivistes-libres": "civique",
  "continui-numeri": "civique",
  "financiers-culturels": "civique",
  "binariis": "civique",
  "mediarchives": "civique",
};

/**
 * Style d'un lieu : archétype de la première faction connue de la liste
 * (la dominante — voir le tri par poids de relation dans atlas/mapping.ts).
 * Sans faction connue → martial si le C.G.U. pèse, sinon civique.
 */
export function styleFor(factions: string[], cguDensity: number = 0): ArchStyle {
  for (const f of factions) {
    const id = FACTION_ARCH[f];
    if (id) return ARCH_STYLES[id];
  }
  return ARCH_STYLES[cguDensity > 0.55 ? "martial" : "civique"];
}

/** Style effectif d'une carte : override manuel (params.archStyle) sinon faction dominante. */
export function resolveStyle(params: { factions: string[]; cguDensity: number; archStyle?: string }): ArchStyle {
  if (params.archStyle && params.archStyle in ARCH_STYLES) {
    return ARCH_STYLES[params.archStyle as ArchStyleId];
  }
  return styleFor(params.factions, params.cguDensity);
}
