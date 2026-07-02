import type { PaletteName } from "../shared/types";

/** Palette 4 tons, du plus sombre (0) au plus clair (3). */
export type Palette = readonly [string, string, string, string];

export const PALETTES: Record<PaletteName, Palette> = {
  // Vert CRT phosphore — écran radar C.G.U. Tons écartés pour un contraste franc.
  phosphore: ["#040804", "#1e4a24", "#5fae4e", "#d8ff9a"],
  // Sépia — carte d'état-major jaunie, encre brune.
  sepia: ["#170e04", "#5e4223", "#c09154", "#ffedc0"],
  // Blueprint — plan technique blanc sur bleu.
  blueprint: ["#040d1c", "#1d4a7d", "#6fa8d8", "#f4faff"],
};

export const PALETTE_NAMES: PaletteName[] = ["phosphore", "sepia", "blueprint"];
