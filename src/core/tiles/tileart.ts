// Pixel art procédural : chaque recette dessine un tile 16×16 en indices
// de palette 0–3 ; 255 = pixel transparent (pour les tiles de structure
// posés au-dessus du sol).

import type { Rng } from "../rng";
import { rngFor } from "../rng";

export const TILE_PX = 16;
export const TRANSPARENT = 255;

export type ArtBuf = Uint8Array;
export type ArtRecipe = (rng: Rng, variant: number) => ArtBuf;

// ── Helpers de dessin ────────────────────────────────────────────────

export function buf(fillValue: number = TRANSPARENT): ArtBuf {
  return new Uint8Array(TILE_PX * TILE_PX).fill(fillValue);
}

export function set(b: ArtBuf, x: number, y: number, v: number): void {
  if (x >= 0 && x < TILE_PX && y >= 0 && y < TILE_PX) b[y * TILE_PX + x] = v;
}

export function rect(b: ArtBuf, x0: number, y0: number, w: number, h: number, v: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(b, x, y, v);
}

export function hline(b: ArtBuf, x0: number, x1: number, y: number, v: number): void {
  for (let x = x0; x <= x1; x++) set(b, x, y, v);
}

export function vline(b: ArtBuf, x: number, y0: number, y1: number, v: number): void {
  for (let y = y0; y <= y1; y++) set(b, x, y, v);
}

/** Mouchetis : pose `count` pixels de valeur `v` au hasard. */
export function speckle(b: ArtBuf, rng: Rng, v: number, count: number): void {
  for (let i = 0; i < count; i++) {
    set(b, Math.floor(rng() * TILE_PX), Math.floor(rng() * TILE_PX), v);
  }
}

/** Tramage en damier (dither) de valeur `v`, une case sur `step`. */
export function dither(b: ArtBuf, v: number, step: number = 2): void {
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      if ((x + y) % step === 0) set(b, x, y, v);
    }
  }
}

// Directions du bitmask autotile : N=1, E=2, S=4, W=8.
export const N = 1, E = 2, S = 4, W = 8;

// ── Recettes : sols ──────────────────────────────────────────────────

export const artGrass: ArtRecipe = (rng) => {
  const b = buf(1);
  speckle(b, rng, 2, 14);
  speckle(b, rng, 0, 5);
  return b;
};

export const artDirt: ArtRecipe = (rng) => {
  const b = buf(1);
  speckle(b, rng, 0, 12);
  speckle(b, rng, 2, 4);
  return b;
};

export const artSand: ArtRecipe = (rng) => {
  const b = buf(2);
  speckle(b, rng, 1, 10);
  speckle(b, rng, 3, 3);
  return b;
};

export const artWater: ArtRecipe = (rng) => {
  const b = buf(0);
  for (let y = 2; y < TILE_PX; y += 5) {
    const off = Math.floor(rng() * 4);
    hline(b, off, off + 5, y, 1);
    hline(b, off + 8, off + 11, y + 2, 1);
  }
  speckle(b, rng, 2, 2);
  return b;
};

export const artRock: ArtRecipe = (rng) => {
  const b = buf(1);
  // Arête diagonale éclairée, pied ombré.
  for (let i = 0; i < TILE_PX; i++) {
    set(b, i, TILE_PX - 1 - i, 2);
    set(b, i, TILE_PX - i, 0);
  }
  speckle(b, rng, 2, 6);
  speckle(b, rng, 3, 2);
  return b;
};

export const artWaste: ArtRecipe = (rng) => {
  const b = buf(1);
  speckle(b, rng, 0, 22);
  // Fissures.
  const x0 = Math.floor(rng() * 12);
  for (let i = 0; i < 8; i++) set(b, x0 + (i >> 1), 4 + i, 0);
  return b;
};

export const artAsh: ArtRecipe = (rng) => {
  const b = buf(0);
  speckle(b, rng, 1, 18);
  speckle(b, rng, 2, 4);
  return b;
};

export const artRoad: ArtRecipe = (rng, variant) => {
  const b = buf(0);
  speckle(b, rng, 1, 8);
  const c = TILE_PX / 2;
  // Ligne médiane pointillée vers chaque direction connectée.
  const dash = (x: number, y: number, i: number): void => {
    if (i % 4 < 2) set(b, x, y, 2);
  };
  if (variant & N) for (let y = 0; y < c; y++) dash(c, y, y);
  if (variant & S) for (let y = c; y < TILE_PX; y++) dash(c, y, y);
  if (variant & E) for (let x = c; x < TILE_PX; x++) dash(x, c, x);
  if (variant & W) for (let x = 0; x < c; x++) dash(x, c, x);
  if (variant === 0) hline(b, 6, 9, c, 2);
  return b;
};

export const artPlaza: ArtRecipe = (rng) => {
  const b = buf(1);
  for (let i = 0; i < TILE_PX; i += 4) {
    hline(b, 0, TILE_PX - 1, i, 0);
    vline(b, i, 0, TILE_PX - 1, 0);
  }
  speckle(b, rng, 2, 5);
  return b;
};

export const artFloorConc: ArtRecipe = (rng) => {
  const b = buf(1);
  dither(b, 2, 6);
  speckle(b, rng, 0, 3);
  return b;
};

export const artFloorMetal: ArtRecipe = () => {
  const b = buf(1);
  hline(b, 0, TILE_PX - 1, 0, 0);
  vline(b, 0, 0, TILE_PX - 1, 0);
  // Rivets aux coins de plaque.
  for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]] as const) set(b, x, y, 2);
  return b;
};

export const artRubble: ArtRecipe = (rng) => {
  const b = buf(0);
  for (let i = 0; i < 7; i++) {
    rect(b, Math.floor(rng() * 13), Math.floor(rng() * 13), 2 + Math.floor(rng() * 3), 2, rng() < 0.5 ? 1 : 2);
  }
  return b;
};

// ── Recettes : structures (murs autotile, bâtiments, mobilier) ───────

/** Mur béton : briques + arêtes marquées sur les côtés non connectés. */
export const artWall: ArtRecipe = (rng, variant) => {
  const b = buf(2);
  // Assises de briques.
  for (let y = 3; y < TILE_PX; y += 4) {
    hline(b, 0, TILE_PX - 1, y, 0);
    const off = (y % 8 === 3) ? 4 : 0;
    for (let x = off; x < TILE_PX; x += 8) vline(b, x, y - 3, y - 1, 0);
  }
  speckle(b, rng, 1, 4);
  if (!(variant & N)) { hline(b, 0, TILE_PX - 1, 0, 3); hline(b, 0, TILE_PX - 1, 1, 3); }
  if (!(variant & S)) hline(b, 0, TILE_PX - 1, TILE_PX - 1, 0);
  if (!(variant & W)) vline(b, 0, 0, TILE_PX - 1, 0);
  if (!(variant & E)) vline(b, TILE_PX - 1, 0, TILE_PX - 1, 0);
  return b;
};

export const artWallMetal: ArtRecipe = (rng, variant) => {
  const b = buf(1);
  for (let y = 0; y < TILE_PX; y += 8) hline(b, 0, TILE_PX - 1, y, 0);
  for (const [x, y] of [[2, 2], [13, 2], [2, 10], [13, 10]] as const) set(b, x, y, 3);
  speckle(b, rng, 2, 3);
  if (!(variant & N)) hline(b, 0, TILE_PX - 1, 0, 2);
  if (!(variant & W)) vline(b, 0, 0, TILE_PX - 1, 0);
  if (!(variant & E)) vline(b, TILE_PX - 1, 0, TILE_PX - 1, 0);
  if (!(variant & S)) hline(b, 0, TILE_PX - 1, TILE_PX - 1, 0);
  return b;
};

export const artFence: ArtRecipe = (_rng, variant) => {
  const b = buf();
  const c = TILE_PX / 2;
  // Grillage : poteau central + traverses vers les connexions.
  vline(b, c, 3, TILE_PX - 1, 2);
  if (variant & E) { hline(b, c, TILE_PX - 1, 5, 2); hline(b, c, TILE_PX - 1, 9, 1); }
  if (variant & W) { hline(b, 0, c, 5, 2); hline(b, 0, c, 9, 1); }
  if (variant & N) vline(b, c, 0, 3, 2);
  if (variant & S) vline(b, c, TILE_PX - 4, TILE_PX - 1, 2);
  set(b, c, 2, 3);
  return b;
};

export const artDoor: ArtRecipe = () => {
  const b = buf(0);
  rect(b, 2, 1, 12, 14, 2);
  vline(b, 8, 1, 14, 0);
  set(b, 6, 8, 3);
  set(b, 10, 8, 3);
  return b;
};

/** Porte blindée C.G.U. : chevrons de danger. */
export const artGate: ArtRecipe = () => {
  const b = buf(1);
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      if (((x + y) & 7) < 4) set(b, x, y, 0);
      else set(b, x, y, 3);
    }
  }
  rect(b, 0, 6, TILE_PX, 4, 1);
  hline(b, 2, 13, 8, 0);
  return b;
};

export const artRoofHab: ArtRecipe = (rng, variant) => {
  const b = buf(2);
  // Hachures de toit.
  for (let y = 2; y < TILE_PX; y += 3) hline(b, 1, TILE_PX - 2, y, 1);
  if (rng() < 0.3) rect(b, 10, 3, 3, 3, 3); // lucarne
  if (!(variant & N)) hline(b, 0, TILE_PX - 1, 0, 3);
  if (!(variant & W)) vline(b, 0, 0, TILE_PX - 1, 0);
  if (!(variant & E)) vline(b, TILE_PX - 1, 0, TILE_PX - 1, 0);
  if (!(variant & S)) hline(b, 0, TILE_PX - 1, TILE_PX - 1, 0);
  return b;
};

export const artRoofInd: ArtRecipe = (rng, variant) => {
  const b = buf(1);
  // Tôle ondulée.
  for (let x = 1; x < TILE_PX; x += 3) vline(b, x, 1, TILE_PX - 2, 2);
  if (rng() < 0.25) { rect(b, 5, 5, 4, 4, 0); set(b, 6, 6, 3); } // cheminée
  if (!(variant & N)) hline(b, 0, TILE_PX - 1, 0, 2);
  if (!(variant & W)) vline(b, 0, 0, TILE_PX - 1, 0);
  if (!(variant & E)) vline(b, TILE_PX - 1, 0, TILE_PX - 1, 0);
  if (!(variant & S)) hline(b, 0, TILE_PX - 1, TILE_PX - 1, 0);
  return b;
};

export const artMirador: ArtRecipe = () => {
  const b = buf();
  // Pieds croisés + plateforme + guérite.
  vline(b, 2, 8, 15, 0);
  vline(b, 13, 8, 15, 0);
  for (let i = 0; i < 6; i++) { set(b, 3 + i, 9 + i, 0); set(b, 12 - i, 9 + i, 0); }
  rect(b, 1, 6, 14, 3, 1);
  rect(b, 4, 1, 8, 5, 2);
  rect(b, 6, 2, 4, 2, 0); // meurtrière
  set(b, 7, 3, 3); // projecteur
  return b;
};

export const artBarrier: ArtRecipe = () => {
  const b = buf();
  // Herse / barrière rayée sur plots.
  rect(b, 1, 12, 3, 4, 1);
  rect(b, 12, 12, 3, 4, 1);
  for (let x = 0; x < TILE_PX; x++) {
    const v = (x & 4) ? 3 : 0;
    set(b, x, 8, v);
    set(b, x, 9, v);
  }
  return b;
};

export const artTree: ArtRecipe = (rng) => {
  const b = buf();
  rect(b, 3, 2, 10, 9, 1);
  rect(b, 5, 1, 6, 11, 1);
  rect(b, 2, 4, 12, 5, 1);
  speckle(b, rng, 2, 10);
  rect(b, 7, 11, 2, 4, 0); // tronc
  for (let x = 2; x < 14; x++) if (rng() < 0.3) set(b, x, 10, 0); // ombre
  return b;
};

export const artLamp: ArtRecipe = () => {
  const b = buf();
  vline(b, 7, 4, 15, 0);
  vline(b, 8, 4, 15, 0);
  rect(b, 5, 1, 6, 3, 3);
  return b;
};

export const artCrate: ArtRecipe = () => {
  const b = buf();
  rect(b, 2, 4, 12, 11, 2);
  rect(b, 2, 4, 12, 1, 3);
  hline(b, 2, 13, 14, 0);
  vline(b, 2, 4, 14, 0);
  vline(b, 13, 4, 14, 0);
  for (let i = 0; i < 10; i++) { set(b, 3 + i, 5 + i, 1); set(b, 12 - i, 5 + i, 1); }
  return b;
};

export const artMachine: ArtRecipe = (rng) => {
  const b = buf();
  rect(b, 1, 2, 14, 13, 1);
  rect(b, 1, 2, 14, 1, 2);
  for (let i = 0; i < 3; i++) set(b, 3 + i * 4, 5, rng() < 0.5 ? 3 : 0); // voyants
  rect(b, 3, 8, 10, 4, 0); // panneau
  hline(b, 4, 11, 10, 2);
  return b;
};

export const artGenerator: ArtRecipe = () => {
  const b = buf();
  rect(b, 2, 3, 12, 12, 2);
  for (let y = 5; y < 14; y += 2) hline(b, 3, 12, y, 0); // bobinage
  set(b, 13, 1, 3); set(b, 12, 2, 3); // étincelle
  vline(b, 13, 3, 3, 0);
  return b;
};

export const artBunk: ArtRecipe = () => {
  const b = buf();
  rect(b, 1, 4, 14, 9, 2);
  rect(b, 2, 5, 4, 7, 3); // oreiller
  hline(b, 1, 14, 13, 0);
  vline(b, 1, 4, 15, 0);
  vline(b, 14, 4, 15, 0);
  return b;
};

export const artTable: ArtRecipe = () => {
  const b = buf();
  rect(b, 2, 5, 12, 6, 2);
  hline(b, 2, 13, 5, 3);
  vline(b, 3, 11, 14, 0);
  vline(b, 12, 11, 14, 0);
  return b;
};

export const artCellBars: ArtRecipe = () => {
  const b = buf();
  for (let x = 2; x < TILE_PX; x += 4) vline(b, x, 0, TILE_PX - 1, 0);
  hline(b, 0, TILE_PX - 1, 2, 1);
  hline(b, 0, TILE_PX - 1, 13, 1);
  return b;
};

export const artStall: ArtRecipe = (rng) => {
  const b = buf();
  // Auvent rayé + comptoir.
  for (let x = 0; x < TILE_PX; x++) {
    const v = (x & 2) ? 3 : 2;
    set(b, x, 2, v); set(b, x, 3, v);
  }
  rect(b, 1, 8, 14, 5, 1);
  hline(b, 1, 14, 8, 2);
  speckle(b, rng, 3, 3);
  return b;
};

export const artTurret: ArtRecipe = () => {
  const b = buf();
  rect(b, 3, 8, 10, 7, 1); // socle
  rect(b, 5, 4, 6, 6, 2);  // dôme
  hline(b, 10, 15, 6, 0);  // canon
  set(b, 7, 5, 3);
  return b;
};

export const artRuinWall: ArtRecipe = (rng) => {
  const b = buf();
  // Mur effondré : hauteur de créneaux aléatoire.
  for (let x = 0; x < TILE_PX; x++) {
    const top = 4 + Math.floor(rng() * 8);
    for (let y = top; y < TILE_PX; y++) set(b, x, y, 2);
    set(b, x, top, 0);
  }
  for (let y = 8; y < TILE_PX; y += 4) hline(b, 0, TILE_PX - 1, y, 0);
  return b;
};

// ── Recettes : overlay (propagande, marqueurs) ───────────────────────

export const artPropaganda: ArtRecipe = (rng) => {
  const b = buf();
  // Affiche claire, cadre sombre, aplat "soleil levant" C.G.U.
  rect(b, 3, 2, 10, 12, 3);
  rect(b, 3, 2, 10, 1, 0);
  rect(b, 3, 13, 10, 1, 0);
  vline(b, 3, 2, 13, 0);
  vline(b, 12, 2, 13, 0);
  for (let i = 0; i < 4; i++) hline(b, 5, 10, 9 + i, i % 2 ? 0 : 1); // texte
  rect(b, 6, 4, 4, 3, rng() < 0.5 ? 1 : 0); // emblème
  return b;
};

export const artGraffiti: ArtRecipe = (rng) => {
  const b = buf();
  let y = 6 + Math.floor(rng() * 4);
  for (let x = 2; x < 14; x++) {
    y += Math.floor(rng() * 3) - 1;
    set(b, x, Math.max(2, Math.min(13, y)), 3);
    if (rng() < 0.3) set(b, x, Math.max(2, Math.min(13, y + 1)), 3);
  }
  return b;
};

export const artBannerCgu: ArtRecipe = () => {
  const b = buf();
  rect(b, 4, 0, 8, 14, 0);
  rect(b, 5, 1, 6, 12, 1);
  // Emblème : cercle barré (l'œil de la Rectitude).
  rect(b, 6, 4, 4, 4, 3);
  set(b, 7, 5, 0); set(b, 8, 5, 0);
  vline(b, 7, 9, 11, 3);
  set(b, 4, 14, 0); set(b, 11, 14, 0); // pointes du fanion
  return b;
};

export const artPoiCity: ArtRecipe = () => {
  const b = buf();
  rect(b, 2, 8, 4, 7, 2);
  rect(b, 7, 5, 4, 10, 3);
  rect(b, 12, 9, 3, 6, 2);
  set(b, 8, 6, 0); set(b, 8, 8, 0); set(b, 8, 10, 0);
  return b;
};

export const artPoiBase: ArtRecipe = () => {
  const b = buf();
  // Chevron militaire.
  for (let i = 0; i < 6; i++) {
    set(b, 2 + i, 10 - i, 3); set(b, 3 + i, 10 - i, 3);
    set(b, 13 - i, 10 - i, 3); set(b, 12 - i, 10 - i, 3);
  }
  hline(b, 2, 13, 12, 0);
  hline(b, 2, 13, 13, 3);
  return b;
};

export const artPoiRuin: ArtRecipe = (rng) => {
  const b = buf();
  rect(b, 3, 6, 10, 8, 1);
  for (let x = 3; x < 13; x++) if (rng() < 0.4) set(b, x, 5 + Math.floor(rng() * 3), 1);
  vline(b, 8, 6, 13, 0);
  return b;
};

export const artContested: ArtRecipe = () => {
  const b = buf();
  // Croix de zone contestée.
  for (let i = 2; i < 14; i++) { set(b, i, i, 3); set(b, i, 15 - i, 3); }
  return b;
};

/** Rend le pixel art d'un tile de façon déterministe (id+variante). */
export function renderTileArt(recipe: ArtRecipe, tileId: number, variant: number): ArtBuf {
  return recipe(rngFor(`tile:${tileId}:v${variant}`, "art"), variant);
}
