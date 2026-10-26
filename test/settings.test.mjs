import { test } from "node:test";
import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";

// main.js requires "obsidian", which only exists inside the app.
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return request === "obsidian" ? "obsidian" : resolve.call(this, request, ...rest);
};
class Stub {}
Module._cache.obsidian = { id: "obsidian", filename: "obsidian", loaded: true, exports: new Proxy({}, { get: () => Stub }) };
const { parseCurrencyLines, serializeCurrencyLines } = createRequire(import.meta.url)("../main.js");

test("currency lines round trip", () => {
  const text = "R$ = 1.234,56\n$ = 1,234.56";
  assert.deepEqual(parseCurrencyLines(text), [
    { symbol: "R$", sample: "1.234,56" },
    { symbol: "$", sample: "1,234.56" },
  ]);
  assert.equal(serializeCurrencyLines(parseCurrencyLines(text)), text);
});

test("empty lines are ignored", () => {
  assert.deepEqual(parseCurrencyLines("\nR$ = 1.234,56\n\n"), [{ symbol: "R$", sample: "1.234,56" }]);
});

test("missing sample falls back to 1,234.56", () => {
  assert.deepEqual(parseCurrencyLines("£"), [{ symbol: "£", sample: "1,234.56" }]);
});

test("empty symbols are dropped when saving", () => {
  assert.equal(serializeCurrencyLines([{ symbol: " ", sample: "1,234.56" }, { symbol: " € ", sample: "1.234,56" }]), "€ = 1.234,56");
});
