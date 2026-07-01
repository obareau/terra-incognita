// Client Atlas (robotariis-graph) — s'exécute dans le main process.
// API REST uniquement : /api/graph chargé en une fois puis indexé côté renderer.
// L'API ne propose pas de GET /api/nodes/<id>.

import * as fs from "node:fs";
import * as path from "node:path";
import type { AtlasGraph, AtlasNode, AtlasState, PublishResult } from "../shared/types";
import { upsertMarker, type Publication } from "../core/atlas/publish";

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
  color?: string | null;
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

async function api<T>(pathname: string, method: string = "GET", body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${ATLAS_URL}${pathname}`, {
      method,
      signal: controller.signal,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Atlas ${method} ${pathname} → HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRawGraph(): Promise<{ nodes: RawNode[]; relations?: unknown[]; links?: unknown[] }> {
  return api("/api/graph");
}

async function fetchGraph(): Promise<AtlasGraph> {
  return normalizeGraph(await fetchRawGraph());
}

/**
 * Publication carte → Atlas (écriture EXPLICITE uniquement, jamais auto) :
 * crée les nœuds POI manquants, les relie au parent, tague, puis fige la
 * carte canonique dans les notes du parent via le marqueur [terra-incognita].
 */
export async function publishToAtlas(pub: Publication): Promise<PublishResult> {
  try {
    const raw = await fetchRawGraph();
    const existing = new Set(raw.nodes.map((n) => n.id));
    let createdNodes = 0;
    let skippedNodes = 0;
    for (const n of pub.nodes) {
      if (existing.has(n.id)) {
        skippedNodes++;
        continue;
      }
      const res = await api<{ id: string }>("/api/nodes", "POST", {
        id: n.id,
        label: n.label,
        category: n.category,
        subcat: n.subcat,
        notes: n.notes,
      });
      await api(`/api/nodes/${res.id}/tags`, "PUT", { tags: n.tags });
      createdNodes++;
    }
    let relations = 0;
    for (const r of pub.relations) {
      // L'API dédoublonne (status: 'exists') et valide l'existence des nœuds.
      await api("/api/relations", "POST", { ...r, since: "An0" });
      relations++;
    }
    // Marqueur canonique sur le parent — PUT complet, champs préservés.
    const parent = raw.nodes.find((n) => n.id === pub.parentId);
    let parentUpdated = false;
    if (parent) {
      let tags: unknown = [];
      try { tags = JSON.parse(parent.tags || "[]"); } catch { /* tags illisibles : on ne les touche pas */ }
      await api(`/api/nodes/${pub.parentId}`, "PUT", {
        label: parent.label,
        category: parent.category,
        color: parent.color ?? null,
        subcat: parent.subcat ?? null,
        tags,
        notes: upsertMarker(parent.notes ?? "", pub.marker),
      });
      parentUpdated = true;
    }
    return { ok: true, createdNodes, skippedNodes, relations, parentUpdated };
  } catch (err) {
    return { ok: false, createdNodes: 0, skippedNodes: 0, relations: 0, parentUpdated: false, error: (err as Error).message };
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
