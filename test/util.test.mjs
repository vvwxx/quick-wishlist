import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { buyHref, countPhrase } = createRequire(import.meta.url)("../src/util.js");
const { createT } = createRequire(import.meta.url)("../src/kit/i18n.js");

test("buyHref: http and https links are kept as they are", () => {
  assert.equal(buyHref("https://shop.com/a?b=1"), "https://shop.com/a?b=1");
  assert.equal(buyHref("  HTTP://shop.com  "), "HTTP://shop.com");
});

test("buyHref: a bare domain or domain/path gets https://", () => {
  assert.equal(buyHref("shop.com"), "https://shop.com");
  assert.equal(buyHref("www.shop.com.br/item/1"), "https://www.shop.com.br/item/1");
});

test("buyHref: wikilinks, mailto, plain text and non-strings give no link", () => {
  for (const x of ["[[My note]]", "[[site.com]]", "mailto:a@b.com", "ask the store", "", "   ", "see shop.com", null, undefined, 42, ["shop.com"], [["note"]]]) {
    assert.equal(buyHref(x), null, String(JSON.stringify(x)));
  }
});

const T = {
  en: { countNote: "{n} note", countNotes: "{n} notes", countBase: "{n} base", countBases: "{n} bases", countAnd: "{a} and {b}" },
  pt: { countNote: "{n} nota", countNotes: "{n} notas", countBase: "{n} base", countBases: "{n} bases", countAnd: "{a} e {b}" },
};

test("countPhrase: singular for one, plural otherwise, in both languages", () => {
  for (const [lang, w] of [["en", ["note", "notes", "and"]], ["pt", ["nota", "notas", "e"]]]) {
    const t = createT(T, () => lang);
    assert.equal(countPhrase(t, 1, 0), `1 ${w[0]}`);
    assert.equal(countPhrase(t, 18, 0), `18 ${w[1]}`);
    assert.equal(countPhrase(t, 0, 1), "1 base");
    assert.equal(countPhrase(t, 0, 2), "2 bases");
    assert.equal(countPhrase(t, 18, 1), `18 ${w[1]} ${w[2]} 1 base`);
    assert.equal(countPhrase(t, 1, 2), `1 ${w[0]} ${w[2]} 2 bases`);
    assert.equal(countPhrase(t, 0, 0), `0 ${w[1]}`);
  }
});
