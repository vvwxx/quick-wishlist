import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { upgradeNote } = createRequire(import.meta.url)("../src/upgrade.js");

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
