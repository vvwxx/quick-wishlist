"use strict";

// Kit interface text. Plugins pass their own table to createT; the kit's keys
// are the fallback, so a plugin can override any of them.
const KIT_STRINGS = {
  en: {
    toTop: "Move to top",
    edit: "Edit",
    remove: "Remove",
    removeConfirm: "Remove?",
    add: "Add",
    newItem: "New item… (Enter adds)",
    empty: "Nothing yet.",
  },
  pt: {
    toTop: "Pôr no topo",
    edit: "Editar",
    remove: "Remover",
    removeConfirm: "Remover?",
    add: "Adicionar",
    newItem: "Novo item… (Enter adiciona)",
    empty: "Nada ainda.",
  },
};

function obsidianLanguage() {
  try {
    return String(window.localStorage.getItem("language") || window.moment?.locale() || "en").toLowerCase();
  } catch {
    return "en";
  }
}

// "auto" (or nothing) follows Obsidian's language. Anything starting with "pt" is Portuguese.
function resolveLanguage(setting, detect = obsidianLanguage) {
  const lang = setting === "auto" || !setting ? detect() : String(setting).toLowerCase();
  return lang.startsWith("pt") ? "pt" : "en";
}

// getLang is read on every call, so changing the language applies at once.
// A missing key falls back to English, then to "", and is reported once.
function createT(strings, getLang, warn = console.warn) {
  const warned = new Set();
  const pick = (lang, key) => strings[lang]?.[key] ?? KIT_STRINGS[lang]?.[key];
  return (key, vars = {}) => {
    const lang = getLang();
    let text = pick(lang, key);
    if (text === undefined) {
      if (!warned.has(`${lang}:${key}`)) {
        warned.add(`${lang}:${key}`);
        warn(`[kit] missing text "${key}" in ${lang}`);
      }
      text = pick("en", key) ?? "";
    }
    return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
  };
}

module.exports = { KIT_STRINGS, resolveLanguage, createT };
