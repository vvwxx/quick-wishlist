"use strict";

// Turns an old wishlist note ("## Photo" with an embed, "## Why I want it" with a list)
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

module.exports = { upgradeNote };
