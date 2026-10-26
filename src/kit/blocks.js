"use strict";

// Items of a code block: one per line. A list marker is "- " or "* " (a "-" or "*"
// followed by whitespace or end of line); any other leading "-" or "*" is item text.
// Blank lines are dropped.
function readItems(src) {
  return String(src ?? "").split("\n").map((l) => l.replace(/^\s*[-*](?:\s+|$)/, "").trim()).filter(Boolean);
}

// Replaces the lines inside ```type ... ```. When the note has no such block,
// appends "## heading" and the block at the end.
function writeBlock(text, type, heading, lines) {
  const ls = text.split("\n");
  const start = ls.findIndex((l) => l.trim() === "```" + type);
  const end = start < 0 ? -1 : ls.findIndex((l, i) => i > start && l.trim() === "```");
  if (end < 0) {
    const body = lines.length ? lines.join("\n") + "\n" : "";
    return text.replace(/\s*$/, "") + `\n\n## ${heading}\n\n\`\`\`${type}\n${body}\`\`\`\n`;
  }
  ls.splice(start + 1, end - start - 1, ...lines);
  return ls.join("\n");
}

module.exports = { readItems, writeBlock };
