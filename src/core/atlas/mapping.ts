// Mapping lore → génération : un nœud Atlas (tags + relations) devient
// un jeu de GenParams et une échelle suggérée.

import type { Ambiance, AtlasGraph, AtlasNode, GenParams, Scale } from "../../shared/types";

export const CGU_ID = "cgu-rectitude";

export interface MappedNode {
  params: GenParams;
  scale: Scale;
  label: string;
}

/** Relations d'un nœud, dans les deux sens. */
function relationsOf(graph: AtlasGraph, nodeId: string): { otherId: string; rel: string }[] {
  const out: { otherId: string; rel: string }[] = [];
  for (const l of graph.links) {
    if (l.source === nodeId) out.push({ otherId: l.target, rel: l.rel_type });
    else if (l.target === nodeId) out.push({ otherId: l.source, rel: l.rel_type });
  }
  return out;
}

/** Slugs des factions parmi des ids de nœuds. */
function factionIds(graph: AtlasGraph, ids: string[]): string[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  return ids.filter((id) => byId.get(id)?.category === "faction");
}

export function mapNodeToParams(node: AtlasNode, graph: AtlasGraph): MappedNode {
  // Normalisation : minuscules sans accents ("zones-abandonnées" → "zones-abandonnees").
  const tags = node.tags.map((t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  const has = (fragment: string): boolean => tags.some((t) => t.includes(fragment));
  const rels = relationsOf(graph, node.id);

  // ── Densité C.G.U. : liens directs + tags martiaux ─────────────────
  let cguDensity = 0.15;
  const cguRels = rels.filter((r) => r.otherId === CGU_ID);
  for (const r of cguRels) {
    if (r.rel === "membre" || r.rel === "parent") cguDensity += 0.5;
    else if (r.rel === "allie") cguDensity += 0.35;
    else if (r.rel === "connecte") cguDensity += 0.25;
    else if (r.rel === "ennemi") cguDensity -= 0.1;
  }
  if (has("cgu") || has("rectitude")) cguDensity += 0.3;
  if (has("marche-militaire") || has("militaire")) cguDensity += 0.15;
  if (has("neutre")) cguDensity -= 0.15;
  if (has("clandestin") || has("voile-ombre") || has("resistance")) cguDensity -= 0.25;
  cguDensity = Math.max(0, Math.min(1, cguDensity));

  // ── Ambiance ───────────────────────────────────────────────────────
  let ambiance: Ambiance = "neutre";
  if (has("voile-ombre") || has("clandestin") || has("marche-noir") || has("resistance")) ambiance = "clandestin";
  else if (has("industriel") || has("usine") || has("docks")) ambiance = "industriel";
  else if (has("ruine") || has("abandon")) ambiance = "ruine";
  else if (cguDensity > 0.55) ambiance = "militaire";

  // ── Délabrement ────────────────────────────────────────────────────
  let ruin = 0.15;
  if (has("ere-fragmentation")) ruin += 0.2;
  if (has("ruine") || has("abandon")) ruin += 0.5;
  if (has("guerre")) ruin += 0.25;
  ruin = Math.max(0, Math.min(1, ruin));

  // ── Factions présentes (alliés + ennemis = présence sur zone) ─────
  const present = rels
    .filter((r) => ["membre", "allie", "ennemi", "connecte", "parent"].includes(r.rel))
    .map((r) => r.otherId);
  const factions = [...new Set(factionIds(graph, present))];

  // ── Échelle suggérée ───────────────────────────────────────────────
  let scale: Scale = "city";
  if (node.category === "planete" || node.category === "systeme") scale = "region";
  else if (has("station-orbitale") || has("bunker") || has("interieur")) scale = "interior";

  return {
    params: { cguDensity, factions, ambiance, ruin },
    scale,
    label: node.label,
  };
}
