import { PLANET_TYPES, resolvePlanetType, biomeTileAt } from "../src/core/planet/types";
import { generatePlanet } from "../src/core/gen/planet";
import { generateRegion } from "../src/core/gen/region";
import { childScale, DEFAULT_PARAMS } from "../src/core/generate";
import { T } from "../src/core/tiles/tileset";

function countTile(buf: Uint16Array, id: number): number {
  let n = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === id) n++;
  return n;
}

describe("types de planète — climat/météo", () => {
  test("tellurique reproduit exactement les constantes historiques de region.ts", () => {
    const t = PLANET_TYPES.tellurique;
    expect(t.waterLevel).toBe(0.38);
    expect(t.beachLevel).toBe(0.42);
    expect(t.rockLevel).toBe(0.74);
    expect(t.humidityBias).toBe(0);
  });

  test("l'override manuel (params.planetType) prime, sinon tellurique par défaut", () => {
    expect(resolvePlanetType({}).id).toBe("tellurique");
    expect(resolvePlanetType({ planetType: "glaciale" }).id).toBe("glaciale");
    expect(resolvePlanetType({ planetType: "inconnu" }).id).toBe("tellurique");
  });

  test("région sans planetType === région avec planetType tellurique explicite (no-op garanti)", () => {
    const a = generateRegion("sigma-7", DEFAULT_PARAMS);
    const b = generateRegion("sigma-7", { ...DEFAULT_PARAMS, planetType: "tellurique" });
    expect(Buffer.from(a.layers.ground.buffer).equals(Buffer.from(b.layers.ground.buffer))).toBe(true);
  });

  test("région glaciale : neige présente, aucune forêt", () => {
    const glaciale = generateRegion("sigma-7", { ...DEFAULT_PARAMS, planetType: "glaciale" });
    expect(countTile(glaciale.layers.ground, T.SNOW)).toBeGreaterThan(0);
    expect(countTile(glaciale.layers.structure, T.TREE)).toBe(0);
  });

  test("région océanique : nettement plus d'eau qu'une région tellurique, même seed", () => {
    const tellurique = generateRegion("sigma-7", DEFAULT_PARAMS);
    const oceanique = generateRegion("sigma-7", { ...DEFAULT_PARAMS, planetType: "oceanique" });
    expect(countTile(oceanique.layers.ground, T.WATER)).toBeGreaterThan(countTile(tellurique.layers.ground, T.WATER));
  });

  test("biomeTileAt : délabrement indépendant du climat", () => {
    const t = PLANET_TYPES.tellurique;
    // Élévation/humidité neutres (terrain normal), ruin élevé → cendre/friche
    // quelle que soit la planète.
    expect(biomeTileAt(t, 0.6, 0.6, 0.1, 1)).toBe(T.ASH);
  });
});

describe("échelle planète", () => {
  test("même seed → carte identique (déterminisme)", () => {
    const a = generatePlanet("sigma-7", DEFAULT_PARAMS);
    const b = generatePlanet("sigma-7", DEFAULT_PARAMS);
    expect(Buffer.from(a.layers.ground.buffer).equals(Buffer.from(b.layers.ground.buffer))).toBe(true);
    expect(a.pois).toEqual(b.pois);
  });

  test("chaque type de planète reste déterministe", () => {
    for (const id of Object.keys(PLANET_TYPES)) {
      const a = generatePlanet("det", { ...DEFAULT_PARAMS, planetType: id });
      const b = generatePlanet("det", { ...DEFAULT_PARAMS, planetType: id });
      expect(Buffer.from(a.layers.ground.buffer).equals(Buffer.from(b.layers.ground.buffer))).toBe(true);
    }
  });

  test("descente : continent → région, avant-poste → intérieur direct", () => {
    expect(childScale("planet", "continent")).toBe("region");
    expect(childScale("planet", "avant-poste")).toBe("interior");
  });

  test("une géante gazeuse quasi inhabitable garde au moins un avant-poste", () => {
    const map = generatePlanet("gaz-7", { ...DEFAULT_PARAMS, planetType: "gazeuse", cguDensity: 0 });
    expect(map.pois.some((p) => p.kind === "avant-poste")).toBe(true);
  });
});
