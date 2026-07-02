import { ambianceForHour, announcementFor, frequencyFor, hourKey, msUntilNextHour, stationSeed } from "../src/radio/logic";

describe("Radio Robotariis — logique de station", () => {
  test("même anniversaire + même instant exact → même onde", () => {
    const d = new Date(2026, 6, 2, 21, 12, 33);
    expect(stationSeed("1980-03-14", d)).toBe(stationSeed("1980-03-14", new Date(2026, 6, 2, 21, 12, 33)));
  });

  test("rallumer le poste une seconde plus tard → onde nouvelle (sel temporel)", () => {
    const a = stationSeed("1980-03-14", new Date(2026, 6, 2, 21, 12, 33));
    const b = stationSeed("1980-03-14", new Date(2026, 6, 2, 21, 12, 34));
    expect(a).not.toBe(b);
  });

  test("deux anniversaires au même instant → deux ondes", () => {
    const d = new Date(2026, 6, 2, 21, 12, 33);
    expect(stationSeed("1980-03-14", d)).not.toBe(stationSeed("1993-11-02", d));
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

describe("speakerine — annonces", () => {
  test("déterministe : même seed → même annonce", () => {
    expect(announcementFor("radio:x:2026-07-02T21", 0, "marche", 21, "103.3"))
      .toBe(announcementFor("radio:x:2026-07-02T21", 0, "marche", 21, "103.3"));
  });

  test("l'ouverture d'antenne annonce fréquence et heure", () => {
    const a = announcementFor("radio:x:2026-07-02T21", 0, "marche", 21, "103.3");
    expect(a).toContain("103 point 3");
    expect(a).toContain("21 heures");
    expect(a).toContain("Radio Robotariis");
  });

  test("les pistes suivantes présentent le genre sans redonner l'heure", () => {
    const a = announcementFor("radio:x:2026-07-02T21", 2, "requiem", 21, "103.3");
    expect(a).not.toContain("heures");
    expect(a.toLowerCase()).toContain("requiem");
  });

  test("grammaire combinatoire : 40 ondes → au moins 30 annonces distinctes", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      seen.add(announcementFor(`radio:x:onde-${i}`, 1, "blues", 21, "103.3"));
    }
    expect(seen.size).toBeGreaterThanOrEqual(30);
  });

  test("tous les trous des gabarits sont remplis (aucune {accolade} ne fuit)", () => {
    for (const genre of ["marche", "hymne", "blues", "berceuse", "drone", "requiem"]) {
      for (let i = 0; i < 20; i++) {
        for (const track of [0, 1]) {
          const a = announcementFor(`radio:g:${i}`, track, genre, 12, "99.9");
          expect(a).not.toMatch(/[{}]/);
        }
      }
    }
  });
});
