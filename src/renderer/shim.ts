// Shim navigateur : quand l'app tourne hors Electron (démo GitHub Pages),
// window.terra n'existe pas — on fournit des équivalents web.
// L'Atlas est une appli locale privée : la version web tourne en mode libre.

import type { TerraApi } from "../shared/types";

function download(name: string, href: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

export function installBrowserShim(): void {
  if (window.terra) return; // Electron : le preload a déjà posé l'API.
  // Version web : le lien vers la Radio Robotariis a du sens ici.
  document.getElementById("radioLink")?.removeAttribute("hidden");
  const shim: TerraApi = {
    atlas: {
      load: async () => ({ online: false, fromCache: false, graph: null }),
      publish: async () => ({
        ok: false, createdNodes: 0, skippedNodes: 0, relations: 0, parentUpdated: false,
        error: "version web : l'Atlas est une appli locale (utilisez l'app desktop)",
      }),
    },
    export: {
      saveText: async (name, content) => {
        const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
        download(name, url);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        return name;
      },
      savePng: async (name, dataUrl) => {
        download(name, dataUrl);
        return name;
      },
      openJson: () =>
        new Promise((resolve) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".json,application/json";
          input.onchange = () => {
            const f = input.files?.[0];
            if (!f) return resolve(null);
            f.text().then(resolve, () => resolve(null));
          };
          input.oncancel = () => resolve(null);
          input.click();
        }),
    },
  };
  window.terra = shim;
}
