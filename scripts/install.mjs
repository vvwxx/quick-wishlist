// Copies the built plugin into a vault for testing: npm run install-vault -- ~/path/to/vault
// data.json (the user's settings) is never touched.
import fs from "node:fs";
import path from "node:path";

const vault = process.argv[2];
if (!vault) {
  console.error("Usage: npm run install-vault -- <vault folder>");
  process.exit(1);
}
const target = path.join(vault, ".obsidian/plugins/quick-wishlist");
fs.mkdirSync(target, { recursive: true });
for (const f of ["main.js", "styles.css", "manifest.json"]) fs.copyFileSync(f, path.join(target, f));
console.log("installed in", target);
