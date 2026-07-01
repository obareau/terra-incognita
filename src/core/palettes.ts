import type { PaletteName } from "../shared/types";

/** Palette 4 tons, du plus sombre (0) au plus clair (3). */
export type Palette = readonly [string, string, string, string];

export const PALETTES: Record<PaletteName, Palette> = {
  // Vert CRT phosphore — écran radar C.G.U.
  phosphore: ["#0a120a", "#1d3a22", "#4e7d43", "#a8d977"],
  // Sépia — carte d'état-major jaunie, encre brune.
  sepia: ["#241809", "#54402a", "#a07d4a", "#e6d3a3"],
  // Blueprint — plan technique blanc sur bleu.
  blueprint: ["#0b1a30", "#1f4066", "#5585b5", "#dbe9f4"],
};

export const PALETTE_NAMES: PaletteName[] = ["phosphore", "sepia", "blueprint"];
