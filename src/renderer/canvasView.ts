// Vue pixel : la carte entière est rendue une fois dans un canvas offscreen
// (16 px/cellule), puis blittée avec caméra + zoom entier, sans lissage.

import type { MapData, PaletteName, WeatherInfo } from "../shared/types";
import { PALETTES } from "../core/palettes";
import { TILE_PX, TRANSPARENT, renderTileArt } from "../core/tiles/tileart";
import { TILESET, variantCount, type TileDef } from "../core/tiles/tileset";
import { variantAt } from "../core/autotile";
import { rngFor } from "../core/rng";

export interface Camera {
  x: number; // px carte au coin haut-gauche
  y: number;
  zoom: number;
}

/** Cache du pixel art : tileId → variantes → ImageData teintée par palette. */
function buildTileCache(palette: readonly string[]): Map<number, ImageData[]> {
  const cache = new Map<number, ImageData[]>();
  const rgb = palette.map((hex) => {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255] as const;
  });
  for (const def of TILESET.values()) {
    const variants: ImageData[] = [];
    for (let v = 0; v < variantCount(def); v++) {
      const art = renderTileArt(def.art, def.id, v);
      const img = new ImageData(TILE_PX, TILE_PX);
      for (let i = 0; i < art.length; i++) {
        const p = art[i];
        if (p === TRANSPARENT) continue;
        const [r, g, b] = rgb[p];
        img.data[i * 4] = r;
        img.data[i * 4 + 1] = g;
        img.data[i * 4 + 2] = b;
        img.data[i * 4 + 3] = 255;
      }
      variants.push(img);
    }
    cache.set(def.id, variants);
  }
  return cache;
}

/**
 * Overlay météo — statique (aucune primitive d'animation dans ce rendu),
 * baké une fois dans le canvas offscreen avec les tuiles, pas redessiné à
 * chaque frame. Déterministe : seed dérivée de map.seed, donc stable pour
 * une même carte, différente d'une génération à l'autre.
 */
function drawWeatherOverlay(
  octx: CanvasRenderingContext2D, map: MapData, palette: readonly string[], w: number, h: number,
): void {
  const weather = map.weather as WeatherInfo;
  if (weather.intensity <= 0) return;
  const rng = rngFor(map.seed, "weather-fx");
  const count = Math.round(weather.intensity * (w * h) / 900); // densité ∝ surface

  if (weather.overlay === "neige") {
    octx.fillStyle = palette[7] ?? palette[3];
    for (let i = 0; i < count; i++) {
      const r = 1 + rng() * 1.5;
      octx.globalAlpha = 0.4 + rng() * 0.4;
      octx.beginPath();
      octx.arc(rng() * w, rng() * h, r, 0, Math.PI * 2);
      octx.fill();
    }
  } else if (weather.overlay === "pluie") {
    octx.strokeStyle = palette[1];
    octx.lineWidth = 1;
    for (let i = 0; i < count; i++) {
      const x = rng() * w, y = rng() * h;
      octx.globalAlpha = 0.25 + rng() * 0.35;
      octx.beginPath();
      octx.moveTo(x, y);
      octx.lineTo(x - 3, y + 9);
      octx.stroke();
    }
  } else if (weather.overlay === "poussiere") {
    octx.fillStyle = palette[2];
    for (let i = 0; i < count; i++) {
      octx.globalAlpha = 0.15 + rng() * 0.25;
      octx.fillRect(rng() * w, rng() * h, 2 + rng() * 3, 1);
    }
  } else if (weather.overlay === "orage-ionique") {
    octx.strokeStyle = palette[7] ?? palette[3];
    octx.lineWidth = 1;
    const bolts = Math.max(1, Math.round(count / 30));
    for (let i = 0; i < bolts; i++) {
      let x = rng() * w, y = rng() * h * 0.4;
      octx.globalAlpha = 0.5 + rng() * 0.4;
      octx.beginPath();
      octx.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += (rng() - 0.5) * 14; y += 8 + rng() * 6; octx.lineTo(x, y); }
      octx.stroke();
    }
  } else if (weather.overlay === "brume") {
    octx.fillStyle = palette[3];
    const patches = Math.max(3, Math.round(count / 20));
    for (let i = 0; i < patches; i++) {
      octx.globalAlpha = 0.05 + rng() * 0.06;
      const r = 30 + rng() * 60;
      octx.beginPath();
      octx.arc(rng() * w, rng() * h, r, 0, Math.PI * 2);
      octx.fill();
    }
  }
  octx.globalAlpha = 1;
}

export class CanvasView {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement | null = null;
  private map: MapData | null = null;
  camera: Camera = { x: 0, y: 0, zoom: 1 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponible");
    this.ctx = ctx;
  }

  /** Re-rend la carte complète (à appeler quand carte ou palette change). */
  setMap(map: MapData, paletteName: PaletteName): void {
    this.map = map;
    const palette = PALETTES[paletteName];
    const cache = buildTileCache(palette);
    const off = document.createElement("canvas");
    off.width = map.w * TILE_PX;
    off.height = map.h * TILE_PX;
    const octx = off.getContext("2d");
    if (!octx) throw new Error("Canvas offscreen indisponible");

    // Compose sol → structure → overlay avec transparence par calque.
    const scratch = document.createElement("canvas");
    scratch.width = TILE_PX;
    scratch.height = TILE_PX;
    const sctx = scratch.getContext("2d")!;
    const drawLayer = (layer: "ground" | "structure" | "overlay"): void => {
      const grid = map.layers[layer];
      for (let y = 0; y < map.h; y++) {
        for (let x = 0; x < map.w; x++) {
          const id = grid[y * map.w + x];
          if (id === 0 && layer !== "ground") continue;
          const def: TileDef | undefined = TILESET.get(id);
          if (!def) continue;
          const variants = cache.get(id)!;
          const v = variantAt(map, layer, x, y) % variants.length;
          sctx.clearRect(0, 0, TILE_PX, TILE_PX);
          sctx.putImageData(variants[v], 0, 0);
          octx.drawImage(scratch, x * TILE_PX, y * TILE_PX);
        }
      }
    };
    octx.fillStyle = palette[0];
    octx.fillRect(0, 0, off.width, off.height);
    drawLayer("ground");
    drawLayer("structure");
    drawLayer("overlay");
    if (map.weather) drawWeatherOverlay(octx, map, palette, off.width, off.height);
    this.offscreen = off;
  }

  /** Cadre la carte entière dans le canvas visible. */
  fit(): void {
    if (!this.map) return;
    const mw = this.map.w * TILE_PX;
    const mh = this.map.h * TILE_PX;
    const zx = this.canvas.width / mw;
    const zy = this.canvas.height / mh;
    this.camera.zoom = Math.max(0.25, Math.min(4, Math.min(zx, zy)));
    this.camera.x = -(this.canvas.width / this.camera.zoom - mw) / 2;
    this.camera.y = -(this.canvas.height / this.camera.zoom - mh) / 2;
  }

  draw(highlight?: { x: number; y: number } | null): void {
    const { ctx, canvas } = this;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!this.offscreen || !this.map) return;
    const { x, y, zoom } = this.camera;
    const isGlobe = this.map.scale === "planet";
    const globe = isGlobe ? this.globeBounds() : null;

    ctx.save();
    if (globe) {
      ctx.beginPath();
      ctx.arc(globe.cx, globe.cy, globe.r, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.scale(zoom, zoom);
    ctx.drawImage(this.offscreen, -x, -y);
    ctx.restore();

    if (globe) {
      // Ombrage sphérique (limbe assombri) — donne l'illusion d'un globe
      // plutôt qu'une carte plate découpée en rond.
      ctx.save();
      ctx.beginPath();
      ctx.arc(globe.cx, globe.cy, globe.r, 0, Math.PI * 2);
      ctx.clip();
      const shade = ctx.createRadialGradient(
        globe.cx - globe.r * 0.3, globe.cy - globe.r * 0.3, globe.r * 0.2,
        globe.cx, globe.cy, globe.r * 1.05,
      );
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(0.7, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = shade;
      ctx.fillRect(globe.cx - globe.r, globe.cy - globe.r, globe.r * 2, globe.r * 2);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(globe.cx, globe.cy, globe.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Halo sur les POI navigables.
    ctx.save();
    if (globe) { ctx.beginPath(); ctx.arc(globe.cx, globe.cy, globe.r, 0, Math.PI * 2); ctx.clip(); }
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1;
    for (const poi of this.map.pois) {
      const sx = (poi.x * TILE_PX - x) * zoom;
      const sy = (poi.y * TILE_PX - y) * zoom;
      const s = TILE_PX * zoom;
      ctx.strokeRect(sx - 1, sy - 1, s + 2, s + 2);
    }
    if (highlight) {
      const sx = (highlight.x * TILE_PX - x) * zoom;
      const sy = (highlight.y * TILE_PX - y) * zoom;
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.strokeRect(sx, sy, TILE_PX * zoom, TILE_PX * zoom);
    }
    ctx.restore();
  }

  /** Cercle inscrit dans la zone visible de la carte (vue "globe" planète). */
  private globeBounds(): { cx: number; cy: number; r: number } {
    const { x, y, zoom } = this.camera;
    const mapScreenW = this.map!.w * TILE_PX * zoom;
    const mapScreenH = this.map!.h * TILE_PX * zoom;
    const left = -x * zoom;
    const top = -y * zoom;
    const r = Math.min(mapScreenW, mapScreenH) / 2;
    return { cx: left + mapScreenW / 2, cy: top + mapScreenH / 2, r };
  }

  screenToCell(px: number, py: number): { x: number; y: number } | null {
    if (!this.map) return null;
    const x = Math.floor((px / this.camera.zoom + this.camera.x) / TILE_PX);
    const y = Math.floor((py / this.camera.zoom + this.camera.y) / TILE_PX);
    if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return null;
    return { x, y };
  }

  pan(dxScreen: number, dyScreen: number): void {
    this.camera.x -= dxScreen / this.camera.zoom;
    this.camera.y -= dyScreen / this.camera.zoom;
  }

  zoomAt(px: number, py: number, dir: 1 | -1): void {
    const levels = [0.25, 0.5, 1, 2, 3, 4];
    const i = levels.findIndex((l) => l >= this.camera.zoom - 0.001);
    const next = levels[Math.max(0, Math.min(levels.length - 1, i + dir))];
    // Zoom centré sur le curseur.
    const wx = px / this.camera.zoom + this.camera.x;
    const wy = py / this.camera.zoom + this.camera.y;
    this.camera.zoom = next;
    this.camera.x = wx - px / next;
    this.camera.y = wy - py / next;
  }

  /** PNG de la carte complète (échelle 1). */
  toPngDataUrl(): string | null {
    return this.offscreen?.toDataURL("image/png") ?? null;
  }
}
