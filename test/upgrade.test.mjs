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
