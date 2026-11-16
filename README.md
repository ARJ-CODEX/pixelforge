# 🎨 PixelForge

<p align="center">
  <img src="https://img.shields.io/badge/license-Brand%20Protected-red.svg" alt="License: PixelForge Brand License — no rebranding" />
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen.svg" alt="Zero dependencies" />
  <img src="https://img.shields.io/badge/prs-welcome-orange.svg" alt="PRs welcome" />
</p>

**PixelForge** is a fast, minimalist pixel-art editor that runs entirely in your browser. Draw game sprites, icons, and pixel art — no account, no install, no server. Everything stays on your device.

**🔗 Live demo: [arj-codex.github.io/pixelforge](https://arj-codex.github.io/pixelforge)**

## ✨ Features

- ✏️ **Core tools** — pencil, eraser, flood fill, and an eyedropper
- ↩️ **Full undo/redo history** (60 steps) — experiment freely
- 🎨 **Curated palette** — 16 hand-picked colors, custom color picker, and recent colors
- 📐 **Flexible canvases** — 16×16, 32×32, and 64×64 with an adjustable grid overlay
- 📤 **PNG export** — ×8, ×16, and ×32 upscale for crisp game-ready sprites
- 💾 **Autosave** — your drawing is saved in your browser and restored automatically
- ⌨️ **Keyboard shortcuts** — tools and history at your fingertips
- 🌓 **Crisp rendering** — true `image-rendering: pixelated` output, exactly like your export
- 🖱️ **Touch support** — draw on tablets too

## 🚀 Getting Started

No build step, no dependencies:

```bash
git clone https://github.com/ARJ-CODEX/pixelforge.git
cd pixelforge
# open index.html in your browser, or serve it:
npx serve .
```

Or simply use the [live demo](https://arj-codex.github.io/pixelforge).

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `B` | Pencil |
| `E` | Eraser |
| `F` | Flood fill |
| `I` | Color picker |
| `G` | Toggle grid |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |

## 🛠 Tech Stack

- **HTML5** + **CSS3** + **vanilla JavaScript (ES6+)**
- Canvas 2D with pixel-perfect 1px-per-cell rendering
- Zero frameworks, zero dependencies, zero build tools

## 📂 Project Structure

```
pixelforge/
├── index.html   # Markup
├── style.css    # Editor styling
├── app.js       # Canvas engine, tools, history, export
└── README.md
```

## 🗺 Roadmap

- 🎞 Animation frames with onion-skin preview
- 📥 Import existing images as pixels
- 🗂 Multiple save slots / gallery

## ™ Trademark & Branding

**PixelForge™** and its logo are the exclusive brand of **ARJ-CODEX**.

You may use the PixelForge name only to refer to this original project. You may **not**:

- Rebrand or redistribute this project under any other name
- Use the PixelForge name or logo for your own products, domains, or marketing
- Present a modified version as an official PixelForge release

Personal and internal use is free, and contributions to this repository are welcome — see the [License](LICENSE) for full terms.

## 📄 License

Released under the **[PixelForge Brand License (FBL)](LICENSE)** — free to use, protected against rebranding.
