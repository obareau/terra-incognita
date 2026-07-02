import { ARCH_STYLES, FACTION_ARCH, resolveStyle, styleFor } from "../src/core/factions/styles";
import { mapNodeToParams, CGU_ID } from "../src/core/atlas/mapping";
import { generateCity } from "../src/core/gen/city";
import { DEFAULT_PARAMS } from "../src/core/generate";
import { T } from "../src/core/tiles/tileset";
import type { AtlasGraph, AtlasNode } from "../src/shared/types";

describe("styles d'architecture par faction", () => {
  test("les factions canon connues ont un archétype", () => {
    for (const id of [CGU_ID, "voile-ombre", "gardiens-des-jardins", "magnats-industriels", "pasteurs-de-la-rectitude", "archivistes-libres"]) {
      expect(FACTION_ARCH[id]).toBeDefined();
    }
  });

  test("la faction dominante (première) impose son style", () => {
    expect(styleFor(["gardiens-des-jardins", CGU_ID]).id).toBe("organique");
    expect(styleFor([CGU_ID, "gardiens-des-jardins"]).id).toBe("martial");
    expect(styleFor(["faction-inconnue", "voile-ombre"]).id).toBe("clandestin");
  });

  test("sans faction connue : martial si le C.G.U. pèse, sinon civique", () => {
    expect(styleFor([], 0.8).id).toBe("martial");
    expect(styleFor([], 0.2).id).toBe("civique");
  });

  test("l'override manuel prime sur les factions", () => {
    const params = { factions: [CGU_ID], cguDensity: 1, archStyle: "organique" };
    expect(resolveStyle(params).id).toBe("organique");
  });

  test("le mapping Atlas trie les factions par dominance (membre > ennemi)", () => {
    const node: AtlasNode = { id: "jardin-x", label: "Jardin X", category: "lieu", tags: [] };
    const gardiens: AtlasNode = { id: "gardiens-des-jardins", label: "Gardiens", category: "faction", tags: [] };
    const cgu: AtlasNode = { id: CGU_ID, label: "C.G.U.", category: "faction", tags: [] };
    const graph: AtlasGraph = {
      nodes: [node, gardiens, cgu],
      links: [
        { source: "jardin-x", target: CGU_ID, rel_type: "ennemi" },
        { source: "jardin-x", target: "gardiens-des-jardins", rel_type: "membre" },
      ],
    };
    const mapped = mapNodeToParams(node, graph);
    expect(mapped.params.factions[0]).toBe("gardiens-des-jardins");
    expect(styleFor(mapped.params.factions).id).toBe("organique");
  });

  test("ville organique : enceinte en grillage et nette dominance d'arbres", () => {
    const base = { ...DEFAULT_PARAMS, cguDensity: 0.8 };
    const organique = generateCity("jardin-7", { ...base, archStyle: "organique" });
    const martial = generateCity("jardin-7", { ...base, archStyle: "martial" });
    // Enceinte : grillage vs métal (coin de courtine, hors portes).
    expect(organique.layers.structure[5]).toBe(T.FENCE);
    expect(martial.layers.structure[5]).toBe(T.WALL_METAL);
    const count = (m: typeof organique, id: number): number =>
      m.layers.structure.reduce((acc, s) => acc + (s === id ? 1 : 0), 0);
    expect(count(organique, T.TREE)).toBeGreaterThan(count(martial, T.TREE) * 2);
  });

  test("chaque archétype reste déterministe", () => {
    for (const id of Object.keys(ARCH_STYLES)) {
      const a = generateCity("det", { ...DEFAULT_PARAMS, archStyle: id });
      const b = generateCity("det", { ...DEFAULT_PARAMS, archStyle: id });
      expect(Buffer.from(a.layers.structure.buffer).equals(Buffer.from(b.layers.structure.buffer))).toBe(true);
    }
  });
});
