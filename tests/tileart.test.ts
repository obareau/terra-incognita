import { renderTileArt, TILE_PX, TRANSPARENT } from "../src/core/tiles/tileart";
import { TILESET, variantCount } from "../src/core/tiles/tileset";

describe("pixel art procédural", () => {
  test("chaque tile rend un buffer 16×16 valide pour toutes ses variantes", () => {
    for (const def of TILESET.values()) {
      for (let v = 0; v < variantCount(def); v++) {
        const art = renderTileArt(def.art, def.id, v);
        expect(art.length).toBe(TILE_PX * TILE_PX);
        for (const px of art) {
          expect(px === TRANSPARENT || px <= 3).toBe(true);
        }
      }
    }
  });

  test("même tile + même variante → pixels identiques (déterminisme)", () => {
    for (const def of TILESET.values()) {
      const a = renderTileArt(def.art, def.id, 0);
      const b = renderTileArt(def.art, def.id, 0);
      expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    }
  });

  test("les tiles de sol sont opaques", () => {
    for (const def of TILESET.values()) {
      if (def.layer !== "ground") continue;
      const art = renderTileArt(def.art, def.id, 0);
      for (const px of art) expect(px).not.toBe(TRANSPARENT);
    }
  });
});
