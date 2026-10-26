"use strict";

// Small pure helpers, kept out of main.js so they can be tested without Obsidian.

// The address for the "Buy" button, or null when the link is not something a browser can open.
// A full http(s) link is kept, a bare domain ("shop.com/item") gets https://, anything else
// (wikilinks, mailto:, plain text) shows no button.
function buyHref(raw) {
  if (typeof raw !== "string") return null;
  const link = raw.trim();
  if (/^https?:\/\//i.test(link)) return link;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(link)) return `https://${link}`;
  return null;
}

// "18 notes and 1 base" in the user's language. The text table has no plurals, so the
// singular and plural forms are separate keys and the count picks one.
// t is the plugin's translate function (keys countNote, countNotes, countBase, countBases, countAnd).
function countPhrase(t, notes, bases) {
  const parts = [];
  if (notes) parts.push(t(notes === 1 ? "countNote" : "countNotes", { n: notes }));
  if (bases) parts.push(t(bases === 1 ? "countBase" : "countBases", { n: bases }));
  if (!parts.length) return t("countNotes", { n: 0 });
  return parts.length === 2 ? t("countAnd", { a: parts[0], b: parts[1] }) : parts[0];
}

module.exports = { buyHref, countPhrase };
