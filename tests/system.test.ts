import { generateSystem } from "../src/core/gen/system";
import { childScale, DEFAULT_PARAMS } from "../src/core/generate";

// Pas de tuiles à cette échelle (layers vides) — le déterminisme se mesure
// sur pois/stars directement, pas via un hash des calques comme les autres
// échelles (cf. tests/determinism.test.ts).

describe("génération de système stellaire", () => {
  test("même seed → système identique (étoiles + planètes)", () => {
    const a = generateSystem("sigma-7", DEFAULT_PARAMS);
    const b = generateSystem("sigma-7", DEFAULT_PARAMS);
    expect(a.stars).toEqual(b.stars);
    expect(a.pois).toEqual(b.pois);
  });

  test("seeds différentes → systèmes différents", () => {
    const a = generateSystem("sigma-7", DEFAULT_PARAMS);
    const b = generateSystem("port-alpha", DEFAULT_PARAMS);
    expect(a.stars).not.toEqual(b.stars);
  });

  test("nomenclature : simple = nom nu, double/triple = suffixe A/B/C", () => {
    // Balaie plusieurs seeds pour trouver un exemple de chaque cardinalité
    // (le nombre d'étoiles est aléatoire-seedé, pas un param direct).
    const found = { 1: false, 2: false, 3: false };
    for (let i = 0; i < 200 && !(found[1] && found[2] && found[3]); i++) {
      const map = generateSystem(`seed-${i}`, DEFAULT_PARAMS);
      const n = map.stars!.length as 1 | 2 | 3;
      found[n] = true;
      if (n === 1) expect(map.stars![0].name).not.toMatch(/ [ABC]$/);
      else map.stars!.forEach((s, idx) => expect(s.name.endsWith(` ${["A", "B", "C"][idx]}`)).toBe(true));
    }
    expect(found[1]).toBe(true);
    expect(found[2]).toBe(true);
    // Triple est rare (8%) — pas garanti sur 200 tirages, non vérifié en dur.
  });

  test("3 à 7 planètes, numérotées en chiffres romains par ordre de distance", () => {
    const map = generateSystem("sigma-7", DEFAULT_PARAMS);
    expect(map.pois.length).toBeGreaterThanOrEqual(3);
    expect(map.pois.length).toBeLessThanOrEqual(7);
    expect(map.pois[0].label).toMatch(/ I$/);
  });

  test("chaque planète porte un planetType propagé via poi.params", () => {
    const map = generateSystem("sigma-7", DEFAULT_PARAMS);
    for (const poi of map.pois) {
      expect(["tellurique", "oceanique", "glaciale", "gazeuse"]).toContain(poi.params?.planetType);
    }
  });

  test("descente : système → planète", () => {
    expect(childScale("system", "planete")).toBe("planet");
  });
});
