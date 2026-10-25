# Quick Wishlist

An Obsidian plugin to keep a wishlist without touching the mouse.

Press a hotkey and a three-step form opens in the middle of the screen:

1. **Details**: product, price, currency, category, priority, rank, link and store
2. **Photo**: paste an image or an image link with Ctrl+V
3. **Why I want it**: your reasons, one per line

Each item becomes a note in your wishlist folder, with its properties filled in and the photo saved as an attachment.

## Features

- **Keyboard first.** Enter goes to the next step, Ctrl/Cmd+Enter saves, Esc cancels.
- **Price formatting while you type.** `6000` becomes `6,000` or `6.000` depending on the currency. Each currency has its own separators.
- **Photo paste.** Paste a copied image or an image URL; the plugin downloads it and stores it where your attachment settings say.
- **Ranking.** Leave it empty to add the item at the end, or use decimals such as `1.1` and `1.2` to keep related items together.
- **Suggestions.** Category and store suggest the values you already used.
- **Ready-made base.** The command *Create wishlist base* creates a [Bases](https://help.obsidian.md/bases) file with four views: *Want* (cards with the photo), *By category*, *Reorder* (edit the rank inline) and *Bought*. Prices show formatted and the link appears as *Link to buy*.
- **The base "New" button opens the same form**, instead of the small popover.
- **Notes created any other way** in the wishlist folder get the same properties and sections.

## Commands

| Command | What it does |
|---|---|
| New wishlist item | Opens the form. Assign it a hotkey in *Settings → Hotkeys*. |
| Create wishlist base | Creates `Wishlist.base` inside the wishlist folder. |
| Fill current note with wishlist properties | Adds missing properties and sections to the open note. |

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
```

## Settings

- **Wishlist folder** where items are created.
- **Currencies**, one per line, written as `symbol = 1,234.56`, showing how that currency writes thousands and decimals. Example: `R$ = 1.234,56`.
- **Default currency**, **priorities** and **default priority**.
- **Status** for new and bought items, and the **tag** added to every item.
- **Extra properties**: YAML added to every new item.
- **Headings** of the photo and reasons sections, and the **link label** used by the base.
- Toggles for the base "New" button and for filling notes created elsewhere.

## Installation

Until the plugin is in the community list, install it manually or with [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Download `main.js`, `manifest.json` and `styles.css` from the latest release.
2. Put them in `<your vault>/.obsidian/plugins/quick-wishlist/`.
3. Enable *Quick Wishlist* in *Settings → Community plugins*.

## License

[MIT](LICENSE)
