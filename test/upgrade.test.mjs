import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { upgradeNote, upgradeBase } = createRequire(import.meta.url)("../src/upgrade.js");

const OPTS = {
  photoHeadings: ["Photo", "Foto"],
  reasonsHeadings: ["Why I want it", "Por que eu quero"],
  reasonsHeading: "Why I want it",
};

test("old note: photo goes to cover, reasons into a block", () => {
  const old = "---\nbrand: Vibram\ntype: desejo\n---\n## Photo\n\n![[Five Fingers Black.png]]\n\n## Why I want it\n\n- IRADO\n";
  assert.equal(upgradeNote(old, OPTS),
    "---\nbrand: Vibram\ntype: desejo\ncover: \"[[Five Fingers Black.png]]\"\n---\n" +
    "```wish\n```\n\n## Why I want it\n\n```reasons\n- IRADO\n```\n");
});

test("Portuguese headings keep the note's own reasons heading", () => {
  const old = "---\nprice: 10\n---\n## Foto\n\n![[x.jpg|300]]\n\n## Por que eu quero\n\n- a\n- b\n";
  assert.equal(upgradeNote(old, OPTS),
    "---\nprice: 10\ncover: \"[[x.jpg]]\"\n---\n```wish\n```\n\n## Por que eu quero\n\n```reasons\n- a\n- b\n```\n");
});

test("already upgraded notes are left alone", () => {
  assert.equal(upgradeNote("---\na: 1\n---\n```wish\n```\n", OPTS), null);
});

test("no photo and an empty reason", () => {
  const old = "---\na: 1\n---\n## Photo\n\n\n## Why I want it\n\n- \n";
  assert.equal(upgradeNote(old, OPTS), "---\na: 1\n---\n```wish\n```\n\n## Why I want it\n\n```reasons\n```\n");
});

test("other sections are kept after the blocks", () => {
  const old = "---\na: 1\n---\n## Photo\n\n![[p.png]]\n\n## Why I want it\n\n- a\n\n## Notes\n\nsize 42\n";
  assert.equal(upgradeNote(old, OPTS),
    "---\na: 1\ncover: \"[[p.png]]\"\n---\n```wish\n```\n\n## Why I want it\n\n```reasons\n- a\n```\n\n## Notes\n\nsize 42\n");
});

test("a note that already has a cover keeps its embed in the body", () => {
  const old = "---\ncover: \"[[a.png]]\"\n---\n## Photo\n\n![[b.png]]\n\n## Why I want it\n\n- a\n";
  assert.equal(upgradeNote(old, OPTS),
    "---\ncover: \"[[a.png]]\"\n---\n```wish\n```\n\n## Why I want it\n\n```reasons\n- a\n```\n\n## Photo\n\n![[b.png]]\n");
});

test("markdown image links become a wikilink cover", () => {
  const old = "---\na: 1\n---\n## Photo\n\n![shoe](Media/My%20Shoe.png)\n\n## Why I want it\n\n- a\n";
  assert.match(upgradeNote(old, OPTS), /^cover: "\[\[Media\/My Shoe\.png\]\]"$/m);
});

test("a note with no frontmatter and no sections still gets the blocks", () => {
  assert.equal(upgradeNote("just text\n", OPTS),
    "```wish\n```\n\n## Why I want it\n\n```reasons\n```\n\njust text\n");
});

test("a stray % in an image path does not throw", () => {
  const old = "---\na: 1\n---\n## Photo\n\n![x](Media/100%.png)\n\n## Why I want it\n\n- a\n";
  let out;
  assert.doesNotThrow(() => { out = upgradeNote(old, OPTS); });
  assert.match(out, /^cover: "\[\[Media\/100%\.png\]\]"$/m);
});

test("reasons keep their text: emphasis, dashes and bold are not list markers", () => {
  const old = "---\na: 1\n---\n## Why I want it\n\n- *really* want\n-5% off\n**bold** y\n";
  assert.equal(upgradeNote(old, OPTS),
    "---\na: 1\n---\n```wish\n```\n\n## Why I want it\n\n```reasons\n- *really* want\n- -5% off\n- **bold** y\n```\n");
});

test("CRLF notes keep their frontmatter on top and their line endings", () => {
  const old = "---\r\nbrand: V\r\n---\r\n## Photo\r\n\r\n![[a.png]]\r\n\r\n## Why I want it\r\n\r\n- a\r\n";
  assert.equal(upgradeNote(old, OPTS),
    "---\r\nbrand: V\r\ncover: \"[[a.png]]\"\r\n---\r\n```wish\r\n```\r\n\r\n## Why I want it\r\n\r\n```reasons\r\n- a\r\n```\r\n");
});

test("a value ending in --- does not close the frontmatter", () => {
  const old = "---\nurl: http://x/a---\nbrand: V\n---\n## Photo\n\n![[a.png]]\n\n## Why I want it\n\n- a\n";
  assert.equal(upgradeNote(old, OPTS),
    "---\nurl: http://x/a---\nbrand: V\ncover: \"[[a.png]]\"\n---\n```wish\n```\n\n## Why I want it\n\n```reasons\n- a\n```\n");
});

test("empty frontmatter stays empty, or receives the cover", () => {
  assert.equal(upgradeNote("---\n---\nhello\n", OPTS),
    "---\n---\n```wish\n```\n\n## Why I want it\n\n```reasons\n```\n\nhello\n");
  assert.equal(upgradeNote("---\n---\n## Photo\n\n![[a.png]]\n", OPTS),
    "---\ncover: \"[[a.png]]\"\n---\n```wish\n```\n\n## Why I want it\n\n```reasons\n```\n");
});

test("an empty cover counts as no cover and is filled in place", () => {
  for (const empty of ["cover:", "cover:  ", 'cover: ""', "cover: ''"]) {
    const old = `---\n${empty}\nbrand: V\n---\n## Photo\n\n![[a.png]]\n\n## Why I want it\n\n- a\n`;
    assert.equal(upgradeNote(old, OPTS),
      "---\ncover: \"[[a.png]]\"\nbrand: V\n---\n```wish\n```\n\n## Why I want it\n\n```reasons\n- a\n```\n", empty);
  }
});

test("an empty cover with no photo to take is left untouched", () => {
  const old = "---\ncover:\nbrand: V\n---\n## Why I want it\n\n- a\n";
  assert.equal(upgradeNote(old, OPTS),
    "---\ncover:\nbrand: V\n---\n```wish\n```\n\n## Why I want it\n\n```reasons\n- a\n```\n");
});

test("a cover whose value continues on the next lines is not empty", () => {
  const old = "---\ncover:\n  - x\n---\n## Photo\n\n![[a.png]]\n\n## Why I want it\n\n- a\n";
  assert.equal(upgradeNote(old, OPTS),
    "---\ncover:\n  - x\n---\n```wish\n```\n\n## Why I want it\n\n```reasons\n- a\n```\n\n## Photo\n\n![[a.png]]\n");
});

test("an image under another section stays in the body", () => {
  const old = "---\na: 1\n---\n## Why I want it\n\n- a\n\n## Notes\n\n![[diagram.png]]\n\nsize 42\n";
  assert.equal(upgradeNote(old, OPTS),
    "---\na: 1\n---\n```wish\n```\n\n## Why I want it\n\n```reasons\n- a\n```\n\n## Notes\n\n![[diagram.png]]\n\nsize 42\n");
});

test("an image in the preamble before the first section can be the cover", () => {
  const old = "---\na: 1\n---\n![[top.png]]\n\n## Why I want it\n\n- a\n\n## Notes\n\n![[other.png]]\n";
  assert.equal(upgradeNote(old, OPTS),
    "---\na: 1\ncover: \"[[top.png]]\"\n---\n```wish\n```\n\n## Why I want it\n\n```reasons\n- a\n```\n\n## Notes\n\n![[other.png]]\n");
});

// Bases: "image: formula.<photo>" becomes "image: note.cover", and the formula goes away.
const OLD_PLUGIN_BASE = `newItemFolder: "Wishlist"
filters:
  and:
    - 'file.inFolder("Wishlist")'
formulas:
  value: 'if(price.isEmpty(), "", "$ " + price.toFixed(2))'
  buy: 'if(link.isEmpty(), "", link(link, "Link to buy"))'
  photo: 'file.embeds.filter(value.toString().lower().containsAny(".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"))[0]'
  main_category: 'if(categories.isEmpty(), "(no category)", list(categories)[0])'
properties:
  file.name:
    displayName: "Item"
views:
  - type: cards
    name: "All items"
    order:
      - file.name
      - formula.value
    image: formula.photo
    imageAspectRatio: 1
    cardSize: 300
  - type: table
    name: "Reorder"
    order:
      - file.name
`;

test("base made by the old plugin: the photo formula goes, the cover is used", () => {
  const out = upgradeBase(OLD_PLUGIN_BASE);
  assert.equal(out, OLD_PLUGIN_BASE
    .replace(/  photo: .*\n/, "")
    .replace("image: formula.photo", "image: note.cover"));
  assert.doesNotMatch(out, /file\.embeds|formula\.photo/);
});

const OWN_NAME_BASE = `filters:
  and:
    - file.inFolder("Wishlist")
formulas:
  site: if(link.isEmpty(), "", link(link, "Buy"))
  foto: file.embeds.filter(value.toString().lower().containsAny(".png", ".jpg"))[0]
  valor: if(price.isEmpty(), "", "$ " + price)
views:
  - type: cards
    name: All items
    image: formula.foto
    cardSize: 300
  - type: cards
    name: Want
    image: formula.foto
    cardSize: 300
  - type: table
    name: Purchased
`;

test("a formula with its own name, unquoted and used by two views", () => {
  assert.equal(upgradeBase(OWN_NAME_BASE), OWN_NAME_BASE
    .replace(/  foto: .*\n/, "")
    .replaceAll("image: formula.foto", "image: note.cover"));
});

test("a base that already uses note.cover is left alone", () => {
  assert.equal(upgradeBase(OLD_PLUGIN_BASE.replace(/  photo: .*\n/, "").replace("formula.photo", "note.cover")), null);
});

test("an image formula that does not read file.embeds stays intact", () => {
  assert.equal(upgradeBase("formulas:\n  image: note.picture\nviews:\n  - type: cards\n    image: formula.image\n"), null);
  assert.equal(upgradeBase("formulas:\n  pic: 'note.picture'\nviews:\n  - type: cards\n    image: formula.pic\n"), null);
});

test("the formula stays when something else still uses it", () => {
  const base = OLD_PLUGIN_BASE.replace("      - formula.value\n    image", "      - formula.value\n      - formula.photo\n    image");
  const out = upgradeBase(base);
  assert.match(out, /^    image: note\.cover$/m);
  assert.match(out, /^  photo: 'file\.embeds/m);
  assert.equal(out, base.replace("image: formula.photo", "image: note.cover"));
});

test("an emptied formulas section is removed, a multi-line formula goes whole", () => {
  const only = "formulas:\n  photo: file.embeds[0]\nviews:\n  - type: cards\n    image: formula.photo\n";
  assert.equal(upgradeBase(only), "views:\n  - type: cards\n    image: note.cover\n");
  const block = "formulas:\n  photo: |\n    file.embeds\n      .filter(true)[0]\n  b: 1\nviews:\n  - type: cards\n    image: formula.photo\n";
  assert.equal(upgradeBase(block), "formulas:\n  b: 1\nviews:\n  - type: cards\n    image: note.cover\n");
});

test("CRLF bases keep their line endings", () => {
  const crlf = OWN_NAME_BASE.replace(/\n/g, "\r\n");
  assert.equal(upgradeBase(crlf), OWN_NAME_BASE
    .replace(/  foto: .*\n/, "")
    .replaceAll("image: formula.foto", "image: note.cover")
    .replace(/\n/g, "\r\n"));
});

test("upgradeBase never throws and gives null for non-bases", () => {
  for (const x of ["", "views: []\n", "image: formula.nope\n", null, undefined, 42]) {
    assert.doesNotThrow(() => upgradeBase(x));
    assert.equal(upgradeBase(x), null);
  }
});

test("a second pass over an upgraded base finds nothing to do", () => {
  assert.equal(upgradeBase(upgradeBase(OLD_PLUGIN_BASE)), null);
  assert.equal(upgradeBase(upgradeBase(OWN_NAME_BASE)), null);
});
