import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { kitHash } = require("../src/kit/check.js");

test("src/kit is an untouched copy of vorgan-kit", () => {
  const dir = new URL("../src/kit/", import.meta.url).pathname;
  const info = JSON.parse(fs.readFileSync(dir + "KIT.json", "utf8"));
  assert.equal(kitHash(dir, info.files), info.hash,
    "src/kit was edited by hand. Change ~/projects/vorgan-kit/src and run npm run publicar there.");
});
