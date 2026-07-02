import * as esbuild from "esbuild";
import * as fs from "node:fs";

const production = process.argv.includes("--production");
const common = {
  bundle: true,
  sourcemap: !production,
  minify: production,
  logLevel: "info" as const,
};

async function main(): Promise<void> {
  // Processus principal Electron (Node / CommonJS).
  await esbuild.build({
    ...common,
    entryPoints: ["src/main.ts"],
    outfile: "dist/main.js",
    platform: "node",
    format: "cjs",
    external: ["electron"],
  });

  // Preload (pont sécurisé renderer ↔ main).
  await esbuild.build({
    ...common,
    entryPoints: ["src/preload.ts"],
    outfile: "dist/preload.js",
    platform: "node",
    format: "cjs",
    external: ["electron"],
  });

  // Renderer (navigateur : Canvas 2D / Web Audio).
  await esbuild.build({
    ...common,
    entryPoints: ["src/renderer/renderer.ts"],
    outfile: "dist/renderer.js",
    platform: "browser",
    format: "iife",
  });

  fs.mkdirSync("dist", { recursive: true });
  fs.copyFileSync("src/renderer/index.html", "dist/index.html");

  // Démo web (GitHub Pages) : le renderer est du web standard, le shim
  // remplace l'IPC Electron — il suffit d'index.html + renderer.js.
  fs.mkdirSync("dist-web", { recursive: true });
  fs.copyFileSync("src/renderer/index.html", "dist-web/index.html");
  fs.copyFileSync("dist/renderer.js", "dist-web/renderer.js");
  if (!production && fs.existsSync("dist/renderer.js.map")) {
    fs.copyFileSync("dist/renderer.js.map", "dist-web/renderer.js.map");
  }

  // Radio Robotariis — jukebox chiptune web (side project, même moteur).
  await esbuild.build({
    ...common,
    entryPoints: ["src/radio/radio.ts"],
    outfile: "dist-web/radio/radio.js",
    platform: "browser",
    format: "iife",
  });
  fs.copyFileSync("src/radio/index.html", "dist-web/radio/index.html");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
