import { generateInterior } from "../src/core/gen/interior";
import { DEFAULT_PARAMS } from "../src/core/generate";
import { tileDef } from "../src/core/tiles/tileset";
import type { MapData } from "../src/shared/types";

/** Toutes les cases traversables doivent former une seule composante connexe. */
function walkableComponents(map: MapData): number {
  const passable = (i: number): boolean => {
    const s = map.layers.structure[i];
    return s === 0 || tileDef(s).walkable;
  };
  const seen = new Uint8Array(map.w * map.h);
  let components = 0;
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || !passable(start)) continue;
    components++;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % map.w;
      const y = Math.floor(i / map.w);
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue;
        const ni = ny * map.w + nx;
        if (!seen[ni] && passable(ni)) {
          seen[ni] = 1;
          stack.push(ni);
        }
      }
    }
  }
  return components;
}

describe("génération d'intérieur (BSP)", () => {
  for (const seed of ["bunker-1", "bunker-2", "sigma-7", "qg-cgu"]) {
    test(`${seed} : toutes les salles sont connexes`, () => {
      const map = generateInterior(seed, { ...DEFAULT_PARAMS, ambiance: "militaire" });
      expect(walkableComponents(map)).toBe(1);
    });
  }

  test("l'intérieur militaire utilise des murs métalliques", () => {
    const map = generateInterior("base-x", { ...DEFAULT_PARAMS, ambiance: "militaire" });
    const hasMetal = Array.from(map.layers.structure).some((s) => s === 21);
    expect(hasMetal).toBe(true);
  });
});
