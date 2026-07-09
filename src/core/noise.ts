// Bruit de valeur fBm maison (zéro dépendance) — partagé entre les échelles
// région et planète.

import type { Rng } from "./rng";

/** Bruit de valeur : grille de gradients aléatoires + interpolation lissée. */
export function makeValueNoise(rng: Rng, gridSize: number): (x: number, y: number) => number {
  const values = new Float32Array(gridSize * gridSize);
  for (let i = 0; i < values.length; i++) values[i] = rng();
  const at = (gx: number, gy: number): number =>
    values[((gy % gridSize + gridSize) % gridSize) * gridSize + ((gx % gridSize + gridSize) % gridSize)];
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    const fx = smooth(x - gx);
    const fy = smooth(y - gy);
    const a = at(gx, gy) * (1 - fx) + at(gx + 1, gy) * fx;
    const b = at(gx, gy + 1) * (1 - fx) + at(gx + 1, gy + 1) * fx;
    return a * (1 - fy) + b * fy;
  };
}

/** fBm : superposition d'octaves de bruit de valeur. */
export function fbm(noise: (x: number, y: number) => number, x: number, y: number, octaves: number): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * f, y * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}
