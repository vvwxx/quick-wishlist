"use strict";

const {
  Plugin, Modal, Notice, TFile, PluginSettingTab, Setting,
  AbstractInputSuggest, requestUrl, normalizePath, parseYaml,
} = require("obsidian");

const DEFAULT_SETTINGS = {
  folder: "Wishlist",
  currencies: "$ = 1,234.56\n€ = 1.234,56\nR$ = 1.234,56",
  defaultCurrency: "$",
  priorities: "high, medium, low",
  defaultPriority: "medium",
  status: "want",
  boughtStatus: "bought",
  tag: "wishlist",
  extraFrontmatter: "",
  photoHeading: "Photo",
  reasonsHeading: "Why I want it",
  linkLabel: "Link to buy",
  fillNewNotes: true,
  interceptNewButton: true,
};

const IMAGE_TYPES = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif",
};

module.exports = class QuickWishlist extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new QuickWishlistSettingTab(this.app, this));

    this.addCommand({
      id: "new-item",
      name: "New wishlist item",
      callback: () => new WishlistModal(this.app, this).open(),
    });
    this.addCommand({
      id: "create-base",
      name: "Create wishlist base",
      callback: () => this.createBase(),
    });
    this.addCommand({
      id: "fill-note",
      name: "Fill current note with wishlist properties",
      editorCallback: async (_editor, view) => {
        if (view.file) await this.fillNote(view.file, { force: true });
      },
    });

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

  async saveSettings() {
    await this.saveData(this.settings);
  }

  get folder() {
    return normalizePath(this.settings.folder || DEFAULT_SETTINGS.folder);
  }

  isWishlistNote(file) {
    return file instanceof TFile && file.extension === "md" && file.parent?.path === this.folder;
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
      new Notice("Quick Wishlist: extra properties are not valid YAML.");
      return {};
    }
  }

  defaultProperties() {
    const s = this.settings;
    return {
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

  sections(embed = "", reasons = "") {
    const s = this.settings;
    return `## ${s.photoHeading}\n\n${embed}\n\n## ${s.reasonsHeading}\n\n${reasons}\n`;
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

  async createBase() {
    const path = normalizePath(`${this.folder}/Wishlist.base`);
    if (this.app.vault.getAbstractFileByPath(path)) {
      new Notice(`${path} already exists.`);
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
  const q = (text) => `'${String(text).replace(/'/g, "''")}'`;
  const status = (value) => q(`status == ${JSON.stringify(value)}`);
  return `newItemFolder: ${JSON.stringify(plugin.folder)}
filters:
  and:
    - ${q(`file.inFolder(${JSON.stringify(plugin.folder)})`)}
formulas:
  value: ${q(priceFormula(plugin))}
  buy: ${q(`if(link.isEmpty(), "", link(link, ${JSON.stringify(s.linkLabel)}))`)}
  photo: ${q('file.embeds.filter(value.toString().lower().containsAny(".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"))[0]')}
properties:
  file.name:
    displayName: Item
  note.rank:
    displayName: "#"
  formula.value:
    displayName: Price
  formula.buy:
    displayName: Link
views:
  - type: cards
    name: Want
    filters:
      and:
        - ${status(s.status)}
    order:
      - file.name
      - categories
      - formula.value
      - formula.buy
      - priority
      - store
    sort:
      - property: rank
        direction: ASC
    image: formula.photo
  - type: cards
    name: By category
    filters:
      and:
        - ${status(s.status)}
    groupBy:
      property: note.categories
      direction: ASC
    order:
      - file.name
      - formula.value
      - formula.buy
      - priority
    sort:
      - property: rank
        direction: ASC
    image: formula.photo
  - type: table
    name: Reorder
    filters:
      and:
        - ${status(s.status)}
    order:
      - rank
      - file.name
      - categories
      - price
      - currency
      - formula.value
      - priority
    sort:
      - property: rank
        direction: ASC
  - type: table
    name: Bought
    filters:
      and:
        - ${status(s.boughtStatus)}
    order:
      - file.name
      - formula.value
      - formula.buy
      - store
`;
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
      product: "", price: "", currency: plugin.currency(s.defaultCurrency).symbol, category: "",
      priority: s.defaultPriority, rank: "", link: "", store: "", reasons: "",
    };
    this.image = null; // { buffer, ext, previewUrl }
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
    const titles = ["Details", "Photo", "Why I want it"];
    const head = contentEl.createDiv("qw-head");
    head.createEl("h2", { text: "New wishlist item" });
    const steps = head.createDiv("qw-steps");
    titles.forEach((t, i) => steps.createSpan({
      text: `${i + 1}. ${t}`, cls: i === this.step ? "is-active" : i < this.step ? "is-done" : "",
    }));

    const body = contentEl.createDiv("qw-body");
    if (this.step === 0) this.renderDetails(body);
    if (this.step === 1) this.renderPhoto(body);
    if (this.step === 2) this.renderReasons(body);

    const footer = contentEl.createDiv("qw-footer");
    footer.createSpan({
      cls: "qw-hint",
      text: this.step < 2 ? "Enter: next · Esc: cancel" : "Ctrl+Enter: save · Esc: cancel",
    });
    const buttons = footer.createDiv("qw-buttons");
    if (this.step > 0) buttons.createEl("button", { text: "Back" }).onclick = () => this.go(this.step - 1);
    const main = buttons.createEl("button", { text: this.step < 2 ? "Next" : "Save", cls: "mod-cta" });
    main.onclick = () => (this.step < 2 ? this.next() : this.save());
  }

  field(parent, label, optional) {
    const row = parent.createDiv("qw-field");
    const el = row.createEl("label", { text: label });
    if (optional) el.createSpan({ text: " optional", cls: "qw-optional" });
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
    const product = this.text(body, "product", "Product");

    const price = this.text(body, "price", "Price", { optional: true });
    price.setAttr("inputmode", "decimal");
    price.addEventListener("input", () => {
      price.value = formatPrice(price.value, p.currency(this.data.currency));
      this.data.price = price.value;
    });

    const symbols = p.currencies().map((c) => c.symbol);
    let previous = this.data.currency;
    this.select(body, "currency", "Currency", symbols, () => {
      // Re-read the typed number with the new currency's separators.
      const n = parsePrice(this.data.price, p.currency(previous));
      const c = p.currency(this.data.currency);
      this.data.price = n === null ? "" : formatPrice(String(n).replace(".", c.decimal), c);
      price.value = this.data.price;
      previous = this.data.currency;
    });

    this.text(body, "category", "Category", { optional: true, suggestions: p.valuesOf("categories") });
    this.select(body, "priority", "Priority", p.list(p.settings.priorities));

    const rank = this.text(body, "rank", "Rank", { optional: true });
    rank.setAttrs({ inputmode: "decimal", placeholder: `${p.nextRank()} (end of the list) · 1.1, 1.2 for related items` });
    rank.addEventListener("input", () => {
      const [int, ...rest] = rank.value.replace(/,/g, ".").replace(/[^0-9.]/g, "").split(".");
      rank.value = rest.length ? `${int}.${rest.join("")}` : int;
      this.data.rank = rank.value;
    });

    this.text(body, "link", "Product link", { optional: true });
    this.text(body, "store", "Store", { optional: true, suggestions: p.valuesOf("store") });
    window.setTimeout(() => product.focus(), 0);
  }

  renderPhoto(body) {
    const zone = body.createDiv({ cls: "qw-drop", attr: { tabindex: "0" } });
    const show = () => {
      zone.empty();
      if (this.image) {
        zone.createEl("img", { attr: { src: this.image.previewUrl } });
        zone.createDiv({ text: "Ctrl+V again to replace · Delete to remove", cls: "qw-hint" });
      } else {
        zone.createDiv({ text: "Paste an image or an image link here (Ctrl+V)", cls: "qw-drop-title" });
        zone.createDiv({ text: "Optional. Press Enter to skip.", cls: "qw-hint" });
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
            new Notice("Nothing to paste: copy an image or an image link.");
            return;
          }
          zone.empty();
          zone.createDiv({ text: "Downloading image…", cls: "qw-hint" });
          const res = await requestUrl({ url });
          this.setImage(res.arrayBuffer, res.headers["content-type"] ?? "");
        }
      } catch (err) {
        console.error(err);
        new Notice("Could not load that image.");
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
    const row = this.field(body, "Reasons, one per line", true);
    const area = row.createEl("textarea", { cls: "qw-reasons" });
    area.value = this.data.reasons;
    area.addEventListener("input", () => (this.data.reasons = area.value));
    window.setTimeout(() => area.focus(), 0);
  }

  go(step) {
    this.step = step;
    this.render();
  }

  next() {
    if (this.step === 0 && !this.data.product.trim()) {
      new Notice("Product is required.");
      return;
    }
    if (this.step < 2) this.go(this.step + 1);
    else this.save();
  }

  async save() {
    if (this.saving) return;
    if (!this.data.product.trim()) {
      this.go(0);
      new Notice("Product is required.");
      return;
    }
    this.saving = true;
    try {
      const file = await createItem(this.plugin, this.data, this.image);
      this.close();
      new Notice(`Added to wishlist: ${file.basename}`);
      await this.app.workspace.getLeaf(false).openFile(file);
    } catch (err) {
      console.error(err);
      new Notice("Could not save the item. See the console.");
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

  let embed = "";
  if (image) {
    const imagePath = await fileManager.getAvailablePathForAttachment(`${name}.${image.ext}`, notePath);
    const imageFile = await vault.createBinary(imagePath, image.buffer);
    embed = "!" + fileManager.generateMarkdownLink(imageFile, notePath);
  }

  const typedRank = Number(data.rank);
  const props = plugin.defaultProperties();
  Object.assign(props, {
    price: parsePrice(data.price, plugin.currency(data.currency)),
    currency: data.currency,
    rank: data.rank && Number.isFinite(typedRank) ? typedRank : props.rank,
    categories: data.category.trim() ? [data.category.trim()] : [],
    priority: data.priority,
    link: data.link.trim() || null,
    store: data.store.trim() || null,
  });

  const reasons = data.reasons.split("\n").map((l) => l.trim()).filter(Boolean)
    .map((l) => (l.startsWith("- ") ? l : `- ${l}`)).join("\n");
  const file = await vault.create(notePath, plugin.sections(embed, reasons));
  await fileManager.processFrontMatter(file, (fm) => Object.assign(fm, props));
  return file;
}

class ValueSuggest extends AbstractInputSuggest {
  constructor(app, input, values) {
    super(app, input);
    this.input = input;
    this.values = values;
    this.isOpen = false;
  }

  getSuggestions(query) {
    const q = query.trim().toLowerCase();
    return this.values.filter((v) => v.toLowerCase().includes(q) && v.toLowerCase() !== q);
  }

  renderSuggestion(value, el) {
    el.setText(value);
  }

  selectSuggestion(value) {
    this.setValue(value);
    this.input.dispatchEvent(new Event("input"));
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

class QuickWishlistSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    const p = this.plugin;
    containerEl.empty();

    const text = (name, desc, key, { area = false } = {}) => {
      new Setting(containerEl).setName(name).setDesc(desc)[area ? "addTextArea" : "addText"]((c) => c
        .setPlaceholder(String(DEFAULT_SETTINGS[key]))
        .setValue(String(p.settings[key] ?? ""))
        .onChange(async (v) => { p.settings[key] = v; await p.saveSettings(); }));
    };

    new Setting(containerEl).setName("Wishlist folder")
      .setDesc("Where items are created. Notes created here in any other way are filled too.")
      .addText((c) => c.setPlaceholder(DEFAULT_SETTINGS.folder).setValue(p.settings.folder).onChange(async (v) => {
        p.settings.folder = v;
        await p.saveSettings();
        await p.indexBases();
      }));
    text("Currencies", "One per line: symbol = how 1234.56 is written. Example: R$ = 1.234,56", "currencies", { area: true });
    text("Default currency", "Must match one of the symbols above.", "defaultCurrency");
    text("Priorities", "Comma-separated, in the order shown in the form.", "priorities");
    text("Default priority", "", "defaultPriority");
    text("Status for new items", "The base shows these in the Want views.", "status");
    text("Status for bought items", "The base shows these in the Bought view.", "boughtStatus");
    text("Tag", "Added to every item.", "tag");
    text("Extra properties", "Optional YAML added to every new item, e.g. type: wish", "extraFrontmatter", { area: true });
    text("Photo heading", "", "photoHeading");
    text("Reasons heading", "", "reasonsHeading");
    text("Link label", "Text of the buy link in the base. Run \"Create wishlist base\" again (after deleting the old base) to apply.", "linkLabel");

    new Setting(containerEl)
      .setName("Base \"New\" button opens the form")
      .setDesc("In bases that show the wishlist folder, the \"New\" button opens this form instead of the small popover.")
      .addToggle((t) => t.setValue(p.settings.interceptNewButton).onChange(async (v) => {
        p.settings.interceptNewButton = v;
        await p.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Fill notes created elsewhere")
      .setDesc("Adds the wishlist properties and sections to empty notes created in the folder, e.g. by the base \"New\" button.")
      .addToggle((t) => t.setValue(p.settings.fillNewNotes).onChange(async (v) => {
        p.settings.fillNewNotes = v;
        await p.saveSettings();
      }));
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

module.exports.formatPrice = formatPrice;
module.exports.parsePrice = parsePrice;
module.exports.createItem = createItem;
module.exports.buildBase = buildBase;
