// Types partagés entre main, preload, renderer et core.

export type Scale = "system" | "planet" | "region" | "city" | "interior";

export type Ambiance =
  | "militaire"    // zone C.G.U. verrouillée
  | "industriel"   // usines, docks, fumées
  | "neutre"       // civil ordinaire
  | "clandestin"   // marché noir, Voile d'Ombre
  | "ruine";       // friches, zones abandonnées

export type PaletteName = "phosphore" | "sepia" | "blueprint";

/** Pont Atlas → génération : tout ce qui influence une carte. */
export interface GenParams {
  /** Présence martiale du C.G.U. (0 = absent, 1 = état de siège). */
  cguDensity: number;
  /** Slugs Atlas des factions présentes (rivales incluses). */
  factions: string[];
  ambiance: Ambiance;
  /** Délabrement 0..1 (guerre, abandon). */
  ruin: number;
  /** Override manuel du style d'architecture (sinon : faction dominante). */
  archStyle?: string;
  /** Override manuel du type de planète — climat/météo (sinon : tellurique). */
  planetType?: string;
  biome?: string;
  population?: number;
}

export interface POI {
  x: number;
  y: number;
  kind: string;
  label: string;
  /** Seed dérivée pour générer la carte enfant (descente d'échelle). */
  childSeed: string;
  /** Surcharge de params pour la carte enfant (ex. planetType d'une planète de système). */
  params?: Partial<GenParams>;
}

export interface MapLayers {
  ground: Uint16Array;
  structure: Uint16Array;
  overlay: Uint16Array;
}

export interface AtlasRef {
  nodeId: string;
  label: string;
}

/** Étoile d'un système (échelle "system") — 1 à 3 (simple/double/triple). */
export interface StarInfo {
  name: string;
  /** Type spectral simplifié — pilote couleur/taille du rendu orbital. */
  spectralType: "naine-rouge" | "jaune" | "blanche" | "geante-bleue";
  radiusPx: number;
}

/** Météo courante d'une carte (échelles planet/region) — cf. core/planet/weather.ts. */
export type WeatherOverlay = "clair" | "brume" | "pluie" | "neige" | "poussiere" | "orage-ionique";
export interface WeatherInfo {
  label: string;
  glyph: string;
  overlay: WeatherOverlay;
  intensity: number;
}

export interface MapData {
  version: 1;
  scale: Scale;
  seed: string;
  params: GenParams;
  w: number;
  h: number;
  layers: MapLayers;
  pois: POI[];
  atlasRef?: AtlasRef;
  /** Uniquement pour scale==="system" — rendu orbital dédié (systemView.ts). */
  stars?: StarInfo[];
  /** Météo courante — scales planet/region (atmosphère extérieure). */
  weather?: WeatherInfo;
}

// ── Atlas ────────────────────────────────────────────────────────────

export interface AtlasNode {
  id: string;
  label: string;
  category: string;
  subcat?: string | null;
  /** JSON string côté API ; parsé en liste de noms côté client. */
  tags: string[];
  notes?: string;
}

export interface AtlasLink {
  source: string;
  target: string;
  rel_type: string;
}

export interface AtlasGraph {
  nodes: AtlasNode[];
  links: AtlasLink[];
}

export interface AtlasState {
  online: boolean;
  fromCache: boolean;
  graph: AtlasGraph | null;
}

/** Bilan d'une publication carte → Atlas. */
export interface PublishResult {
  ok: boolean;
  createdNodes: number;
  skippedNodes: number;
  relations: number;
  parentUpdated: boolean;
  error?: string;
}

// ── Surface IPC exposée au renderer via preload ──────────────────────

export interface TerraApi {
  atlas: {
    /** Charge le graphe (API si dispo, sinon cache disque). */
    load(): Promise<AtlasState>;
    /** Publie la carte courante vers l'Atlas (nœuds POI + marqueur canonique). */
    publish(publication: unknown): Promise<PublishResult>;
  };
  export: {
    /** Ouvre un dialog "enregistrer" et écrit le contenu texte. */
    saveText(defaultName: string, content: string): Promise<string | null>;
    /** Ouvre un dialog "enregistrer" et écrit un PNG depuis un dataURL. */
    savePng(defaultName: string, dataUrl: string): Promise<string | null>;
    /** Ouvre un dialog "ouvrir" et lit un fichier JSON. */
    openJson(): Promise<string | null>;
  };
}
