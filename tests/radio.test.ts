import { ambianceForHour, frequencyFor, hourKey, msUntilNextHour, stationSeed } from "../src/radio/logic";

describe("Radio Robotariis — logique de station", () => {
  test("même anniversaire + même heure → même seed (onde partagée)", () => {
    const d = new Date(2026, 6, 2, 21, 12, 33);
    expect(stationSeed("1980-03-14", d)).toBe(stationSeed("1980-03-14", new Date(2026, 6, 2, 21, 59, 59)));
  });

  test("l'onde change à l'heure pile", () => {
    const before = new Date(2026, 6, 2, 21, 59, 59);
    const after = new Date(2026, 6, 2, 22, 0, 1);
    expect(stationSeed("1980-03-14", before)).not.toBe(stationSeed("1980-03-14", after));
  });

  test("deux anniversaires → deux fréquences (et dans la bande FM)", () => {
    const a = parseFloat(frequencyFor("1980-03-14"));
    const b = parseFloat(frequencyFor("1993-11-02"));
    expect(a).not.toBe(b);
    for (const f of [a, b]) {
      expect(f).toBeGreaterThanOrEqual(87.5);
      expect(f).toBeLessThanOrEqual(107.9);
    }
  });

  test("grille des programmes : nuit = requiem/drone, matinée = marches", () => {
    expect(ambianceForHour(3)).toBe("ruine");
    expect(ambianceForHour(10)).toBe("militaire");
    expect(ambianceForHour(15)).toBe("industriel");
    expect(ambianceForHour(20)).toBe("clandestin");
  });

  test("compte à rebours vers l'heure pile", () => {
    const d = new Date(2026, 6, 2, 21, 58, 0);
    expect(msUntilNextHour(d)).toBe(2 * 60 * 1000);
    expect(hourKey(d)).toBe("2026-07-02T21");
  });
});
