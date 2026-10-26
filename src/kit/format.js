"use strict";

// currency: { symbol: "R$", thousands: ".", decimal: "," }. Always 2 decimals.
function formatMoney(value, currency) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousands);
  return `${n < 0 ? "-" : ""}${currency.symbol} ${grouped}${currency.decimal}${dec}`;
}

// "2026-10-26" -> "26/10/2026" (pt) or "10/26/2026" (en). Anything else comes back as is.
function formatDate(iso, lang) {
  const text = String(iso ?? "");
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return text;
  return lang === "pt" ? `${m[3]}/${m[2]}/${m[1]}` : `${m[2]}/${m[3]}/${m[1]}`;
}

module.exports = { formatMoney, formatDate };
