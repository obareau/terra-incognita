import { generate, DEFAULT_PARAMS } from "../src/core/generate";
import { fromJson, toAscii, toJson } from "../src/core/serialize";

describe("sérialisation", () => {
  test("aller-retour JSON : carte identique", () => {
    const map = generate("city", "sigma-7", DEFAULT_PARAMS);
    map.atlasRef = { nodeId: "sigma-7", label: "Sigma-7" };
    const restored = fromJson(toJson(map));
    expect(restored.seed).toBe(map.seed);
    expect(restored.scale).toBe(map.scale);
    expect(restored.atlasRef).toEqual(map.atlasRef);
    expect(restored.pois).toEqual(map.pois);
    expect(Array.from(restored.layers.ground)).toEqual(Array.from(map.layers.ground));
    expect(Array.from(restored.layers.structure)).toEqual(Array.from(map.layers.structure));
    expect(Array.from(restored.layers.overlay)).toEqual(Array.from(map.layers.overlay));
  });

  test("export ASCII : bonnes dimensions, glyphes connus", () => {
    const map = generate("interior", "bunker-7", { ...DEFAULT_PARAMS, ambiance: "militaire" });
    const ascii = toAscii(map);
    const rows = ascii.split("\n");
    expect(rows.length).toBe(map.h);
    for (const row of rows) expect([...row].length).toBe(map.w);
    expect(ascii).not.toContain("?");
  });

  test("JSON corrompu → erreur claire", () => {
    expect(() => fromJson("{\"version\":1,\"w\":4,\"h\":4,\"scale\":\"city\",\"seed\":\"x\",\"params\":{},\"layers\":{\"ground\":[0],\"structure\":[],\"overlay\":[]},\"pois\":[]}")).toThrow(/corrompu/);
  });
});
