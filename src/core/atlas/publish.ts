// Publication carte → Atlas : les POI significatifs deviennent des nœuds
// canoniques reliés au lieu parent, et le lieu parent reçoit un marqueur
// [terra-incognita] qui fige sa carte canonique (seed + params).
// Logique pure — les appels réseau vivent dans src/atlas/client.ts.

import type { GenParams, MapData, Scale } from "../../shared/types";

export const TI_TAG = "terra-incognita";
export const TI_TAG_COLOR = "#5585b5";

export interface NodePayload {
  id: string;
  label: string;
  category: string;
  subcat: string;
  notes: string;
  tags: { name: string; color: string }[];
}

export interface RelationPayload {
  source: string;
  target: string;
  rel_type: string;
  metadata: Record<string, unknown>;
}

export interface Publication {
  parentId: string;
  nodes: NodePayload[];
  relations: RelationPayload[];
  /** Marqueur à écrire dans les notes du nœud parent. */
  marker: string;
}

// ── Marqueur canonique dans les notes du nœud ────────────────────────

const MARKER_RE = /\[terra-incognita\]\s*(\{[^\n]*\})/;

export interface CanonicalMap {
  seed: string;
  scale: Scale;
  params: GenParams;
}

export function formatMarker(map: MapData): string {
  return `[terra-incognita] ${JSON.stringify({ seed: map.seed, scale: map.scale, params: map.params })}`;
}

/** Retrouve la carte canonique stockée dans les notes d'un nœud Atlas. */
export function parseMarker(notes: string | undefined): CanonicalMap | null {
  if (!notes) return null;
  const m = notes.match(MARKER_RE);
  if (!m) return null;
  try {
    const raw = JSON.parse(m[1]) as Partial<CanonicalMap>;
    if (!raw.seed || !raw.scale || !raw.params) return null;
    return raw as CanonicalMap;
  } catch {
    return null;
  }
}

/** Remplace (ou ajoute) le marqueur dans des notes existantes. */
export function upsertMarker(notes: string, marker: string): string {
  if (MARKER_RE.test(notes)) return notes.replace(MARKER_RE, marker);
  return notes.length > 0 ? `${notes}\n\n${marker}` : marker;
}

// ── Sélection des POI publiables ─────────────────────────────────────

/** Genres de POI qui méritent une fiche Atlas, par échelle. */
const PUBLISHABLE: Record<Scale, string[]> = {
  system: ["planete"],
  planet: ["continent", "avant-poste"],
  region: ["city", "base", "ruin", "mystere"],
  city: ["qg", "caserne", "marche", "usine", "memorial"],
  interior: [],
};

const KIND_LABEL: Record<string, string> = {
  planete: "Planète",
  continent: "Continent",
  "avant-poste": "Avant-poste",
  city: "Ville",
  base: "Base C.G.U.",
  ruin: "Ruines",
  qg: "Q.G. C.G.U.",
  caserne: "Caserne C.G.U.",
  marche: "Marché",
  usine: "Complexe industriel",
  memorial: "Mémorial C.G.U.",
};

const MAX_POIS = 12;

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Construit la publication d'une carte ancrée à un nœud Atlas.
 * `existingIds` évite les doublons lors d'une re-publication (les ids
 * sont stables : dérivés du parent, du genre et d'un compteur).
 */
export function buildPublication(map: MapData, existingIds: ReadonlySet<string>): Publication {
  if (!map.atlasRef) throw new Error("Carte non ancrée à un nœud Atlas");
  const parentId = map.atlasRef.nodeId;
  const kinds = PUBLISHABLE[map.scale];
  const nodes: NodePayload[] = [];
  const relations: RelationPayload[] = [];
  const counters: Record<string, number> = {};
  // Le plafond porte sur les POI TRAITÉS (pas créés) : la sélection et les
  // ids restent identiques d'une publication à l'autre → idempotence.
  let processed = 0;

  for (const poi of map.pois) {
    if (!kinds.includes(poi.kind)) continue;
    if (processed >= MAX_POIS) break;
    processed++;
    counters[poi.kind] = (counters[poi.kind] ?? 0) + 1;
    const id = `${parentId}-ti-${slugify(poi.kind)}-${counters[poi.kind]}`;
    const label = `${KIND_LABEL[poi.kind] ?? poi.label} ${counters[poi.kind]} (${map.atlasRef.label})`;
    if (!existingIds.has(id)) {
      nodes.push({
        id,
        label,
        category: "lieu",
        subcat: poi.kind,
        notes:
          `Généré par Terra-Incognita depuis ${map.atlasRef.label}.\n` +
          `Carte ${map.seed} [${map.scale}], position (${poi.x},${poi.y}), seed enfant ${poi.childSeed}.`,
        tags: [
          { name: TI_TAG, color: TI_TAG_COLOR },
          { name: slugify(poi.kind), color: TI_TAG_COLOR },
        ],
      });
    }
    // La relation est idempotente côté API (doublon exact → 'exists').
    relations.push({
      source: id,
      target: parentId,
      rel_type: "membre",
      metadata: { origin: TI_TAG, x: poi.x, y: poi.y, childSeed: poi.childSeed },
    });
  }

  return { parentId, nodes, relations, marker: formatMarker(map) };
}
