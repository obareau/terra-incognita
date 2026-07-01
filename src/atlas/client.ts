// Client Atlas (robotariis-graph) — s'exécute dans le main process.
// API REST uniquement : /api/graph chargé en une fois puis indexé côté renderer.
// L'API ne propose pas de GET /api/nodes/<id>.

import * as fs from "node:fs";
import * as path from "node:path";
import type { AtlasGraph, AtlasNode, AtlasState } from "../shared/types";

const ATLAS_URL = process.env.ATLAS_URL ?? "http://localhost:5557";
const FETCH_TIMEOUT_MS = 2000;
const CACHE_FILE = "atlas-cache.json";

interface RawNode {
  id: string;
  label: string;
  category: string;
  subcat?: string | null;
  tags?: string;
  notes?: string;
}

/** Les tags arrivent en JSON string : [{"name": "cgu", "color": "#..."}]. */
function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((t: unknown) => (typeof t === "string" ? t : (t as { name?: string })?.name ?? ""))
      .filter((s: string) => s.length > 0);
  } catch {
    return [];
  }
}

/** L'API renvoie {nodes, relations} — vérifié sur robotariis-graph. */
function normalizeGraph(raw: { nodes: RawNode[]; relations?: unknown[]; links?: unknown[] }): AtlasGraph {
  const nodes: AtlasNode[] = raw.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    category: n.category,
    subcat: n.subcat ?? null,
    tags: parseTags(n.tags),
    notes: n.notes,
  }));
  const rawLinks = (raw.relations ?? raw.links ?? []) as { source: string; target: string; rel_type: string }[];
  const links = rawLinks.map((l) => ({
    source: typeof l.source === "object" ? (l.source as { id: string }).id : l.source,
    target: typeof l.target === "object" ? (l.target as { id: string }).id : l.target,
    rel_type: l.rel_type,
  }));
  return { nodes, links };
}

async function fetchGraph(): Promise<AtlasGraph> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${ATLAS_URL}/api/graph`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Atlas HTTP ${res.status}`);
    return normalizeGraph(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

export async function loadAtlas(userDataDir: string): Promise<AtlasState> {
  const cachePath = path.join(userDataDir, CACHE_FILE);
  try {
    const graph = await fetchGraph();
    try {
      fs.writeFileSync(cachePath, JSON.stringify(graph), "utf-8");
    } catch {
      // Cache non critique : on continue même si l'écriture échoue.
    }
    return { online: true, fromCache: false, graph };
  } catch {
    try {
      const graph = JSON.parse(fs.readFileSync(cachePath, "utf-8")) as AtlasGraph;
      return { online: false, fromCache: true, graph };
    } catch {
      return { online: false, fromCache: false, graph: null };
    }
  }
}
