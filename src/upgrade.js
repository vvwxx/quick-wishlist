"use strict";

// Two pure functions for the "upgrade old notes" command:
// upgradeNote: an old wishlist note -> the page format. upgradeBase: an old base -> reads the cover property.
//
// upgradeNote: turns an old wishlist note ("## Photo" with an embed, "## Why I want it" with a list)
// into the page format: "cover" property, ```wish block, ```reasons block.
// Returns the whole new text, or null when the note already has the page format.

const { readItems } = require("./kit/blocks");

const IMAGE = /\.(png|jpe?g|webp|gif|avif|svg|bmp)$/i;

// decodeURI throws on a stray "%" (e.g. "100%.png"): keep the raw path then.
function decodePath(p) {
  try { return decodeURI(p); } catch { return p; }
}

// A line that is only an image embed -> "[[path]]" (or the URL for web images).
function imageEmbed(line) {
  const t = line.trim();
  let m = t.match(/^!\[\[([^\]|]+)(\|[^\]]*)?\]\]$/);
  if (m && IMAGE.test(m[1])) return `[[${m[1]}]]`;
  m = t.match(/^!\[[^\]]*\]\(<?([^)>]+)>?\)$/);
  if (!m) return null;
  if (/^https?:\/\//.test(m[1])) return m[1];
  return IMAGE.test(m[1]) ? `[[${decodePath(m[1])}]]` : null;
}

// Works on LF text; upgradeNote restores the note's own line endings.
function convert(text, { photoHeadings, reasonsHeadings, reasonsHeading }) {
  if (/^```wish\s*$/m.test(text)) return null;

  // The closing "---" must be a whole line (a value like "url: http://x/a---" does not close it).
  const fmMatch = text.match(/^---\n(?:([\s\S]*?)\n)?---[ \t]*(?:\n|$)/);
  let fm = fmMatch ? fmMatch[1] ?? "" : null;
  const body = fmMatch ? text.slice(fmMatch[0].length) : text;

  // An empty "cover:" (or cover: "" / ''), with no value continuing on the next lines,
  // counts as no cover: the found photo takes its place.
  const fmLines = fm === null ? [] : fm.split("\n");
  const isEmptyCover = (l, i) =>
    /^cover:[ \t]*(?:""|'')?[ \t]*$/.test(l) && !/^(?:[ \t]|-[ \t])/.test(fmLines[i + 1] ?? "");
  const hasCover = fmLines.some((l, i) => /^cover:/.test(l) && !isEmptyCover(l, i));
  const emptyCoverAt = hasCover ? -1 : fmLines.findIndex(isEmptyCover);

  // Preamble plus one entry per "## " section.
  const sections = [{ heading: null, lines: [] }];
  for (const line of body.split("\n")) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) sections.push({ heading: h[1], lines: [] });
    else sections[sections.length - 1].lines.push(line);
  }

  const norm = (s) => s.trim().toLowerCase();
  const is = (s, list) => s.heading !== null && list.map(norm).includes(norm(s.heading));

  let cover = null;
  let heading = reasonsHeading;
  const reasons = [];
  const rest = [];
  for (const s of sections) {
    if (is(s, reasonsHeadings)) {
      heading = s.heading;
      reasons.push(...readItems(s.lines.join("\n")));
      continue;
    }
    // The cover comes only from a photo section or the preamble, never from other sections.
    const mayCover = s.heading === null || is(s, photoHeadings);
    const kept = [];
    for (const l of s.lines) {
      const embed = !hasCover && !cover && mayCover ? imageEmbed(l) : null;
      if (embed) cover = embed;
      else kept.push(l);
    }
    const content = kept.join("\n").trim();
    if (!content && (s.heading === null || is(s, photoHeadings))) continue;
    rest.push(s.heading === null ? content : content ? `## ${s.heading}\n\n${content}` : `## ${s.heading}`);
  }

  if (cover) {
    const line = `cover: ${JSON.stringify(cover)}`;
    if (emptyCoverAt >= 0) {
      fmLines[emptyCoverAt] = line;
      fm = fmLines.join("\n");
    } else {
      fm = (fm ? fm + "\n" : "") + line;
    }
  }
  const list = reasons.map((r) => `- ${r}\n`).join("");
  const parts = ["```wish\n```", `## ${heading}\n\n\`\`\`reasons\n${list}\`\`\``, ...rest];
  const head = fm === null ? "" : fm === "" ? "---\n---\n" : `---\n${fm}\n---\n`;
  return head + parts.join("\n\n") + "\n";
}

function upgradeNote(text, opts) {
  const crlf = text.includes("\r\n");
  const out = convert(crlf ? text.replace(/\r\n/g, "\n") : text, opts);
  return out !== null && crlf ? out.replace(/\n/g, "\r\n") : out;
}

// Old bases showed the photo through a formula over file.embeds ("image: formula.photo").
// The notes now keep it in "cover", so every "image: formula.<name>" whose formula reads
// file.embeds becomes "image: note.cover", and that formula goes unless something else uses it.
// Returns the whole new text, or null when there is nothing to change.

// A formula name as written after "formula." (letters of any script, digits, "_" and "-").
const NAME = "[\\p{L}\\p{M}\\p{N}_-]+";
// A mapping key at the start of an entry: "quoted", 'quoted' or plain text (not a "- " list item).
const KEY = /^(?:"([^"]+)"|'([^']+)'|(?!-(?:[ \t]|$))([^\s:#][^:]*?))[ \t]*:(?:[ \t]|$)/u;

function convertBase(text) {
  const lines = text.split("\n");
  const head = lines.findIndex((l) => /^formulas:[ \t]*(?:#.*)?$/.test(l));
  if (head < 0) return null;
  let end = head + 1;
  while (end < lines.length && (lines[end].trim() === "" || /^[ \t]/.test(lines[end]))) end++;

  // One entry per formula. A line at the entry indent that starts with a key opens a new entry;
  // only deeper lines (block scalars, wrapped values) continue the previous one. Comments at the
  // entry indent belong to the entry that follows them.
  const isBlank = (l) => l.trim() === "";
  const first = lines.slice(head + 1, end).find((l) => !isBlank(l) && !/^[ \t]*#/.test(l));
  const indent = first ? first.match(/^[ \t]*/)[0] : "";
  const entries = [];
  let pending = null; // first comment line waiting for its entry
  for (let i = head + 1; i < end; i++) {
    const line = lines[i];
    const last = entries[entries.length - 1];
    if (isBlank(line)) {
      if (last && pending === null) last.to = i + 1;
      continue;
    }
    const atIndent = line.startsWith(indent) && !/^[ \t]/.test(line.slice(indent.length));
    const m = atIndent ? line.slice(indent.length).match(KEY) : null;
    if (m) {
      entries.push({ name: (m[1] ?? m[2] ?? m[3]).trim(), from: pending ?? i, key: i, to: i + 1 });
      pending = null;
    } else if (atIndent && line.slice(indent.length).startsWith("#")) {
      pending ??= i;
    } else if (last) {
      last.to = i + 1;
      pending = null;
    }
  }
  for (const e of entries) {
    while (e.to > e.key + 1 && isBlank(lines[e.to - 1])) e.to--;
  }
  const readsEmbeds = new Set(
    entries.filter((e) => lines.slice(e.key, e.to).join("\n").includes("file.embeds")).map((e) => e.name),
  );

  const imageLine = new RegExp(`^([ \\t]*)image:[ \\t]*["']?formula\\.(${NAME})["']?[ \\t]*(?:#.*)?$`, "u");
  const replaced = new Set();
  const out = lines.map((line, i) => {
    if (i >= head && i < end) return line;
    const m = line.match(imageLine);
    if (!m || !readsEmbeds.has(m[2])) return line;
    replaced.add(m[2]);
    return `${m[1]}image: note.cover`;
  });
  if (!replaced.size) return null;

  // Drop a replaced formula unless a column, a property or another formula still refers to it.
  const drop = new Set();
  for (const e of entries) {
    if (!replaced.has(e.name)) continue;
    const others = out.filter((_, i) => i < e.from || i >= e.to).join("\n");
    const escaped = e.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`formula\\.${escaped}(?![\\p{L}\\p{M}\\p{N}_-])`, "u").test(others)) {
      for (let i = e.from; i < e.to; i++) drop.add(i);
    }
  }
  // A "formulas:" left with no entries is removed too, with the blank lines inside it.
  if (entries.length && entries.every((e) => drop.has(e.key))) {
    for (let i = head; i < end; i++) drop.add(i);
  }
  return out.filter((_, i) => !drop.has(i)).join("\n");
}

function upgradeBase(text) {
  try {
    if (typeof text !== "string") return null;
    const crlf = text.includes("\r\n");
    const out = convertBase(crlf ? text.replace(/\r\n/g, "\n") : text);
    return out !== null && crlf ? out.replace(/\n/g, "\r\n") : out;
  } catch {
    return null;
  }
}

module.exports = { upgradeNote, upgradeBase };
