// Orchestration de l'UI : état, contrôles, navigation d'échelles, Atlas.

import type { Ambiance, AtlasState, GenParams, MapData, PaletteName, POI, Scale, TerraApi } from "../shared/types";
import { DEFAULT_PARAMS, childScale, generate } from "../core/generate";
import { fromJson, toAscii, toJson } from "../core/serialize";
import { mapNodeToParams } from "../core/atlas/mapping";
import { buildPublication, parseMarker } from "../core/atlas/publish";
import { PALETTES } from "../core/palettes";
import { TILESET } from "../core/tiles/tileset";
import { CanvasView } from "./canvasView";
import { AsciiView } from "./asciiView";
import { SystemView } from "./systemView";
import { Chiptune } from "./chiptune";
import { installBrowserShim } from "./shim";

declare global {
  interface Window { terra: TerraApi }
}

// Hors Electron (démo web), fournit exports navigateur + Atlas hors-ligne.
installBrowserShim();

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} introuvable`);
  return el as T;
};

interface Crumb {
  scale: Scale;
  seed: string;
  params: GenParams;
  label: string;
}

const state = {
  map: null as MapData | null,
  palette: "phosphore" as PaletteName,
  view: "pixel" as "pixel" | "ascii",
  stack: [] as Crumb[],
  atlas: null as AtlasState | null,
};

const canvas = $<HTMLCanvasElement>("view");
const pixelView = new CanvasView(canvas);
const asciiView = new AsciiView(canvas);
const systemView = new SystemView(canvas);
const chiptune = new Chiptune();

/** Échelle système : scène orbitale dédiée, pas le pipeline tuiles pixel/ascii. */
const isSystemScale = (): boolean => state.map?.scale === "system";

// ── Lecture des contrôles ────────────────────────────────────────────

function readParams(): GenParams {
  const arch = $<HTMLSelectElement>("archStyle").value;
  const planetType = $<HTMLSelectElement>("planetType").value;
  return {
    ...DEFAULT_PARAMS,
    cguDensity: parseFloat($<HTMLInputElement>("cgu").value),
    ruin: parseFloat($<HTMLInputElement>("ruin").value),
    ambiance: $<HTMLSelectElement>("ambiance").value as Ambiance,
    ...(arch ? { archStyle: arch } : {}),
    ...(planetType ? { planetType } : {}),
  };
}

function writeParams(p: GenParams): void {
  $<HTMLInputElement>("cgu").value = String(p.cguDensity);
  $<HTMLInputElement>("ruin").value = String(p.ruin);
  $<HTMLSelectElement>("ambiance").value = p.ambiance;
  $<HTMLSelectElement>("archStyle").value = p.archStyle ?? "";
  $<HTMLSelectElement>("planetType").value = p.planetType ?? "";
  syncSliderLabels();
}

function syncSliderLabels(): void {
  $("cguVal").textContent = parseFloat($<HTMLInputElement>("cgu").value).toFixed(2);
  $("ruinVal").textContent = parseFloat($<HTMLInputElement>("ruin").value).toFixed(2);
}

// ── Rendu ────────────────────────────────────────────────────────────

// Cadrage auto tant que l'utilisateur n'a pas pris la main (pan/zoom).
let autoFit = true;

let systemHighlight: POI | null = null;

function resizeCanvas(): void {
  const box = $("viewport").getBoundingClientRect();
  canvas.width = Math.floor(box.width);
  canvas.height = Math.floor(box.height);
  if (autoFit && !isSystemScale()) pixelView.fit();
  redraw();
}

function redraw(highlight?: { x: number; y: number } | null): void {
  if (isSystemScale()) systemView.draw(systemHighlight);
  else if (state.view === "pixel") pixelView.draw(highlight);
  else asciiView.draw(pixelView.camera);
}

function applyPaletteToUi(): void {
  const p = PALETTES[state.palette];
  const root = document.documentElement.style;
  p.forEach((c, i) => root.setProperty(`--c${i}`, c));
}

function setMap(map: MapData, label: string, pushCrumb: boolean): void {
  state.map = map;
  systemHighlight = null;
  if (pushCrumb) {
    state.stack.push({ scale: map.scale, seed: map.seed, params: map.params, label });
  }
  if (map.scale === "system") {
    // Scène orbitale : pas de pipeline tuiles (le canvas offscreen pixel/ascii
    // n'a pas de sens ici — layers vides, w/h = un plan orbital, pas une grille).
    systemView.setMap(map, state.palette);
  } else {
    pixelView.setMap(map, state.palette);
    asciiView.setMap(map, state.palette);
    autoFit = true;
    pixelView.fit();
  }
  updateBreadcrumb();
  redraw();
  if (chiptune.playing) {
    chiptune.start(map.seed, map.params.ambiance);
    $("trackInfo").textContent = `♪ ${chiptune.trackLabel}`;
  }
}

function updateBreadcrumb(): void {
  const el = $("breadcrumb");
  el.innerHTML = state.stack
    .map((c, i) => (i === state.stack.length - 1 ? `<b>${c.label}</b>` : c.label))
    .join(" ▸ ") || "—";
  $<HTMLButtonElement>("btnUp").disabled = state.stack.length <= 1;
}

// ── Génération ───────────────────────────────────────────────────────

function generateFromControls(): void {
  const seed = $<HTMLInputElement>("seed").value.trim() || "terra";
  const scale = $<HTMLSelectElement>("scale").value as Scale;
  const params = readParams();
  state.stack = [];
  const map = generate(scale, seed, params);
  setMap(map, `${seed} [${scale}]`, true);
}

function descendTo(poi: POI): void {
  if (!state.map) return;
  const { label: poiLabel, kind, childSeed } = poi;
  const next = childScale(state.map.scale, kind);
  if (!next) return;
  const params = { ...state.map.params, ...poi.params };
  if (kind === "base" || kind === "qg" || kind === "caserne" || kind === "avant-poste") {
    params.ambiance = "militaire";
    params.cguDensity = Math.max(params.cguDensity, 0.7);
  } else if (kind === "usine") {
    params.ambiance = "industriel";
  } else if (kind === "ruin") {
    params.ambiance = "ruine";
    params.ruin = Math.max(params.ruin, 0.6);
  }
  const map = generate(next, childSeed, params);
  map.atlasRef = state.map.atlasRef;
  setMap(map, poiLabel, true);
}

function goUp(): void {
  if (state.stack.length <= 1) return;
  state.stack.pop();
  const crumb = state.stack[state.stack.length - 1];
  const map = generate(crumb.scale, crumb.seed, crumb.params);
  setMap(map, crumb.label, false);
}

// ── Atlas ────────────────────────────────────────────────────────────

async function loadAtlas(): Promise<void> {
  const status = $("atlasStatus");
  try {
    state.atlas = await window.terra.atlas.load();
  } catch {
    state.atlas = { online: false, fromCache: false, graph: null };
  }
  const a = state.atlas;
  if (a.graph) {
    status.textContent = a.online ? "ATLAS : EN LIGNE ⇄" : "ATLAS : HORS-LIGNE (cache)";
    status.classList.toggle("online", a.online);
    const select = $<HTMLSelectElement>("atlasNode");
    const previous = select.value;
    // Repeuplement idempotent (appelé aussi après une publication).
    select.replaceChildren(new Option("— mode libre —", ""));
    const places = a.graph.nodes
      .filter((n) => ["lieu", "planete", "systeme"].includes(n.category))
      .sort((x, y) => x.label.localeCompare(y.label));
    for (const n of places) {
      const canon = parseMarker(n.notes) ? " ⚓" : "";
      select.appendChild(new Option(`${n.label} (${n.category})${canon}`, n.id));
    }
    select.value = previous;
    if (select.selectedIndex < 0) select.selectedIndex = 0;
  } else {
    status.textContent = "ATLAS : HORS-LIGNE — mode libre";
  }
}

function generateFromAtlas(): void {
  const a = state.atlas;
  const nodeId = $<HTMLSelectElement>("atlasNode").value;
  if (!a?.graph || !nodeId) return;
  const node = a.graph.nodes.find((n) => n.id === nodeId);
  if (!node) return;
  // Carte canonique déjà publiée ? Le marqueur [terra-incognita] des notes
  // du nœud fige seed + échelle + params : l'Atlas fait autorité.
  const canon = parseMarker(node.notes);
  const mapped = canon
    ? { params: canon.params, scale: canon.scale, label: `${node.label} ⚓` }
    : mapNodeToParams(node, a.graph);
  const seed = canon?.seed ?? node.id;
  writeParams(mapped.params);
  $<HTMLInputElement>("seed").value = seed;
  $<HTMLSelectElement>("scale").value = mapped.scale;
  state.stack = [];
  const map = generate(mapped.scale, seed, mapped.params);
  map.atlasRef = { nodeId: node.id, label: node.label };
  setMap(map, mapped.label, true);
  $("cellInfo").textContent = canon
    ? `Carte canonique de ${node.label} (figée dans l'Atlas)`
    : `Carte dérivée du lore de ${node.label}`;
}

async function publishToAtlas(): Promise<void> {
  const map = state.map;
  const info = $("cellInfo");
  if (!map?.atlasRef) {
    info.textContent = "Publication impossible : carte non ancrée à un nœud Atlas.";
    return;
  }
  if (!state.atlas?.online) {
    info.textContent = "Publication impossible : Atlas hors-ligne.";
    return;
  }
  const existing = new Set(state.atlas.graph?.nodes.map((n) => n.id) ?? []);
  const pub = buildPublication(map, existing);
  info.textContent = "Publication vers l'Atlas…";
  const res = await window.terra.atlas.publish(pub);
  if (res.ok) {
    info.textContent = `Atlas ⇄ : ${res.createdNodes} nœud(s) créé(s), ${res.skippedNodes} déjà présent(s), ${res.relations} relation(s), carte canonique figée.`;
    await loadAtlas(); // rafraîchit le graphe local (nouveaux nœuds, marqueur)
  } else {
    info.textContent = `Échec de publication : ${res.error ?? "erreur inconnue"}`;
  }
}

// ── Interactions souris ──────────────────────────────────────────────

let dragging = false;
let moved = false;
let last = { x: 0, y: 0 };

canvas.addEventListener("mousedown", (e) => {
  dragging = true;
  moved = false;
  last = { x: e.clientX, y: e.clientY };
});
window.addEventListener("mouseup", () => { dragging = false; });
canvas.addEventListener("mousemove", (e) => {
  if (dragging) {
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) { moved = true; autoFit = false; }
    if (!isSystemScale()) pixelView.pan(dx, dy); // scène système fixe, pas de pan
    last = { x: e.clientX, y: e.clientY };
    redraw();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const info = $("cellInfo");
  if (isSystemScale()) {
    const poi = systemView.findPlanetAt(e.clientX - rect.left, e.clientY - rect.top);
    systemHighlight = poi;
    info.textContent = poi ? `${poi.label} ▸` : "";
    redraw();
    return;
  }
  const cell = pixelView.screenToCell(e.clientX - rect.left, e.clientY - rect.top);
  if (cell && state.map) {
    const i = cell.y * state.map.w + cell.x;
    const id = state.map.layers.overlay[i] || state.map.layers.structure[i] || state.map.layers.ground[i];
    const name = TILESET.get(id)?.name ?? "?";
    const poi = state.map.pois.find((p) => Math.abs(p.x - cell.x) <= 1 && Math.abs(p.y - cell.y) <= 1);
    info.textContent = `(${cell.x},${cell.y}) ${name}${poi ? ` — ${poi.label} ▸` : ""}`;
    redraw(cell);
  } else {
    info.textContent = "";
  }
});
canvas.addEventListener("click", (e) => {
  if (moved || !state.map) return;
  const rect = canvas.getBoundingClientRect();
  if (isSystemScale()) {
    const poi = systemView.findPlanetAt(e.clientX - rect.left, e.clientY - rect.top);
    if (poi) descendTo(poi);
    return;
  }
  const cell = pixelView.screenToCell(e.clientX - rect.left, e.clientY - rect.top);
  if (!cell) return;
  const poi = state.map.pois.find((p) => Math.abs(p.x - cell.x) <= 1 && Math.abs(p.y - cell.y) <= 1);
  if (poi) descendTo(poi);
});
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (isSystemScale()) return; // scène système à échelle fixe, pas de zoom
  const rect = canvas.getBoundingClientRect();
  autoFit = false;
  pixelView.zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1 : -1);
  redraw();
}, { passive: false });

// ── Boutons ──────────────────────────────────────────────────────────

$("btnGenerate").addEventListener("click", generateFromControls);
$("btnAtlasGen").addEventListener("click", generateFromAtlas);
$("btnPublish").addEventListener("click", () => void publishToAtlas());
$("btnUp").addEventListener("click", goUp);
$("btnFit").addEventListener("click", () => { if (!isSystemScale()) pixelView.fit(); redraw(); });

$("btnRandomSeed").addEventListener("click", () => {
  // Seule source d'aléa non-seedée : le bouton dé, hors de src/core.
  const words = ["helion", "sigma", "vespera", "axion", "lumina", "umbra", "recta", "nona"];
  const w = words[Math.floor(Math.random() * words.length)];
  $<HTMLInputElement>("seed").value = `${w}-${Math.floor(Math.random() * 999)}`;
  generateFromControls();
});

$("btnView").addEventListener("click", () => {
  state.view = state.view === "pixel" ? "ascii" : "pixel";
  $("btnView").textContent = state.view === "pixel" ? "VUE : PIXEL" : "VUE : ASCII";
  redraw();
});

$("btnCrt").addEventListener("click", () => {
  const vp = $("viewport");
  vp.classList.toggle("crt");
  $("btnCrt").textContent = vp.classList.contains("crt") ? "CRT : ON" : "CRT : OFF";
});

$<HTMLSelectElement>("palette").addEventListener("change", (e) => {
  state.palette = (e.target as HTMLSelectElement).value as PaletteName;
  applyPaletteToUi();
  if (state.map) {
    pixelView.setMap(state.map, state.palette);
    asciiView.setMap(state.map, state.palette);
    redraw();
  }
});

for (const id of ["cgu", "ruin"]) {
  $(id).addEventListener("input", syncSliderLabels);
}

function syncTrackInfo(): void {
  $("trackInfo").textContent = chiptune.playing ? `♪ ${chiptune.trackLabel}` : "";
}

$("btnAudio").addEventListener("click", () => {
  if (chiptune.playing) {
    chiptune.stop();
    $("btnAudio").textContent = "▶ CHIPTUNE";
  } else if (state.map) {
    chiptune.unlock(); // mobile : dans le geste
    chiptune.start(state.map.seed, state.map.params.ambiance);
    $("btnAudio").textContent = "■ STOP";
  }
  syncTrackInfo();
});

$("btnNextTrack").addEventListener("click", () => {
  if (!state.map) return;
  if (chiptune.playing) {
    chiptune.next();
  } else {
    chiptune.start(state.map.seed, state.map.params.ambiance, chiptune.track + 1);
    $("btnAudio").textContent = "■ STOP";
  }
  syncTrackInfo();
});

$("btnPng").addEventListener("click", () => {
  const url = isSystemScale() ? systemView.toPngDataUrl() : pixelView.toPngDataUrl();
  if (url && state.map) void window.terra.export.savePng(`${state.map.seed}-${state.map.scale}.png`, url);
});
$("btnTxt").addEventListener("click", () => {
  if (state.map) void window.terra.export.saveText(`${state.map.seed}-${state.map.scale}.txt`, toAscii(state.map));
});
$("btnJson").addEventListener("click", () => {
  if (state.map) void window.terra.export.saveText(`${state.map.seed}-${state.map.scale}.json`, toJson(state.map));
});
$("btnOpen").addEventListener("click", async () => {
  const json = await window.terra.export.openJson();
  if (!json) return;
  try {
    const map = fromJson(json);
    $<HTMLInputElement>("seed").value = map.seed;
    $<HTMLSelectElement>("scale").value = map.scale;
    writeParams(map.params);
    state.stack = [];
    setMap(map, `${map.atlasRef?.label ?? map.seed} [${map.scale}]`, true);
  } catch (err) {
    $("cellInfo").textContent = `Fichier illisible : ${(err as Error).message}`;
  }
});

window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  if (e.key === "r" || e.key === "R") generateFromControls();
  if (e.key === "v" || e.key === "V") $("btnView").click();
  if (e.key === "f" || e.key === "F") { if (!isSystemScale()) pixelView.fit(); redraw(); }
  if (e.key === "Backspace") goUp();
});

// ── Démarrage ────────────────────────────────────────────────────────

window.addEventListener("resize", resizeCanvas);
applyPaletteToUi();
resizeCanvas();
syncSliderLabels();
generateFromControls();
void loadAtlas();
