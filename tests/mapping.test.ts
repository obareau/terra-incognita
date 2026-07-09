import { mapNodeToParams, CGU_ID } from "../src/core/atlas/mapping";
import type { AtlasGraph, AtlasNode } from "../src/shared/types";

function makeGraph(nodes: AtlasNode[], links: AtlasGraph["links"]): AtlasGraph {
  return { nodes, links };
}

const cgu: AtlasNode = { id: CGU_ID, label: "C.G.U.", category: "faction", tags: [] };
const voile: AtlasNode = { id: "voile-ombre", label: "Voile d'Ombre", category: "faction", tags: [] };

describe("mapping Atlas → GenParams", () => {
  test("station membre du C.G.U. → densité élevée, échelle intérieur", () => {
    const node: AtlasNode = {
      id: "sigma-7", label: "Sigma-7", category: "lieu",
      tags: ["station-orbitale", "marche-militaire"],
    };
    const graph = makeGraph([node, cgu], [
      { source: "sigma-7", target: CGU_ID, rel_type: "membre" },
    ]);
    const mapped = mapNodeToParams(node, graph);
    expect(mapped.scale).toBe("interior");
    expect(mapped.params.cguDensity).toBeGreaterThan(0.6);
    expect(mapped.params.factions).toContain(CGU_ID);
  });

  test("repaire du Voile d'Ombre → ambiance clandestine, C.G.U. faible", () => {
    const node: AtlasNode = {
      id: "anciens-docks", label: "Anciens Docks", category: "lieu",
      tags: ["voile-ombre", "clandestin"],
    };
    const graph = makeGraph([node, voile], [
      { source: "anciens-docks", target: "voile-ombre", rel_type: "membre" },
    ]);
    const mapped = mapNodeToParams(node, graph);
    expect(mapped.params.ambiance).toBe("clandestin");
    expect(mapped.params.cguDensity).toBeLessThan(0.3);
  });

  test("planète → échelle planète", () => {
    const node: AtlasNode = { id: "terre", label: "Terre", category: "planete", tags: [] };
    const mapped = mapNodeToParams(node, makeGraph([node], []));
    expect(mapped.scale).toBe("planet");
  });

  test("système → échelle système", () => {
    const node: AtlasNode = { id: "sigma", label: "Sigma", category: "systeme", tags: [] };
    const mapped = mapNodeToParams(node, makeGraph([node], []));
    expect(mapped.scale).toBe("system");
  });

  test("planète taguée glace → planetType glaciale", () => {
    const node: AtlasNode = { id: "hoth", label: "Hoth", category: "planete", tags: ["glace"] };
    const mapped = mapNodeToParams(node, makeGraph([node], []));
    expect(mapped.scale).toBe("planet");
    expect(mapped.params.planetType).toBe("glaciale");
  });

  test("factions ennemies présentes → zones contestées possibles", () => {
    const node: AtlasNode = { id: "helion-4", label: "Helion-4", category: "lieu", tags: [] };
    const graph = makeGraph([node, cgu, voile], [
      { source: "helion-4", target: CGU_ID, rel_type: "allie" },
      { source: "helion-4", target: "voile-ombre", rel_type: "ennemi" },
    ]);
    const mapped = mapNodeToParams(node, graph);
    expect(mapped.params.factions.length).toBeGreaterThanOrEqual(2);
  });
});
