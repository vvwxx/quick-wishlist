"use strict";

const { setIcon } = require("obsidian");

const cleanText = (s) => String(s ?? "").replace(/\s*\n\s*/g, " ").trim();

// Item being dragged, shared by every list so a drop only works inside its own list.
let dragging = null;

// Top of a note page: image, title, summary lines and action buttons.
function renderHeader(el, { image = null, title, lines = [], actions = [] }) {
  const top = el.createDiv("kit-header");
  if (image) top.createEl("img", { cls: "kit-cover", attr: { src: image, alt: title } });
  const id = top.createDiv("kit-id");
  id.createDiv({ cls: "kit-title", text: title });
  for (const parts of lines) {
    const text = parts.filter(Boolean).join(" · ");
    if (text) id.createDiv({ cls: "kit-summary", text });
  }
  if (actions.length) {
    const row = id.createDiv("kit-actions");
    for (const a of actions) {
      const b = a.href
        ? row.createEl("a", { cls: "kit-tag", text: a.text, href: a.href })
        : row.createEl("button", { cls: a.cta ? "mod-cta" : "", text: a.text });
      if (a.onClick) b.onclick = (e) => { e.preventDefault(); a.onClick(); };
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

// Trash button that needs a second click within 3 seconds.
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
    }, 3000);
  });
}

// Swaps the text for an input. Enter or leaving the field saves, Esc cancels.
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
    if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); close(true); }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(false); }
  });
  input.addEventListener("blur", () => close(true));
}

// Drag to reorder, move to top, double click to edit, remove, and a field to add
// (Enter adds at the end, Shift+Enter at the top). save() gets the whole new list.
function renderEditableList(parent, items, save, { t, placeholder, empty }) {
  const box = parent.createDiv("kit-list");
  const rows = box.createDiv("kit-rows");
  if (!items.length) rows.createDiv({ cls: "kit-hint kit-empty", text: empty ?? t("empty") });
  items.forEach((text, i) => {
    const row = rows.createDiv("kit-row");
    row.createDiv("kit-dot");
    const body = row.createDiv("kit-row-body");
    const textEl = body.createDiv({ cls: "kit-row-text", text });
    const edit = () => editInline(textEl, text, (v) => { const l = [...items]; l[i] = v; save(l); });
    textEl.ondblclick = edit;
    const actions = row.createDiv("kit-row-actions");
    if (i > 0) iconButton(actions, "arrow-up-to-line", t("toTop"), () => { const l = [...items]; l.unshift(l.splice(i, 1)[0]); save(l); });
    iconButton(actions, "pencil", t("edit"), edit);
    removeButton(actions, t, () => save(items.filter((_, j) => j !== i)));

    row.draggable = true;
    row.addEventListener("dragstart", (e) => { dragging = { box, i }; row.addClass("is-dragging"); e.dataTransfer.effectAllowed = "move"; });
    row.addEventListener("dragend", () => { dragging = null; row.removeClass("is-dragging"); });
    row.addEventListener("dragover", (e) => { if (dragging?.box === box && dragging.i !== i) { e.preventDefault(); row.addClass("is-target"); } });
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
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); submit(e.shiftKey); } });
  add.createEl("button", { cls: "mod-cta", text: t("add") }).onclick = () => submit(false);
  return box;
}

module.exports = { renderHeader, renderEditableList };
