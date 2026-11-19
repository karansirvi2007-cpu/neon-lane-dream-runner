import { build } from "vite";
import { mkdtemp, writeFile, mkdir, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stage = await mkdtemp(path.join(tmpdir(), "neon-rush-itchio-"));
await writeFile(path.join(stage, "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>NEON RUSH</title><meta name="description" content="NEON RUSH — futuristic 3D endless runner"><link rel="icon" href="./favicon.png"></head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>`);
await writeFile(path.join(stage, "entry.tsx"), `import React from "react";
import { createRoot } from "react-dom/client";
import Scene from "${project}/src/components/game/Scene";
import GameUI from "${project}/src/components/game/GameUI";
import "${project}/src/styles.css";
const root = document.getElementById("root");
if (root) createRoot(root).render(<main className="game-root"><Scene /><GameUI /></main>);`);
const out = path.join(stage, "game");
const { default: react } = await import("@vitejs/plugin-react");
const { default: tailwind } = await import("@tailwindcss/vite");
await build({
  configFile: false, root: stage, base: "./", publicDir: false,
  plugins: [react(), tailwind()],
  resolve: { alias: { "@": path.join(project, "src"), "react": path.join(project, "node_modules/react"), "react-dom": path.join(project, "node_modules/react-dom") }, dedupe: ["react", "react-dom", "three"] },
  build: { outDir: out, emptyOutDir: true },
});
await mkdir(out, { recursive: true });
await copyFile(path.join(project, "public/favicon.png"), path.join(out, "favicon.png"));
await writeFile(path.join(out, "UPLOAD-README.txt"), `NEON RUSH — itch.io HTML5 upload

Upload this ZIP to itch.io, choose Kind of project: HTML, and select This file will be played in the browser.
Suggested viewport: 480 x 850, Mobile friendly; allow fullscreen.
Keep index.html and assets together. The game is bundled locally, not an iframe to Lovable.
Desktop: arrows or WASD, Space to jump, P/Esc to pause. Mobile: swipe.
Sound starts after a click. Settings includes music/effects volume and High/Low graphics.
Paid runners show INR prices but remain locked: payments have not been activated.
Lovable analytics calls are included, but itch.io does not inject the Lovable collector; tracking is available only in the Lovable-hosted app.
Runner portraits are concept artwork; in-game runners use the existing stylized 3D model with corresponding colors.
`);
console.log(`EXPORT_DIRECTORY=${out}`);