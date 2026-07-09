// Vue système stellaire — rendu orbital dédié (pas une grille de tuiles) :
// étoile(s) au centre + planètes en orbite, cliquables. Scène fixe mise à
// l'échelle du canvas (pas de pan/zoom, contrairement à la vue pixel).

import type { MapData, PaletteName, POI, StarInfo } from "../shared/types";
import { PALETTES } from "../core/palettes";

/** Ton de palette (0-7) par type spectral — variété par luminosité, pas teinte,
 * cohérent avec l'esthétique CRT monochrome de l'app. */
const SPECTRAL_TONE: Record<StarInfo["spectralType"], number> = {
  "naine-rouge": 2,
  jaune: 4,
  blanche: 6,
  "geante-bleue": 7,
};

export class SystemView {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private map: MapData | null = null;
  private palette: PaletteName = "phosphore";
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponible");
    this.ctx = ctx;
  }

  setMap(map: MapData, paletteName: PaletteName): void {
    this.map = map;
    this.palette = paletteName;
  }

  private fitTransform(): void {
    if (!this.map) return;
    const sx = this.canvas.width / this.map.w;
    const sy = this.canvas.height / this.map.h;
    this.scale = Math.min(sx, sy) * 0.92;
    this.offsetX = (this.canvas.width - this.map.w * this.scale) / 2;
    this.offsetY = (this.canvas.height - this.map.h * this.scale) / 2;
  }

  private toScreen(x: number, y: number): { x: number; y: number } {
    return { x: this.offsetX + x * this.scale, y: this.offsetY + y * this.scale };
  }

  draw(highlight?: POI | null): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!this.map) return;
    this.fitTransform();
    const tones = PALETTES[this.palette];
    const map = this.map;
    const cx = map.w / 2;
    const cy = map.h / 2;

    // Orbites : anneaux discrets, un par planète (rayon = distance au centre).
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (const poi of map.pois) {
      const r = Math.hypot(poi.x - cx, poi.y - cy) * this.scale;
      const c = this.toScreen(cx, cy);
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Étoile(s) — décalées légèrement si double/triple (barycentre visuel).
    const stars = map.stars ?? [];
    const starGap = 10 * this.scale;
    stars.forEach((star, i) => {
      const dx = (i - (stars.length - 1) / 2) * starGap;
      const p = this.toScreen(cx, cy);
      const tone = tones[SPECTRAL_TONE[star.spectralType]];
      const r = star.radiusPx * this.scale;
      ctx.save();
      // Halo doux.
      const grad = ctx.createRadialGradient(p.x + dx, p.y, 0, p.x + dx, p.y, r * 2.2);
      grad.addColorStop(0, tone);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x + dx, p.y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.arc(p.x + dx, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = tones[3];
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(star.name, p.x + dx, p.y + r + 14);
    });

    // Planètes — petit disque teinté par type + halo si survolée/sélectionnée.
    for (const poi of map.pois) {
      const p = this.toScreen(poi.x, poi.y);
      const isHi = highlight === poi;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isHi ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = tones[isHi ? 7 : 5];
      ctx.fill();
      if (isHi) {
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = tones[3];
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(poi.label, p.x, p.y - 9);
    }
  }

  /** Planète la plus proche du point écran (px,py), dans un rayon de tolérance. */
  findPlanetAt(px: number, py: number): POI | null {
    if (!this.map) return null;
    let best: POI | null = null;
    let bestD = 12; // tolérance de clic en px écran
    for (const poi of this.map.pois) {
      const p = this.toScreen(poi.x, poi.y);
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bestD) { bestD = d; best = poi; }
    }
    return best;
  }

  toPngDataUrl(): string | null {
    return this.canvas.toDataURL("image/png");
  }
}
