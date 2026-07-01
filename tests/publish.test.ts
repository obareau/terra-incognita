import { generate, DEFAULT_PARAMS } from "../src/core/generate";
import { buildPublication, formatMarker, parseMarker, upsertMarker, TI_TAG } from "../src/core/atlas/publish";

describe("publication carte → Atlas", () => {
  const map = generate("city", "sigma-7", { ...DEFAULT_PARAMS, cguDensity: 0.8, ambiance: "militaire" });
  map.atlasRef = { nodeId: "sigma-7", label: "Sigma-7" };

  test("construit des nœuds POI stables, reliés au parent en 'membre'", () => {
    const pub = buildPublication(map, new Set());
    expect(pub.parentId).toBe("sigma-7");
    expect(pub.nodes.length).toBeGreaterThan(0);
    for (const n of pub.nodes) {
      expect(n.id.startsWith("sigma-7-ti-")).toBe(true);
      expect(n.category).toBe("lieu");
      expect(n.tags.map((t) => t.name)).toContain(TI_TAG);
    }
    for (const r of pub.relations) {
      expect(r.target).toBe("sigma-7");
      expect(r.rel_type).toBe("membre");
      expect(r.metadata.origin).toBe(TI_TAG);
    }
  });

  test("re-publication : les ids existants ne sont pas recréés", () => {
    const first = buildPublication(map, new Set());
    const again = buildPublication(map, new Set(first.nodes.map((n) => n.id)));
    expect(again.nodes.length).toBe(0);
    // Les relations restent (idempotentes côté API).
    expect(again.relations.length).toBe(first.relations.length);
  });

  test("ids déterministes entre deux constructions", () => {
    const a = buildPublication(map, new Set());
    const b = buildPublication(map, new Set());
    expect(a.nodes.map((n) => n.id)).toEqual(b.nodes.map((n) => n.id));
  });

  test("carte non ancrée → erreur", () => {
    const free = generate("city", "libre", DEFAULT_PARAMS);
    expect(() => buildPublication(free, new Set())).toThrow(/ancrée/);
  });
});

describe("marqueur canonique [terra-incognita]", () => {
  const map = generate("interior", "bunker-9", { ...DEFAULT_PARAMS, ambiance: "militaire" });
  map.atlasRef = { nodeId: "sigma-7", label: "Sigma-7" };

  test("aller-retour format → parse", () => {
    const canon = parseMarker(formatMarker(map));
    expect(canon).not.toBeNull();
    expect(canon!.seed).toBe("bunker-9");
    expect(canon!.scale).toBe("interior");
    expect(canon!.params).toEqual(map.params);
  });

  test("upsert : ajoute puis remplace sans dupliquer", () => {
    const lore = "Sigma-7, la Place du Marché de la Guerre.";
    const once = upsertMarker(lore, formatMarker(map));
    expect(once).toContain(lore);
    expect(once).toContain("[terra-incognita]");
    const other = generate("interior", "bunker-10", DEFAULT_PARAMS);
    const twice = upsertMarker(once, formatMarker(other));
    expect(twice.match(/\[terra-incognita\]/g)?.length).toBe(1);
    expect(parseMarker(twice)!.seed).toBe("bunker-10");
    expect(twice).toContain(lore);
  });

  test("notes sans marqueur ou marqueur corrompu → null", () => {
    expect(parseMarker("du lore ordinaire")).toBeNull();
    expect(parseMarker("[terra-incognita] {pas du json")).toBeNull();
    expect(parseMarker(undefined)).toBeNull();
  });
});
