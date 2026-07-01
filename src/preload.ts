import { contextBridge, ipcRenderer } from "electron";
import type { TerraApi } from "./shared/types";

const api: TerraApi = {
  atlas: {
    load: () => ipcRenderer.invoke("atlas:load"),
  },
  export: {
    saveText: (defaultName, content) => ipcRenderer.invoke("export:saveText", defaultName, content),
    savePng: (defaultName, dataUrl) => ipcRenderer.invoke("export:savePng", defaultName, dataUrl),
    openJson: () => ipcRenderer.invoke("export:openJson"),
  },
};

contextBridge.exposeInMainWorld("terra", api);
