/* ============================================================
   PixelForge — Pixel art editor logic
   Vanilla JavaScript. No dependencies. Autosaves to localStorage.
   ============================================================ */

"use strict";

/* ---------- Palette (PICO-8 inspired, 16 colors) ---------- */
const PALETTE = [
  "#000000", "#1D2B53", "#7E2553", "#008751",
  "#AB5236", "#5F574F", "#C2C3C7", "#FFF1E8",
  "#FF004D", "#FFA300", "#FFEC27", "#00E436",
  "#29ADFF", "#83769C", "#FF77A8", "#FFCCAA",
];

const MAX_UNDO = 60;
const SIZES = [16, 32, 64];

/* ---------- State ---------- */
const state = {
  size: 16,
  pixels: [],        // Array(size*size) of hex color or null (transparent)
  tool: "pencil",
  color: "#FF004D",
  showGrid: true,
};

let undoStack = [];
let redoStack = [];
let recents = [];
let drawing = false;
let lastCell = null;
let preStroke = null; // snapshot before a stroke, to drop no-op undo entries

/* ---------- DOM handles ---------- */
const $ = (id) => document.getElementById(id);

const canvas = $("pixel-canvas");
const gridCanvas = $("grid-canvas");
const frame = $("canvas-frame");
const posLabel = $("pos-label");

const currentSwatch = $("current-swatch");
const currentHex = $("current-hex");
const customColor = $("custom-color");
const paletteEl = $("palette");
const recentsEl = $("recents");

const undoBtn = $("undo-btn");
const redoBtn = $("redo-btn");

/* ---------- Grid helpers ---------- */
function initGrid(size) {
  state.size = size;
  state.pixels = new Array(size * size).fill(null);
}

const idx = (x, y) => y * state.size + x;

function getPixel(x, y) {
  return state.pixels[idx(x, y)];
}

function setPixel(x, y, color) {
  state.pixels[idx(x, y)] = color;
}

/* ---------- Rendering ---------- */
function render() {
  canvas.width = state.size;
  canvas.height = state.size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, state.size, state.size);

  for (let i = 0; i < state.pixels.length; i++) {
    const c = state.pixels[i];
    if (!c) continue;
    ctx.fillStyle = c;
    ctx.fillRect(i % state.size, Math.floor(i / state.size), 1, 1);
  }

  layoutCanvases();
}

/* Size the canvases to fit the frame with crisp integer-ish scaling. */
function layoutCanvases() {
  const box = frame.clientWidth - 16; // small inner padding
  const cell = Math.max(2, Math.floor(box / state.size));
  const cssSize = cell * state.size;

  for (const el of [canvas, gridCanvas]) {
    el.style.width = `${cssSize}px`;
    el.style.height = `${cssSize}px`;
  }

  gridCanvas.width = cssSize;
  gridCanvas.height = cssSize;
  const g = gridCanvas.getContext("2d");
  g.clearRect(0, 0, cssSize, cssSize);

  if (!state.showGrid || cell < 8) return; // no tiny unreadable grids

  g.strokeStyle = "rgba(255, 255, 255, 0.10)";
  g.lineWidth = 1;
  for (let i = 1; i < state.size; i++) {
    const p = i * cell + 0.5;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, cssSize); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(cssSize, p); g.stroke();
  }
}

/* ---------- Pointer → cell mapping ---------- */
function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * state.size);
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * state.size);
  if (x < 0 || y < 0 || x >= state.size || y >= state.size) return null;
  return { x, y };
}

/* ---------- History ---------- */
function snapshot() {
  return JSON.stringify({ size: state.size, pixels: [...state.pixels] });
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
  updateHistoryButtons();
}

function applySnapshot(json) {
  const s = JSON.parse(json);
  state.size = s.size;
  state.pixels = s.pixels;
  syncSizeButtons();
  render();
  save();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  applySnapshot(undoStack.pop());
  updateHistoryButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  applySnapshot(redoStack.pop());
  updateHistoryButtons();
}

function updateHistoryButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

/* ---------- Tools ---------- */
function applyTool(cell) {
  const { x, y } = cell;

  if (state.tool === "pencil") {
    setPixel(x, y, state.color);
    render();
  } else if (state.tool === "eraser") {
    setPixel(x, y, null);
    render();
  } else if (state.tool === "picker") {
    const c = getPixel(x, y);
    if (c) setColor(c);
  } else if (state.tool === "fill") {
    floodFill(x, y);
    render();
  }
}

/* Bresenham line so fast strokes never leave gaps. */
function strokeTo(cell) {
  if (!lastCell) {
    applyTool(cell);
    return;
  }

  let { x: x0, y: y0 } = lastCell;
  const { x: x1, y: y1 } = cell;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    applyTool({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx)  { err += dx; y0 += sy; }
  }
}

function floodFill(x, y) {
  const target = getPixel(x, y);
  const fill = state.color;
  if (target === fill) return;

  const queue = [[x, y]];
  const seen = new Set();

  while (queue.length) {
    const [cx, cy] = queue.pop();
    const key = idx(cx, cy);
    if (seen.has(key)) continue;
    if (cx < 0 || cy < 0 || cx >= state.size || cy >= state.size) continue;
    if (getPixel(cx, cy) !== target) continue;

    seen.add(key);
    setPixel(cx, cy, fill);
    queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

/* ---------- Pointer events ---------- */
canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const cell = cellFromEvent(e);
  if (!cell) return;

  preStroke = snapshot();
  pushUndo();
  drawing = true;
  canvas.setPointerCapture(e.pointerId);
  applyTool(cell);
  lastCell = cell;
});

canvas.addEventListener("pointermove", (e) => {
  const cell = cellFromEvent(e);
  posLabel.textContent = cell ? `x: ${cell.x} · y: ${cell.y}` : "—";
  if (!drawing || !cell) return;
  if (state.tool === "fill" || state.tool === "picker") return; // one-shot tools: click only
  strokeTo(cell);
  lastCell = cell;
});

canvas.addEventListener("pointerup", () => {
  if (!drawing) return;
  drawing = false;
  lastCell = null;
  if (preStroke !== null && snapshot() === preStroke) {
    undoStack.pop(); // stroke changed nothing — keep history clean
    updateHistoryButtons();
  }
  preStroke = null;
  save();
});

canvas.addEventListener("pointerleave", () => {
  posLabel.textContent = "—";
});

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

/* ---------- Colors & palette ---------- */
function setColor(color, { remember = true } = {}) {
  state.color = color;
  currentSwatch.style.background = color;
  currentHex.textContent = color.toUpperCase();
  customColor.value = color;

  document.querySelectorAll(".swatch").forEach((s) => {
    s.classList.toggle("active", s.dataset.color?.toLowerCase() === color.toLowerCase());
  });

  if (remember) {
    recents = [color, ...recents.filter((c) => c !== color)].slice(0, 8);
    renderRecents();
    localStorage.setItem("pixelforge.recents", JSON.stringify(recents));
  }
}

function buildPalette() {
  for (const color of PALETTE) {
    paletteEl.appendChild(makeSwatch(color));
  }
}

function makeSwatch(color) {
  const s = document.createElement("button");
  s.className = "swatch";
  s.style.background = color;
  s.dataset.color = color;
  s.title = color.toUpperCase();
  s.setAttribute("aria-label", `Color ${color}`);
  s.addEventListener("click", () => setColor(color));
  return s;
}

function renderRecents() {
  recentsEl.innerHTML = "";
  for (const color of recents) recentsEl.appendChild(makeSwatch(color));
}

/* ---------- Persistence ---------- */
function save() {
  try {
    localStorage.setItem(
      "pixelforge.project",
      JSON.stringify({ size: state.size, pixels: state.pixels })
    );
  } catch {
    /* storage full — ignore */
  }
}

function loadSaved() {
  try {
    const raw = localStorage.getItem("pixelforge.project");
    if (!raw) return false;
    const p = JSON.parse(raw);
    if (!SIZES.includes(p.size) || !Array.isArray(p.pixels)) return false;
    state.size = p.size;
    state.pixels = p.pixels.slice(0, p.size * p.size);
    return true;
  } catch {
    return false;
  }
}

/* ---------- Export ---------- */
function exportPNG(scale) {
  const size = state.size;
  const out = document.createElement("canvas");
  out.width = size * scale;
  out.height = size * scale;
  const ctx = out.getContext("2d");

  for (let i = 0; i < state.pixels.length; i++) {
    const c = state.pixels[i];
    if (!c) continue;
    ctx.fillStyle = c;
    ctx.fillRect(
      (i % size) * scale,
      Math.floor(i / size) * scale,
      scale,
      scale
    );
  }

  const a = document.createElement("a");
  a.download = `pixelforge-${size}x${size}@${scale}x.png`;
  a.href = out.toDataURL("image/png");
  a.click();
}

/* ---------- Canvas actions ---------- */
function changeSize(size) {
  if (size === state.size) return;
  if (state.pixels.some(Boolean) && !confirm(`Start a new ${size}×${size} canvas? Your current drawing will be cleared.`)) {
    syncSizeButtons();
    return;
  }
  initGrid(size);
  undoStack = [];
  redoStack = [];
  syncSizeButtons();
  render();
  save();
  updateHistoryButtons();
}

function syncSizeButtons() {
  document.querySelectorAll(".size-btn").forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.size) === state.size);
  });
}

function clearCanvas() {
  if (!state.pixels.some(Boolean)) return;
  if (!confirm("Clear the whole canvas?")) return;
  pushUndo();
  state.pixels = state.pixels.map(() => null);
  render();
  save();
}

/* ---------- Events ---------- */
document.querySelectorAll(".tool-btn[data-tool]").forEach((btn) => {
  btn.addEventListener("click", () => setTool(btn.dataset.tool));
});

function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll(".tool-btn[data-tool]").forEach((b) => {
    b.classList.toggle("active", b.dataset.tool === tool);
  });
}

$("grid-btn").addEventListener("click", () => {
  state.showGrid = !state.showGrid;
  $("grid-btn").classList.toggle("active", state.showGrid);
  layoutCanvases();
});

$("clear-btn").addEventListener("click", clearCanvas);
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

document.querySelectorAll(".size-btn").forEach((btn) => {
  btn.addEventListener("click", () => changeSize(Number(btn.dataset.size)));
});

document.querySelectorAll("[data-scale]").forEach((btn) => {
  btn.addEventListener("click", () => exportPNG(Number(btn.dataset.scale)));
});

customColor.addEventListener("input", (e) =>
  setColor(e.target.value, { remember: false }) // live preview without polluting recents
);
customColor.addEventListener("change", (e) => setColor(e.target.value));

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  const k = e.key.toLowerCase();

  if (e.ctrlKey || e.metaKey) {
    if (k === "z") {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    } else if (k === "y") {
      e.preventDefault();
      redo();
    }
    return; // leave every other browser shortcut (Ctrl+F, Ctrl+S…) untouched
  }

  if (k === "b") setTool("pencil");
  else if (k === "e") setTool("eraser");
  else if (k === "f") setTool("fill");
  else if (k === "i") setTool("picker");
  else if (k === "g") $("grid-btn").click();
});

window.addEventListener("resize", layoutCanvases);

/* ---------- Boot ---------- */
function init() {
  buildPalette();
  if (!loadSaved()) initGrid(16);
  recents = loadJSONRecents();
  syncSizeButtons();
  setColor(state.color, { remember: false });
  render();
  updateHistoryButtons();
}

function loadJSONRecents() {
  try {
    const raw = localStorage.getItem("pixelforge.recents");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

init();
