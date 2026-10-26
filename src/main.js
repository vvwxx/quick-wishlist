"use strict";

const {
  Plugin, Modal, Notice, TFile, PluginSettingTab, Setting, Keymap,
  AbstractInputSuggest, BasesView, MarkdownRenderChild, requestUrl, normalizePath, parseYaml,
} = require("obsidian");
const { resolveLanguage, createT } = require("./kit/i18n");
const { formatMoney, formatDate } = require("./kit/format");
const { readItems, writeBlock } = require("./kit/blocks");
const { renderHeader, renderEditableList } = require("./kit/page");
const { upgradeNote, upgradeBase } = require("./upgrade");
const { buyHref, countPhrase } = require("./util");

const SMART_VIEW = "qw-smart-categories";

// Interface text. {name} placeholders are filled by t().
const STRINGS = {
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
    hintNext: "Enter: next · Esc: cancel",
    hintSave: "Ctrl+Enter: save · Esc: cancel",
    rankPlaceholder: "{rank} (end of the list) · 1.1, 1.2 for related items",
    pasteHere: "Paste an image or an image link here (Ctrl+V)",
    pasteOptional: "Optional. Press Enter to skip.",
    pasteReplace: "Ctrl+V again to replace · Delete to remove",
    downloading: "Downloading image…",
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
    setIntercept: "Base \"New\" button opens the form",
    setInterceptDesc: "In bases that show the wishlist folder, the \"New\" button opens this form instead of the small popover.",
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
    pageBuy: "Buy ↗",
    pageMarkBought: "Mark as purchased",
    pageBackToWant: "Back to the list",
    pagePriority: "{priority} priority",
    pageStore: "{store} (store)",
    pageBoughtOn: "purchased on {date}",
    pageReasonPlaceholder: "New reason… (Enter adds)",
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
    upgradeBody: "This will upgrade {items} in {folder} to the item page.",
    upgradeBodyNotes: "In each note, the photo moves to the cover property and the reasons go into a list.",
    upgradeBodyBases: "Each base shows the cover property instead of the photo formula.",
    upgradeBodyEnd: "The rest stays as it is.",
    upgradeRun: "Upgrade",
    upgradeCancel: "Cancel",
    upgradeNone: "Every note already uses the item page.",
    upgradeDone: "Upgraded: {items}.",
    upgradeSkipped: "Skipped, could not read: {names}",
    upgradeBasesLater: "Bases left for the next run, so the skipped notes keep their photos.",
    countNote: "{n} note",
    countNotes: "{n} notes",
    countBase: "{n} base",
    countBases: "{n} bases",
    countAnd: "{a} and {b}",
  },
  pt: {
    cmdNewItem: "Novo item da wishlist",
    cmdCreateBase: "Criar base da wishlist",
    cmdFillNote: "Completar a nota atual com as propriedades da wishlist",
    cmdTogglePurchased: "Marcar como comprado / voltar para quero",
    cmdUpgrade: "Atualizar notas antigas para a página do item",
    formTitle: "Novo item da wishlist",
    stepDetails: "Detalhes",
    stepPhoto: "Foto",
    stepReasons: "Por que eu quero",
    product: "Produto",
    brand: "Marca",
    price: "Preço",
    currency: "Moeda",
    category: "Categorias",
    categoryPlaceholder: "Enter ou vírgula para adicionar",
    priority: "Prioridade",
    rank: "Rank",
    link: "Link do produto",
    store: "Loja",
    reasons: "Motivos",
    optional: "opcional",
    next: "Próximo",
    back: "Voltar",
    save: "Salvar",
    hintNext: "Enter: próximo · Esc: cancelar",
    hintSave: "Ctrl+Enter: salvar · Esc: cancelar",
    rankPlaceholder: "{rank} (fim da lista) · 1.1, 1.2 para itens relacionados",
    pasteHere: "Cole aqui uma imagem ou o link de uma imagem (Ctrl+V)",
    pasteOptional: "Opcional. Aperte Enter para pular.",
    pasteReplace: "Ctrl+V de novo para trocar · Delete para remover",
    downloading: "Baixando a imagem…",
    productRequired: "O produto é obrigatório.",
    added: "Adicionado à wishlist: {name}",
    purchased: "Comprado: {name}",
    backToWant: "De volta para quero: {name}",
    imageFailed: "Não foi possível carregar essa imagem.",
    saveFailed: "Não foi possível salvar o item. Veja o console.",
    nothingToPaste: "Nada para colar: copie uma imagem ou o link de uma imagem.",
    baseExists: "{path} já existe.",
    badYaml: "Quick Wishlist: as propriedades extras não são um YAML válido.",
    setLanguage: "Idioma",
    setLanguageDesc: "Idioma do formulário e das configurações. Os nomes dos comandos mudam depois de reiniciar o Obsidian.",
    langAuto: "Automático (igual ao Obsidian)",
    setFolder: "Pasta da wishlist",
    setFolderDesc: "Onde os itens são criados. Notas criadas aqui de outro jeito também são completadas.",
    setCurrencies: "Moedas",
    setCurrenciesDesc: "Símbolo e como 1234,56 é escrito. A estrela marca a padrão.",
    setPriorities: "Prioridades",
    setPrioritiesDesc: "Na ordem em que aparecem no formulário. A estrela marca a padrão.",
    secGeneral: "Geral",
    secStatus: "Status",
    secNote: "Textos da nota",
    secNoteDesc: "Títulos escritos em todo item novo.",
    secBase: "Base",
    secAdvanced: "Avançado",
    secAdvancedDesc: "Tag, propriedades extras e escondidas.",
    show: "Mostrar",
    hide: "Esconder",
    symbol: "Símbolo",
    addCurrency: "Adicionar moeda",
    addPriority: "Adicionar prioridade",
    makeDefault: "Tornar padrão",
    isDefault: "Padrão",
    remove: "Remover",
    moveUp: "Subir",
    moveDown: "Descer",
    previewInBase: "na base",
    setStatus: "Status dos itens novos",
    setStatusDesc: "A base mostra esses itens nas visualizações de Quero.",
    setBoughtStatus: "Status dos itens comprados",
    setBoughtStatusDesc: "A base mostra esses itens na visualização Comprados.",
    setTag: "Tag",
    setTagDesc: "Adicionada a todo item.",
    setExtra: "Propriedades extras",
    setExtraDesc: "YAML opcional adicionado a todo item novo, por exemplo: tipo: desejo",
    setHidden: "Propriedades escondidas",
    setHiddenDesc: "Separadas por vírgula. Ficam na nota, mas não aparecem nas propriedades dos itens da wishlist, por exemplo: tipo",
    setReasonsHeading: "Título dos motivos",
    setLinkLabel: "Texto do link",
    setLinkLabelDesc: "Texto do link de compra na base. Vale para as bases criadas depois da mudança.",
    setIntercept: "Botão \"Novo\" da base abre o formulário",
    setInterceptDesc: "Nas bases que mostram a pasta da wishlist, o botão \"Novo\" abre este formulário no lugar da janelinha.",
    setFill: "Completar notas criadas de outro jeito",
    setFillDesc: "Adiciona as propriedades e seções da wishlist às notas vazias criadas na pasta.",
    viewAll: "Todos",
    viewWant: "Quero",
    viewByCategory: "Por categoria",
    viewReorder: "Reordenar",
    viewPurchased: "Comprados",
    colItem: "Item",
    colBrand: "Marca",
    pageBuy: "Comprar ↗",
    pageMarkBought: "Marcar como comprado",
    pageBackToWant: "Voltar para a lista",
    pagePriority: "prioridade {priority}",
    pageStore: "{store} (loja)",
    pageBoughtOn: "comprado em {date}",
    pageReasonPlaceholder: "Novo motivo… (Enter adiciona)",
    pageReasonsEmpty: "Por que você quer isso? O que muda quando tiver?",
    colPrice: "Preço",
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
    upgradeBody: "Isto vai atualizar {items} em {folder} para a página do item.",
    upgradeBodyNotes: "Em cada nota, a foto vai para a propriedade cover e os motivos viram uma lista.",
    upgradeBodyBases: "Cada base passa a mostrar a propriedade cover no lugar da fórmula da foto.",
    upgradeBodyEnd: "O resto fica como está.",
    upgradeRun: "Atualizar",
    upgradeCancel: "Cancelar",
    upgradeNone: "Todas as notas já usam a página do item.",
    upgradeDone: "Atualizado: {items}.",
    upgradeSkipped: "Puladas, não deu para ler: {names}",
    upgradeBasesLater: "As bases ficam para a próxima execução, para as notas puladas não perderem a foto.",
    countNote: "{n} nota",
    countNotes: "{n} notas",
    countBase: "{n} base",
    countBases: "{n} bases",
    countAnd: "{a} e {b}",
  },
};

// Values written into notes. Only used as the starting settings, so changing
// the language later never breaks the filters of existing notes.
const LOCALE_DEFAULTS = {
  en: {
    currencies: "$ = 1,234.56\n€ = 1.234,56\nR$ = 1.234,56",
    defaultCurrency: "$",
    priorities: "high, medium, low",
    defaultPriority: "medium",
    status: "want",
    boughtStatus: "purchased",
    photoHeading: "Photo",
    reasonsHeading: "Why I want it",
    linkLabel: "Link to buy",
  },
  pt: {
    currencies: "R$ = 1.234,56\n$ = 1,234.56\n€ = 1.234,56",
    defaultCurrency: "R$",
    priorities: "alta, média, baixa",
    defaultPriority: "média",
    status: "quero",
    boughtStatus: "comprado",
    photoHeading: "Foto",
    reasonsHeading: "Por que eu quero",
    linkLabel: "Link para comprar",
  },
};

const DEFAULT_SETTINGS = {
  language: "auto",
  folder: "Wishlist",
  tag: "wishlist",
  extraFrontmatter: "",
  hiddenProperties: "",
  fillNewNotes: true,
  interceptNewButton: true,
};

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "avif", "svg", "bmp"];

const IMAGE_TYPES = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif",
};

module.exports = class QuickWishlist extends Plugin {
  async onload() {
    const saved = await this.loadData();
    const lang = resolveLanguage(saved?.language ?? DEFAULT_SETTINGS.language);
    this.settings = Object.assign({}, DEFAULT_SETTINGS, LOCALE_DEFAULTS[lang], saved);
    // Old settings name for the purchased status.
    if (saved && saved.boughtStatus === undefined) this.settings.boughtStatus = LOCALE_DEFAULTS[lang].boughtStatus;
    this.addSettingTab(new QuickWishlistSettingTab(this.app, this));

    // Note page: header with photo and summary, and the editable list of reasons.
    this.registerMarkdownCodeBlockProcessor("wish", (_src, el, ctx) => ctx.addChild(new WishPage(this, el, ctx.sourcePath)));
    this.registerMarkdownCodeBlockProcessor("reasons", (src, el, ctx) => {
      const file = this.app.vault.getFileByPath(ctx.sourcePath);
      if (!file) return;
      const save = (items) => this.app.vault.process(file,
        (text) => writeBlock(text, "reasons", this.settings.reasonsHeading, items.map((x) => `- ${x}`))).catch(console.error);
      renderEditableList(el.createDiv("kit-section"), readItems(src), save, {
        t: (k, v) => this.t(k, v),
        placeholder: this.t("pageReasonPlaceholder"),
        empty: this.t("pageReasonsEmpty"),
      });
    });

    this.addCommand({
      id: "new-item",
      name: this.t("cmdNewItem"),
      callback: () => new WishlistModal(this.app, this).open(),
    });
    this.addCommand({
      id: "create-base",
      name: this.t("cmdCreateBase"),
      callback: () => this.createBase(),
    });
    this.addCommand({
      id: "fill-note",
      name: this.t("cmdFillNote"),
      editorCallback: async (_editor, view) => {
        if (view.file) await this.fillNote(view.file, { force: true });
      },
    });
    this.addCommand({
      id: "toggle-purchased",
      name: this.t("cmdTogglePurchased"),
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || !this.isWishlistNote(file)) return false;
        if (!checking) this.togglePurchased(file).catch(console.error);
        return true;
      },
    });
    this.addCommand({
      id: "upgrade-notes",
      name: this.t("cmdUpgrade"),
      callback: () => this.upgradeNotes().catch(console.error),
    });

    // "Smart categories" view type for bases (Obsidian 1.10+).
    if (BasesView && typeof this.registerBasesView === "function") {
      this.registerBasesView(SMART_VIEW, {
        name: this.t("viewSmart"),
        icon: "lucide-sparkles",
        factory: (controller, containerEl) => new SmartCategoriesView(controller, containerEl, this),
      });
    }

    // Notes created in the wishlist folder some other way (the file explorer,
    // a hotkey...) get the same properties and sections.
    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(this.app.vault.on("create", (file) => {
        if (!this.settings.fillNewNotes || !this.isWishlistNote(file)) return;
        window.setTimeout(() => this.fillNote(file).catch(console.error), 1200);
      }));
      this.indexBases();
      this.registerEvent(this.app.vault.on("create", (f) => this.indexBase(f)));
      this.registerEvent(this.app.vault.on("modify", (f) => this.indexBase(f)));
      this.registerEvent(this.app.vault.on("rename", (f, old) => { this.wishlistBases.delete(old); this.indexBase(f); }));
      this.registerEvent(this.app.vault.on("delete", (f) => this.wishlistBases.delete(f.path)));
    });

    // The "New" button of a wishlist base opens the form instead of the
    // small popover. Capture phase, so it runs before the base's own handler.
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

    // Hidden properties: open wishlist notes get a class, and a style rule
    // hides the chosen keys only inside them.
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
    this.hiddenStyle.textContent = this.list(this.settings.hiddenProperties)
      .map((key) => `.qw-wishlist-note .metadata-property[data-property-key="${CSS.escape(key)}"] { display: none; }`)
      .join("\n");
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
    this.wishlistBases = this.wishlistBases ?? new Set();
    for (const f of this.app.vault.getFiles()) await this.indexBase(f);
  }

  async indexBase(file) {
    this.wishlistBases = this.wishlistBases ?? new Set();
    if (!(file instanceof TFile) || file.extension !== "base") return;
    const text = await this.app.vault.cachedRead(file);
    const folder = JSON.stringify(this.folder).slice(1, -1);
    const usesFolder = text.includes(`inFolder("${folder}")`) || new RegExp(`^newItemFolder:\\s*"?${escapeRegExp(folder)}"?\\s*$`, "m").test(text);
    if (usesFolder) this.wishlistBases.add(file.path);
    else this.wishlistBases.delete(file.path);
  }

  baseFileFor(el) {
    // Base embedded in a note: ![[Wishlist.base#View]]
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
    const seen = new Set();
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (!this.isWishlistNote(f)) continue;
      const v = this.app.metadataCache.getFileCache(f)?.frontmatter?.[key];
      for (const x of [].concat(v ?? [])) if (x) seen.add(String(x));
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }

  // Next multiple of 10 after the highest rank: new items go to the end.
  nextRank() {
    const ranks = this.app.vault.getMarkdownFiles()
      .filter((f) => this.isWishlistNote(f))
      .map((f) => Number(this.app.metadataCache.getFileCache(f)?.frontmatter?.rank))
      .filter((n) => Number.isFinite(n));
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
      tags: [s.tag],
    };
  }

  // Body of a new note. The photo lives in the "cover" property.
  sections(reasons = "") {
    return `\`\`\`wish\n\`\`\`\n\n## ${this.settings.reasonsHeading}\n\n\`\`\`reasons\n${reasons ? reasons + "\n" : ""}\`\`\`\n`;
  }

  // Image of an item: the "cover" property, or the first image embedded in the note (old notes).
  coverOf(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    let link = String(cache?.frontmatter?.cover ?? "").trim().replace(/^!?\[\[|\]\]$/g, "").split("|")[0];
    if (!link) {
      link = (cache?.embeds ?? []).map((e) => e.link.split("|")[0])
        .find((l) => IMAGE_EXTENSIONS.includes(l.split(".").pop().toLowerCase())) ?? "";
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
      reasonsHeading: s.reasonsHeading,
    };
  }

  // Old notes get the page format; the wishlist bases stop reading the photo from a formula.
  // Each file is rewritten in a single write, so a failure never leaves one half done.
  async upgradeNotes() {
    const opts = this.upgradeOptions();
    const t = (key, vars) => this.t(key, vars);
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
      new Notice(t("upgradeNone"));
      return;
    }
    const body = [
      t("upgradeBody", { items: countPhrase(t, notes.length, bases.length), folder: this.folder }),
      notes.length ? t("upgradeBodyNotes") : "",
      bases.length ? t("upgradeBodyBases") : "",
      t("upgradeBodyEnd"),
    ].filter(Boolean).join(" ");
    new ConfirmModal(this.app, {
      title: t("upgradeTitle"),
      body,
      confirm: t("upgradeRun"),
      cancel: t("upgradeCancel"),
      onConfirm: async () => {
        const skipped = [];
        // Rewrites one file in a single write; true only when its text really changed.
        const rewrite = async (f, convert) => {
          let changed = false;
          try {
            await this.app.vault.process(f, (text) => {
              const out = convert(text);
              changed = out !== null && out !== text;
              return changed ? out : text;
            });
          } catch (err) {
            console.error(err);
            skipped.push(f.extension === "base" ? f.name : f.basename);
            return false;
          }
          return changed;
        };
        let doneNotes = 0;
        let doneBases = 0;
        for (const f of notes) if (await rewrite(f, (text) => upgradeNote(text, opts))) doneNotes++;
        // Bases switch to the cover property, so they wait until every note has one.
        const basesLater = skipped.length > 0 && bases.length > 0;
        if (!basesLater) for (const f of bases) if (await rewrite(f, upgradeBase)) doneBases++;
        const lines = [t("upgradeDone", { items: countPhrase(t, doneNotes, doneBases) })];
        if (skipped.length) lines.push(t("upgradeSkipped", { names: skipped.join(", ") }));
        if (basesLater) lines.push(t("upgradeBasesLater"));
        new Notice(lines.join("\n"), 8000);
      },
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

// Bases formula that formats the price with each currency's separators.
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

// Puts every item in exactly one category group, picking the best one:
// 1. Only categories shared by 2+ items count (no group of one by accident).
// 2. A subcategory wins: if every item of A is also in B, A is the more
//    specific group (underwear inside clothes).
// 3. Otherwise the biggest category wins, then the order the user typed.
// 4. If the others' choices would leave an item alone, it moves to its next
//    best category.
// Items left without a pair (or without categories) go to "Others", last.
// Biggest groups first.
function smartGroups(items, categoriesOf, others) {
  const catsOf = new Map(items.map((item) => [item, categoriesOf(item)]));
  const members = new Map();
  for (const [item, cats] of catsOf) {
    for (const c of cats) (members.get(c) ?? members.set(c, new Set()).get(c)).add(item);
  }
  const isSubcategory = (a, b) => {
    const A = members.get(a), B = members.get(b);
    return a !== b && A.size < B.size && [...A].every((item) => B.has(item));
  };

  const banned = new Map();
  let assignment = new Map();
  for (let round = 0; round < 20; round++) {
    assignment = new Map();
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
    const size = new Map();
    for (const g of assignment.values()) size.set(g, (size.get(g) ?? 0) + 1);
    let changed = false;
    for (const [item, g] of assignment) {
      if (size.get(g) !== 1 || (members.get(g)?.size ?? 0) < 2) continue;
      // Only move items that have somewhere else to go; the rest wait, since
      // someone may join them in the next round.
      const alternatives = catsOf.get(item).filter((c) =>
        c !== g && members.get(c).size >= 2 && !banned.get(item)?.has(c));
      if (!alternatives.length) continue;
      (banned.get(item) ?? banned.set(item, new Set()).get(item)).add(g);
      changed = true;
    }
    if (!changed) break;
  }

  const size = new Map();
  for (const g of assignment.values()) size.set(g, (size.get(g) ?? 0) + 1);
  const groups = new Map();
  for (const item of items) {
    let g = assignment.get(item);
    if (size.get(g) < 2) g = others;
    (groups.get(g) ?? groups.set(g, []).get(g)).push(item);
  }
  return [...groups.entries()].sort(([a, x], [b, y]) =>
    (a === others) - (b === others) || y.length - x.length || a.localeCompare(b));
}

const SmartCategoriesView = BasesView ? class extends BasesView {
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
          text: prop.startsWith("formula.") ? this.plugin.settings.linkLabel : text,
        });
        a.addEventListener("click", (e) => e.stopPropagation());
      } else valueEl.setText(text);
    }
    const open = (e) => this.app.workspace.getLeaf(Keymap.isModEvent(e)).openFile(file);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter") open(e); });
  }
} : null;

// The ```wish block: header with photo, title, summary and actions. Redraws when the note's properties change.
class WishPage extends MarkdownRenderChild {
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
    this.registerEvent(this.plugin.app.metadataCache.on("changed", (f) => { if (f === this.file) this.render(); }));
  }

  render() {
    const p = this.plugin;
    const file = this.file;
    const fm = p.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const t = (k, v) => p.t(k, v);
    const bought = fm.status === p.settings.boughtStatus;
    const present = (v) => v !== null && v !== undefined && v !== "";
    const actions = [];
    const href = buyHref(fm.link);
    if (href) actions.push({ text: t("pageBuy"), href });
    actions.push({ text: t(bought ? "pageBackToWant" : "pageMarkBought"), cta: !bought, onClick: () => p.togglePurchased(file).catch(console.error) });
    this.containerEl.empty();
    renderHeader(this.containerEl.createDiv("kit-page qw-page"), {
      image: p.coverOf(file),
      title: file.basename,
      lines: [
        [fm.brand, present(fm.price) ? formatMoney(fm.price, p.currency(fm.currency)) : "", fm.priority ? t("pagePriority", { priority: fm.priority }) : ""],
        [present(fm.rank) ? `#${fm.rank}` : "", fm.store ? t("pageStore", { store: fm.store }) : "", [].concat(fm.categories ?? []).filter(Boolean).join(" › ")],
        [bought && fm.purchased ? t("pageBoughtOn", { date: formatDate(String(fm.purchased), p.lang) }) : ""],
      ],
      actions,
      size: "large",
    });
  }
}

class ConfirmModal extends Modal {
  constructor(app, opts) {
    super(app);
    this.opts = opts;
  }

  onOpen() {
    const { contentEl, opts } = this;
    this.setTitle(opts.title);
    contentEl.createEl("p", { text: opts.body });
    new Setting(contentEl)
      .addButton((b) => b.setButtonText(opts.cancel).onClick(() => this.close()))
      .addButton((b) => b.setButtonText(opts.confirm).setCta().onClick(() => { this.close(); opts.onConfirm().catch(console.error); }));
  }

  onClose() {
    this.contentEl.empty();
  }
}

// Three-step form built for the keyboard: Enter goes to the next step,
// Ctrl/Cmd+Enter saves on the last one, Esc cancels.
class WishlistModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    const s = plugin.settings;
    this.step = 0;
    this.data = {
      product: "", brand: "", price: "", currency: plugin.currency(s.defaultCurrency).symbol, categories: [], categoryDraft: "",
      priority: s.defaultPriority, rank: "", link: "", store: "", reasons: "",
    };
    this.image = null; // { buffer, ext, previewUrl }
  }

  t(key, vars) {
    return this.plugin.t(key, vars);
  }

  onOpen() {
    this.containerEl.addClass("qw-modal");
    this.scope.register(["Mod"], "Enter", () => { this.save(); return false; });
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
      text: `${i + 1}. ${title}`, cls: i === this.step ? "is-active" : i < this.step ? "is-done" : "",
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
    main.onclick = () => (this.step < 2 ? this.next() : this.save());
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
    // Obsidian-styled suggestions (the native <datalist> ignores the theme).
    const suggest = suggestions?.length ? new ValueSuggest(this.app, input, suggestions) : null;
    input.addEventListener("input", () => (this.data[key] = input.value));
    this.enterGoesNext(input, () => suggest?.isOpen);
    return input;
  }

  select(parent, key, label, options, onChange) {
    const row = this.field(parent, label, false);
    const sel = row.createEl("select", { cls: "dropdown" });
    options.forEach((o) => sel.createEl("option", { value: o, text: o }));
    sel.value = this.data[key];
    sel.addEventListener("change", () => { this.data[key] = sel.value; onChange?.(); });
    this.enterGoesNext(sel);
    return sel;
  }

  enterGoesNext(el, busy = () => false) {
    el.addEventListener("keydown", (e) => {
      // While the suggestion list is open, Enter picks a suggestion.
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
      // Re-read the typed number with the new currency's separators.
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
        const x = chip.createSpan({ cls: "qw-chip-remove", text: "×" });
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
    const suggest = new ValueSuggest(this.app, input, this.plugin.valuesOf("categories"), (v) => add(v),
      () => this.data.categories);
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
    box.addEventListener("click", (e) => { if (e.target === box) input.focus(); });
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
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
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
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) { e.preventDefault(); this.next(); }
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
    // Works as a bulleted list: starts with "- " and every Enter adds a new "- ".
    area.value = this.data.reasons || "- ";
    area.addEventListener("input", () => (this.data.reasons = area.value));
    area.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing) return;
      e.preventDefault();
      const { selectionStart: start, selectionEnd: end, value } = area;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      // Enter on an empty bullet removes it, like in the editor.
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
    // A category typed but not confirmed still counts.
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
}

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
    store: data.store.trim() || null,
  });

  const reasons = data.reasons.split("\n").map((l) => l.trim().replace(/^-\s*/, "")).filter(Boolean)
    .map((l) => `- ${l}`).join("\n");
  const file = await vault.create(notePath, plugin.sections(reasons));
  await fileManager.processFrontMatter(file, (fm) => Object.assign(fm, props));
  return file;
}

class ValueSuggest extends AbstractInputSuggest {
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
}

class FolderSuggest extends AbstractInputSuggest {
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
}

const PRICE_FORMATS = ["1,234.56", "1.234,56", "1 234,56", "1'234.56"];

class QuickWishlistSettingTab extends PluginSettingTab {
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
    // Lists being edited. Kept here so an empty new row survives a redraw.
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
    return new Setting(el).setName(this.t(name)).setDesc(desc ? this.t(desc) : "")[area ? "addTextArea" : "addText"]((c) => c
      .setValue(String(p.settings[key] ?? ""))
      .onChange(async (v) => {
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
    setting.addExtraButton((b) => b.setIcon("trash").setTooltip(this.t("remove")).setDisabled(!canRemove)
      .onClick(() => canRemove && onRemove()));
  }

  sectionGeneral(el) {
    const p = this.plugin;
    this.heading(el, "secGeneral");
    new Setting(el).setName(this.t("setLanguage")).setDesc(this.t("setLanguageDesc"))
      .addDropdown((d) => d
        .addOption("auto", this.t("langAuto"))
        .addOption("en", "English")
        .addOption("pt-BR", "Português (Brasil)")
        .setValue(p.settings.language)
        .onChange(async (v) => {
          p.settings.language = v;
          await p.saveSettings();
          this.display();
        }));
    new Setting(el).setName(this.t("setFolder")).setDesc(this.t("setFolderDesc"))
      .addText((c) => {
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
        for (const f of new Set([...PRICE_FORMATS, c.sample])) d.addOption(f, f);
        d.setValue(c.sample).onChange(async (v) => {
          c.sample = v;
          row.setName(`${c.symbol} ${c.sample}`);
          await save();
        });
      });
      this.rowButtons(row, c.symbol !== "" && c.symbol === p.settings.defaultCurrency, list.length > 1,
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
        });
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
      row.addExtraButton((b) => b.setIcon("arrow-up").setTooltip(this.t("moveUp")).setDisabled(i === 0)
        .onClick(() => i > 0 && move(i, i - 1)));
      row.addExtraButton((b) => b.setIcon("arrow-down").setTooltip(this.t("moveDown")).setDisabled(i === list.length - 1)
        .onClick(() => i < list.length - 1 && move(i, i + 1)));
      this.rowButtons(row, name !== "" && name === p.settings.defaultPriority, list.length > 1,
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
        });
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
      link.createSpan({ text: `${p.settings.linkLabel} ↗` });
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
    const toggle = (name, desc, key) => new Setting(el).setName(this.t(name)).setDesc(this.t(desc))
      .addToggle((c) => c.setValue(p.settings[key]).onChange(async (v) => {
        p.settings[key] = v;
        await p.saveSettings();
      }));
    toggle("setIntercept", "setInterceptDesc", "interceptNewButton");
    toggle("setFill", "setFillDesc", "fillNewNotes");
  }

  sectionAdvanced(el) {
    const p = this.plugin;
    this.heading(el, "secAdvanced", "secAdvancedDesc").setClass("qw-advanced-toggle")
      .addButton((b) => b.setButtonText(this.t(this.showAdvanced ? "hide" : "show")).onClick(() => {
        this.showAdvanced = !this.showAdvanced;
        this.display();
      }));
    if (!this.showAdvanced) return;
    this.text(el, "setTag", "setTagDesc", "tag");
    this.text(el, "setExtra", "setExtraDesc", "extraFrontmatter", { area: true });
    this.text(el, "setHidden", "setHiddenDesc", "hiddenProperties", { onChange: () => p.updateHiddenStyle() });
  }
}

function freePath(vault, base, ext) {
  let path = normalizePath(`${base}.${ext}`);
  for (let i = 2; vault.getAbstractFileByPath(path); i++) path = normalizePath(`${base} ${i}.${ext}`);
  return path;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Formats while typing: "6000" -> "6,000" or "6.000", keeping up to 2 decimals.
function formatPrice(text, c) {
  const clean = String(text).split(c.thousands).join("")
    .replace(new RegExp(`[^0-9${escapeRegExp(c.decimal)}]`, "g"), "");
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

// "R$ = 1.234,56\n$ = 1,234.56" <-> [{ symbol: "R$", sample: "1.234,56" }, ...]
// The settings tab edits currencies as a list but saves the same text as before.
function parseCurrencyLines(text) {
  return String(text ?? "").split("\n").map((l) => l.split("=").map((s) => s.trim()))
    .filter(([symbol]) => symbol).map(([symbol, sample]) => ({ symbol, sample: sample || "1,234.56" }));
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
