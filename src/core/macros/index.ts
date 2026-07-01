// Macros : prefabs déclarés en ASCII multiligne — les "briques Lego".
// Chaque caractère de la grille pointe vers une cellule (sol/structure/overlay)
// dans la légende ; ' ' laisse la carte intacte.

import type { MapData } from "../../shared/types";

export interface MacroCell {
  ground?: number;
  structure?: number;
  overlay?: number;
}

export interface Macro {
  id: string;
  tags: string[];
  grid: string[];
  legend: Record<string, MacroCell>;
}

export function macroSize(m: Macro): { w: number; h: number } {
  return { w: Math.max(...m.grid.map((r) => r.length)), h: m.grid.length };
}

/** Rotation 90° horaire — pour orienter checkpoints et portails. */
export function rotateMacro(m: Macro): Macro {
  const { w, h } = macroSize(m);
  const rows: string[] = [];
  for (let x = 0; x < w; x++) {
    let row = "";
    for (let y = h - 1; y >= 0; y--) row += m.grid[y][x] ?? " ";
    rows.push(row);
  }
  return { ...m, id: `${m.id}:r`, grid: rows };
}

/** Pose la macro sur la carte en (x0,y0). Ignore ce qui déborde. */
export function stampMacro(map: MapData, m: Macro, x0: number, y0: number): void {
  for (let dy = 0; dy < m.grid.length; dy++) {
    const row = m.grid[dy];
    for (let dx = 0; dx < row.length; dx++) {
      const ch = row[dx];
      if (ch === " ") continue;
      const cell = m.legend[ch];
      if (!cell) throw new Error(`Macro ${m.id} : caractère '${ch}' absent de la légende`);
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < 0 || y < 0 || x >= map.w || y >= map.h) continue;
      const i = y * map.w + x;
      if (cell.ground !== undefined) map.layers.ground[i] = cell.ground;
      if (cell.structure !== undefined) map.layers.structure[i] = cell.structure;
      if (cell.overlay !== undefined) map.layers.overlay[i] = cell.overlay;
    }
  }
}

/** Vérifie que la zone d'accueil ne contient aucune structure. */
export function areaIsFree(map: MapData, x0: number, y0: number, w: number, h: number): boolean {
  if (x0 < 0 || y0 < 0 || x0 + w > map.w || y0 + h > map.h) return false;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (map.layers.structure[y * map.w + x] !== 0) return false;
    }
  }
  return true;
}
