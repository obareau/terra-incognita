import { app, BrowserWindow, dialog, ipcMain } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import { loadAtlas } from "./atlas/client";

/** Mode vérification : --screenshot=/chemin.png capture la fenêtre puis quitte. */
const screenshotPath = process.argv.find((a) => a.startsWith("--screenshot="))?.slice("--screenshot=".length);

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0a0f0a",
    title: "Terra-Incognita — ROBOTARIIS",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  void win.loadFile(path.join(__dirname, "index.html"));
  if (screenshotPath) {
    win.webContents.once("did-finish-load", () => {
      setTimeout(async () => {
        const img = await win.webContents.capturePage();
        fs.writeFileSync(screenshotPath, img.toPNG());
        app.quit();
      }, 2500);
    });
  }
}

function registerIpc(): void {
  ipcMain.handle("atlas:load", async () => {
    return loadAtlas(app.getPath("userData"));
  });

  ipcMain.handle("export:saveText", async (_e, defaultName: string, content: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({ defaultPath: defaultName });
    if (canceled || !filePath) return null;
    fs.writeFileSync(filePath, content, "utf-8");
    return filePath;
  });

  ipcMain.handle("export:savePng", async (_e, defaultName: string, dataUrl: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: "PNG", extensions: ["png"] }],
    });
    if (canceled || !filePath) return null;
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
    return filePath;
  });

  ipcMain.handle("export:openJson", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      filters: [{ name: "Carte Terra-Incognita", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (canceled || filePaths.length === 0) return null;
    return fs.readFileSync(filePaths[0], "utf-8");
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
