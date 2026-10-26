"use strict";

// Turns an old wishlist note ("## Photo" with an embed, "## Why I want it" with a list)
// into the page format: "cover" property, ```wish block, ```reasons block.
// Returns the whole new text, or null when the note already has the page format.

const IMAGE = /\.(png|jpe?g|webp|gif|avif|svg|bmp)$/i;

// A line that is only an image embed -> "[[path]]" (or the URL for web images).
function imageEmbed(line) {
  const t = line.trim();
  let m = t.match(/^!\[\[([^\]|]+)(\|[^\]]*)?\]\]$/);
  if (m && IMAGE.test(m[1])) return `[[${m[1]}]]`;
  m = t.match(/^!\[[^\]]*\]\(<?([^)>]+)>?\)$/);
  if (!m) return null;
  if (/^https?:\/\//.test(m[1])) return m[1];
  return IMAGE.test(m[1]) ? `[[${decodeURI(m[1])}]]` : null;
}

function upgradeNote(text, { photoHeadings, reasonsHeadings, reasonsHeading }) {
  if (/^```wish\s*$/m.test(text)) return null;

  const fmMatch = text.match(/^---\n([\s\S]*?)\n?---(\n|$)/);
  let fm = fmMatch ? fmMatch[1] : null;
  const body = fmMatch ? text.slice(fmMatch[0].length) : text;
  const hasCover = fm !== null && /^cover:/m.test(fm);

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
      for (const l of s.lines) {
        const v = l.replace(/^\s*[-*]\s*/, "").trim();
        if (v) reasons.push(v);
      }
      continue;
    }
    const kept = [];
    for (const l of s.lines) {
      const embed = !hasCover && !cover ? imageEmbed(l) : null;
      if (embed) cover = embed;
      else kept.push(l);
    }
    const content = kept.join("\n").trim();
    if (!content && (s.heading === null || is(s, photoHeadings))) continue;
    rest.push(s.heading === null ? content : content ? `## ${s.heading}\n\n${content}` : `## ${s.heading}`);
  }

  if (cover) fm = (fm ? fm + "\n" : "") + `cover: ${JSON.stringify(cover)}`;
  const list = reasons.map((r) => `- ${r}\n`).join("");
  const parts = ["```wish\n```", `## ${heading}\n\n\`\`\`reasons\n${list}\`\`\``, ...rest];
  return (fm !== null ? `---\n${fm}\n---\n` : "") + parts.join("\n\n") + "\n";
}

module.exports = { upgradeNote };
