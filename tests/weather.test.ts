import { weatherFor } from "../src/core/planet/weather";
import { generateRegion } from "../src/core/gen/region";
import { generatePlanet } from "../src/core/gen/planet";
import { DEFAULT_PARAMS } from "../src/core/generate";

describe("météo courante", () => {
  test("même seed + type → météo identique (déterminisme)", () => {
    const a = weatherFor("sigma-7", "glaciale");
    const b = weatherFor("sigma-7", "glaciale");
    expect(a).toEqual(b);
  });

  test("seeds différentes → météo pas toujours identique", () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) results.add(weatherFor(`seed-${i}`, "tellurique").label);
    expect(results.size).toBeGreaterThan(1);
  });

  test("region/planet portent un champ weather cohérent avec leur planetType", () => {
    const region = generateRegion("sigma-7", { ...DEFAULT_PARAMS, planetType: "glaciale" });
    expect(region.weather).toBeDefined();
    expect(["clair", "neige"]).toContain(region.weather!.overlay);

    const planet = generatePlanet("sigma-7", { ...DEFAULT_PARAMS, planetType: "gazeuse" });
    expect(planet.weather).toBeDefined();
    expect(["orage-ionique", "brume"]).toContain(planet.weather!.overlay);
  });
});
