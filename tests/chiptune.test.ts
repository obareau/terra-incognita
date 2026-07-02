import { buildSong, TRACKS_PER_MAP } from "../src/renderer/chiptune";

describe("jukebox chiptune", () => {
  test("même seed + même piste → même morceau (déterminisme)", () => {
    const a = buildSong("sigma-7", "militaire", 0);
    const b = buildSong("sigma-7", "militaire", 0);
    expect(a).toEqual(b);
  });

  test("les pistes d'une même carte sont des morceaux différents", () => {
    const genres = new Set<string>();
    for (let t = 0; t < TRACKS_PER_MAP; t++) {
      genres.add(buildSong("sigma-7", "militaire", t).genre);
    }
    expect(genres.size).toBe(TRACKS_PER_MAP);
  });

  test("chaque ambiance ouvre sur un genre qui lui colle", () => {
    expect(buildSong("x", "militaire", 0).genre).toBe("marche");
    expect(buildSong("x", "clandestin", 0).genre).toBe("blues");
    expect(buildSong("x", "industriel", 0).genre).toBe("drone");
    expect(buildSong("x", "ruine", 0).genre).toBe("requiem");
  });

  test("le requiem est lent et grave", () => {
    const r = buildSong("x", "ruine", 0);
    expect(r.genre).toBe("requiem");
    expect(r.tempo).toBeLessThanOrEqual(56);
    expect(r.melodyWave).toBe("triangle");
  });

  test("structure : 4 patterns enchaînés en couplets/refrains", () => {
    const s = buildSong("terre", "neutre", 1);
    expect(s.patterns.length).toBe(4);
    expect(s.order.length).toBeGreaterThanOrEqual(8);
    for (const idx of s.order) expect(idx).toBeLessThan(s.patterns.length);
    // Le refrain (pattern 2) est transposé : au moins une note diffère du couplet.
    expect(s.patterns[2].melody).not.toEqual(s.patterns[0].melody);
  });

  test("le blues clandestin traîne (swing), la marche est droite", () => {
    expect(buildSong("x", "clandestin", 0).swing).toBeGreaterThan(0.2);
    expect(buildSong("x", "militaire", 0).swing).toBe(0);
  });
});
