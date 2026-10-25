# Quick Wishlist

*[Leia em português](README.pt-BR.md)*

Quick Wishlist is an Obsidian plugin for keeping a wishlist without leaving the keyboard.

Press a shortcut, fill in a short form and the item becomes a note, with a photo, the price and the reasons you want it.

## How it works

1. **Details:** name, price, category, priority, rank, link and store.
2. **Photo:** paste an image or an image link.
3. **Why I want it:** a few reasons, one per line.

Enter goes to the next step, Ctrl+Enter saves and Esc cancels.

## What else it does

- Formats the price as you type (`6000` becomes `6,000` or `6.000`, depending on the currency).
- Suggests the categories and stores you've used before.
- Orders items by rank. Use `1.1` and `1.2` to keep related items together.
- Creates a ready-made base to browse the list: cards with photos, by category, to reorder, and what you've already bought.
- Makes the base "New" button open the same form.
- Works in English and Portuguese.

## Commands

| Command | What it does |
|---|---|
| New wishlist item | Opens the form. |
| Create wishlist base | Creates the base with the list views. |
| Mark as purchased / back to want | Moves the open item to Purchased, with today's date, or back to the list. |
| Fill current note with wishlist properties | Adds the missing properties and sections to the open note. |

None of them come with a shortcut. Pick yours in Settings → Hotkeys.

## Note format

```yaml
---
price: 6000
currency: $
rank: 10
categories:
  - electronics
priority: medium
status: want
link: https://example.com/product
store: Example Store
created: 2026-10-25
tags:
  - wishlist
---
## Photo

![[Product.png]]

## Why I want it

- Reason one
- Reason two
```

## Install

It's not in the plugin store yet. For now:

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/vvwxx/quick-wishlist/releases/latest).
2. Put them in `.obsidian/plugins/quick-wishlist/` inside your vault.
3. Turn it on in Settings → Community plugins, and give "New wishlist item" a shortcut in Settings → Hotkeys.

Then run "Create wishlist base" once to get the views.

Folder, currencies, priorities and the rest are in the plugin settings.

## License

MIT
