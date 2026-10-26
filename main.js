"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/kit/i18n.js
var require_i18n = __commonJS({
  "src/kit/i18n.js"(exports2, module2) {
    "use strict";
    var KIT_STRINGS = {
      en: {
        toTop: "Move to top",
        edit: "Edit",
        remove: "Remove",
        removeConfirm: "Remove?",
        add: "Add",
        newItem: "New item\u2026 (Enter adds)",
        empty: "Nothing yet."
      },
      pt: {
        toTop: "P\xF4r no topo",
        edit: "Editar",
        remove: "Remover",
        removeConfirm: "Remover?",
        add: "Adicionar",
        newItem: "Novo item\u2026 (Enter adiciona)",
        empty: "Nada ainda."
      }
    };
    function obsidianLanguage() {
      try {
        return String(window.localStorage.getItem("language") || window.moment?.locale() || "en").toLowerCase();
      } catch {
        return "en";
      }
    }
    function resolveLanguage2(setting, detect = obsidianLanguage) {
      const lang = setting === "auto" || !setting ? detect() : String(setting).toLowerCase();
      return lang.startsWith("pt") ? "pt" : "en";
    }
    function createT2(strings, getLang, warn = console.warn) {
      const warned = /* @__PURE__ */ new Set();
      const pick = (lang, key) => strings[lang]?.[key] ?? KIT_STRINGS[lang]?.[key];
      return (key, vars = {}) => {
        const lang = getLang();
        let text = pick(lang, key);
        if (text === void 0) {
          if (!warned.has(`${lang}:${key}`)) {
            warned.add(`${lang}:${key}`);
            warn(`[kit] missing text "${key}" in ${lang}`);
          }
          text = pick("en", key) ?? "";
        }
        return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
      };
    }
    module2.exports = { KIT_STRINGS, resolveLanguage: resolveLanguage2, createT: createT2 };
  }
});

// src/kit/format.js
var require_format = __commonJS({
  "src/kit/format.js"(exports2, module2) {
    "use strict";
    function formatMoney2(value, currency) {
      if (value === null || value === void 0 || value === "") return "";
      const n = Number(value);
      if (!Number.isFinite(n)) return "";
      const [int, dec] = Math.abs(n).toFixed(2).split(".");
      const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousands);
      return `${n < 0 ? "-" : ""}${currency.symbol} ${grouped}${currency.decimal}${dec}`;
    }
    function formatDate2(iso, lang) {
      const text = String(iso ?? "");
      const m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) return text;
      return lang === "pt" ? `${m[3]}/${m[2]}/${m[1]}` : `${m[2]}/${m[3]}/${m[1]}`;
    }
    module2.exports = { formatMoney: formatMoney2, formatDate: formatDate2 };
  }
});

// src/kit/blocks.js
var require_blocks = __commonJS({
  "src/kit/blocks.js"(exports2, module2) {
    "use strict";
    function readItems2(src) {
      return String(src ?? "").split("\n").map((l) => l.replace(/^\s*[-*](?:\s+|$)/, "").trim()).filter(Boolean);
    }
    function writeBlock2(text, type, heading, lines) {
      const ls = text.split("\n");
      const start = ls.findIndex((l) => l.trim() === "```" + type);
      const end = start < 0 ? -1 : ls.findIndex((l, i) => i > start && l.trim() === "```");
      if (end < 0) {
        const body = lines.length ? lines.join("\n") + "\n" : "";
        return text.replace(/\s*$/, "") + `

## ${heading}

\`\`\`${type}
${body}\`\`\`
`;
      }
      ls.splice(start + 1, end - start - 1, ...lines);
      return ls.join("\n");
    }
    module2.exports = { readItems: readItems2, writeBlock: writeBlock2 };
  }
});

// src/kit/page.js
var require_page = __commonJS({
  "src/kit/page.js"(exports2, module2) {
    "use strict";
    var { setIcon } = require("obsidian");
    var cleanText = (s) => String(s ?? "").replace(/\s*\n\s*/g, " ").trim();
    var dragging = null;
    function renderHeader2(el, { image = null, title, lines = [], actions = [] }) {
      const top = el.createDiv("kit-header");
      if (image) top.createEl("img", { cls: "kit-cover", attr: { src: image, alt: title } });
      const id = top.createDiv("kit-id");
      id.createDiv({ cls: "kit-title", text: title });
      for (const parts of lines) {
        const text = parts.filter(Boolean).join(" \xB7 ");
        if (text) id.createDiv({ cls: "kit-summary", text });
      }
      if (actions.length) {
        const row = id.createDiv("kit-actions");
        for (const a of actions) {
          const b = a.href ? row.createEl("a", { cls: "kit-tag", text: a.text, href: a.href }) : row.createEl("button", { cls: a.cta ? "mod-cta" : "", text: a.text });
          if (a.onClick) b.onclick = (e) => {
            e.preventDefault();
            a.onClick();
          };
        }
      }
      return top;
    }
    function iconButton(parent, icon, label, fn) {
      const b = parent.createEl("button", { cls: "kit-action clickable-icon", attr: { "aria-label": label } });
      setIcon(b, icon);
      b.onclick = () => fn(b);
      return b;
    }
    function removeButton(parent, t, fn) {
      iconButton(parent, "trash-2", t("remove"), (b) => {
        if (b.hasClass("is-confirm")) return fn();
        b.addClass("is-confirm");
        b.setText(t("removeConfirm"));
        window.setTimeout(() => {
          if (!b.isConnected) return;
          b.removeClass("is-confirm");
          b.empty();
          setIcon(b, "trash-2");
        }, 3e3);
      });
    }
    function editInline(textEl, current, onSave) {
      const input = createEl("input", { type: "text", cls: "kit-row-input" });
      input.value = current;
      textEl.replaceWith(input);
      input.focus();
      input.select();
      let done = false;
      const close = (ok) => {
        if (done) return;
        done = true;
        const v = cleanText(input.value);
        if (!ok || !v || v === current) return input.replaceWith(textEl);
        onSave(v);
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) {
          e.preventDefault();
          close(true);
        }
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          close(false);
        }
      });
      input.addEventListener("blur", () => close(true));
    }
    function renderEditableList2(parent, items, save, { t, placeholder, empty }) {
      const box = parent.createDiv("kit-list");
      const rows = box.createDiv("kit-rows");
      if (!items.length) rows.createDiv({ cls: "kit-hint kit-empty", text: empty ?? t("empty") });
      items.forEach((text, i) => {
        const row = rows.createDiv("kit-row");
        row.createDiv("kit-dot");
        const body = row.createDiv("kit-row-body");
        const textEl = body.createDiv({ cls: "kit-row-text", text });
        const edit = () => editInline(textEl, text, (v) => {
          const l = [...items];
          l[i] = v;
          save(l);
        });
        textEl.ondblclick = edit;
        const actions = row.createDiv("kit-row-actions");
        if (i > 0) iconButton(actions, "arrow-up-to-line", t("toTop"), () => {
          const l = [...items];
          l.unshift(l.splice(i, 1)[0]);
          save(l);
        });
        iconButton(actions, "pencil", t("edit"), edit);
        removeButton(actions, t, () => save(items.filter((_, j) => j !== i)));
        row.draggable = true;
        row.addEventListener("dragstart", (e) => {
          dragging = { box, i };
          row.addClass("is-dragging");
          e.dataTransfer.effectAllowed = "move";
        });
        row.addEventListener("dragend", () => {
          dragging = null;
          row.removeClass("is-dragging");
        });
        row.addEventListener("dragover", (e) => {
          if (dragging?.box === box && dragging.i !== i) {
            e.preventDefault();
            row.addClass("is-target");
          }
        });
        row.addEventListener("dragleave", () => row.removeClass("is-target"));
        row.addEventListener("drop", (e) => {
          e.preventDefault();
          row.removeClass("is-target");
          if (dragging?.box !== box || dragging.i === i) return;
          const l = [...items];
          const [moved] = l.splice(dragging.i, 1);
          l.splice(i, 0, moved);
          save(l);
        });
      });
      const add = box.createDiv("kit-new");
      const input = add.createEl("input", { type: "text", attr: { placeholder: placeholder ?? t("newItem") } });
      const submit = (top) => {
        const v = cleanText(input.value);
        if (!v) return input.focus();
        save(top ? [v, ...items] : [...items, v]);
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) {
          e.preventDefault();
          submit(e.shiftKey);
        }
      });
      add.createEl("button", { cls: "mod-cta", text: t("add") }).onclick = () => submit(false);
      return box;
    }
    module2.exports = { renderHeader: renderHeader2, renderEditableList: renderEditableList2 };
  }
});

// src/upgrade.js
var require_upgrade = __commonJS({
  "src/upgrade.js"(exports2, module2) {
    "use strict";
    var { readItems: readItems2 } = require_blocks();
    var IMAGE = /\.(png|jpe?g|webp|gif|avif|svg|bmp)$/i;
    function decodePath(p) {
      try {
        return decodeURI(p);
      } catch {
        return p;
      }
    }
    function imageEmbed(line) {
      const t = line.trim();
      let m = t.match(/^!\[\[([^\]|]+)(\|[^\]]*)?\]\]$/);
      if (m && IMAGE.test(m[1])) return `[[${m[1]}]]`;
      m = t.match(/^!\[[^\]]*\]\(<?([^)>]+)>?\)$/);
      if (!m) return null;
      if (/^https?:\/\//.test(m[1])) return m[1];
      return IMAGE.test(m[1]) ? `[[${decodePath(m[1])}]]` : null;
    }
    function convert(text, { photoHeadings, reasonsHeadings, reasonsHeading }) {
      if (/^```wish\s*$/m.test(text)) return null;
      const fmMatch = text.match(/^---\n(?:([\s\S]*?)\n)?---[ \t]*(?:\n|$)/);
      let fm = fmMatch ? fmMatch[1] ?? "" : null;
      const body = fmMatch ? text.slice(fmMatch[0].length) : text;
      const fmLines = fm === null ? [] : fm.split("\n");
      const isEmptyCover = (l, i) => /^cover:[ \t]*(?:""|'')?[ \t]*$/.test(l) && !/^(?:[ \t]|-[ \t])/.test(fmLines[i + 1] ?? "");
      const hasCover = fmLines.some((l, i) => /^cover:/.test(l) && !isEmptyCover(l, i));
      const emptyCoverAt = hasCover ? -1 : fmLines.findIndex(isEmptyCover);
      const sections = [{ heading: null, lines: [] }];
      for (const line of body.split("\n")) {
        const h = line.match(/^##\s+(.+?)\s*$/);
        if (h) sections.push({ heading: h[1], lines: [] });
        else sections[sections.length - 1].lines.push(line);
      }
      const norm = (s) => s.trim().toLowerCase();
      const is = (s, list2) => s.heading !== null && list2.map(norm).includes(norm(s.heading));
      let cover = null;
      let heading = reasonsHeading;
      const reasons = [];
      const rest = [];
      for (const s of sections) {
        if (is(s, reasonsHeadings)) {
          heading = s.heading;
          reasons.push(...readItems2(s.lines.join("\n")));
          continue;
        }
        const mayCover = s.heading === null || is(s, photoHeadings);
        const kept = [];
        for (const l of s.lines) {
          const embed = !hasCover && !cover && mayCover ? imageEmbed(l) : null;
          if (embed) cover = embed;
          else kept.push(l);
        }
        const content = kept.join("\n").trim();
        if (!content && (s.heading === null || is(s, photoHeadings))) continue;
        rest.push(s.heading === null ? content : content ? `## ${s.heading}

${content}` : `## ${s.heading}`);
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
      const list = reasons.map((r) => `- ${r}
`).join("");
      const parts = ["```wish\n```", `## ${heading}

\`\`\`reasons
${list}\`\`\``, ...rest];
      const head = fm === null ? "" : fm === "" ? "---\n---\n" : `---
${fm}
---
`;
      return head + parts.join("\n\n") + "\n";
    }
    function upgradeNote2(text, opts) {
      const crlf = text.includes("\r\n");
      const out = convert(crlf ? text.replace(/\r\n/g, "\n") : text, opts);
      return out !== null && crlf ? out.replace(/\n/g, "\r\n") : out;
    }
    function convertBase(text) {
      const lines = text.split("\n");
      const head = lines.findIndex((l) => /^formulas:[ \t]*(?:#.*)?$/.test(l));
      if (head < 0) return null;
      let end = head + 1;
      while (end < lines.length && (lines[end].trim() === "" || /^[ \t]/.test(lines[end]))) end++;
      const entries = [];
      let indent = null;
      for (let i = head + 1; i < end; i++) {
        const m = lines[i].match(/^([ \t]+)([\w-]+):(?:[ \t]|$)/);
        if (m && (indent === null || m[1] === indent)) {
          indent = m[1];
          entries.push({ name: m[2], from: i, to: i + 1 });
        } else if (entries.length) {
          entries[entries.length - 1].to = i + 1;
        }
      }
      for (const e of entries) {
        while (e.to > e.from + 1 && lines[e.to - 1].trim() === "") e.to--;
      }
      const readsEmbeds = new Set(
        entries.filter((e) => lines.slice(e.from, e.to).join("\n").includes("file.embeds")).map((e) => e.name)
      );
      const replaced = /* @__PURE__ */ new Set();
      const out = lines.map((line, i) => {
        if (i >= head && i < end) return line;
        const m = line.match(/^([ \t]*)image:[ \t]*["']?formula\.([\w-]+)["']?[ \t]*(?:#.*)?$/);
        if (!m || !readsEmbeds.has(m[2])) return line;
        replaced.add(m[2]);
        return `${m[1]}image: note.cover`;
      });
      if (!replaced.size) return null;
      const drop = /* @__PURE__ */ new Set();
      for (const e of entries) {
        if (!replaced.has(e.name)) continue;
        const others = out.filter((_, i) => i < e.from || i >= e.to).join("\n");
        if (!new RegExp(`formula\\.${e.name}(?![\\w-])`).test(others)) {
          for (let i = e.from; i < e.to; i++) drop.add(i);
        }
      }
      if (entries.length && entries.every((e) => drop.has(e.from))) {
        for (let i = head; i < end; i++) drop.add(i);
      }
      return out.filter((_, i) => !drop.has(i)).join("\n");
    }
    function upgradeBase2(text) {
      try {
        if (typeof text !== "string") return null;
        const crlf = text.includes("\r\n");
        const out = convertBase(crlf ? text.replace(/\r\n/g, "\n") : text);
        return out !== null && crlf ? out.replace(/\n/g, "\r\n") : out;
      } catch {
        return null;
      }
    }
    module2.exports = { upgradeNote: upgradeNote2, upgradeBase: upgradeBase2 };
  }
});

// src/main.js
var {
  Plugin,
  Modal,
  Notice,
  TFile,
  PluginSettingTab,
  Setting,
  Keymap,
  AbstractInputSuggest,
  BasesView,
  MarkdownRenderChild,
  requestUrl,
  normalizePath,
  parseYaml
} = require("obsidian");
var { resolveLanguage, createT } = require_i18n();
var { formatMoney, formatDate } = require_format();
var { readItems, writeBlock } = require_blocks();
var { renderHeader, renderEditableList } = require_page();
var { upgradeNote, upgradeBase } = require_upgrade();
var SMART_VIEW = "qw-smart-categories";
var STRINGS = {
  en: {
    cmdNewItem: "New wishlist item",
    cmdCreateBase: "Create wishlist base",
    cmdFillNote: "Fill current note with wishlist properties",
    cmdTogglePurchased: "Mark as purchased / back to want",
    cmdUpgrade: "Upgrade old notes to the item page",
    formTitle: "New wishlist item",
    stepDetails: "Details",
    stepPhoto: "Photo",
    stepReasons: "Why I want it",
    product: "Product",
    brand: "Brand",
    price: "Price",
    currency: "Currency",
    category: "Categories",
    categoryPlaceholder: "Enter or comma to add",
    priority: "Priority",
    rank: "Rank",
    link: "Product link",
    store: "Store",
    reasons: "Reasons",
    optional: "optional",
    next: "Next",
    back: "Back",
    save: "Save",
    hintNext: "Enter: next \xB7 Esc: cancel",
    hintSave: "Ctrl+Enter: save \xB7 Esc: cancel",
    rankPlaceholder: "{rank} (end of the list) \xB7 1.1, 1.2 for related items",
    pasteHere: "Paste an image or an image link here (Ctrl+V)",
    pasteOptional: "Optional. Press Enter to skip.",
    pasteReplace: "Ctrl+V again to replace \xB7 Delete to remove",
    downloading: "Downloading image\u2026",
    productRequired: "Product is required.",
    added: "Added to wishlist: {name}",
    purchased: "Purchased: {name}",
    backToWant: "Back to want: {name}",
    imageFailed: "Could not load that image.",
    saveFailed: "Could not save the item. See the console.",
    nothingToPaste: "Nothing to paste: copy an image or an image link.",
    baseExists: "{path} already exists.",
    badYaml: "Quick Wishlist: extra properties are not valid YAML.",
    // Settings
    setLanguage: "Language",
    setLanguageDesc: "Language of the form and settings. Command names change after restarting Obsidian.",
    langAuto: "Automatic (same as Obsidian)",
    setFolder: "Wishlist folder",
    setFolderDesc: "Where items are created. Notes created here in any other way are filled too.",
    setCurrencies: "Currencies",
    setCurrenciesDesc: "Symbol and how 1234.56 is written. The star marks the default.",
    setPriorities: "Priorities",
    setPrioritiesDesc: "In the order shown in the form. The star marks the default.",
    secGeneral: "General",
    secStatus: "Status",
    secNote: "Note text",
    secNoteDesc: "Headings written in every new item.",
    secBase: "Base",
    secAdvanced: "Advanced",
    secAdvancedDesc: "Tag, extra and hidden properties.",
    show: "Show",
    hide: "Hide",
    symbol: "Symbol",
    addCurrency: "Add currency",
    addPriority: "Add priority",
    makeDefault: "Make default",
    isDefault: "Default",
    remove: "Remove",
    moveUp: "Move up",
    moveDown: "Move down",
    previewInBase: "in the base",
    setStatus: "Status for new items",
    setStatusDesc: "The base shows these in the Want views.",
    setBoughtStatus: "Status for purchased items",
    setBoughtStatusDesc: "The base shows these in the Purchased view.",
    setTag: "Tag",
    setTagDesc: "Added to every item.",
    setExtra: "Extra properties",
    setExtraDesc: "Optional YAML added to every new item, e.g. type: wish",
    setHidden: "Hidden properties",
    setHiddenDesc: "Comma-separated. Kept in the note but not shown in the properties of wishlist items, e.g. type",
    setReasonsHeading: "Reasons heading",
    setLinkLabel: "Link label",
    setLinkLabelDesc: "Text of the buy link in the base. Applies to bases created after the change.",
    setIntercept: 'Base "New" button opens the form',
    setInterceptDesc: 'In bases that show the wishlist folder, the "New" button opens this form instead of the small popover.',
    setFill: "Fill notes created elsewhere",
    setFillDesc: "Adds the wishlist properties and sections to empty notes created in the folder.",
    // Base
    viewAll: "All items",
    viewWant: "Want",
    viewByCategory: "By category",
    viewReorder: "Reorder",
    viewPurchased: "Purchased",
    colItem: "Item",
    colBrand: "Brand",
    pageBuy: "Buy \u2197",
    pageMarkBought: "Mark as purchased",
    pageBackToWant: "Back to the list",
    pagePriority: "{priority} priority",
    pageStore: "{store} (store)",
    pageBoughtOn: "purchased on {date}",
    pageReasonPlaceholder: "New reason\u2026 (Enter adds)",
    pageReasonsEmpty: "Why do you want it? What changes once you have it?",
    colPrice: "Price",
    colAmount: "Amount",
    colCurrency: "Currency",
    colCategories: "Categories",
    colPriority: "Priority",
    colStore: "Store",
    colLink: "Link",
    colStatus: "Status",
    colPurchasedOn: "Purchased on",
    noCategory: "(no category)",
    viewSmart: "Smart categories",
    others: "Others",
    emptyView: "No items yet.",
    upgradeTitle: "Upgrade old notes",
    upgradeBody: "{count} notes in {folder} will get the item page: the photo moves to the cover property and the reasons go into a list. The rest of each note stays as it is.",
    upgradeBodyBases: "{count} notes and {bases} bases in {folder} will get the item page: in the notes, the photo moves to the cover property and the reasons go into a list. The bases show the cover property instead of the photo formula. The rest stays as it is.",
    upgradeRun: "Upgrade",
    upgradeCancel: "Cancel",
    upgradeNone: "Every note already uses the item page.",
    upgradeDone: "{count} notes upgraded.",
    upgradeDoneBases: "{count} notes and {bases} bases upgraded.",
    upgradeSkipped: "Skipped, could not read: {names}"
  },
  pt: {
    cmdNewItem: "Novo item da wishlist",
    cmdCreateBase: "Criar base da wishlist",
    cmdFillNote: "Completar a nota atual com as propriedades da wishlist",
    cmdTogglePurchased: "Marcar como comprado / voltar para quero",
    cmdUpgrade: "Atualizar notas antigas para a p\xE1gina do item",
    formTitle: "Novo item da wishlist",
    stepDetails: "Detalhes",
    stepPhoto: "Foto",
    stepReasons: "Por que eu quero",
    product: "Produto",
    brand: "Marca",
    price: "Pre\xE7o",
    currency: "Moeda",
    category: "Categorias",
    categoryPlaceholder: "Enter ou v\xEDrgula para adicionar",
    priority: "Prioridade",
    rank: "Rank",
    link: "Link do produto",
    store: "Loja",
    reasons: "Motivos",
    optional: "opcional",
    next: "Pr\xF3ximo",
    back: "Voltar",
    save: "Salvar",
    hintNext: "Enter: pr\xF3ximo \xB7 Esc: cancelar",
    hintSave: "Ctrl+Enter: salvar \xB7 Esc: cancelar",
    rankPlaceholder: "{rank} (fim da lista) \xB7 1.1, 1.2 para itens relacionados",
    pasteHere: "Cole aqui uma imagem ou o link de uma imagem (Ctrl+V)",
    pasteOptional: "Opcional. Aperte Enter para pular.",
    pasteReplace: "Ctrl+V de novo para trocar \xB7 Delete para remover",
    downloading: "Baixando a imagem\u2026",
    productRequired: "O produto \xE9 obrigat\xF3rio.",
    added: "Adicionado \xE0 wishlist: {name}",
    purchased: "Comprado: {name}",
    backToWant: "De volta para quero: {name}",
    imageFailed: "N\xE3o foi poss\xEDvel carregar essa imagem.",
    saveFailed: "N\xE3o foi poss\xEDvel salvar o item. Veja o console.",
    nothingToPaste: "Nada para colar: copie uma imagem ou o link de uma imagem.",
    baseExists: "{path} j\xE1 existe.",
    badYaml: "Quick Wishlist: as propriedades extras n\xE3o s\xE3o um YAML v\xE1lido.",
    setLanguage: "Idioma",
    setLanguageDesc: "Idioma do formul\xE1rio e das configura\xE7\xF5es. Os nomes dos comandos mudam depois de reiniciar o Obsidian.",
    langAuto: "Autom\xE1tico (igual ao Obsidian)",
    setFolder: "Pasta da wishlist",
    setFolderDesc: "Onde os itens s\xE3o criados. Notas criadas aqui de outro jeito tamb\xE9m s\xE3o completadas.",
    setCurrencies: "Moedas",
    setCurrenciesDesc: "S\xEDmbolo e como 1234,56 \xE9 escrito. A estrela marca a padr\xE3o.",
    setPriorities: "Prioridades",
    setPrioritiesDesc: "Na ordem em que aparecem no formul\xE1rio. A estrela marca a padr\xE3o.",
    secGeneral: "Geral",
    secStatus: "Status",
    secNote: "Textos da nota",
    secNoteDesc: "T\xEDtulos escritos em todo item novo.",
    secBase: "Base",
    secAdvanced: "Avan\xE7ado",
    secAdvancedDesc: "Tag, propriedades extras e escondidas.",
    show: "Mostrar",
    hide: "Esconder",
    symbol: "S\xEDmbolo",
    addCurrency: "Adicionar moeda",
    addPriority: "Adicionar prioridade",
    makeDefault: "Tornar padr\xE3o",
    isDefault: "Padr\xE3o",
    remove: "Remover",
    moveUp: "Subir",
    moveDown: "Descer",
    previewInBase: "na base",
    setStatus: "Status dos itens novos",
    setStatusDesc: "A base mostra esses itens nas visualiza\xE7\xF5es de Quero.",
    setBoughtStatus: "Status dos itens comprados",
    setBoughtStatusDesc: "A base mostra esses itens na visualiza\xE7\xE3o Comprados.",
    setTag: "Tag",
    setTagDesc: "Adicionada a todo item.",
    setExtra: "Propriedades extras",
    setExtraDesc: "YAML opcional adicionado a todo item novo, por exemplo: tipo: desejo",
    setHidden: "Propriedades escondidas",
    setHiddenDesc: "Separadas por v\xEDrgula. Ficam na nota, mas n\xE3o aparecem nas propriedades dos itens da wishlist, por exemplo: tipo",
    setReasonsHeading: "T\xEDtulo dos motivos",
    setLinkLabel: "Texto do link",
    setLinkLabelDesc: "Texto do link de compra na base. Vale para as bases criadas depois da mudan\xE7a.",
    setIntercept: 'Bot\xE3o "Novo" da base abre o formul\xE1rio',
    setInterceptDesc: 'Nas bases que mostram a pasta da wishlist, o bot\xE3o "Novo" abre este formul\xE1rio no lugar da janelinha.',
    setFill: "Completar notas criadas de outro jeito",
    setFillDesc: "Adiciona as propriedades e se\xE7\xF5es da wishlist \xE0s notas vazias criadas na pasta.",
    viewAll: "Todos",
    viewWant: "Quero",
    viewByCategory: "Por categoria",
    viewReorder: "Reordenar",
    viewPurchased: "Comprados",
    colItem: "Item",
    colBrand: "Marca",
    pageBuy: "Comprar \u2197",
    pageMarkBought: "Marcar como comprado",
    pageBackToWant: "Voltar para a lista",
    pagePriority: "prioridade {priority}",
    pageStore: "{store} (loja)",
    pageBoughtOn: "comprado em {date}",
    pageReasonPlaceholder: "Novo motivo\u2026 (Enter adiciona)",
    pageReasonsEmpty: "Por que voc\xEA quer isso? O que muda quando tiver?",
    colPrice: "Pre\xE7o",
    colAmount: "Valor",
    colCurrency: "Moeda",
    colCategories: "Categorias",
    colPriority: "Prioridade",
    colStore: "Loja",
    colLink: "Link",
    colStatus: "Status",
    colPurchasedOn: "Comprado em",
    noCategory: "(sem categoria)",
    viewSmart: "Categorias inteligentes",
    others: "Outros",
    emptyView: "Nenhum item ainda.",
    upgradeTitle: "Atualizar notas antigas",
    upgradeBody: "{count} notas em {folder} v\xE3o ganhar a p\xE1gina do item: a foto vai para a propriedade cover e os motivos viram uma lista. O resto de cada nota fica como est\xE1.",
    upgradeBodyBases: "{count} notas e {bases} bases em {folder} v\xE3o ganhar a p\xE1gina do item: nas notas, a foto vai para a propriedade cover e os motivos viram uma lista. As bases passam a mostrar a propriedade cover no lugar da f\xF3rmula da foto. O resto fica como est\xE1.",
    upgradeRun: "Atualizar",
    upgradeCancel: "Cancelar",
    upgradeNone: "Todas as notas j\xE1 usam a p\xE1gina do item.",
    upgradeDone: "{count} notas atualizadas.",
    upgradeDoneBases: "{count} notas e {bases} bases atualizadas.",
    upgradeSkipped: "Puladas, n\xE3o deu para ler: {names}"
  }
};
var LOCALE_DEFAULTS = {
  en: {
    currencies: "$ = 1,234.56\n\u20AC = 1.234,56\nR$ = 1.234,56",
    defaultCurrency: "$",
    priorities: "high, medium, low",
    defaultPriority: "medium",
    status: "want",
    boughtStatus: "purchased",
    photoHeading: "Photo",
    reasonsHeading: "Why I want it",
    linkLabel: "Link to buy"
  },
  pt: {
    currencies: "R$ = 1.234,56\n$ = 1,234.56\n\u20AC = 1.234,56",
    defaultCurrency: "R$",
    priorities: "alta, m\xE9dia, baixa",
    defaultPriority: "m\xE9dia",
    status: "quero",
    boughtStatus: "comprado",
    photoHeading: "Foto",
    reasonsHeading: "Por que eu quero",
    linkLabel: "Link para comprar"
  }
};
var DEFAULT_SETTINGS = {
  language: "auto",
  folder: "Wishlist",
  tag: "wishlist",
  extraFrontmatter: "",
  hiddenProperties: "",
  fillNewNotes: true,
  interceptNewButton: true
};
var IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "avif", "svg", "bmp"];
var IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif"
};
module.exports = class QuickWishlist extends Plugin {
  async onload() {
    const saved = await this.loadData();
    const lang = resolveLanguage(saved?.language ?? DEFAULT_SETTINGS.language);
    this.settings = Object.assign({}, DEFAULT_SETTINGS, LOCALE_DEFAULTS[lang], saved);
    if (saved && saved.boughtStatus === void 0) this.settings.boughtStatus = LOCALE_DEFAULTS[lang].boughtStatus;
    this.addSettingTab(new QuickWishlistSettingTab(this.app, this));
    this.registerMarkdownCodeBlockProcessor("wish", (_src, el, ctx) => ctx.addChild(new WishPage(this, el, ctx.sourcePath)));
    this.registerMarkdownCodeBlockProcessor("reasons", (src, el, ctx) => {
      const file = this.app.vault.getFileByPath(ctx.sourcePath);
      if (!file) return;
      const save = (items) => this.app.vault.process(
        file,
        (text) => writeBlock(text, "reasons", this.settings.reasonsHeading, items.map((x) => `- ${x}`))
      ).catch(console.error);
      renderEditableList(el.createDiv("kit-section"), readItems(src), save, {
        t: (k, v) => this.t(k, v),
        placeholder: this.t("pageReasonPlaceholder"),
        empty: this.t("pageReasonsEmpty")
      });
    });
    this.addCommand({
      id: "new-item",
      name: this.t("cmdNewItem"),
      callback: () => new WishlistModal(this.app, this).open()
    });
    this.addCommand({
      id: "create-base",
      name: this.t("cmdCreateBase"),
      callback: () => this.createBase()
    });
    this.addCommand({
      id: "fill-note",
      name: this.t("cmdFillNote"),
      editorCallback: async (_editor, view) => {
        if (view.file) await this.fillNote(view.file, { force: true });
      }
    });
    this.addCommand({
      id: "toggle-purchased",
      name: this.t("cmdTogglePurchased"),
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || !this.isWishlistNote(file)) return false;
        if (!checking) this.togglePurchased(file).catch(console.error);
        return true;
      }
    });
    this.addCommand({
      id: "upgrade-notes",
      name: this.t("cmdUpgrade"),
      callback: () => this.upgradeNotes().catch(console.error)
    });
    if (BasesView && typeof this.registerBasesView === "function") {
      this.registerBasesView(SMART_VIEW, {
        name: this.t("viewSmart"),
        icon: "lucide-sparkles",
        factory: (controller, containerEl) => new SmartCategoriesView(controller, containerEl, this)
      });
    }
    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(this.app.vault.on("create", (file) => {
        if (!this.settings.fillNewNotes || !this.isWishlistNote(file)) return;
        window.setTimeout(() => this.fillNote(file).catch(console.error), 1200);
      }));
      this.indexBases();
      this.registerEvent(this.app.vault.on("create", (f) => this.indexBase(f)));
      this.registerEvent(this.app.vault.on("modify", (f) => this.indexBase(f)));
      this.registerEvent(this.app.vault.on("rename", (f, old) => {
        this.wishlistBases.delete(old);
        this.indexBase(f);
      }));
      this.registerEvent(this.app.vault.on("delete", (f) => this.wishlistBases.delete(f.path)));
    });
    const intercept = (e) => {
      if (!this.settings.interceptNewButton) return;
      if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
      const button = e.target instanceof Element && e.target.closest(".bases-toolbar-new-item-menu");
      if (!button) return;
      const base = this.baseFileFor(button);
      if (!base || !this.wishlistBases?.has(base.path)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      new WishlistModal(this.app, this).open();
    };
    this.registerDomEvent(document, "click", intercept, { capture: true });
    this.registerDomEvent(document, "keydown", intercept, { capture: true });
    this.hiddenStyle = document.head.createEl("style", { attr: { id: "qw-hidden-properties" } });
    this.register(() => this.hiddenStyle.remove());
    this.updateHiddenStyle();
    const mark = () => this.app.workspace.iterateAllLeaves((leaf) => {
      const file = leaf.view?.file;
      leaf.view?.containerEl?.toggleClass("qw-wishlist-note", !!file && this.isWishlistNote(file));
    });
    this.app.workspace.onLayoutReady(mark);
    this.registerEvent(this.app.workspace.on("file-open", mark));
    this.registerEvent(this.app.workspace.on("layout-change", mark));
    this.register(() => document.querySelectorAll(".qw-wishlist-note").forEach((el) => el.removeClass("qw-wishlist-note")));
  }
  updateHiddenStyle() {
    this.hiddenStyle.textContent = this.list(this.settings.hiddenProperties).map((key) => `.qw-wishlist-note .metadata-property[data-property-key="${CSS.escape(key)}"] { display: none; }`).join("\n");
  }
  get lang() {
    return resolveLanguage(this.settings.language);
  }
  t(key, vars = {}) {
    this.translate ??= createT(STRINGS, () => this.lang);
    return this.translate(key, vars);
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  // Bases whose items live in the wishlist folder, kept in memory so the
  // click handler can decide synchronously.
  async indexBases() {
    this.wishlistBases = this.wishlistBases ?? /* @__PURE__ */ new Set();
    for (const f of this.app.vault.getFiles()) await this.indexBase(f);
  }
  async indexBase(file) {
    this.wishlistBases = this.wishlistBases ?? /* @__PURE__ */ new Set();
    if (!(file instanceof TFile) || file.extension !== "base") return;
    const text = await this.app.vault.cachedRead(file);
    const folder = JSON.stringify(this.folder).slice(1, -1);
    const usesFolder = text.includes(`inFolder("${folder}")`) || new RegExp(`^newItemFolder:\\s*"?${escapeRegExp(folder)}"?\\s*$`, "m").test(text);
    if (usesFolder) this.wishlistBases.add(file.path);
    else this.wishlistBases.delete(file.path);
  }
  baseFileFor(el) {
    const embed = el.closest(".internal-embed[src]");
    if (embed) {
      const link = embed.getAttribute("src").split("#")[0];
      const leaf = this.leafFor(el);
      return this.app.metadataCache.getFirstLinkpathDest(link, leaf?.view?.file?.path ?? "");
    }
    return this.leafFor(el)?.view?.file ?? null;
  }
  leafFor(el) {
    let found = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!found && leaf.view?.containerEl?.contains(el)) found = leaf;
    });
    return found;
  }
  get folder() {
    return normalizePath(this.settings.folder || DEFAULT_SETTINGS.folder);
  }
  isWishlistNote(file) {
    return file instanceof TFile && file.extension === "md" && file.path.startsWith(`${this.folder}/`);
  }
  list(text) {
    return String(text ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  currencies() {
    const result = [];
    for (const line of String(this.settings.currencies ?? "").split("\n")) {
      const [symbol, sample] = line.split("=").map((s) => s?.trim());
      if (!symbol) continue;
      const m = (sample ?? "").match(/^1(\D)234(\D)56$/);
      result.push({ symbol, thousands: m ? m[1] : ",", decimal: m ? m[2] : "." });
    }
    return result.length ? result : [{ symbol: "$", thousands: ",", decimal: "." }];
  }
  currency(symbol) {
    const all = this.currencies();
    return all.find((c) => c.symbol === symbol) ?? all[0];
  }
  valuesOf(key) {
    const seen = /* @__PURE__ */ new Set();
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (!this.isWishlistNote(f)) continue;
      const v = this.app.metadataCache.getFileCache(f)?.frontmatter?.[key];
      for (const x of [].concat(v ?? [])) if (x) seen.add(String(x));
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }
  // Next multiple of 10 after the highest rank: new items go to the end.
  nextRank() {
    const ranks = this.app.vault.getMarkdownFiles().filter((f) => this.isWishlistNote(f)).map((f) => Number(this.app.metadataCache.getFileCache(f)?.frontmatter?.rank)).filter((n) => Number.isFinite(n));
    return ranks.length ? Math.floor(Math.max(...ranks) / 10) * 10 + 10 : 10;
  }
  extraFrontmatter() {
    const text = String(this.settings.extraFrontmatter ?? "").trim();
    if (!text) return {};
    try {
      const parsed = parseYaml(text);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      new Notice(this.t("badYaml"));
      return {};
    }
  }
  defaultProperties() {
    const s = this.settings;
    return {
      brand: null,
      ...this.extraFrontmatter(),
      price: null,
      currency: this.currency(s.defaultCurrency).symbol,
      rank: this.nextRank(),
      categories: [],
      priority: s.defaultPriority,
      status: s.status,
      link: null,
      store: null,
      created: window.moment().format("YYYY-MM-DD"),
      tags: [s.tag]
    };
  }
  // Body of a new note. The photo lives in the "cover" property.
  sections(reasons = "") {
    return `\`\`\`wish
\`\`\`

## ${this.settings.reasonsHeading}

\`\`\`reasons
${reasons ? reasons + "\n" : ""}\`\`\`
`;
  }
  // Image of an item: the "cover" property, or the first image embedded in the note (old notes).
  coverOf(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    let link = String(cache?.frontmatter?.cover ?? "").trim().replace(/^!?\[\[|\]\]$/g, "").split("|")[0];
    if (!link) {
      link = (cache?.embeds ?? []).map((e) => e.link.split("|")[0]).find((l) => IMAGE_EXTENSIONS.includes(l.split(".").pop().toLowerCase())) ?? "";
    }
    if (!link) return null;
    if (/^https?:\/\//.test(link)) return link;
    const target = this.app.metadataCache.getFirstLinkpathDest(link, file.path);
    return target ? this.app.vault.getResourcePath(target) : null;
  }
  async fillNote(file, { force = false } = {}) {
    if (!this.app.vault.getFileByPath(file.path)) return;
    if (!force && !this.isWishlistNote(file)) return;
    const defaults = this.defaultProperties();
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      for (const [k, v] of Object.entries(defaults)) if (!(k in fm)) fm[k] = v;
      for (const [k, v] of Object.entries(fm)) {
        if (Array.isArray(v)) fm[k] = v.filter((x) => x !== "" && x !== null);
      }
    });
    await this.app.vault.process(file, (text) => {
      const body = text.replace(/^---\n[\s\S]*?\n---\n?/, "");
      return body.trim() ? text : text.replace(/\n*$/, "\n") + this.sections();
    });
  }
  // Switches the open item between "want" and "purchased", keeping the date.
  async togglePurchased(file) {
    const s = this.settings;
    let purchased = false;
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      purchased = fm.status !== s.boughtStatus;
      fm.status = purchased ? s.boughtStatus : s.status;
      if (purchased) fm.purchased = window.moment().format("YYYY-MM-DD");
      else delete fm.purchased;
    });
    new Notice(this.t(purchased ? "purchased" : "backToWant", { name: file.basename }));
  }
  // Headings of old notes in both languages, plus whatever the user set.
  upgradeOptions() {
    const s = this.settings;
    return {
      photoHeadings: [LOCALE_DEFAULTS.en.photoHeading, LOCALE_DEFAULTS.pt.photoHeading, s.photoHeading].filter(Boolean),
      reasonsHeadings: [LOCALE_DEFAULTS.en.reasonsHeading, LOCALE_DEFAULTS.pt.reasonsHeading, s.reasonsHeading].filter(Boolean),
      reasonsHeading: s.reasonsHeading
    };
  }
  // Old notes get the page format; the wishlist bases stop reading the photo from a formula.
  // Each file is rewritten in a single write, so a failure never leaves one half done.
  async upgradeNotes() {
    const opts = this.upgradeOptions();
    const notes = [];
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (!this.isWishlistNote(f)) continue;
      if (upgradeNote(await this.app.vault.cachedRead(f), opts) !== null) notes.push(f);
    }
    const bases = [];
    for (const path of this.wishlistBases ?? []) {
      const f = this.app.vault.getFileByPath(path);
      if (f && upgradeBase(await this.app.vault.cachedRead(f)) !== null) bases.push(f);
    }
    if (!notes.length && !bases.length) {
      new Notice(this.t("upgradeNone"));
      return;
    }
    const vars = { count: notes.length, bases: bases.length, folder: this.folder };
    new ConfirmModal(this.app, {
      title: this.t("upgradeTitle"),
      body: this.t(bases.length ? "upgradeBodyBases" : "upgradeBody", vars),
      confirm: this.t("upgradeRun"),
      cancel: this.t("upgradeCancel"),
      onConfirm: async () => {
        const skipped = [];
        let doneNotes = 0;
        let doneBases = 0;
        for (const f of [...notes, ...bases]) {
          const isBase = f.extension === "base";
          try {
            await this.app.vault.process(f, (text) => (isBase ? upgradeBase(text) : upgradeNote(text, opts)) ?? text);
            if (isBase) doneBases++;
            else doneNotes++;
          } catch (err) {
            console.error(err);
            skipped.push(isBase ? f.name : f.basename);
          }
        }
        const msg = bases.length ? this.t("upgradeDoneBases", { count: doneNotes, bases: doneBases }) : this.t("upgradeDone", { count: doneNotes });
        new Notice(skipped.length ? `${msg}
${this.t("upgradeSkipped", { names: skipped.join(", ") })}` : msg, 8e3);
      }
    }).open();
  }
  async createBase() {
    const path = normalizePath(`${this.folder}/Wishlist.base`);
    if (this.app.vault.getAbstractFileByPath(path)) {
      new Notice(this.t("baseExists", { path }));
      return;
    }
    if (!this.app.vault.getAbstractFileByPath(this.folder)) await this.app.vault.createFolder(this.folder);
    const file = await this.app.vault.create(path, buildBase(this));
    await this.app.workspace.getLeaf(false).openFile(file);
  }
};
function priceFormula(plugin) {
  const fmt = (c) => {
    let expr = "price.toFixed(2)";
    if (c.decimal !== ".") expr += `.replace(".", ${JSON.stringify(c.decimal)})`;
    expr += `.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ${JSON.stringify(c.thousands)})`;
    return `${JSON.stringify(c.symbol + " ")} + ${expr}`;
  };
  const all = plugin.currencies();
  let chain = fmt(all[0]);
  for (const c of all.slice(1).reverse()) chain = `if(currency == ${JSON.stringify(c.symbol)}, ${fmt(c)}, ${chain})`;
  return `if(price.isEmpty(), "", ${chain})`;
}
function buildBase(plugin) {
  const s = plugin.settings;
  const t = (k) => plugin.t(k);
  const q = (text) => `'${String(text).replace(/'/g, "''")}'`;
  const status = (value) => q(`status == ${JSON.stringify(value)}`);
  const cards = `    image: note.cover
    imageAspectRatio: 1
    cardSize: 300`;
  return `newItemFolder: ${JSON.stringify(plugin.folder)}
filters:
  and:
    - ${q(`file.inFolder(${JSON.stringify(plugin.folder)})`)}
formulas:
  value: ${q(priceFormula(plugin))}
  buy: ${q(`if(link.isEmpty(), "", link(link, ${JSON.stringify(s.linkLabel)}))`)}
  main_category: ${q(`if(categories.isEmpty(), ${JSON.stringify(t("noCategory"))}, list(categories)[0])`)}
properties:
  file.name:
    displayName: ${JSON.stringify(t("colItem"))}
  note.brand:
    displayName: ${JSON.stringify(t("colBrand"))}
  note.rank:
    displayName: "#"
  formula.value:
    displayName: ${JSON.stringify(t("colPrice"))}
  note.price:
    displayName: ${JSON.stringify(t("colAmount"))}
  note.currency:
    displayName: ${JSON.stringify(t("colCurrency"))}
  note.categories:
    displayName: ${JSON.stringify(t("colCategories"))}
  note.priority:
    displayName: ${JSON.stringify(t("colPriority"))}
  note.store:
    displayName: ${JSON.stringify(t("colStore"))}
  formula.buy:
    displayName: ${JSON.stringify(t("colLink"))}
  note.status:
    displayName: ${JSON.stringify(t("colStatus"))}
  note.purchased:
    displayName: ${JSON.stringify(t("colPurchasedOn"))}
views:
  - type: cards
    name: ${JSON.stringify(t("viewAll"))}
    order:
      - file.name
      - brand
      - status
      - formula.value
      - categories
      - priority
      - store
      - formula.buy
    sort:
      - property: rank
        direction: ASC
${cards}
  - type: cards
    name: ${JSON.stringify(t("viewWant"))}
    filters:
      and:
        - ${status(s.status)}
    order:
      - file.name
      - brand
      - formula.value
      - categories
      - priority
      - store
      - formula.buy
    sort:
      - property: rank
        direction: ASC
${cards}
  - type: ${SMART_VIEW}
    name: ${JSON.stringify(t("viewByCategory"))}
    filters:
      and:
        - ${status(s.status)}
    order:
      - file.name
      - brand
      - categories
      - formula.value
      - formula.buy
      - priority
    sort:
      - property: rank
        direction: ASC
  - type: table
    name: ${JSON.stringify(t("viewReorder"))}
    filters:
      and:
        - ${status(s.status)}
    order:
      - rank
      - file.name
      - brand
      - price
      - currency
      - formula.value
      - categories
      - priority
      - store
    sort:
      - property: rank
        direction: ASC
  - type: table
    name: ${JSON.stringify(t("viewPurchased"))}
    filters:
      and:
        - ${status(s.boughtStatus)}
    order:
      - file.name
      - brand
      - formula.value
      - purchased
      - store
      - formula.buy
    sort:
      - property: purchased
        direction: DESC
`;
}
function smartGroups(items, categoriesOf, others) {
  const catsOf = new Map(items.map((item) => [item, categoriesOf(item)]));
  const members = /* @__PURE__ */ new Map();
  for (const [item, cats] of catsOf) {
    for (const c of cats) (members.get(c) ?? members.set(c, /* @__PURE__ */ new Set()).get(c)).add(item);
  }
  const isSubcategory = (a, b) => {
    const A = members.get(a), B = members.get(b);
    return a !== b && A.size < B.size && [...A].every((item) => B.has(item));
  };
  const banned = /* @__PURE__ */ new Map();
  let assignment = /* @__PURE__ */ new Map();
  for (let round = 0; round < 20; round++) {
    assignment = /* @__PURE__ */ new Map();
    for (const [item, cats] of catsOf) {
      const candidates = cats.filter((c) => members.get(c).size >= 2 && !banned.get(item)?.has(c));
      if (!candidates.length) {
        assignment.set(item, others);
        continue;
      }
      const specific = candidates.filter((c) => !candidates.some((d) => isSubcategory(d, c)));
      specific.sort((a, b) => members.get(b).size - members.get(a).size || cats.indexOf(a) - cats.indexOf(b));
      assignment.set(item, specific[0]);
    }
    const size2 = /* @__PURE__ */ new Map();
    for (const g of assignment.values()) size2.set(g, (size2.get(g) ?? 0) + 1);
    let changed = false;
    for (const [item, g] of assignment) {
      if (size2.get(g) !== 1 || (members.get(g)?.size ?? 0) < 2) continue;
      const alternatives = catsOf.get(item).filter((c) => c !== g && members.get(c).size >= 2 && !banned.get(item)?.has(c));
      if (!alternatives.length) continue;
      (banned.get(item) ?? banned.set(item, /* @__PURE__ */ new Set()).get(item)).add(g);
      changed = true;
    }
    if (!changed) break;
  }
  const size = /* @__PURE__ */ new Map();
  for (const g of assignment.values()) size.set(g, (size.get(g) ?? 0) + 1);
  const groups = /* @__PURE__ */ new Map();
  for (const item of items) {
    let g = assignment.get(item);
    if (size.get(g) < 2) g = others;
    (groups.get(g) ?? groups.set(g, []).get(g)).push(item);
  }
  return [...groups.entries()].sort(([a, x], [b, y]) => (a === others) - (b === others) || y.length - x.length || a.localeCompare(b));
}
var SmartCategoriesView = BasesView ? class extends BasesView {
  constructor(controller, containerEl, plugin) {
    super(controller);
    this.type = SMART_VIEW;
    this.plugin = plugin;
    this.rootEl = containerEl.createDiv("qw-smart");
  }
  onDataUpdated() {
    this.render();
  }
  categoriesOf(entry) {
    const raw = this.app.metadataCache.getFileCache(entry.file)?.frontmatter?.categories;
    return [...new Set([].concat(raw ?? []).map((c) => String(c ?? "").trim()).filter(Boolean))];
  }
  photoOf(file) {
    return this.plugin.coverOf(file);
  }
  render() {
    const root = this.rootEl;
    root.empty();
    const entries = this.data?.data ?? [];
    if (!entries.length) {
      root.createDiv({ cls: "qw-smart-empty", text: this.plugin.t("emptyView") });
      return;
    }
    const props = (this.config?.getOrder?.() ?? []).filter((p) => p !== "file.name");
    for (const [name, items] of smartGroups(entries, (e) => this.categoriesOf(e), this.plugin.t("others"))) {
      const group = root.createDiv("qw-smart-group");
      const head = group.createDiv("qw-smart-heading");
      head.createSpan({ text: name });
      head.createSpan({ cls: "qw-smart-count", text: String(items.length) });
      const grid = group.createDiv("qw-smart-grid");
      for (const entry of items) this.renderCard(grid, entry, props);
    }
  }
  renderCard(grid, entry, props) {
    const file = entry.file;
    const card = grid.createDiv({ cls: "qw-card", attr: { tabindex: "0" } });
    const cover = card.createDiv("qw-card-cover");
    const photo = this.photoOf(file);
    if (photo) cover.createEl("img", { attr: { src: photo, alt: file.basename } });
    const body = card.createDiv("qw-card-body");
    body.createDiv({ cls: "qw-card-title", text: file.basename });
    for (const prop of props) {
      const row = body.createDiv("qw-card-prop");
      row.createDiv({ cls: "qw-card-label", text: this.config.getDisplayName(prop) });
      const valueEl = row.createDiv("qw-card-value");
      const value = entry.getValue(prop);
      const text = value == null ? "" : String(value.toString() ?? "");
      if (!text || text === "null") valueEl.setText("-");
      else if (/^https?:\/\//i.test(text)) {
        const a = valueEl.createEl("a", {
          cls: "external-link",
          href: text,
          text: prop.startsWith("formula.") ? this.plugin.settings.linkLabel : text
        });
        a.addEventListener("click", (e) => e.stopPropagation());
      } else valueEl.setText(text);
    }
    const open = (e) => this.app.workspace.getLeaf(Keymap.isModEvent(e)).openFile(file);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") open(e);
    });
  }
} : null;
var WishPage = class extends MarkdownRenderChild {
  constructor(plugin, el, path) {
    super(el);
    this.plugin = plugin;
    this.path = path;
  }
  // The file is kept as an object, so the page still follows its note after a rename.
  onload() {
    this.file = this.plugin.app.vault.getFileByPath(this.path);
    if (!this.file) return;
    this.render();
    this.registerEvent(this.plugin.app.metadataCache.on("changed", (f) => {
      if (f === this.file) this.render();
    }));
  }
  render() {
    const p = this.plugin;
    const file = this.file;
    const fm = p.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const t = (k, v) => p.t(k, v);
    const bought = fm.status === p.settings.boughtStatus;
    const present = (v) => v !== null && v !== void 0 && v !== "";
    const actions = [];
    const link = String(fm.link ?? "").trim();
    if (link) actions.push({ text: t("pageBuy"), href: /^https?:\/\//i.test(link) ? link : `https://${link}` });
    actions.push({ text: t(bought ? "pageBackToWant" : "pageMarkBought"), cta: !bought, onClick: () => p.togglePurchased(file).catch(console.error) });
    this.containerEl.empty();
    renderHeader(this.containerEl.createDiv("kit-page qw-page"), {
      image: p.coverOf(file),
      title: file.basename,
      lines: [
        [fm.brand, present(fm.price) ? formatMoney(fm.price, p.currency(fm.currency)) : "", fm.priority ? t("pagePriority", { priority: fm.priority }) : ""],
        [present(fm.rank) ? `#${fm.rank}` : "", fm.store ? t("pageStore", { store: fm.store }) : "", [].concat(fm.categories ?? []).filter(Boolean).join(" \u203A ")],
        [bought && fm.purchased ? t("pageBoughtOn", { date: formatDate(String(fm.purchased), p.lang) }) : ""]
      ],
      actions
    });
  }
};
var ConfirmModal = class extends Modal {
  constructor(app, opts) {
    super(app);
    this.opts = opts;
  }
  onOpen() {
    const { contentEl, opts } = this;
    this.setTitle(opts.title);
    contentEl.createEl("p", { text: opts.body });
    new Setting(contentEl).addButton((b) => b.setButtonText(opts.cancel).onClick(() => this.close())).addButton((b) => b.setButtonText(opts.confirm).setCta().onClick(() => {
      this.close();
      opts.onConfirm().catch(console.error);
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
};
var WishlistModal = class extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    const s = plugin.settings;
    this.step = 0;
    this.data = {
      product: "",
      brand: "",
      price: "",
      currency: plugin.currency(s.defaultCurrency).symbol,
      categories: [],
      categoryDraft: "",
      priority: s.defaultPriority,
      rank: "",
      link: "",
      store: "",
      reasons: ""
    };
    this.image = null;
  }
  t(key, vars) {
    return this.plugin.t(key, vars);
  }
  onOpen() {
    this.containerEl.addClass("qw-modal");
    this.scope.register(["Mod"], "Enter", () => {
      this.save();
      return false;
    });
    this.render();
  }
  onClose() {
    if (this.image?.previewUrl) URL.revokeObjectURL(this.image.previewUrl);
    this.contentEl.empty();
  }
  render() {
    const { contentEl } = this;
    contentEl.empty();
    const titles = [this.t("stepDetails"), this.t("stepPhoto"), this.t("stepReasons")];
    const head = contentEl.createDiv("qw-head");
    head.createEl("h2", { text: this.t("formTitle") });
    const steps = head.createDiv("qw-steps");
    titles.forEach((title, i) => steps.createSpan({
      text: `${i + 1}. ${title}`,
      cls: i === this.step ? "is-active" : i < this.step ? "is-done" : ""
    }));
    const body = contentEl.createDiv("qw-body");
    if (this.step === 0) this.renderDetails(body);
    if (this.step === 1) this.renderPhoto(body);
    if (this.step === 2) this.renderReasons(body);
    const footer = contentEl.createDiv("qw-footer");
    footer.createSpan({ cls: "qw-hint", text: this.t(this.step < 2 ? "hintNext" : "hintSave") });
    const buttons = footer.createDiv("qw-buttons");
    if (this.step > 0) buttons.createEl("button", { text: this.t("back") }).onclick = () => this.go(this.step - 1);
    const main = buttons.createEl("button", { text: this.t(this.step < 2 ? "next" : "save"), cls: "mod-cta" });
    main.onclick = () => this.step < 2 ? this.next() : this.save();
  }
  field(parent, label, optional) {
    const row = parent.createDiv("qw-field");
    const el = row.createEl("label", { text: label });
    if (optional) el.createSpan({ text: ` ${this.t("optional")}`, cls: "qw-optional" });
    return row;
  }
  text(parent, key, label, { optional = false, suggestions = null } = {}) {
    const row = this.field(parent, label, optional);
    const input = row.createEl("input", { type: "text" });
    input.value = this.data[key];
    const suggest = suggestions?.length ? new ValueSuggest(this.app, input, suggestions) : null;
    input.addEventListener("input", () => this.data[key] = input.value);
    this.enterGoesNext(input, () => suggest?.isOpen);
    return input;
  }
  select(parent, key, label, options, onChange) {
    const row = this.field(parent, label, false);
    const sel = row.createEl("select", { cls: "dropdown" });
    options.forEach((o) => sel.createEl("option", { value: o, text: o }));
    sel.value = this.data[key];
    sel.addEventListener("change", () => {
      this.data[key] = sel.value;
      onChange?.();
    });
    this.enterGoesNext(sel);
    return sel;
  }
  enterGoesNext(el, busy = () => false) {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.isComposing && !busy()) {
        e.preventDefault();
        this.next();
      }
    });
  }
  renderDetails(body) {
    const p = this.plugin;
    const product = this.text(body, "product", this.t("product"));
    this.text(body, "brand", this.t("brand"), { optional: true, suggestions: p.valuesOf("brand") });
    const price = this.text(body, "price", this.t("price"), { optional: true });
    price.setAttr("inputmode", "decimal");
    price.addEventListener("input", () => {
      price.value = formatPrice(price.value, p.currency(this.data.currency));
      this.data.price = price.value;
    });
    const symbols = p.currencies().map((c) => c.symbol);
    let previous = this.data.currency;
    this.select(body, "currency", this.t("currency"), symbols, () => {
      const n = parsePrice(this.data.price, p.currency(previous));
      const c = p.currency(this.data.currency);
      this.data.price = n === null ? "" : formatPrice(String(n).replace(".", c.decimal), c);
      price.value = this.data.price;
      previous = this.data.currency;
    });
    this.categoriesField(body);
    this.select(body, "priority", this.t("priority"), p.list(p.settings.priorities));
    const rank = this.text(body, "rank", this.t("rank"), { optional: true });
    rank.setAttrs({ inputmode: "decimal", placeholder: this.t("rankPlaceholder", { rank: p.nextRank() }) });
    rank.addEventListener("input", () => {
      const [int, ...rest] = rank.value.replace(/,/g, ".").replace(/[^0-9.]/g, "").split(".");
      rank.value = rest.length ? `${int}.${rest.join("")}` : int;
      this.data.rank = rank.value;
    });
    this.text(body, "link", this.t("link"), { optional: true });
    this.text(body, "store", this.t("store"), { optional: true, suggestions: p.valuesOf("store") });
    window.setTimeout(() => product.focus(), 0);
  }
  // Several categories as chips: Enter or comma adds, Backspace on an empty
  // field removes the last one, Enter on an empty field goes to the next step.
  categoriesField(body) {
    const row = this.field(body, this.t("category"), true);
    const box = row.createDiv("qw-chips");
    const input = box.createEl("input", { type: "text", attr: { placeholder: this.t("categoryPlaceholder") } });
    input.value = this.data.categoryDraft;
    const draw = () => {
      box.querySelectorAll(".qw-chip").forEach((el) => el.remove());
      for (const c of this.data.categories) {
        const chip = createDiv({ cls: "qw-chip", text: c });
        const x = chip.createSpan({ cls: "qw-chip-remove", text: "\xD7" });
        x.addEventListener("click", () => {
          this.data.categories = this.data.categories.filter((v) => v !== c);
          draw();
          input.focus();
        });
        box.insertBefore(chip, input);
      }
      input.placeholder = this.data.categories.length ? "" : this.t("categoryPlaceholder");
    };
    const add = (text) => {
      for (const c of String(text).split(",").map((v) => v.trim()).filter(Boolean)) {
        if (!this.data.categories.includes(c)) this.data.categories.push(c);
      }
      input.value = "";
      this.data.categoryDraft = "";
      draw();
    };
    const suggest = new ValueSuggest(
      this.app,
      input,
      this.plugin.valuesOf("categories"),
      (v) => add(v),
      () => this.data.categories
    );
    input.addEventListener("input", () => {
      if (input.value.includes(",")) add(input.value);
      else this.data.categoryDraft = input.value;
    });
    input.addEventListener("keydown", (e) => {
      if (e.isComposing || e.ctrlKey || e.metaKey) return;
      if (e.key === "Enter" && !suggest.isOpen) {
        e.preventDefault();
        if (input.value.trim()) add(input.value);
        else this.next();
      } else if (e.key === "Backspace" && !input.value && this.data.categories.length) {
        this.data.categories.pop();
        draw();
      }
    });
    box.addEventListener("click", (e) => {
      if (e.target === box) input.focus();
    });
    draw();
  }
  renderPhoto(body) {
    const zone = body.createDiv({ cls: "qw-drop", attr: { tabindex: "0" } });
    const show = () => {
      zone.empty();
      if (this.image) {
        zone.createEl("img", { attr: { src: this.image.previewUrl } });
        zone.createDiv({ text: this.t("pasteReplace"), cls: "qw-hint" });
      } else {
        zone.createDiv({ text: this.t("pasteHere"), cls: "qw-drop-title" });
        zone.createDiv({ text: this.t("pasteOptional"), cls: "qw-hint" });
      }
    };
    show();
    zone.addEventListener("paste", async (e) => {
      e.preventDefault();
      const file = [...e.clipboardData?.files ?? []].find((f) => f.type.startsWith("image/"));
      try {
        if (file) {
          this.setImage(await file.arrayBuffer(), file.type);
        } else {
          const url = (e.clipboardData?.getData("text") ?? "").trim();
          if (!/^https?:\/\//i.test(url)) {
            new Notice(this.t("nothingToPaste"));
            return;
          }
          zone.empty();
          zone.createDiv({ text: this.t("downloading"), cls: "qw-hint" });
          const res = await requestUrl({ url });
          this.setImage(res.arrayBuffer, res.headers["content-type"] ?? "");
        }
      } catch (err) {
        console.error(err);
        new Notice(this.t("imageFailed"));
      }
      show();
    });
    zone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.next();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && this.image) {
        URL.revokeObjectURL(this.image.previewUrl);
        this.image = null;
        show();
      }
    });
    window.setTimeout(() => zone.focus(), 0);
  }
  setImage(buffer, type) {
    const mime = String(type).split(";")[0].trim();
    if (this.image?.previewUrl) URL.revokeObjectURL(this.image.previewUrl);
    const previewUrl = URL.createObjectURL(new Blob([buffer], { type: mime || "image/png" }));
    this.image = { buffer, ext: IMAGE_TYPES[mime] ?? "png", previewUrl };
  }
  renderReasons(body) {
    const row = this.field(body, this.t("reasons"), true);
    const area = row.createEl("textarea", { cls: "qw-reasons" });
    area.value = this.data.reasons || "- ";
    area.addEventListener("input", () => this.data.reasons = area.value);
    area.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing) return;
      e.preventDefault();
      const { selectionStart: start, selectionEnd: end, value } = area;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      if (value.slice(lineStart, start).trim() === "-" && value.slice(end).split("\n")[0].trim() === "") {
        area.setRangeText("", lineStart, end, "end");
      } else {
        area.setRangeText("\n- ", start, end, "end");
      }
      this.data.reasons = area.value;
    });
    window.setTimeout(() => {
      area.focus();
      area.setSelectionRange(area.value.length, area.value.length);
    }, 0);
  }
  go(step) {
    this.step = step;
    this.render();
  }
  next() {
    if (this.data.categoryDraft.trim()) {
      for (const c of this.data.categoryDraft.split(",").map((v) => v.trim()).filter(Boolean)) {
        if (!this.data.categories.includes(c)) this.data.categories.push(c);
      }
      this.data.categoryDraft = "";
    }
    if (this.step === 0 && !this.data.product.trim()) {
      new Notice(this.t("productRequired"));
      return;
    }
    if (this.step < 2) this.go(this.step + 1);
    else this.save();
  }
  async save() {
    if (this.saving) return;
    if (!this.data.product.trim()) {
      this.go(0);
      new Notice(this.t("productRequired"));
      return;
    }
    this.saving = true;
    try {
      const file = await createItem(this.plugin, this.data, this.image);
      this.close();
      new Notice(this.t("added", { name: file.basename }));
      await this.app.workspace.getLeaf(false).openFile(file);
    } catch (err) {
      console.error(err);
      new Notice(this.t("saveFailed"));
    } finally {
      this.saving = false;
    }
  }
};
async function createItem(plugin, data, image) {
  const { app } = plugin;
  const { vault, fileManager } = app;
  const name = data.product.trim().replace(/[\\/:*?"<>|#^[\]]/g, "-");
  if (!vault.getAbstractFileByPath(plugin.folder)) await vault.createFolder(plugin.folder);
  const notePath = freePath(vault, `${plugin.folder}/${name}`, "md");
  let cover = null;
  if (image) {
    const imagePath = await fileManager.getAvailablePathForAttachment(`${name}.${image.ext}`, notePath);
    const imageFile = await vault.createBinary(imagePath, image.buffer);
    cover = `[[${app.metadataCache.fileToLinktext(imageFile, notePath)}]]`;
  }
  const typedRank = Number(data.rank);
  const props = plugin.defaultProperties();
  Object.assign(props, {
    cover,
    price: parsePrice(data.price, plugin.currency(data.currency)),
    currency: data.currency,
    rank: data.rank && Number.isFinite(typedRank) ? typedRank : props.rank,
    categories: [...new Set([...data.categories, ...String(data.categoryDraft ?? "").split(",")].map((c) => c.trim()).filter(Boolean))],
    priority: data.priority,
    link: data.link.trim() || null,
    brand: data.brand.trim() || null,
    store: data.store.trim() || null
  });
  const reasons = data.reasons.split("\n").map((l) => l.trim().replace(/^-\s*/, "")).filter(Boolean).map((l) => `- ${l}`).join("\n");
  const file = await vault.create(notePath, plugin.sections(reasons));
  await fileManager.processFrontMatter(file, (fm) => Object.assign(fm, props));
  return file;
}
var ValueSuggest = class extends AbstractInputSuggest {
  // onPick: called with the chosen value instead of filling the input.
  // exclude: values that should not be suggested (e.g. chips already added).
  constructor(app, input, values, onPick = null, exclude = () => []) {
    super(app, input);
    this.input = input;
    this.values = values;
    this.onPick = onPick;
    this.exclude = exclude;
    this.isOpen = false;
  }
  getSuggestions(query) {
    const q = query.trim().toLowerCase();
    const taken = this.exclude();
    return this.values.filter((v) => v.toLowerCase().includes(q) && v.toLowerCase() !== q && !taken.includes(v));
  }
  renderSuggestion(value, el) {
    el.setText(value);
  }
  selectSuggestion(value) {
    if (this.onPick) {
      this.onPick(value);
    } else {
      this.setValue(value);
      this.input.dispatchEvent(new Event("input"));
    }
    this.close();
  }
  open() {
    super.open();
    this.isOpen = true;
  }
  close() {
    super.close();
    this.isOpen = false;
  }
};
var FolderSuggest = class extends AbstractInputSuggest {
  constructor(app, input) {
    super(app, input);
    this.input = input;
  }
  getSuggestions(query) {
    const q = query.trim().toLowerCase();
    return this.app.vault.getAllFolders(false).map((f) => f.path).filter((p) => p.toLowerCase().includes(q)).sort();
  }
  renderSuggestion(path, el) {
    el.setText(path);
  }
  selectSuggestion(path) {
    this.setValue(path);
    this.input.dispatchEvent(new Event("input"));
    this.close();
  }
};
var PRICE_FORMATS = ["1,234.56", "1.234,56", "1 234,56", "1'234.56"];
var QuickWishlistSettingTab = class extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.showAdvanced = false;
  }
  t(key) {
    return this.plugin.t(key);
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    this.currencyList ??= parseCurrencyLines(this.plugin.settings.currencies);
    this.priorityList ??= this.plugin.list(this.plugin.settings.priorities);
    this.sectionGeneral(containerEl);
    this.sectionCurrencies(containerEl);
    this.sectionPriorities(containerEl);
    this.sectionStatus(containerEl);
    this.sectionNote(containerEl);
    this.sectionBase(containerEl);
    this.sectionAdvanced(containerEl);
  }
  hide() {
    this.currencyList = null;
    this.priorityList = null;
  }
  heading(el, name, desc) {
    const s = new Setting(el).setName(this.t(name)).setHeading();
    if (desc) s.setDesc(this.t(desc));
    return s;
  }
  text(el, name, desc, key, { area = false, onChange } = {}) {
    const p = this.plugin;
    return new Setting(el).setName(this.t(name)).setDesc(desc ? this.t(desc) : "")[area ? "addTextArea" : "addText"]((c) => c.setValue(String(p.settings[key] ?? "")).onChange(async (v) => {
      p.settings[key] = v;
      await p.saveSettings();
      onChange?.(v);
    }));
  }
  // Star and trash buttons shared by the currency and priority rows.
  rowButtons(setting, isDefault, canRemove, onDefault, onRemove) {
    setting.addExtraButton((b) => {
      b.setIcon("star").setTooltip(this.t(isDefault ? "isDefault" : "makeDefault")).onClick(onDefault);
      b.extraSettingsEl.toggleClass("qw-default", isDefault);
    });
    setting.addExtraButton((b) => b.setIcon("trash").setTooltip(this.t("remove")).setDisabled(!canRemove).onClick(() => canRemove && onRemove()));
  }
  sectionGeneral(el) {
    const p = this.plugin;
    this.heading(el, "secGeneral");
    new Setting(el).setName(this.t("setLanguage")).setDesc(this.t("setLanguageDesc")).addDropdown((d) => d.addOption("auto", this.t("langAuto")).addOption("en", "English").addOption("pt-BR", "Portugu\xEAs (Brasil)").setValue(p.settings.language).onChange(async (v) => {
      p.settings.language = v;
      await p.saveSettings();
      this.display();
    }));
    new Setting(el).setName(this.t("setFolder")).setDesc(this.t("setFolderDesc")).addText((c) => {
      new FolderSuggest(this.app, c.inputEl);
      c.setPlaceholder(DEFAULT_SETTINGS.folder).setValue(p.settings.folder).onChange(async (v) => {
        p.settings.folder = v;
        await p.saveSettings();
        await p.indexBases();
      });
    });
  }
  sectionCurrencies(el) {
    const p = this.plugin;
    const list = this.currencyList;
    const save = async () => {
      p.settings.currencies = serializeCurrencyLines(list);
      await p.saveSettings();
    };
    this.heading(el, "setCurrencies", "setCurrenciesDesc");
    list.forEach((c, i) => {
      const row = new Setting(el).setName(`${c.symbol} ${c.sample}`).setClass("qw-list-row");
      row.addText((txt) => {
        txt.inputEl.addClass("qw-symbol");
        txt.setPlaceholder(this.t("symbol")).setValue(c.symbol).onChange(async (v) => {
          if (p.settings.defaultCurrency === c.symbol) p.settings.defaultCurrency = v.trim();
          c.symbol = v.trim();
          row.setName(`${c.symbol} ${c.sample}`);
          await save();
        });
      });
      row.addDropdown((d) => {
        for (const f of /* @__PURE__ */ new Set([...PRICE_FORMATS, c.sample])) d.addOption(f, f);
        d.setValue(c.sample).onChange(async (v) => {
          c.sample = v;
          row.setName(`${c.symbol} ${c.sample}`);
          await save();
        });
      });
      this.rowButtons(
        row,
        c.symbol !== "" && c.symbol === p.settings.defaultCurrency,
        list.length > 1,
        async () => {
          p.settings.defaultCurrency = c.symbol;
          await save();
          this.display();
        },
        async () => {
          list.splice(i, 1);
          if (p.settings.defaultCurrency === c.symbol) p.settings.defaultCurrency = list[0].symbol;
          await save();
          this.display();
        }
      );
    });
    new Setting(el).addButton((b) => b.setButtonText(this.t("addCurrency")).onClick(() => {
      list.push({ symbol: "", sample: "1,234.56" });
      this.display();
    }));
  }
  sectionPriorities(el) {
    const p = this.plugin;
    const list = this.priorityList;
    const save = async () => {
      p.settings.priorities = list.filter(Boolean).join(", ");
      await p.saveSettings();
    };
    const move = async (from, to) => {
      list.splice(to, 0, list.splice(from, 1)[0]);
      await save();
      this.display();
    };
    this.heading(el, "setPriorities", "setPrioritiesDesc");
    list.forEach((name, i) => {
      const row = new Setting(el).setClass("qw-list-row").setClass("qw-priority-row");
      row.addText((txt) => txt.setValue(name).onChange(async (v) => {
        if (p.settings.defaultPriority === list[i]) p.settings.defaultPriority = v.trim();
        list[i] = v.trim();
        await save();
      }));
      row.addExtraButton((b) => b.setIcon("arrow-up").setTooltip(this.t("moveUp")).setDisabled(i === 0).onClick(() => i > 0 && move(i, i - 1)));
      row.addExtraButton((b) => b.setIcon("arrow-down").setTooltip(this.t("moveDown")).setDisabled(i === list.length - 1).onClick(() => i < list.length - 1 && move(i, i + 1)));
      this.rowButtons(
        row,
        name !== "" && name === p.settings.defaultPriority,
        list.length > 1,
        async () => {
          p.settings.defaultPriority = list[i];
          await save();
          this.display();
        },
        async () => {
          const [removed] = list.splice(i, 1);
          if (p.settings.defaultPriority === removed) p.settings.defaultPriority = list[0];
          await save();
          this.display();
        }
      );
    });
    new Setting(el).addButton((b) => b.setButtonText(this.t("addPriority")).onClick(() => {
      list.push("");
      this.display();
    }));
  }
  sectionStatus(el) {
    this.heading(el, "secStatus");
    this.text(el, "setStatus", "setStatusDesc", "status");
    this.text(el, "setBoughtStatus", "setBoughtStatusDesc", "boughtStatus");
  }
  sectionNote(el) {
    const p = this.plugin;
    this.heading(el, "secNote", "secNoteDesc");
    let preview;
    const update = () => {
      preview.empty();
      preview.createEl("pre", { text: p.sections("- ...").trim() });
      const link = preview.createDiv({ cls: "qw-preview-link" });
      link.createSpan({ text: `${p.settings.linkLabel} \u2197` });
      link.createSpan({ cls: "qw-preview-caption", text: this.t("previewInBase") });
    };
    this.text(el, "setReasonsHeading", null, "reasonsHeading", { onChange: update });
    this.text(el, "setLinkLabel", "setLinkLabelDesc", "linkLabel", { onChange: update });
    preview = el.createDiv({ cls: "qw-preview" });
    update();
  }
  sectionBase(el) {
    const p = this.plugin;
    this.heading(el, "secBase");
    const toggle = (name, desc, key) => new Setting(el).setName(this.t(name)).setDesc(this.t(desc)).addToggle((c) => c.setValue(p.settings[key]).onChange(async (v) => {
      p.settings[key] = v;
      await p.saveSettings();
    }));
    toggle("setIntercept", "setInterceptDesc", "interceptNewButton");
    toggle("setFill", "setFillDesc", "fillNewNotes");
  }
  sectionAdvanced(el) {
    const p = this.plugin;
    this.heading(el, "secAdvanced", "secAdvancedDesc").setClass("qw-advanced-toggle").addButton((b) => b.setButtonText(this.t(this.showAdvanced ? "hide" : "show")).onClick(() => {
      this.showAdvanced = !this.showAdvanced;
      this.display();
    }));
    if (!this.showAdvanced) return;
    this.text(el, "setTag", "setTagDesc", "tag");
    this.text(el, "setExtra", "setExtraDesc", "extraFrontmatter", { area: true });
    this.text(el, "setHidden", "setHiddenDesc", "hiddenProperties", { onChange: () => p.updateHiddenStyle() });
  }
};
function freePath(vault, base, ext) {
  let path = normalizePath(`${base}.${ext}`);
  for (let i = 2; vault.getAbstractFileByPath(path); i++) path = normalizePath(`${base} ${i}.${ext}`);
  return path;
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function formatPrice(text, c) {
  const clean = String(text).split(c.thousands).join("").replace(new RegExp(`[^0-9${escapeRegExp(c.decimal)}]`, "g"), "");
  const [int, ...rest] = clean.split(c.decimal);
  const intFmt = int.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, c.thousands);
  return rest.length ? `${intFmt}${c.decimal}${rest.join("").slice(0, 2)}` : intFmt;
}
function parsePrice(text, c) {
  const s = String(text ?? "").split(c.thousands).join("").replace(c.decimal, ".").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function parseCurrencyLines(text) {
  return String(text ?? "").split("\n").map((l) => l.split("=").map((s) => s.trim())).filter(([symbol]) => symbol).map(([symbol, sample]) => ({ symbol, sample: sample || "1,234.56" }));
}
function serializeCurrencyLines(list) {
  return list.filter((c) => c.symbol.trim()).map((c) => `${c.symbol.trim()} = ${c.sample}`).join("\n");
}
module.exports.formatPrice = formatPrice;
module.exports.parseCurrencyLines = parseCurrencyLines;
module.exports.serializeCurrencyLines = serializeCurrencyLines;
module.exports.parsePrice = parsePrice;
module.exports.createItem = createItem;
module.exports.buildBase = buildBase;
module.exports.smartGroups = smartGroups;
