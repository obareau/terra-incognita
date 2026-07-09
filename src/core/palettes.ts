import type { PaletteName } from "../shared/types";

/**
 * Palette 8 tons max, du plus sombre (0) au plus clair (7).
 * Les tons 0-3 sont les 4 tons historiques, INCHANGÉS (aucune recette de
 * tileart.ts existante ne doit changer d'aspect) ; 4-7 sont des tons
 * additionnels pour donner plus de marge de contraste (ex. distinguer un
 * marqueur POI d'un bâtiment sans qu'ils partagent le même ton "le plus clair").
 */
export type Palette = readonly [string, string, string, string, string, string, string, string];

export const PALETTES: Record<PaletteName, Palette> = {
  // Vert CRT phosphore — écran radar C.G.U. Tons écartés pour un contraste franc.
  phosphore: ["#040804", "#1e4a24", "#5fae4e", "#d8ff9a", "#0a1f0d", "#37653a", "#8ecb63", "#f4ffd6"],
  // Sépia — carte d'état-major jaunie, encre brune.
  sepia: ["#170e04", "#5e4223", "#c09154", "#ffedc0", "#2c1c0a", "#7c5c33", "#d9ab72", "#fff6e0"],
  // Blueprint — plan technique blanc sur bleu.
  blueprint: ["#040d1c", "#1d4a7d", "#6fa8d8", "#f4faff", "#0a2036", "#3168a3", "#94c3e8", "#ffffff"],
};

export const PALETTE_NAMES: PaletteName[] = ["phosphore", "sepia", "blueprint"];
