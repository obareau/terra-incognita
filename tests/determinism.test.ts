import { generate, DEFAULT_PARAMS } from "../src/core/generate";
import type { MapData, Scale } from "../src/shared/types";

function hashMap(map: MapData): number {
  let h = 2166136261;
  for (const layer of [map.layers.ground, map.layers.structure, map.layers.overlay]) {
    for (let i = 0; i < layer.length; i++) {
      h = Math.imul(h ^ layer[i], 16777619);
    }
  }
  return h >>> 0;
}

const scales: Scale[] = ["planet", "region", "city", "interior"];

describe("déterminisme de la génération", () => {
  for (const scale of scales) {
    test(`${scale} : même seed → carte identique`, () => {
      const a = generate(scale, "sigma-7", DEFAULT_PARAMS);
      const b = generate(scale, "sigma-7", DEFAULT_PARAMS);
      expect(hashMap(a)).toBe(hashMap(b));
      expect(a.pois).toEqual(b.pois);
    });

    test(`${scale} : seeds différentes → cartes différentes`, () => {
      const a = generate(scale, "sigma-7", DEFAULT_PARAMS);
      const b = generate(scale, "port-alpha", DEFAULT_PARAMS);
      expect(hashMap(a)).not.toBe(hashMap(b));
    });
  }

  test("les params influencent la carte (cguDensity)", () => {
    const calm = generate("city", "terre", { ...DEFAULT_PARAMS, cguDensity: 0 });
    const siege = generate("city", "terre", { ...DEFAULT_PARAMS, cguDensity: 1 });
    expect(hashMap(calm)).not.toBe(hashMap(siege));
  });
});
