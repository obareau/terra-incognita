// Vue ASCII/TUI : la même MapData rendue en glyphes monospace,
// offscreen à 16 px/cellule pour partager la caméra avec la vue pixel.

import type { MapData, PaletteName } from "../shared/types";
import { PALETTES } from "../core/palettes";
import { TILE_PX } from "../core/tiles/tileart";
import { TILESET } from "../core/tiles/tileset";
import type { Camera } from "./canvasView";

export class AsciiView {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement | null = null;
  private map: MapData | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponible");
    this.ctx = ctx;
  }

  setMap(map: MapData, paletteName: PaletteName): void {
    this.map = map;
    const palette = PALETTES[paletteName];
    const off = document.createElement("canvas");
    off.width = map.w * TILE_PX;
    off.height = map.h * TILE_PX;
    const octx = off.getContext("2d");
    if (!octx) throw new Error("Canvas offscreen indisponible");
    octx.fillStyle = palette[0];
    octx.fillRect(0, 0, off.width, off.height);
    octx.font = `${TILE_PX - 2}px "DejaVu Sans Mono", monospace`;
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const i = y * map.w + x;
        const id = map.layers.overlay[i] || map.layers.structure[i] || map.layers.ground[i];
        const def = TILESET.get(id);
        if (!def || def.glyph === " ") continue;
        octx.fillStyle = palette[def.colorRole];
        octx.fillText(def.glyph, x * TILE_PX + TILE_PX / 2, y * TILE_PX + TILE_PX / 2 + 1);
      }
    }
    this.offscreen = off;
  }

  draw(camera: Camera): void {
    const { ctx, canvas } = this;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!this.offscreen || !this.map) return;
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.drawImage(this.offscreen, -camera.x, -camera.y);
    ctx.restore();
  }
}
