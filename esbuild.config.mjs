// Builds main.js and styles.css at the repository root from src/.
// src/kit/ is a copy of vorgan-kit: edit it there, not here.
import esbuild from "esbuild";
import fs from "node:fs";

await esbuild.build({
  entryPoints: ["src/main.js"],
  bundle: true,
  outfile: "main.js",
  format: "cjs",
  platform: "node",
  target: "es2022",
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  logLevel: "info",
});

fs.writeFileSync("styles.css", [fs.readFileSync("src/styles.css", "utf8").trim(), fs.readFileSync("src/kit/kit.css", "utf8").trim()].join("\n\n") + "\n");
