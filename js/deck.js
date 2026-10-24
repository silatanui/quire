import {
  DEFAULT_STYLE,
  absPoints,
  boxOf,
  clone,
  constrainBox,
  createElement,
  diamondPoly,
  duplicateElements,
  handlesFor,
  hitHandle,
  hitTest,
  intersects,
  normalizeBox,
  resizeBox,
  snapAngle,
  reorder,
  translate,
  uid,
  withAbsPoints,
  clamp,
} from "./model.js";
import { pdfFromJpegs, pptxFromJpegs } from "./folio-export.js";
import {
  SHEET,
  SHEET_TEMPLATES,
  blankDeck,
  createList,
  deckFromTalk,
  defaultChrome,
  duplicateSheet,
  gatherLists,
  parseFolio,
  reorderSheets,
  serializeFolio,
  sheetFromTemplate,
  sheetHeading,
} from "./folio.js?v=chrome";
import {
  clipboardImageFiles,
  dataTransferImageFiles,
  filesToImageElements,
  paintImage,
  pickImageFiles,
} from "./media.js";

const STORAGE_KEY = "quire-folio-v1";
const FONT = '"Varela Round", "Segoe UI", sans-serif';
const HANDS = {
  hand: '"Caveat", "Segoe Print", cursive',
  marker: '"Kalam", "Comic Sans MS", cursive',
  script: '"Caveat", "Segoe Script", cursive',
  print: '"Nunito", "Segoe UI", sans-serif',
  book: '"Libre Baskerville", Georgia, serif',
};

function fontStack(element) {
  return HANDS[element && element.fontFamily] || HANDS.hand;
}

function fontCss(element, size) {
  return `${size}px ${fontStack(element)}`;
}

const canvas = document.querySelector("#sheet");
const ctx = canvas.getContext("2d");
const rc = rough.canvas(canvas);
const stage = document.querySelector("#stage");
const editor = document.querySelector("#editor");
const film = document.querySelector("#film");
const titleInput = document.querySelector("#title");
const noteInput = document.querySelector("#note");
const toastNode = document.querySelector("#toast");
const presentNote = document.querySelector("#present-note");

const TOOLS = [
  { id: "hand", label: "Hand", keys: ["h"] },
  { id: "selection", label: "Selection", keys: ["v", "1"] },
  { id: "rectangle", label: "Rectangle", keys: ["r", "2"] },
  { id: "diamond", label: "Diamond", keys: ["d", "3"] },
  { id: "ellipse", label: "Ellipse", keys: ["o", "4"] },
  { id: "arrow", label: "Arrow", keys: ["a", "5"] },
  { id: "line", label: "Line", keys: ["l", "6"] },
  { id: "freedraw", label: "Draw", keys: ["p", "7"] },
  { id: "text", label: "Text", keys: ["t", "8"] },
  { id: "sticky", label: "Sticky note", keys: ["n"] },
  { id: "image", label: "Image", keys: ["i"] },
  { id: "eraser", label: "Eraser", keys: ["e", "0"] },
];

const ICONS = {
  hand: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 11V6.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10.5V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M14 10.8V7.5a1.5 1.5 0 0 1 3 0V13c0 3.2-2 6-5.2 6H11c-2.4 0-4-1.2-4.8-3L5 13.2a1.6 1.6 0 0 1 2.6-1.7L8 13"/></svg>',
  selection: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3.8 5.4 18.2 9.4 14.4 13.2 21.2 15.6 20 11.8 13.4 17.6 13.1Z"/></svg>',
  rectangle: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="6" width="16" height="12" rx="1.5"/></svg>',
  diamond: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3.5 20.5 12 12 20.5 3.5 12Z"/></svg>',
  ellipse: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="12" rx="8" ry="6"/></svg>',
  arrow: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 17 17.5 6.5"/><path d="M11 6h7v7"/></svg>',
  line: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 18 18 6"/></svg>',
  freedraw: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 16c2-6 4-2 6-4s3-6 5-4 3 6 5 2"/></svg>',
  text: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6h12M12 6v12"/></svg>',
  sticky: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 4h9l3 3v13H6Z"/><path d="M15 4v4h4"/></svg>',
  image: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m7 16 3.2-3.4a1.2 1.2 0 0 1 1.7 0L15 15l1.3-1.3a1.2 1.2 0 0 1 1.7 0L20 16"/></svg>',
  eraser: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 15.5 12.5 7l5 5L9 20.5H5.5Z"/><path d="M8 13.5 13 18.5"/></svg>',
  lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="10" width="12" height="9" rx="1.5"/><path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2"/></svg>',
};

const STROKE_COLORS = ["transparent", "#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00", "#6741d9"];
const FILL_COLORS = ["transparent", "#ffc9c9", "#b2f2bb", "#a5d8ff", "#ffec99", "#ffffff"];
const TEXT_GROUNDS = ["transparent", "#fff3bf", "#ffc9c9", "#b2f2bb", "#a5d8ff", "#ffffff", "#e5dbff"];
const TEXT_BORDERS = ["transparent", "#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00", "#6741d9"];

let deck = blankDeck();
let fileId = "";
let library = { current: "", files: [] };
let drawStyle = { ...DEFAULT_STYLE };
let zoom = 1;
let clipboard = [];
let sheetClipboard = null;
let sheetMenuIndex = 0;
let pasteCount = 0;
let ctrlHeld = false;
let lastPointer = null;
let moveIsDuplicate = false;
let handScroll = null;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 6;
let editingId = null;
let editingGroupId = null;
let focusMember = null;
let resizeGroupId = null;
let notePeek = false;
let tool = "selection";
let lockTool = false;
let propertiesOpen = !window.matchMedia("(max-width: 800px)").matches;
let railOpen = !window.matchMedia("(max-width: 800px)").matches;
let selected = new Set();
let mode = null;
let draft = null;
let pointerStart = null;
let moveOrigins = [];
let resizeHandle = null;
let resizeStart = null;
let marquee = null;
let marqueeBase = new Set();
let alignGuides = [];
let pending = null;
const undoStack = [];
const redoStack = [];
let toastTimer = 0;
let idbTimer = 0;

function $(id) {
  return document.querySelector(id);
}

function toast(message) {
  toastNode.textContent = message;
  toastNode.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastNode.hidden = true;
  }, 2600);
}

function fileRecord(source) {
  if (!source || !Array.isArray(source.sheets) || !source.sheets.length) return null;
  return {
    id: typeof source.id === "string" && source.id ? source.id : "talk-opened",
    title: typeof source.title === "string" ? source.title : "Untitled talk",
    index: clamp(source.index || 0, 0, source.sheets.length - 1),
    chrome: { ...defaultChrome(), ...(source.chrome && typeof source.chrome === "object" ? source.chrome : {}) },
    sheets: source.sheets,
    style: source.style && typeof source.style === "object" ? { ...DEFAULT_STYLE, ...source.style } : { ...DEFAULT_STYLE },
    savedAt: Number(source.savedAt) || 0,
  };
}

function readLibrary(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (Array.isArray(raw.files)) {
    const files = raw.files.map(fileRecord).filter(Boolean);
    if (!files.length) return null;
    const current = files.find((file) => file.id === raw.current) || files[0];
    return { savedAt: Number(raw.savedAt) || current.savedAt || 0, files, current: current.id };
  }
  const single = fileRecord(raw);
  if (!single) return null;
  return { savedAt: single.savedAt, files: [single], current: single.id };
}

function adoptSheets(sheets) {
  return (sheets || []).map((item) => ({
    id: typeof item.id === "string" && item.id ? item.id : uid(),
    note: item.note || "",
    elements: gatherLists(item.elements || []),
    background: item.background || "plain",
    backgroundOpacity: item.backgroundOpacity ?? 100,
    header: String(item.header || "").slice(0, 80),
    footer: String(item.footer || "").slice(0, 80),
    showHeader: Boolean(item.showHeader),
    showFooter: Boolean(item.showFooter),
    template: item.template || "none",
  }));
}

function useLibrary(record) {
  library = { current: record.current, files: record.files };
  const file = record.files.find((item) => item.id === record.current) || record.files[0];
  fileId = file.id;
  deck = {
    title: file.title,
    index: file.index,
    chrome: { ...defaultChrome(), ...(file.chrome || {}) },
    sheets: adoptSheets(file.sheets),
  };
  drawStyle = { ...file.style };
}

function readLocal() {
  try {
    return readLibrary(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
  } catch {
    return null;
  }
}

function openStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("quire-folio", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("talks");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readIdb() {
  return openStore().then((db) => new Promise((resolve, reject) => {
    const request = db.transaction("talks").objectStore("talks").get("device");
    request.onsuccess = () => resolve(readLibrary(request.result));
    request.onerror = () => reject(request.error);
  }));
}

function writeIdb(payload) {
  clearTimeout(idbTimer);
  idbTimer = setTimeout(() => {
    openStore().then((db) => {
      const tx = db.transaction("talks", "readwrite");
      tx.objectStore("talks").put(payload, "device");
    }).catch(() => {});
  }, 60);
}

function payload() {
  const savedAt = Date.now();
  if (!fileId) fileId = `talk-${savedAt.toString(36)}`;
  const files = library.files.filter((file) => file.id !== fileId);
  files.unshift({
    id: fileId,
    title: deck.title,
    index: deck.index,
    chrome: { ...defaultChrome(), ...(deck.chrome || {}) },
    sheets: deck.sheets,
    style: drawStyle,
    savedAt,
  });
  library = { current: fileId, files: files.slice(0, 30) };
  return { ...library, savedAt };
}

function persist() {
  const record = payload();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    const kept = $("#kept");
    if (kept) kept.textContent = "Kept on this device";
  } catch {
    const kept = $("#kept");
    if (kept) kept.textContent = "Could not keep this folio";
  }
  writeIdb(record);
}

function persistSoon() {
  persist();
}

function sheet() {
  return deck.sheets[deck.index];
}

function commit(next) {
  undoStack.push(JSON.stringify(deck));
  if (undoStack.length > 40) undoStack.shift();
  redoStack.length = 0;
  deck = next;
  closeEditor();
  persistSoon();
  renderAll();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(deck));
  deck = JSON.parse(undoStack.pop());
  closeEditor();
  selected = new Set();
  focusMember = null;
  persistSoon();
  renderAll();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(deck));
  deck = JSON.parse(redoStack.pop());
  closeEditor();
  selected = new Set();
  focusMember = null;
  persistSoon();
  renderAll();
}

function hasStroke(element) {
  return Boolean(element.strokeColor) && element.strokeColor !== "transparent" && element.strokeColor !== "none";
}

function hasFill(element) {
  return Boolean(element.backgroundColor) && element.backgroundColor !== "transparent";
}

function roughOptions(element) {
  const stroked = hasStroke(element);
  const options = {
    seed: element.seed || 1,
    roughness: element.roughness ?? 1,
    stroke: stroked ? element.strokeColor : "none",
    strokeWidth: stroked ? (element.strokeWidth || 1) : 0,
    bowing: element.roughness ? 1 : 0,
    disableMultiStroke: element.roughness === 0,
  };
  if (stroked && element.strokeStyle === "dashed") options.strokeLineDash = [12, 10];
  if (stroked && element.strokeStyle === "dotted") options.strokeLineDash = [2, 8];
  if (hasFill(element)) {
    options.fill = element.backgroundColor;
    options.fillStyle = element.fillStyle || "hachure";
  }
  return options;
}

function roundedPolyPath(points, radius) {
  const count = points.length;
  const parts = [];
  for (let index = 0; index < count; index += 1) {
    const previous = points[(index + count - 1) % count];
    const current = points[index];
    const next = points[(index + 1) % count];
    const inLength = Math.hypot(current.x - previous.x, current.y - previous.y) || 1;
    const outLength = Math.hypot(next.x - current.x, next.y - current.y) || 1;
    const cut = Math.min(radius, inLength / 2.2, outLength / 2.2);
    const approach = {
      x: current.x - ((current.x - previous.x) / inLength) * cut,
      y: current.y - ((current.y - previous.y) / inLength) * cut,
    };
    const leave = {
      x: current.x + ((next.x - current.x) / outLength) * cut,
      y: current.y + ((next.y - current.y) / outLength) * cut,
    };
    parts.push(index === 0 ? `M ${approach.x} ${approach.y}` : `L ${approach.x} ${approach.y}`);
    parts.push(`Q ${current.x} ${current.y} ${leave.x} ${leave.y}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

function wrapLines(context, text, maxWidth) {
  const limit = Math.max(8, maxWidth);
  const pieces = (word) => {
    if (context.measureText(word).width <= limit) return [word];
    const parts = [];
    let chunk = "";
    for (const char of word) {
      const next = chunk + char;
      if (chunk && context.measureText(next).width > limit) {
        parts.push(chunk);
        chunk = char;
      } else {
        chunk = next;
      }
    }
    if (chunk) parts.push(chunk);
    return parts.length ? parts : [word];
  };
  const lines = [];
  for (const paragraph of String(text || "").split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean).flatMap(pieces);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = words[0];
    for (let index = 1; index < words.length; index += 1) {
      const next = `${line} ${words[index]}`;
      if (context.measureText(next).width > limit && line) {
        lines.push(line);
        line = words[index];
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines.length ? lines : [""];
}

function shapeDrawable(generator, element) {
  if (element.type === "text" || element.type === "list" || element.type === "group" || element.type === "image") return null;
  const stroked = hasStroke(element);
  const filled = hasFill(element);
  const closed = element.type === "rectangle" || element.type === "sticky" || element.type === "ellipse" || element.type === "diamond";
  if (!stroked && !filled) return null;
  if (!stroked && !closed) return null;
  const options = roughOptions(element);
  const box = normalizeBox(element.x, element.y, element.width, element.height);
  if (closed && (box.width < 1 || box.height < 1)) return null;
  if (element.type === "rectangle" || element.type === "sticky" || element.type === "diamond") {
    const points = element.type === "diamond"
      ? diamondPoly(box)
      : [
        { x: box.x, y: box.y },
        { x: box.x + box.width, y: box.y },
        { x: box.x + box.width, y: box.y + box.height },
        { x: box.x, y: box.y + box.height },
      ];
    const radius = element.roundness ? Math.min(28, box.width / 3, box.height / 3) : 0;
    if (radius >= 2) return generator.path(roundedPolyPath(points, radius), options);
    if (element.type === "diamond") return generator.polygon(points.map((point) => [point.x, point.y]), options);
    return generator.rectangle(box.x, box.y, box.width, box.height, options);
  }
  if (element.type === "ellipse") {
    return generator.ellipse(box.x + box.width / 2, box.y + box.height / 2, box.width, box.height, options);
  }
  const points = absPoints(element);
  if (points.length < 2) return null;
  if (element.type === "freedraw") {
    const tuples = points.map((point) => [point.x, point.y]);
    return tuples.length < 4 ? generator.linearPath(tuples, options) : generator.curve(tuples, options);
  }
  let path = points;
  if (element.type === "arrow") {
    const end = points[points.length - 1];
    const prev = points[points.length - 2];
    const head = 12 + (element.strokeWidth || 2) * 2;
    const length = Math.hypot(end.x - prev.x, end.y - prev.y) || 1;
    const keep = Math.max(0, length - head * 0.65) / length;
    path = points.slice(0, -1).concat([{
      x: prev.x + (end.x - prev.x) * keep,
      y: prev.y + (end.y - prev.y) * keep,
    }]);
  }
  return generator.linearPath(path.map((point) => [point.x, point.y]), options);
}

function arrowHeadDrawable(generator, element) {
  if (element.type !== "arrow" || !hasStroke(element)) return null;
  const points = absPoints(element);
  if (points.length < 2) return null;
  const end = points[points.length - 1];
  const prev = points[points.length - 2];
  const length = Math.hypot(end.x - prev.x, end.y - prev.y);
  if (length < 8) return null;
  const angle = Math.atan2(end.y - prev.y, end.x - prev.x);
  const head = 16 + (element.strokeWidth || 2) * 2;
  const spread = 0.42;
  return generator.polygon(
    [
      [end.x, end.y],
      [end.x - head * Math.cos(angle - spread), end.y - head * Math.sin(angle - spread)],
      [end.x - head * Math.cos(angle + spread), end.y - head * Math.sin(angle + spread)],
    ],
    { ...roughOptions(element), fill: element.strokeColor, fillStyle: "solid", stroke: element.strokeColor },
  );
}

function drawElement(context, roughCanvas, element) {
  if (element.type === "group") {
    context.save();
    context.translate(element.x, element.y);
    for (const child of element.children || []) drawElement(context, roughCanvas, child);
    context.restore();
    return;
  }
  context.save();
  context.globalAlpha = clamp(element.opacity ?? 100, 0, 100) / 100;
  if (element.type === "image") {
    paintImage(context, element, paintMain);
    context.restore();
    return;
  }
  const body = shapeDrawable(roughCanvas.generator, element);
  if (body) roughCanvas.draw(body);
  const head = arrowHeadDrawable(roughCanvas.generator, element);
  if (head) roughCanvas.draw(head);
  if (element.type === "text") paintTextBlock(context, element);
  else if (element.type === "list") paintList(context, element);
  else if (element.text && element.id !== editingId) {
    const fontSize = element.fontSize || 28;
    const box = boxOf(element);
    context.fillStyle = hasStroke(element) ? element.strokeColor : "#1e1e1e";
    context.font = fontCss(element, fontSize);
    context.textBaseline = "top";
    context.textAlign = "center";
    const pad = 14;
    const lines = wrapLines(context, element.text, Math.max(40, box.width - pad * 2));
    const lineHeight = fontSize * 1.25;
    const start = box.y + Math.max(pad, (box.height - lines.length * lineHeight) / 2);
    lines.forEach((line, index) => context.fillText(line, box.x + box.width / 2, start + index * lineHeight));
  }
  context.restore();
}

function paintTextFrame(context, element) {
  const box = boxOf(element);
  const fill = element.textFill;
  const border = element.borderColor;
  const hasFill = fill && fill !== "transparent";
  const hasBorder = border && border !== "transparent";
  if (!hasFill && !hasBorder) return;
  context.beginPath();
  context.roundRect(box.x - 10, box.y - 6, box.width + 20, box.height + 12, 12);
  if (hasFill) {
    context.fillStyle = fill;
    context.fill();
  }
  if (hasBorder) {
    context.strokeStyle = border;
    context.lineWidth = 2.5;
    context.stroke();
  }
}

function paintTextBlock(context, element) {
  const fontSize = element.fontSize || 48;
  const box = boxOf(element);
  paintTextFrame(context, element);
  if (!element.text || element.id === editingId) return;
  context.fillStyle = element.strokeColor || "#1e1e1e";
  context.font = fontCss(element, fontSize);
  context.textBaseline = "top";
  const align = element.align || "left";
  context.textAlign = align;
  const pad = 2;
  const lines = wrapLines(context, element.text, Math.max(40, box.width - pad * 2));
  const lineHeight = fontSize * 1.25;
  const x = align === "center" ? box.x + box.width / 2 : align === "right" ? box.x + box.width - pad : box.x + pad;
  lines.forEach((line, index) => context.fillText(line, x, box.y + index * lineHeight));
}

const measureCanvas = document.createElement("canvas");
const measureContext = measureCanvas.getContext("2d");

function markerFor(style, index) {
  if (style === "number") return `${index + 1}.`;
  if (style === "dash") return "–";
  if (style === "plain") return "";
  return "•";
}

function blockHeight(element) {
  const fontSize = element.fontSize || 32;
  measureContext.font = fontCss(element, fontSize);
  const lineHeight = fontSize * (element.type === "list" ? 1.45 : 1.25);
  if (element.type === "list") {
    const items = element.items && element.items.length ? element.items : [""];
    const gutter = element.listStyle === "plain" ? 0 : fontSize * 1.6;
    let rows = 0;
    for (const item of items) {
      rows += Math.max(1, wrapLines(measureContext, item || " ", Math.max(40, element.width - gutter)).length);
    }
    return Math.max(lineHeight, rows * lineHeight);
  }
  const rows = Math.max(1, wrapLines(measureContext, element.text || " ", Math.max(40, element.width - 4)).length);
  return Math.max(fontSize * 1.35, rows * lineHeight);
}

function paintList(context, element) {
  const fontSize = element.fontSize || 30;
  const box = boxOf(element);
  paintTextFrame(context, element);
  if (element.id === editingId) return;
  const items = element.items || [];
  context.fillStyle = element.strokeColor || "#1e1e1e";
  context.font = fontCss(element, fontSize);
  context.textBaseline = "top";
  const gutter = element.listStyle === "plain" ? 0 : fontSize * 1.6;
  const lineHeight = fontSize * 1.45;
  const align = element.align || "left";
  let y = box.y;
  items.forEach((item, index) => {
    const marker = markerFor(element.listStyle, index);
    if (marker) {
      context.textAlign = "left";
      context.fillText(marker, box.x, y);
    }
    const textWidth = Math.max(40, box.width - gutter);
    const lines = wrapLines(context, item || "", textWidth);
    context.textAlign = align;
    const x = align === "center" ? box.x + gutter + textWidth / 2 : align === "right" ? box.x + box.width - 2 : box.x + gutter;
    (lines.length ? lines : [""]).forEach((line) => {
      context.fillText(line, x, y);
      y += lineHeight;
    });
  });
}

function resizeLettering(start, handle, world) {
  const box = boxOf(start);
  const fontSize = start.fontSize || 32;
  const horizontal = handle === "e" || handle === "w";
  if (horizontal) {
    const width = Math.max(36, handle === "e" ? world.x - box.x : box.x + box.width - world.x);
    const next = { ...start, width };
    next.height = blockHeight(next);
    return { ...next, x: handle === "w" ? box.x + box.width - width : box.x, y: box.y };
  }
  const height = Math.max(12, handle.includes("s") ? world.y - box.y : box.y + box.height - world.y);
  const scale = clamp(height / (box.height || 1), 0.2, 8);
  const nextSize = clamp(Math.round(fontSize * scale), 8, 280);
  const width = Math.max(36, box.width * (nextSize / fontSize));
  const next = { ...start, fontSize: nextSize, width };
  next.height = blockHeight(next);
  let x = box.x;
  let y = box.y;
  if (handle.includes("w")) x = box.x + box.width - width;
  if (handle.includes("n")) y = box.y + box.height - next.height;
  return { ...next, x, y };
}

const LABEL_TYPES = ["rectangle", "diamond", "ellipse", "sticky"];

function scaleMember(element, sx, sy) {
  const next = {
    ...element,
    x: element.x * sx,
    y: element.y * sy,
    width: Math.max(1, element.width * sx),
    height: Math.max(1, element.height * sy),
  };
  if (element.fontSize) next.fontSize = clamp(Math.round(element.fontSize * ((Math.abs(sx) + Math.abs(sy)) / 2)), 8, 280);
  if (element.points) next.points = element.points.map((point) => ({ x: point.x * sx, y: point.y * sy }));
  if (element.children) next.children = element.children.map((child) => scaleMember(child, sx, sy));
  return next;
}

function resizeGroup(start, handle, world, keepRatio) {
  const box = resizeBox(boxOf(start), handle, world, keepRatio);
  const sx = start.width ? box.width / start.width : 1;
  const sy = start.height ? box.height / start.height : 1;
  return {
    ...start,
    ...box,
    children: (start.children || []).map((child) => scaleMember(child, sx, sy)),
  };
}

function resizedElement(start, handle, world, shiftKey) {
  if (handle === "start" || handle === "end") {
    const points = absPoints(start);
    const index = handle === "start" ? 0 : points.length - 1;
    let next = world;
    const anchor = points[index === 0 ? points.length - 1 : 0];
    if (shiftKey) next = snapAngle(anchor.x, anchor.y, world.x, world.y);
    points[index] = next;
    return withAbsPoints(start, points);
  }
  if (start.type === "text" || start.type === "list") return resizeLettering(start, handle, world);
  if (start.type === "group") return resizeGroup(start, handle, world, shiftKey);
  return { ...start, ...resizeBox(boxOf(start), handle, world, shiftKey || start.type === "image") };
}

function viewScale() {
  const box = canvas.getBoundingClientRect();
  return box.width > 40 ? box.width / SHEET.width : 0.5;
}

function handleSize() {
  return 8 / viewScale();
}

function unionBoxes(boxes) {
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

function snapAlignment(moving, stationary) {
  const threshold = Math.max(4, 7 / viewScale());
  const box = unionBoxes(moving.map((element) => boxOf(element)));
  const xTargets = [];
  const yTargets = [];
  const mark = (list, at, from, to, page) => list.push({ at, from, to, page });
  mark(xTargets, 0, 0, SHEET.height, true);
  mark(xTargets, SHEET.width / 2, 0, SHEET.height, true);
  mark(xTargets, SHEET.width, 0, SHEET.height, true);
  mark(yTargets, 0, 0, SHEET.width, true);
  mark(yTargets, SHEET.height / 2, 0, SHEET.width, true);
  mark(yTargets, SHEET.height, 0, SHEET.width, true);
  for (const element of stationary) {
    const other = boxOf(element);
    if (other.width < 1 && other.height < 1) continue;
    mark(xTargets, other.x, other.y, other.y + other.height, false);
    mark(xTargets, other.x + other.width / 2, other.y, other.y + other.height, false);
    mark(xTargets, other.x + other.width, other.y, other.y + other.height, false);
    mark(yTargets, other.y, other.x, other.x + other.width, false);
    mark(yTargets, other.y + other.height / 2, other.x, other.x + other.width, false);
    mark(yTargets, other.y + other.height, other.x, other.x + other.width, false);
  }
  const closest = (targets, anchors) => {
    let winner = null;
    for (const anchor of anchors) {
      for (const target of targets) {
        const delta = target.at - anchor;
        const distance = Math.abs(delta);
        if (distance > threshold) continue;
        const prefer = !winner || distance < winner.distance - 0.2 || (Math.abs(distance - winner.distance) <= 0.2 && target.page && !winner.target.page);
        if (prefer) winner = { delta, distance, target };
      }
    }
    return winner;
  };
  const xSnap = closest(xTargets, [box.x, box.x + box.width / 2, box.x + box.width]);
  const ySnap = closest(yTargets, [box.y, box.y + box.height / 2, box.y + box.height]);
  const placed = {
    x: box.x + (xSnap ? xSnap.delta : 0),
    y: box.y + (ySnap ? ySnap.delta : 0),
    width: box.width,
    height: box.height,
  };
  const pad = 12 / viewScale();
  const guides = [];
  if (xSnap) {
    guides.push({
      axis: "x",
      at: xSnap.target.at,
      from: xSnap.target.page ? 0 : Math.min(placed.y, xSnap.target.from) - pad,
      to: xSnap.target.page ? SHEET.height : Math.max(placed.y + placed.height, xSnap.target.to) + pad,
    });
  }
  if (ySnap) {
    guides.push({
      axis: "y",
      at: ySnap.target.at,
      from: ySnap.target.page ? 0 : Math.min(placed.x, ySnap.target.from) - pad,
      to: ySnap.target.page ? SHEET.width : Math.max(placed.x + placed.width, ySnap.target.to) + pad,
    });
  }
  return { dx: xSnap ? xSnap.delta : 0, dy: ySnap ? ySnap.delta : 0, guides };
}

function drawAlignGuides(context) {
  if (!alignGuides.length) return;
  context.save();
  context.strokeStyle = "#e03131";
  context.lineWidth = 1.25 / viewScale();
  context.setLineDash([5 / viewScale(), 4 / viewScale()]);
  for (const guide of alignGuides) {
    context.beginPath();
    if (guide.axis === "x") {
      context.moveTo(guide.at, guide.from);
      context.lineTo(guide.at, guide.to);
    } else {
      context.moveTo(guide.from, guide.at);
      context.lineTo(guide.to, guide.at);
    }
    context.stroke();
  }
  context.restore();
}

function drawGuides(context) {
  const size = handleSize();
  const pad = size * 0.55;
  context.save();
  context.strokeStyle = "#6965db";
  context.fillStyle = "#ffffff";
  context.lineWidth = 1.4 / viewScale();
  if (marquee) {
    context.setLineDash([6 / viewScale(), 4 / viewScale()]);
    context.strokeRect(marquee.x, marquee.y, marquee.width, marquee.height);
    context.setLineDash([]);
  }
  for (const element of sheet().elements || []) {
    if (!selected.has(element.id)) continue;
    const box = boxOf(element);
    context.setLineDash([6 / viewScale(), 4 / viewScale()]);
    context.strokeRect(box.x - pad, box.y - pad, box.width + pad * 2, box.height + pad * 2);
    context.setLineDash([]);
    if (focusMember && element.id === focusMember.groupId) {
      const child = (element.children || []).find((item) => item.id === focusMember.childId);
      if (child) {
        const inner = boxOf(child);
        context.strokeRect(element.x + inner.x - pad, element.y + inner.y - pad, inner.width + pad * 2, inner.height + pad * 2);
      }
    }
    if (selected.size !== 1 || focusMember) continue;
    for (const handle of handlesFor(element)) {
      context.fillRect(handle.x - size / 2, handle.y - size / 2, size, size);
      context.strokeRect(handle.x - size / 2, handle.y - size / 2, size, size);
    }
  }
  context.restore();
  drawAlignGuides(context);
}

function showDupMark(clientX, clientY) {
  const mark = $("#dup-mark");
  if (!mark) return;
  mark.hidden = false;
  mark.style.left = `${clientX + 14}px`;
  mark.style.top = `${clientY + 14}px`;
}

function hideDupMark() {
  const mark = $("#dup-mark");
  if (mark) mark.hidden = true;
}

function updateCursor(world, clientX = 0, clientY = 0) {
  if (document.body.classList.contains("presenting")) return;
  if (tool === "hand" || mode === "hand") {
    canvas.style.cursor = mode === "hand" ? "grabbing" : "grab";
    hideDupMark();
    return;
  }
  if (tool === "text") {
    canvas.style.cursor = "text";
    hideDupMark();
    return;
  }
  if (tool === "eraser") {
    canvas.style.cursor = "cell";
    hideDupMark();
    return;
  }
  if (tool === "selection" && world && (selected.size === 1 || focusMember) && !ctrlHeld) {
    const active = activeHandleTarget();
    const element = active && active.element;
    const handle = element && hitHandle(element, world.x, world.y, handleSize());
    const cursors = {
      nw: "nwse-resize",
      se: "nwse-resize",
      ne: "nesw-resize",
      sw: "nesw-resize",
      n: "ns-resize",
      s: "ns-resize",
      e: "ew-resize",
      w: "ew-resize",
      start: "grab",
      end: "grab",
    };
    if (handle && cursors[handle]) {
      canvas.style.cursor = cursors[handle];
      hideDupMark();
      return;
    }
  }
  if (tool === "selection" && world) {
    const hit = hitTest(elements(), world.x, world.y, 8);
    if (hit) {
      if (ctrlHeld) {
        canvas.style.cursor = "copy";
        showDupMark(clientX, clientY);
        return;
      }
      canvas.style.cursor = "move";
      hideDupMark();
      return;
    }
  }
  hideDupMark();
  canvas.style.cursor = tool === "selection" ? "default" : "crosshair";
}

const PAGE_BACKGROUNDS = [
  ["plain", "Plain"],
  ["doodles", "Doodles"],
  ["dots", "Dots"],
  ["margin", "Margin"],
  ["ruled", "Ruled"],
  ["exercise", "Exercise"],
  ["grid", "Graph"],
  ["squares", "Squares"],
  ["corners", "Corners"],
  ["horizon", "Horizon"],
  ["sun", "Sun"],
  ["steps", "Steps"],
  ["sparks", "Sparks"],
  ["waves", "Waves"],
];

function paintPage(context, id, opacity = 100) {
  const view = context.getTransform().a || 1;
  const strength = clamp(Number.isFinite(Number(opacity)) ? Number(opacity) : 100, 0, 100) / 100;
  const ink = "rgba(116, 108, 96, 0.42)";
  const wash = "rgba(116, 108, 96, 0.1)";
  const hair = Math.max(2.4, 2 / view);
  context.save();
  context.fillStyle = "#fffdf8";
  context.fillRect(0, 0, SHEET.width, SHEET.height);
  context.globalAlpha = strength;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = hair;
  context.strokeStyle = ink;
  context.fillStyle = wash;
  if (!id || id === "plain" || strength <= 0) {
    context.restore();
    return;
  }
  if (id === "doodles") {
    context.setLineDash([8, 9]);
    context.beginPath();
    context.moveTo(36, 280);
    context.bezierCurveTo(180, 90, 460, 70, 640, 230);
    context.bezierCurveTo(820, 390, 860, 520, 1040, 560);
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.moveTo(1040, 560);
    context.lineTo(1004, 538);
    context.moveTo(1040, 560);
    context.lineTo(1012, 592);
    context.stroke();
    context.beginPath();
    context.moveTo(150, 540);
    context.lineTo(246, 540);
    context.lineTo(198, 458);
    context.closePath();
    context.fill();
    context.stroke();
    context.beginPath();
    context.arc(1088, 150, 58, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  } else if (id === "dots") {
    context.fillStyle = ink;
    const dot = Math.max(1.6, 1.3 / view);
    for (let x = 44; x < SHEET.width - 20; x += 36) {
      for (let y = 36; y < SHEET.height - 16; y += 36) {
        context.beginPath();
        context.arc(x, y, dot, 0, Math.PI * 2);
        context.fill();
      }
    }
  } else if (id === "margin") {
    context.beginPath();
    context.moveTo(78, 36);
    context.lineTo(78, SHEET.height - 36);
    context.moveTo(86, 36);
    context.lineTo(86, SHEET.height - 36);
    context.stroke();
  } else if (id === "ruled") {
    for (let y = 52; y < SHEET.height - 28; y += 32) {
      context.beginPath();
      context.moveTo(40, y);
      context.lineTo(SHEET.width - 40, y);
      context.stroke();
    }
  } else if (id === "exercise") {
    for (let y = 64; y < SHEET.height - 28; y += 28) {
      context.beginPath();
      context.moveTo(108, y);
      context.lineTo(SHEET.width - 36, y);
      context.stroke();
    }
    context.strokeStyle = "rgba(176, 92, 92, 0.7)";
    context.beginPath();
    context.moveTo(92, 32);
    context.lineTo(92, SHEET.height - 28);
    context.stroke();
  } else if (id === "grid") {
    context.lineWidth = Math.max(1.2, 1.1 / view);
    for (let x = 36; x < SHEET.width - 16; x += 32) {
      context.beginPath();
      context.moveTo(x, 28);
      context.lineTo(x, SHEET.height - 24);
      context.stroke();
    }
    for (let y = 32; y < SHEET.height - 16; y += 32) {
      context.beginPath();
      context.moveTo(24, y);
      context.lineTo(SHEET.width - 24, y);
      context.stroke();
    }
  } else if (id === "squares") {
    const step = 40;
    context.lineWidth = Math.max(1.15, 1 / view);
    for (let x = 40; x < SHEET.width - 20; x += step) {
      context.beginPath();
      context.moveTo(x, 28);
      context.lineTo(x, SHEET.height - 24);
      context.stroke();
    }
    for (let y = 36; y < SHEET.height - 16; y += step) {
      context.beginPath();
      context.moveTo(28, y);
      context.lineTo(SHEET.width - 28, y);
      context.stroke();
    }
    context.lineWidth = hair;
    context.strokeStyle = "rgba(116, 108, 96, 0.72)";
    for (let x = 40; x < SHEET.width - 20; x += step * 4) {
      context.beginPath();
      context.moveTo(x, 28);
      context.lineTo(x, SHEET.height - 24);
      context.stroke();
    }
    for (let y = 36; y < SHEET.height - 16; y += step * 4) {
      context.beginPath();
      context.moveTo(28, y);
      context.lineTo(SHEET.width - 28, y);
      context.stroke();
    }
  } else if (id === "corners") {
    const marks = [[40, 36, 1, 1], [SHEET.width - 40, 36, -1, 1], [40, SHEET.height - 36, 1, -1], [SHEET.width - 40, SHEET.height - 36, -1, -1]];
    marks.forEach(([x, y, sx, sy]) => {
      context.beginPath();
      context.moveTo(x, y + sy * 34);
      context.lineTo(x, y);
      context.lineTo(x + sx * 34, y);
      context.stroke();
    });
  } else if (id === "horizon") {
    context.beginPath();
    context.moveTo(72, 612);
    context.lineTo(SHEET.width - 72, 612);
    context.stroke();
  } else if (id === "sun") {
    context.beginPath();
    context.arc(1120, 118, 64, 0, Math.PI * 2);
    context.stroke();
    for (let ray = 0; ray < 8; ray += 1) {
      const angle = (Math.PI * 2 * ray) / 8;
      context.beginPath();
      context.moveTo(1120 + Math.cos(angle) * 78, 118 + Math.sin(angle) * 78);
      context.lineTo(1120 + Math.cos(angle) * 98, 118 + Math.sin(angle) * 98);
      context.stroke();
    }
  } else if (id === "steps") {
    [150, 210, 270, 330].forEach((width, index) => {
      const y = 560 + index * 28;
      context.fillRect(72, y, width, 14);
      context.strokeRect(72, y, width, 14);
    });
  } else if (id === "sparks") {
    [[120, 90], [180, 150], [1080, 520], [1160, 180], [980, 80], [140, 600]].forEach(([x, y], index) => {
      context.beginPath();
      if (index % 2) context.arc(x, y, 7, 0, Math.PI * 2);
      else {
        context.moveTo(x - 12, y);
        context.lineTo(x + 12, y);
      }
      context.stroke();
    });
  } else if (id === "waves") {
    for (let band = 0; band < 3; band += 1) {
      context.beginPath();
      for (let x = 0; x <= SHEET.width; x += 16) {
        const y = 620 + band * 22 + Math.sin(x / 90 + band) * 10;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
  }
  context.restore();
}

function paintChrome(context, page, pageLabel) {
  context.save();
  context.fillStyle = "#8a8478";
  context.font = `20px ${FONT}`;
  context.textBaseline = "alphabetic";
  if (page && page.showHeader && String(page.header || "").trim()) {
    context.textAlign = "left";
    context.fillText(String(page.header).slice(0, 80), 56, 40);
  }
  if (page && page.showFooter && String(page.footer || "").trim()) {
    context.textAlign = "left";
    context.fillText(String(page.footer).slice(0, 80), 56, SHEET.height - 42);
  }
  if (pageLabel) {
    context.textAlign = "right";
    context.font = `22px ${FONT}`;
    context.fillText(pageLabel, SHEET.width - 56, SHEET.height - 42);
  }
  context.restore();
}

function paint(target, roughCanvas, elements, pageLabel, pixelWidth, guides = false, background = "plain", backgroundOpacity = 100, page = null) {
  const bitmapWidth = pixelWidth || SHEET.width * (window.devicePixelRatio || 1);
  const bitmapHeight = Math.round(bitmapWidth * (SHEET.height / SHEET.width));
  const scale = bitmapWidth / SHEET.width;
  const context = target.getContext("2d");
  target.width = bitmapWidth;
  target.height = bitmapHeight;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  paintPage(context, background || "plain", backgroundOpacity);
  for (const element of elements) drawElement(context, roughCanvas, element);
  if (guides && !document.body.classList.contains("presenting")) drawGuides(context);
  paintChrome(context, page, pageLabel);
}

function fitCanvas() {
  const bounds = stage.getBoundingClientRect();
  const base = Math.min(bounds.width / SHEET.width, bounds.height / SHEET.height);
  const safe = Number.isFinite(base) && base > 0 ? base : 0.4;
  const scale = safe * zoom;
  canvas.style.width = `${SHEET.width * scale}px`;
  canvas.style.height = `${SHEET.height * scale}px`;
  const overflow = SHEET.width * scale > bounds.width + 1 || SHEET.height * scale > bounds.height + 1;
  stage.classList.toggle("zoomed-in", overflow && !document.body.classList.contains("presenting"));
}

function updateZoomLabel() {
  const label = $("#zoom-level");
  if (label) label.textContent = `${Math.round(zoom * 100)}%`;
}

function paintMain() {
  fitCanvas();
  const cssScale = (parseFloat(canvas.style.width) || 1) / SHEET.width;
  const ratio = Math.min(3, Math.max(window.devicePixelRatio || 1, cssScale * (window.devicePixelRatio || 1)));
  const label = `${deck.index + 1}  /  ${deck.sheets.length}`;
  paint(canvas, rc, sheet().elements || [], label, Math.round(SHEET.width * ratio), true, sheet().background, sheet().backgroundOpacity, sheet());
  if (editingId) positionEditor();
  syncProperties();
  updateZoomLabel();
}

function zoomAt(clientX, clientY, nextZoom) {
  const before = canvas.getBoundingClientRect();
  const relX = before.width ? (clientX - before.left) / before.width : 0.5;
  const relY = before.height ? (clientY - before.top) / before.height : 0.5;
  zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  paintMain();
  const after = canvas.getBoundingClientRect();
  stage.scrollLeft += after.left + relX * after.width - clientX;
  stage.scrollTop += after.top + relY * after.height - clientY;
  if (editingId) positionEditor();
}

function fitZoom() {
  zoom = 1;
  stage.scrollLeft = 0;
  stage.scrollTop = 0;
  paintMain();
}

function goToSheet(index) {
  if (index === deck.index) return;
  closeEditor();
  selected = new Set();
  focusMember = null;
  deck.index = index;
  persistSoon();
  renderAll();
}

function openSheetMenu(index, x, y) {
  sheetMenuIndex = index;
  const menu = $("#sheet-menu");
  hideContextMenu();
  const paste = menu.querySelector('[data-sheet-action="paste"]');
  const earlier = menu.querySelector('[data-sheet-action="earlier"]');
  const later = menu.querySelector('[data-sheet-action="later"]');
  const remove = menu.querySelector('[data-sheet-action="remove"]');
  if (paste) paste.disabled = !sheetClipboard;
  if (earlier) earlier.disabled = index <= 0;
  if (later) later.disabled = index >= deck.sheets.length - 1;
  if (remove) remove.disabled = deck.sheets.length < 2;
  menu.hidden = false;
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
}

function hideSheetMenu() {
  const menu = $("#sheet-menu");
  if (menu) menu.hidden = true;
}

function renderFilm() {
  film.replaceChildren();
  deck.sheets.forEach((item, index) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    if (index === deck.index) button.setAttribute("aria-current", "true");
    const thumb = document.createElement("canvas");
    thumb.width = 320;
    thumb.height = 180;
    button.append(thumb);
    const caption = document.createElement("span");
    caption.textContent = `${index + 1}. ${sheetHeading(item)}`;
    button.append(caption);
    button.addEventListener("click", () => goToSheet(index));
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      goToSheet(index);
      openSheetMenu(index, event.clientX, event.clientY);
    });
    li.append(button);
    film.append(li);
    paint(thumb, rough.canvas(thumb), item.elements || [], "", 320, false, item.background, item.backgroundOpacity, item);
  });
}

function syncFields() {
  if (document.activeElement !== titleInput) titleInput.value = deck.title || "";
  if (document.activeElement !== noteInput) noteInput.value = sheet().note || "";
  const presenting = document.body.classList.contains("presenting");
  $("#present-prev").hidden = !presenting;
  $("#present-next").hidden = !presenting;
  presentNote.hidden = !(presenting && notePeek && sheet().note);
  presentNote.textContent = sheet().note || "";
}

function renderAll() {
  syncFields();
  renderFilm();
  paintMain();
}

function ensureDeckChrome() {
  if (!deck.chrome) deck.chrome = defaultChrome();
  return deck.chrome;
}

function chromeField(kind, labelText) {
  const block = document.createElement("div");
  block.className = "chrome-field";
  const top = document.createElement("label");
  top.className = "chrome-toggle";
  const check = document.createElement("input");
  check.type = "checkbox";
  check.id = `show-${kind}`;
  check.addEventListener("change", () => {
    beginChange();
    if (kind === "header") sheet().showHeader = check.checked;
    else sheet().showFooter = check.checked;
    endChange(true);
  });
  const name = document.createElement("span");
  name.textContent = labelText;
  top.append(check, name);
  const input = document.createElement("input");
  input.type = "text";
  input.id = `${kind}-text`;
  input.maxLength = 80;
  input.placeholder = kind === "header" ? "Optional header" : "Optional footer";
  input.setAttribute("aria-label", labelText);
  input.addEventListener("input", () => {
    beginChange();
    if (kind === "header") {
      sheet().header = input.value.slice(0, 80);
      sheet().showHeader = Boolean(input.value.trim()) || sheet().showHeader;
      const box = $("#show-header");
      if (box && input.value.trim()) box.checked = true;
    } else {
      sheet().footer = input.value.slice(0, 80);
      sheet().showFooter = Boolean(input.value.trim()) || sheet().showFooter;
      const box = $("#show-footer");
      if (box && input.value.trim()) box.checked = true;
    }
    paintMain();
  });
  input.addEventListener("change", () => endChange(true));
  block.append(top, input);
  return block;
}

function buildPagePanel() {
  const wrap = document.createElement("div");
  wrap.className = "page-panel";
  wrap.dataset.audience = "page";
  const title = document.createElement("span");
  title.className = "prop-label";
  title.textContent = "Page";
  const grid = document.createElement("div");
  grid.className = "page-grid";
  grid.id = "page-grid";
  PAGE_BACKGROUNDS.forEach(([id, name]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.background = id;
    button.setAttribute("aria-pressed", "false");
    const preview = document.createElement("canvas");
    preview.width = 160;
    preview.height = 90;
    const context = preview.getContext("2d");
    context.setTransform(preview.width / SHEET.width, 0, 0, preview.height / SHEET.height, 0, 0);
    paintPage(context, id, 100);
    const label = document.createElement("span");
    label.textContent = name;
    button.append(preview, label);
    button.addEventListener("click", () => {
      beginChange();
      sheet().background = id;
      endChange(true);
    });
    grid.append(button);
  });
  const fadeName = document.createElement("span");
  fadeName.className = "prop-label";
  fadeName.textContent = "Opacity";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.value = "100";
  slider.id = "page-opacity";
  slider.setAttribute("aria-label", "Background opacity");
  slider.addEventListener("input", () => {
    beginChange();
    sheet().backgroundOpacity = Number(slider.value);
    paintMain();
  });
  slider.addEventListener("change", () => endChange(true));
  const scale = document.createElement("div");
  scale.className = "opacity-scale";
  scale.innerHTML = "<span>0</span><span>100</span>";
  const fade = document.createElement("div");
  fade.className = "opacity-wrap";
  fade.append(slider, scale);

  const chromeLabel = document.createElement("span");
  chromeLabel.className = "prop-label";
  chromeLabel.textContent = "Header and footer";
  const headerField = chromeField("header", "Show header");
  const footerField = chromeField("footer", "Show footer");
  const applyChrome = document.createElement("button");
  applyChrome.type = "button";
  applyChrome.className = "choice";
  applyChrome.id = "apply-chrome";
  applyChrome.textContent = "Apply header/footer to all";
  applyChrome.addEventListener("click", () => {
    beginChange();
    const current = sheet();
    deck.sheets.forEach((item) => {
      item.header = current.header || "";
      item.footer = current.footer || "";
      item.showHeader = Boolean(current.showHeader);
      item.showFooter = Boolean(current.showFooter);
    });
    const chrome = ensureDeckChrome();
    chrome.header = current.header || "";
    chrome.footer = current.footer || "";
    chrome.showHeader = Boolean(current.showHeader);
    chrome.showFooter = Boolean(current.showFooter);
    endChange(true);
    toast("Header and footer applied to every slide.");
  });

  const templateLabel = document.createElement("span");
  templateLabel.className = "prop-label";
  templateLabel.textContent = "Template (optional)";
  const templateNote = document.createElement("p");
  templateNote.className = "frame-note";
  templateNote.textContent = "Templates drop editable shapes on this sheet. Blank leaves the canvas empty. Nothing is required.";
  const templateRow = document.createElement("div");
  templateRow.className = "choice-row template-row";
  templateRow.id = "template-row";
  SHEET_TEMPLATES.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.dataset.template = item.id;
    button.textContent = item.label;
    button.addEventListener("click", () => {
      beginChange();
      const current = sheet();
      const next = sheetFromTemplate(item.id, {
        header: current.header,
        footer: current.footer,
        showHeader: current.showHeader,
        showFooter: current.showFooter,
      });
      current.elements = next.elements;
      current.template = item.id;
      current.note = current.note || next.note || "";
      endChange(true);
      toast(item.id === "none" ? "Sheet cleared to blank." : `${item.label} template applied. Edit anything on it.`);
    });
    templateRow.append(button);
  });
  const prefer = document.createElement("label");
  prefer.className = "chrome-toggle";
  prefer.htmlFor = "prefer-template";
  const preferBox = document.createElement("input");
  preferBox.type = "checkbox";
  preferBox.id = "prefer-template";
  preferBox.addEventListener("change", () => {
    const chrome = ensureDeckChrome();
    if (preferBox.checked) {
      chrome.template = sheet().template || "none";
      toast("New sheets will use this template.");
    } else {
      chrome.template = "none";
      toast("New sheets stay blank unless you pick a template.");
    }
    persistSoon();
    syncProperties();
  });
  const preferText = document.createElement("span");
  preferText.textContent = "Use this template for new sheets";
  prefer.append(preferBox, preferText);

  const apply = document.createElement("button");
  apply.type = "button";
  apply.className = "choice";
  apply.id = "apply-page";
  apply.textContent = "Apply page look to all";
  apply.addEventListener("click", () => {
    beginChange();
    const background = sheet().background || "plain";
    const backgroundOpacity = sheet().backgroundOpacity ?? 100;
    deck.sheets.forEach((item) => {
      item.background = background;
      item.backgroundOpacity = backgroundOpacity;
    });
    endChange(true);
    toast("Every slide uses this page.");
  });
  wrap.append(
    title, grid, fadeName, fade, apply,
    chromeLabel, headerField, footerField, applyChrome,
    templateLabel, templateNote, templateRow, prefer,
  );
  return wrap;
}

function editingTarget() {
  if (!editingId) return null;
  if (editingGroupId) {
    const group = elements().find((item) => item.id === editingGroupId && item.type === "group");
    const child = group && (group.children || []).find((item) => item.id === editingId);
    if (!group || !child) return null;
    return { group, child, placed: placeChild(group, child) };
  }
  const element = elements().find((item) => item.id === editingId);
  return element ? { group: null, child: element, placed: element } : null;
}

function dropEdited(target) {
  if (!target.group) {
    sheet().elements = elements().filter((item) => item.id !== target.child.id);
    selected.delete(target.child.id);
    return;
  }
  target.group.children = (target.group.children || []).filter((child) => child.id !== target.child.id);
  focusMember = null;
  if (!target.group.children.length) {
    sheet().elements = elements().filter((item) => item.id !== target.group.id);
    selected.delete(target.group.id);
  }
}

function closeEditor() {
  if (!editingId) {
    editor.hidden = true;
    return;
  }
  const target = editingTarget();
  if (target) {
    const element = target.child;
    if (element.type === "list") {
      const items = editor.value.split("\n").map((line) => line.replace(/\s+$/g, "")).filter((line) => line.trim());
      if (!items.length) dropEdited(target);
      else {
        element.items = items;
        element.height = blockHeight(element);
        if (target.group) fitGroup(target.group);
      }
    } else {
      element.text = editor.value.replace(/\s+$/g, "");
      if (element.type === "text" && !element.text.trim()) dropEdited(target);
      else if (element.type === "text") {
        element.height = blockHeight(element);
        if (target.group) fitGroup(target.group);
      }
    }
  }
  editingId = null;
  editingGroupId = null;
  editor.hidden = true;
  if (pending) endChange(true);
  else persist();
}

function positionEditor() {
  const target = editingTarget();
  if (!target) return;
  const element = target.child;
  const box = boxOf(target.placed);
  const scale = canvas.getBoundingClientRect().width / SHEET.width;
  const gutter = element.type === "list" && element.listStyle !== "plain" ? (element.fontSize || 30) * 1.6 * scale : 0;
  editor.hidden = false;
  editor.style.left = `${canvas.offsetLeft + box.x * scale + gutter}px`;
  editor.style.top = `${canvas.offsetTop + box.y * scale}px`;
  editor.style.width = `${Math.max(24, box.width * scale - gutter)}px`;
  editor.style.height = `${Math.max(24, box.height * scale)}px`;
  editor.style.fontFamily = fontStack(element);
  editor.style.fontSize = `${(element.fontSize || 48) * scale}px`;
  editor.style.lineHeight = element.type === "list" ? "1.45" : "1.25";
  editor.style.textAlign = element.align || (element.type === "text" || element.type === "list" ? "left" : "center");
}

function pointerOnSheet(event) {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - box.left) / box.width) * SHEET.width,
    y: ((event.clientY - box.top) / box.height) * SHEET.height,
  };
}

function editAt(event) {
  if (document.body.classList.contains("presenting")) return;
  const point = pointerOnSheet(event);
  const elements = sheet().elements || [];
  const hit = [...elements].reverse().find((element) => {
    if (element.type !== "text") return false;
    return point.x >= element.x && point.x <= element.x + element.width && point.y >= element.y && point.y <= element.y + element.height + 8;
  });
  closeEditor();
  if (!hit) {
    paintMain();
    return;
  }
  editingId = hit.id;
  editor.value = hit.text || "";
  positionEditor();
  paintMain();
  editor.focus();
}

function step(delta) {
  const next = clamp(deck.index + delta, 0, deck.sheets.length - 1);
  if (next === deck.index) return;
  closeEditor();
  selected = new Set();
  focusMember = null;
  deck.index = next;
  persistSoon();
  renderAll();
}

function mutate(change) {
  const next = JSON.parse(JSON.stringify(deck));
  change(next, next.sheets[next.index]);
  commit(next);
}

let rememberedZoom = 1;

function enterPresent() {
  closeEditor();
  rememberedZoom = zoom;
  zoom = 1;
  stage.scrollLeft = 0;
  stage.scrollTop = 0;
  document.body.classList.add("presenting");
  notePeek = false;
  document.documentElement.requestFullscreen?.().catch(() => {});
  renderAll();
}

function exitPresent() {
  document.body.classList.remove("presenting");
  zoom = rememberedZoom;
  notePeek = false;
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  renderAll();
}

function elements() {
  return sheet().elements || [];
}

function isCompactUi() {
  return window.matchMedia("(max-width: 800px)").matches;
}

function setTool(next) {
  tool = next;
  if (!isCompactUi()) propertiesOpen = true;
  for (const button of document.querySelectorAll("#tools [data-tool]")) {
    if (button.dataset.tool === "lock") continue;
    button.setAttribute("aria-pressed", String(button.dataset.tool === tool));
  }
  canvas.style.cursor = tool === "hand" ? "grab" : tool === "text" ? "text" : tool === "selection" ? "default" : "crosshair";
  syncProperties();
}

function buildTools() {
  const host = $("#tools");
  const lock = document.createElement("button");
  lock.type = "button";
  lock.dataset.tool = "lock";
  lock.title = "Keep this tool after drawing";
  lock.setAttribute("aria-label", "Keep this tool after drawing");
  lock.setAttribute("aria-pressed", "false");
  lock.innerHTML = ICONS.lock;
  lock.addEventListener("click", () => {
    lockTool = !lockTool;
    lock.setAttribute("aria-pressed", String(lockTool));
  });
  host.append(lock);
  for (const item of TOOLS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.tool = item.id;
    button.title = item.label;
    button.setAttribute("aria-label", item.label);
    button.setAttribute("aria-pressed", String(item.id === tool));
    button.innerHTML = ICONS[item.id];
    button.addEventListener("click", () => {
      if (item.id === "image") {
        importImages();
        return;
      }
      setTool(item.id);
    });
    host.append(button);
  }
}

function lineIcon(width, dash) {
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true"><path d="M2 8h22" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round"${dashAttr}/></svg>`;
}

function wobbleIcon(amount) {
  const paths = [
    "M2 9h22",
    "M2 11c3-6 5 6 8 0s5 6 8 0 4 4 6-2",
    "M2 12c2-8 3 8 5 0s3 9 6-1 3 8 6-2 3 6 5-1",
  ];
  return `<svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true"><path d="${paths[amount]}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}

function cornerIcon(round) {
  return `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="2.5" y="2.5" width="13" height="13" rx="${round ? 3.5 : 0.5}" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
}

function stackIcon(kind) {
  const paths = {
    floor: "M3 15h12M9 3v8M6 8l3 4 3-4",
    down: "M5 6l4 5 4-5",
    up: "M5 12l4-5 4 5",
    ceiling: "M3 3h12M9 15V7M6 10l3-4 3 4",
  };
  return `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="${paths[kind]}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function alignIcon(kind) {
  const rows = {
    left: ["M2 3.5h14", "M2 8h8", "M2 12.5h11"],
    center: ["M2 3.5h14", "M5 8h8", "M3.5 12.5h11"],
    right: ["M2 3.5h14", "M8 8h8", "M5 12.5h11"],
  };
  return `<svg width="22" height="16" viewBox="0 0 18 16" aria-hidden="true"><path d="${rows[kind].join("")}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}

function propGroup(label, rowClass = "choice-row", audience = "shape") {
  const wrap = document.createElement("div");
  wrap.className = "prop-group";
  wrap.dataset.audience = audience;
  const name = document.createElement("span");
  name.className = "prop-label";
  name.textContent = label;
  const row = document.createElement("div");
  row.className = rowClass;
  wrap.append(name, row);
  return { wrap, row };
}

function selectedElements() {
  return elements().filter((element) => selected.has(element.id));
}

function patchElement(element, partial) {
  if (partial.letterSize != null) {
    if (element.type !== "text") return element;
    const next = { ...element, fontSize: partial.letterSize };
    next.height = blockHeight(next);
    return next;
  }
  if (partial.textFill !== undefined) {
    if (element.type !== "text" && element.type !== "list") return element;
    return { ...element, textFill: partial.textFill };
  }
  if (partial.borderColor !== undefined) {
    if (element.type !== "text" && element.type !== "list") return element;
    return { ...element, borderColor: partial.borderColor };
  }
  if (partial.align != null) {
    if (element.type !== "text" && element.type !== "list") return element;
    return { ...element, align: partial.align };
  }
  if (partial.listStyle && element.type !== "list") return element;
  const next = { ...element, ...partial };
  if ((partial.fontSize || partial.listStyle || partial.fontFamily) && (element.type === "text" || element.type === "list")) {
    next.height = blockHeight(next);
  }
  return next;
}

function focusedChild() {
  if (!focusMember) return null;
  const group = elements().find((item) => item.id === focusMember.groupId && item.type === "group");
  const child = group && (group.children || []).find((item) => item.id === focusMember.childId);
  if (!group || !child) {
    focusMember = null;
    return null;
  }
  return { group, child };
}

function childAt(group, x, y) {
  const children = group.children || [];
  for (let index = children.length - 1; index >= 0; index -= 1) {
    const child = children[index];
    const box = boxOf(child);
    const left = group.x + box.x;
    const top = group.y + box.y;
    if (x >= left - 8 && y >= top - 8 && x <= left + box.width + 8 && y <= top + box.height + 8) return child;
  }
  return null;
}

function placeChild(group, child) {
  return { ...child, x: group.x + child.x, y: group.y + child.y };
}

function activeHandleTarget() {
  const member = focusedChild();
  if (member) return { group: member.group, element: placeChild(member.group, member.child) };
  if (selected.size !== 1) return null;
  const element = elements().find((item) => selected.has(item.id));
  return element ? { group: null, element } : null;
}

function fitGroup(group) {
  const boxes = (group.children || []).map((child) => boxOf(child));
  if (!boxes.length) return;
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  const shiftX = Math.min(0, minX);
  const shiftY = Math.min(0, minY);
  if (shiftX < 0 || shiftY < 0) {
    for (const child of group.children) {
      child.x -= shiftX;
      child.y -= shiftY;
    }
    group.x += shiftX;
    group.y += shiftY;
  }
  group.width = Math.max(1, maxX - shiftX);
  group.height = Math.max(1, maxY - shiftY);
}

function applyStyle(partial, commitChange) {
  if (partial.letterSize != null) drawStyle = { ...drawStyle, letterSize: partial.letterSize };
  else if (partial.textFill !== undefined) drawStyle = { ...drawStyle, textFill: partial.textFill };
  else if (partial.borderColor !== undefined) drawStyle = { ...drawStyle, borderColor: partial.borderColor };
  else if (partial.align != null) drawStyle = { ...drawStyle, align: partial.align };
  else drawStyle = { ...drawStyle, ...partial };
  const member = focusedChild();
  if (member) {
    beginChange();
    member.group.children = (member.group.children || []).map((child) => (child.id === member.child.id ? patchElement(child, partial) : child));
    fitGroup(member.group);
    if (commitChange) endChange(true);
    else paintMain();
    syncProperties();
    if (editingId) positionEditor();
    return;
  }
  if (selected.size) {
    beginChange();
    sheet().elements = elements().map((element) => (selected.has(element.id) ? patchElement(element, partial) : element));
    if (commitChange) endChange(true);
    else paintMain();
  } else if (commitChange) {
    persist();
  }
  syncProperties();
  if (editingId) positionEditor();
}

function changeOrder(direction) {
  if (!selected.size) return;
  beginChange();
  sheet().elements = reorder(elements(), [...selected], direction);
  endChange(true);
}

function swatch(color, kind) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `swatch${color === "transparent" ? " none" : ""}`;
  button.style.background = color === "transparent" ? "" : color;
  button.dataset.color = color;
  button.dataset.kind = kind;
  const emptyLabel = { ground: "No background", border: "No outline", stroke: "No outline" };
  button.title = color === "transparent" ? (emptyLabel[kind] || "No wash") : color;
  button.setAttribute("aria-label", button.title);
  button.addEventListener("click", () => {
    const patch = kind === "stroke" ? { strokeColor: color } : kind === "ground" ? { textFill: color } : kind === "border" ? { borderColor: color } : { backgroundColor: color };
    applyStyle(patch, true);
  });
  return button;
}

function choiceButton(label, group, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "choice";
  button.dataset.group = group;
  button.dataset.value = String(value);
  button.textContent = label;
  button.addEventListener("click", () => {
    const numeric = ["strokeWidth", "roughness", "fontSize", "roundness", "letterSize"].includes(group);
    applyStyle({ [group]: numeric ? Number(value) : value }, true);
  });
  return button;
}

function iconChoice(markup, group, value, label) {
  const button = choiceButton(label, group, value);
  button.className = "choice icon-choice";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = markup;
  return button;
}

function colorPicker(kind) {
  const input = document.createElement("input");
  input.type = "color";
  input.className = "color-picker";
  input.dataset.kind = kind;
  input.value = kind === "stroke" || kind === "border" ? (kind === "border" ? "#1e1e1e" : drawStyle.strokeColor) : kind === "ground" ? "#fff3bf" : "#a5d8ff";
  input.title = kind === "stroke" ? "Custom ink" : kind === "border" ? "Custom outline" : kind === "ground" ? "Custom background" : "Custom wash";
  input.setAttribute("aria-label", input.title);
  input.addEventListener("input", () => {
    const patch = kind === "stroke" ? { strokeColor: input.value } : kind === "ground" ? { textFill: input.value } : kind === "border" ? { borderColor: input.value } : { backgroundColor: input.value };
    applyStyle(patch, false);
  });
  input.addEventListener("change", () => applyStyle({}, true));
  return input;
}

function panelHead(title, onClose) {
  const head = document.createElement("div");
  head.className = "panel-head";
  const label = document.createElement("span");
  label.textContent = title;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "panel-close";
  close.setAttribute("aria-label", `Close ${title.toLowerCase()}`);
  close.title = "Close";
  close.textContent = "×";
  close.addEventListener("click", onClose);
  head.append(label, close);
  return head;
}

function syncRail() {
  const rail = $("#rail");
  const openRail = $("#open-rail");
  const scrim = $("#panel-scrim");
  const presenting = document.body.classList.contains("presenting");
  document.body.classList.toggle("rail-open", railOpen && !presenting);
  document.body.classList.toggle("rail-collapsed", !railOpen || presenting);
  if (rail) rail.setAttribute("aria-hidden", String(!railOpen || presenting));
  if (openRail) openRail.hidden = railOpen || presenting;
  if (scrim) {
    const propsShowing = Boolean($("#properties") && !$("#properties").hidden);
    const narrow = window.matchMedia("(max-width: 800px)").matches;
    scrim.hidden = presenting || !narrow || !(railOpen || propsShowing);
  }
}

function buildProperties() {
  const host = $("#properties");
  host.prepend(panelHead("Details", () => {
    propertiesOpen = false;
    syncProperties();
  }));
  const page = buildPagePanel();
  const piece = document.createElement("p");
  piece.className = "frame-note";
  piece.dataset.audience = "member";
  piece.textContent = "This piece of the merge. Click the merge once to move the whole thing.";
  const ink = propGroup("Ink", "color-row", "text");
  STROKE_COLORS.filter((color) => color !== "transparent").forEach((color) => ink.row.append(swatch(color, "stroke")));
  ink.row.append(colorPicker("stroke"));
  const outline = propGroup("Outline", "color-row", "shape");
  STROKE_COLORS.forEach((color) => outline.row.append(swatch(color, "stroke")));
  const outlinePicker = colorPicker("stroke");
  outlinePicker.title = "Custom outline";
  outlinePicker.setAttribute("aria-label", "Custom outline");
  outline.row.append(outlinePicker);
  const wash = propGroup("Wash", "color-row");
  FILL_COLORS.forEach((color) => wash.row.append(swatch(color, "fill")));
  wash.row.append(colorPicker("fill"));
  const texture = propGroup("Texture");
  texture.row.append(choiceButton("Lines", "fillStyle", "hachure"), choiceButton("Cross", "fillStyle", "cross-hatch"), choiceButton("Flat", "fillStyle", "solid"));
  const weight = propGroup("Weight");
  weight.row.append(iconChoice(lineIcon(1.4), "strokeWidth", 1, "Hairline"), iconChoice(lineIcon(2.4), "strokeWidth", 2, "Marker"), iconChoice(lineIcon(4), "strokeWidth", 4, "Brush"));
  const rhythm = propGroup("Rhythm");
  rhythm.row.append(iconChoice(lineIcon(1.8), "strokeStyle", "solid", "Continuous"), iconChoice(lineIcon(1.8, "5 3"), "strokeStyle", "dashed", "Broken"), iconChoice(lineIcon(2.4, "0.5 4"), "strokeStyle", "dotted", "Dotted"));
  const wobble = propGroup("Wobble");
  wobble.row.append(iconChoice(wobbleIcon(0), "roughness", 0, "Steady"), iconChoice(wobbleIcon(1), "roughness", 1, "Loose"), iconChoice(wobbleIcon(2), "roughness", 2, "Wild"));
  const corners = propGroup("Corners");
  corners.row.append(iconChoice(cornerIcon(false), "roundness", 0, "Square corners"), iconChoice(cornerIcon(true), "roundness", 1, "Soft corners"));
  const fade = propGroup("Fade", "choice-row", "fade");
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.value = String(drawStyle.opacity);
  slider.id = "opacity";
  slider.setAttribute("aria-label", "Fade");
  slider.addEventListener("input", () => applyStyle({ opacity: Number(slider.value) }, false));
  slider.addEventListener("change", () => applyStyle({}, true));
  const scale = document.createElement("div");
  scale.className = "opacity-scale";
  scale.innerHTML = "<span>0</span><span>100</span>";
  fade.row.className = "opacity-wrap";
  fade.row.append(slider, scale);
  const lettering = fontSizeField();
  const frameNote = document.createElement("p");
  frameNote.className = "frame-note";
  frameNote.dataset.audience = "text";
  frameNote.textContent = "Corners change the type size. Side handles change the frame, and the words stay inside it.";
  const wordsButton = document.createElement("button");
  wordsButton.type = "button";
  wordsButton.className = "choice";
  wordsButton.id = "add-words";
  wordsButton.textContent = "Type inside";
  wordsButton.addEventListener("click", () => {
    const member = focusedChild();
    const element = member ? member.child : selectedElements()[0];
    if (element && (LABEL_TYPES.includes(element.type) || element.type === "text" || element.type === "list")) {
      openTextEditor(element, member ? member.group : null);
    }
  });
  const words = propGroup("Words", "choice-row", "label");
  words.row.append(wordsButton);
  const combine = propGroup("Combine", "choice-row", "combine");
  const mergeButton = document.createElement("button");
  mergeButton.type = "button";
  mergeButton.className = "choice";
  mergeButton.id = "merge";
  mergeButton.textContent = "Merge";
  mergeButton.addEventListener("click", mergeSelection);
  const unmergeButton = document.createElement("button");
  unmergeButton.type = "button";
  unmergeButton.className = "choice";
  unmergeButton.id = "unmerge";
  unmergeButton.textContent = "Unmerge";
  unmergeButton.addEventListener("click", unmergeSelection);
  combine.row.append(mergeButton, unmergeButton);
  const stack = propGroup("Stack", "choice-row", "stack");
  [
    ["floor", "back", "Send to the floor"],
    ["down", "backward", "Step back"],
    ["up", "forward", "Step forward"],
    ["ceiling", "front", "Bring to the ceiling"],
  ].forEach(([icon, direction, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice icon-choice";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = stackIcon(icon);
    button.addEventListener("click", () => changeOrder(direction));
    stack.row.append(button);
  });
  const ground = propGroup("Background", "color-row", "text");
  TEXT_GROUNDS.forEach((color) => ground.row.append(swatch(color, "ground")));
  ground.row.append(colorPicker("ground"));
  const border = propGroup("Outline", "color-row", "text");
  TEXT_BORDERS.forEach((color) => border.row.append(swatch(color, "border")));
  border.row.append(colorPicker("border"));
  const hand = propGroup("Hand", "choice-row", "hand");
  hand.row.append(
    choiceButton("Hand", "fontFamily", "hand"),
    choiceButton("Marker", "fontFamily", "marker"),
    choiceButton("Script", "fontFamily", "script"),
    choiceButton("Print", "fontFamily", "print"),
    choiceButton("Book", "fontFamily", "book"),
  );
  const align = propGroup("Align", "choice-row", "text");
  align.row.append(iconChoice(alignIcon("left"), "align", "left", "Align left"), iconChoice(alignIcon("center"), "align", "center", "Align center"), iconChoice(alignIcon("right"), "align", "right", "Align right"));
  const listStyle = propGroup("List", "choice-row", "list");
  listStyle.row.append(
    choiceButton("•", "listStyle", "bullet"),
    choiceButton("1.", "listStyle", "number"),
    choiceButton("–", "listStyle", "dash"),
    choiceButton("None", "listStyle", "plain"),
  );
  host.append(page, piece, ink.wrap, ground.wrap, border.wrap, lettering.wrap, hand.wrap, frameNote, align.wrap, listStyle.wrap, words.wrap, outline.wrap, wash.wrap, texture.wrap, weight.wrap, rhythm.wrap, wobble.wrap, corners.wrap, fade.wrap, stack.wrap, combine.wrap);
}

function fontSizeField() {
  const field = propGroup("Font size", "size-field", "both");
  const input = document.createElement("input");
  input.type = "number";
  input.min = "8";
  input.max = "280";
  input.step = "1";
  input.id = "font-size";
  input.value = String(drawStyle.fontSize || 24);
  input.setAttribute("aria-label", "Font size in pixels");
  const unit = document.createElement("span");
  unit.className = "px-unit";
  unit.textContent = "px";
  input.addEventListener("input", () => {
    if (input.value.trim() === "") return;
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    applyStyle({ fontSize: clamp(Math.round(value), 8, 280) }, false);
  });
  input.addEventListener("change", () => {
    const value = clamp(Math.round(Number(input.value) || drawStyle.fontSize || 24), 8, 280);
    input.value = String(value);
    applyStyle({ fontSize: value }, true);
  });
  field.row.append(input, unit);
  return field;
}

function syncProperties() {
  const host = $("#properties");
  if (!host) return;
  const presenting = document.body.classList.contains("presenting");
  const member = focusedChild();
  const picked = selectedElements();
  const draftingText = picked.length === 0 && (tool === "text" || tool === "list");
  const draftingShape = picked.length === 0 && !draftingText && !["selection", "hand", "eraser", "image"].includes(tool);
  const pageMode = !presenting && !member && picked.length === 0 && !draftingText && !draftingShape;
  const available = !presenting;
  host.hidden = !available || !propertiesOpen;
  const openProps = $("#open-properties");
  if (openProps) openProps.hidden = !available || propertiesOpen;
  syncRail();
  const current = member ? [member.child] : picked;
  const words = (current.length > 0 && current.every((element) => element.type === "text" || element.type === "list")) || draftingText;
  const lists = (current.length > 0 && current.every((element) => element.type === "list")) || tool === "list";
  const images = current.length > 0 && current.every((element) => element.type === "image");
  const groupOnly = !member && picked.length === 1 && picked[0].type === "group";
  const label = current.length === 1 && LABEL_TYPES.includes(current[0].type);
  const canMerge = !member && picked.length >= 2;
  const canUnmerge = !member && picked.length === 1 && (picked[0].type === "group" || (LABEL_TYPES.includes(picked[0].type) && String(picked[0].text || "").trim()));
  const lettering = words || label;
  host.querySelectorAll("[data-audience]").forEach((node) => {
    const audience = node.dataset.audience;
    if (pageMode) {
      node.hidden = audience !== "page";
      return;
    }
    if (audience === "page") node.hidden = true;
    else if (audience === "member") node.hidden = !member;
    else if (audience === "both") node.hidden = groupOnly || images;
    else if (audience === "fade") node.hidden = groupOnly;
    else if (audience === "text") node.hidden = !words;
    else if (audience === "hand") node.hidden = !lettering;
    else if (audience === "list") node.hidden = !lists;
    else if (audience === "label") node.hidden = !label;
    else if (audience === "stack") node.hidden = Boolean(member) || groupOnly || draftingText || draftingShape;
    else if (audience === "combine") node.hidden = !(canMerge || canUnmerge);
    else node.hidden = words || groupOnly || images;
  });
  const mergeButton = host.querySelector("#merge");
  const unmergeButton = host.querySelector("#unmerge");
  if (mergeButton) mergeButton.disabled = !canMerge;
  if (unmergeButton) unmergeButton.disabled = !canUnmerge;
  const addWords = host.querySelector("#add-words");
  if (addWords) addWords.textContent = label && current[0].text ? "Edit words" : "Type inside";
  const read = (key) => {
    if (!current.length) return drawStyle[key];
    const first = current[0][key];
    return current.every((element) => element[key] === first) ? first : null;
  };
  for (const button of host.querySelectorAll(".swatch")) {
    const field = button.dataset.kind === "stroke" ? "strokeColor" : button.dataset.kind === "ground" ? "textFill" : button.dataset.kind === "border" ? "borderColor" : "backgroundColor";
    let value = read(field);
    if ((field === "textFill" || field === "borderColor" || field === "strokeColor") && !value) value = "transparent";
    if (field === "strokeColor" && value === "none") value = "transparent";
    button.setAttribute("aria-pressed", String(value === button.dataset.color));
  }
  for (const button of host.querySelectorAll(".choice[data-group]")) {
    const group = button.dataset.group;
    let value = group === "letterSize" ? read("fontSize") : read(group);
    if (group === "align" && !value) value = "left";
    if (group === "listStyle" && !value) value = "bullet";
    if (group === "fontFamily" && !value) value = "hand";
    button.setAttribute("aria-pressed", String(String(value) === button.dataset.value));
  }
  const fontInput = host.querySelector("#font-size");
  const fontValue = read("fontSize");
  if (fontInput && document.activeElement !== fontInput && fontValue != null) fontInput.value = String(fontValue);
  const opacity = host.querySelector("#opacity");
  const opacityValue = read("opacity");
  if (opacity && opacityValue != null && document.activeElement !== opacity) opacity.value = String(opacityValue);
  for (const input of host.querySelectorAll(".color-picker")) {
    const field = input.dataset.kind === "stroke" ? "strokeColor" : input.dataset.kind === "ground" ? "textFill" : input.dataset.kind === "border" ? "borderColor" : "backgroundColor";
    const value = read(field);
    if (value && value !== "transparent" && document.activeElement !== input) input.value = value;
  }
  const pageSlider = host.querySelector("#page-opacity");
  if (pageSlider && document.activeElement !== pageSlider) pageSlider.value = String(sheet().backgroundOpacity ?? 100);
  const currentPage = sheet().background || "plain";
  host.querySelectorAll("#page-grid button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.background === currentPage));
  });
  const page = sheet();
  const showHeader = host.querySelector("#show-header");
  const showFooter = host.querySelector("#show-footer");
  const headerText = host.querySelector("#header-text");
  const footerText = host.querySelector("#footer-text");
  if (showHeader) showHeader.checked = Boolean(page.showHeader);
  if (showFooter) showFooter.checked = Boolean(page.showFooter);
  if (headerText && document.activeElement !== headerText) headerText.value = page.header || "";
  if (footerText && document.activeElement !== footerText) footerText.value = page.footer || "";
  const templateId = page.template || "none";
  host.querySelectorAll("#template-row [data-template]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.template === templateId));
  });
  const preferBox = host.querySelector("#prefer-template");
  const chrome = ensureDeckChrome();
  if (preferBox) preferBox.checked = Boolean(chrome.template && chrome.template !== "none" && chrome.template === templateId);
}

function beginChange() {
  if (!pending) pending = JSON.stringify(deck);
}

function endChange(renderFilmstrip) {
  if (pending && pending !== JSON.stringify(deck)) {
    undoStack.push(pending);
    if (undoStack.length > 40) undoStack.shift();
    redoStack.length = 0;
    persist();
  }
  pending = null;
  if (renderFilmstrip) renderAll();
  else paintMain();
}

function openTextEditor(element, group = null) {
  closeEditor();
  beginChange();
  editingId = element.id;
  editingGroupId = group ? group.id : null;
  if (group) {
    selected = new Set([group.id]);
    focusMember = { groupId: group.id, childId: element.id };
  } else {
    focusMember = null;
    selected = new Set([element.id]);
  }
  editor.value = element.type === "list" ? (element.items || []).join("\n") : element.text || "";
  positionEditor();
  paintMain();
  editor.focus();
}

function updateDraft(element, world, shiftKey) {
  if (element.type === "line" || element.type === "arrow") {
    let end = world;
    if (shiftKey) end = snapAngle(element.x, element.y, world.x, world.y);
    Object.assign(element, withAbsPoints(element, [{ x: element.x, y: element.y }, end]));
    return;
  }
  if (element.type === "freedraw") {
    const points = absPoints(element);
    const last = points[points.length - 1];
    if (Math.hypot(world.x - last.x, world.y - last.y) >= 2) {
      Object.assign(element, withAbsPoints(element, points.concat(world)));
    }
    return;
  }
  let width = world.x - element.x;
  let height = world.y - element.y;
  if (shiftKey) ({ width, height } = constrainBox(element.x, element.y, width, height));
  element.width = width;
  element.height = height;
}

function finalizeDraft(element) {
  const list = elements();
  if (element.type === "rectangle" || element.type === "diamond" || element.type === "ellipse" || element.type === "sticky") {
    const box = normalizeBox(element.x, element.y, element.width, element.height);
    const tiny = box.width < 4 && box.height < 4;
    if (element.type === "sticky" && tiny) {
      element.width = 200;
      element.height = 180;
    } else if (tiny) {
      sheet().elements = list.filter((item) => item.id !== element.id);
      return;
    } else {
      Object.assign(element, box);
    }
    selected = new Set([element.id]);
    if (element.type === "sticky") openTextEditor(element);
    return;
  }
  const box = boxOf(element);
  const tiny = box.width < 4 && box.height < 4;
  const shortDraw = element.type === "freedraw" && absPoints(element).length < 3;
  if (tiny || shortDraw) {
    sheet().elements = list.filter((item) => item.id !== element.id);
    return;
  }
  selected = new Set([element.id]);
}

function eraseAt(world) {
  const before = elements();
  sheet().elements = before.filter((element) => !hitTest([element], world.x, world.y, 12));
  selected = new Set([...selected].filter((id) => sheet().elements.some((element) => element.id === id)));
}

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  if (document.body.classList.contains("presenting")) {
    const box = canvas.getBoundingClientRect();
    step(event.clientX < box.left + box.width / 2 ? -1 : 1);
    return;
  }
  try { canvas.setPointerCapture(event.pointerId); } catch { /* the pointer already ended */ }
  const world = pointerOnSheet(event);
  pointerStart = world;
  if (editingId && tool !== "text") closeEditor();
  if (tool === "hand") {
    mode = "hand";
    handScroll = { left: stage.scrollLeft, top: stage.scrollTop, x: event.clientX, y: event.clientY };
    canvas.style.cursor = "grabbing";
    return;
  }
  if (tool === "eraser") {
    mode = "erase";
    beginChange();
    eraseAt(world);
    paintMain();
    return;
  }
  if (tool === "text") {
    mode = "text";
    return;
  }
  if (tool === "selection") {
    const active = activeHandleTarget();
    const handle = active && hitHandle(active.element, world.x, world.y, handleSize());
    if (handle) {
      mode = "resize";
      resizeHandle = handle;
      resizeStart = clone(active.element);
      resizeGroupId = active.group ? active.group.id : null;
      beginChange();
      return;
    }
    focusMember = null;
    const hit = hitTest(elements(), world.x, world.y, 10);
    if (hit && (event.ctrlKey || event.metaKey)) {
      if (!selected.has(hit.id)) selected = new Set([hit.id]);
      beginChange();
      const copies = duplicateElements(elements(), [...selected]);
      sheet().elements = elements().concat(copies);
      selected = new Set(copies.map((copy) => copy.id));
      mode = "move";
      moveIsDuplicate = true;
      moveOrigins = copies.map((copy) => clone(copy));
      showDupMark(event.clientX, event.clientY);
      paintMain();
      return;
    }
    if (hit) {
      if (!selected.has(hit.id)) selected = new Set([hit.id]);
      mode = "move";
      moveIsDuplicate = false;
      moveOrigins = elements().filter((element) => selected.has(element.id)).map((element) => clone(element));
      beginChange();
      paintMain();
      return;
    }
    mode = "marquee";
    marqueeBase = new Set();
    selected = new Set();
    focusMember = null;
    marquee = { x: world.x, y: world.y, width: 0, height: 0 };
    paintMain();
    return;
  }
  if (tool === "image") {
    importImages(world);
    return;
  }
  beginChange();
  const element = createElement(tool, world.x, world.y, drawStyle);
  if (tool !== "sticky") {
    element.width = 0;
    element.height = 0;
  }
  sheet().elements = elements().concat(element);
  draft = element;
  mode = "create";
  selected = new Set([element.id]);
  paintMain();
});

canvas.addEventListener("pointermove", (event) => {
  const world = pointerOnSheet(event);
  lastPointer = { world, clientX: event.clientX, clientY: event.clientY };
  ctrlHeld = event.ctrlKey || event.metaKey;
  if (!mode) {
    updateCursor(world, event.clientX, event.clientY);
    return;
  }
  if (mode === "move" && moveIsDuplicate) showDupMark(event.clientX, event.clientY);
  if (mode === "hand" && handScroll) {
    stage.scrollLeft = handScroll.left - (event.clientX - handScroll.x);
    stage.scrollTop = handScroll.top - (event.clientY - handScroll.y);
    if (editingId) positionEditor();
    return;
  }
  if (mode === "erase") {
    eraseAt(world);
    paintMain();
    return;
  }
  if (mode === "create" && draft) {
    updateDraft(draft, world, event.shiftKey);
    paintMain();
    return;
  }
  if (mode === "move" && pointerStart) {
    let dx = world.x - pointerStart.x;
    let dy = world.y - pointerStart.y;
    const origins = new Map(moveOrigins.map((element) => [element.id, element]));
    const moving = moveOrigins.map((element) => translate(element, dx, dy));
    const movingIds = new Set(moving.map((element) => element.id));
    const snap = snapAlignment(moving, elements().filter((element) => !movingIds.has(element.id)));
    dx += snap.dx;
    dy += snap.dy;
    alignGuides = snap.guides;
    sheet().elements = elements().map((element) => {
      const origin = origins.get(element.id);
      return origin ? translate(origin, dx, dy) : element;
    });
    paintMain();
    return;
  }
  if (mode === "resize" && resizeStart) {
    const resized = resizedElement(resizeStart, resizeHandle, world, event.shiftKey);
    if (resizeGroupId) {
      const group = elements().find((item) => item.id === resizeGroupId);
      if (group) {
        group.children = (group.children || []).map((child) => (
          child.id === resizeStart.id ? { ...resized, x: resized.x - group.x, y: resized.y - group.y } : child
        ));
        fitGroup(group);
      }
    } else {
      sheet().elements = elements().map((element) => (element.id === resizeStart.id ? resized : element));
    }
    paintMain();
    return;
  }
  if (mode === "marquee" && pointerStart) {
    marquee = normalizeBox(pointerStart.x, pointerStart.y, world.x - pointerStart.x, world.y - pointerStart.y);
    selected = new Set(elements().filter((element) => intersects(boxOf(element), marquee)).map((element) => element.id));
    paintMain();
  }
});

canvas.addEventListener("pointerup", (event) => {
  if (document.body.classList.contains("presenting")) return;
  if (mode === "text") {
    const world = pointerOnSheet(event);
    const hit = hitTest(elements(), world.x, world.y, 10);
    if (hit && ["text", "list", "sticky", "rectangle", "diamond", "ellipse"].includes(hit.type)) openTextEditor(hit);
    else {
      const element = createElement("text", world.x, world.y, { ...drawStyle, fontSize: drawStyle.fontSize || 48, backgroundColor: "transparent" });
      element.align = drawStyle.align || "left";
      element.textFill = drawStyle.textFill || "transparent";
      element.borderColor = drawStyle.borderColor || "transparent";
      element.fontFamily = drawStyle.fontFamily || "hand";
      sheet().elements = elements().concat(element);
      openTextEditor(element);
    }
  }
  if (mode === "create" && draft) {
    const created = draft;
    draft = null;
    finalizeDraft(created);
    if (!lockTool && !editingId) setTool("selection");
  }
  if (mode === "marquee" && marquee && marquee.width < 4 && marquee.height < 4) selected = new Set(marqueeBase);
  const edited = Boolean(editingId);
  mode = null;
  marquee = null;
  draft = null;
  resizeStart = null;
  resizeGroupId = null;
  handScroll = null;
  alignGuides = [];
  moveIsDuplicate = false;
  hideDupMark();
  if (tool === "hand") canvas.style.cursor = "grab";
  if (!edited) endChange(true);
  else paintMain();
});

canvas.addEventListener("pointercancel", () => {
  mode = null;
  marquee = null;
  draft = null;
  alignGuides = [];
  moveIsDuplicate = false;
  hideDupMark();
  endChange(true);
});

canvas.addEventListener("dragover", (event) => {
  if (document.body.classList.contains("presenting")) return;
  if (!dataTransferImageFiles(event.dataTransfer).length) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
});

canvas.addEventListener("drop", async (event) => {
  if (document.body.classList.contains("presenting")) return;
  const files = dataTransferImageFiles(event.dataTransfer);
  if (!files.length) return;
  event.preventDefault();
  await placeImageFiles(files, pointerOnSheet(event));
});

function canWrite(element) {
  return Boolean(element) && (element.type === "text" || element.type === "list" || LABEL_TYPES.includes(element.type));
}

canvas.addEventListener("dblclick", (event) => {
  if (document.body.classList.contains("presenting") || tool !== "selection") return;
  const world = pointerOnSheet(event);
  const hit = hitTest(elements(), world.x, world.y, 10);
  if (!hit) return;
  if (hit.type === "group") {
    const child = childAt(hit, world.x, world.y);
    if (!child) return;
    focusMember = { groupId: hit.id, childId: child.id };
    selected = new Set([hit.id]);
    if (canWrite(child)) openTextEditor(child, hit);
    else paintMain();
    return;
  }
  focusMember = null;
  if (canWrite(hit)) openTextEditor(hit);
});

editor.addEventListener("input", () => {
  const target = editingTarget();
  if (!target) return;
  const element = target.child;
  if (element.type === "list") {
    element.items = editor.value.split("\n");
    element.height = blockHeight(element);
    if (target.group) fitGroup(target.group);
    positionEditor();
  } else {
    element.text = editor.value;
    if (element.type === "text") {
      element.height = blockHeight(element);
      if (target.group) fitGroup(target.group);
      positionEditor();
    }
  }
  persist();
  paintMain();
});
editor.addEventListener("blur", () => {
  if (editingId) closeEditor();
});

editor.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeEditor();
    paintMain();
  }
  event.stopPropagation();
});

titleInput.addEventListener("input", () => {
  deck.title = titleInput.value.slice(0, 80);
  persistSoon();
});

noteInput.addEventListener("input", () => {
  sheet().note = noteInput.value.slice(0, 800);
  persistSoon();
});

$("#add-sheet").addEventListener("click", () => {
  mutate((next) => {
    const chrome = { ...defaultChrome(), ...(next.chrome || {}) };
    const fresh = sheetFromTemplate(chrome.template || "none", chrome);
    fresh.background = next.sheets[next.index].background || "plain";
    fresh.backgroundOpacity = next.sheets[next.index].backgroundOpacity ?? 100;
    next.sheets.splice(next.index + 1, 0, fresh);
    next.index += 1;
  });
});

$("#duplicate").addEventListener("click", () => {
  mutate((next, current) => {
    next.sheets.splice(next.index + 1, 0, duplicateSheet(current));
    next.index += 1;
  });
});

$("#remove").addEventListener("click", () => {
  if (deck.sheets.length < 2) {
    toast("A folio keeps at least one sheet.");
    return;
  }
  mutate((next) => {
    next.sheets.splice(next.index, 1);
    next.index = clamp(next.index, 0, next.sheets.length - 1);
  });
});

$("#earlier").addEventListener("click", () => {
  const moved = reorderSheets(deck.sheets, deck.index, -1);
  if (moved.index === deck.index) return;
  commit({ ...deck, sheets: moved.sheets, index: moved.index });
});

$("#later").addEventListener("click", () => {
  const moved = reorderSheets(deck.sheets, deck.index, 1);
  if (moved.index === deck.index) return;
  commit({ ...deck, sheets: moved.sheets, index: moved.index });
});

$("#add-line").addEventListener("click", () => {
  mutate((next, current) => {
    const list = [...current.elements].reverse().find((element) => element.type === "list");
    if (!list) {
      current.elements.push(createList(["Another line."]));
      return;
    }
    list.items = [...(list.items || []), "Another line."];
    list.height = blockHeight(list);
  });
});

const fileButton = $("#file-button");
const fileMenu = $("#file-menu");
fileButton.addEventListener("click", (event) => {
  event.stopPropagation();
  const open = fileMenu.hidden;
  fileMenu.hidden = !open;
  fileButton.setAttribute("aria-expanded", String(open));
});
document.addEventListener("pointerdown", (event) => {
  if (!fileMenu.hidden && !event.target.closest("#file-slot")) {
    fileMenu.hidden = true;
    fileButton.setAttribute("aria-expanded", "false");
  }
  if (!$("#context-menu").hidden && !event.target.closest("#context-menu")) hideContextMenu();
  if (!$("#sheet-menu").hidden && !event.target.closest("#sheet-menu")) hideSheetMenu();
});
fileMenu.addEventListener("click", (event) => {
  if (!event.target.closest("button")) return;
  fileMenu.hidden = true;
  fileButton.setAttribute("aria-expanded", "false");
});

$("#present").addEventListener("click", enterPresent);
$("#present-prev").addEventListener("click", () => step(-1));
$("#present-next").addEventListener("click", () => step(1));

$("#ask").addEventListener("click", () => {
  $("#ask-status").textContent = "";
  $("#ask-dialog").showModal();
  $("#prompt").focus();
});

$("#compose").addEventListener("click", async () => {
  const prompt = $("#prompt").value.trim();
  const status = $("#ask-status");
  if (!prompt) {
    status.textContent = "Write what the talk is about.";
    return;
  }
  const button = $("#compose");
  button.disabled = true;
  status.textContent = "Writing the sheets…";
  try {
    const response = await fetch("api/deck.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, sheets: Number($("#sheet-count").value) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not write the talk.");
    const next = deckFromTalk(data.talk);
    persist();
    fileId = `talk-${Date.now().toString(36)}`;
    commit(next);
    $("#ask-dialog").close();
    toast(`Wrote ${next.sheets.length} sheets.`);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Could not write the talk.";
  } finally {
    button.disabled = false;
  }
});

$("#save-folio").addEventListener("click", () => {
  const blob = new Blob([serializeFolio(deck)], { type: "application/json" });
  const link = document.createElement("a");
  const name = (deck.title || "folio").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "folio";
  link.href = URL.createObjectURL(blob);
  link.download = `${name}.folio.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

function fileSlug(ext) {
  const name = (deck.title || "folio").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "folio";
  return `${name}.${ext}`;
}

function downloadBytes(bytes, name, type) {
  const blob = new Blob([bytes], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function rememberThenSwitch() {
  persist();
  fileId = `talk-${Date.now().toString(36)}`;
  selected = new Set();
  focusMember = null;
  undoStack.length = 0;
  redoStack.length = 0;
}

$("#new-file").addEventListener("click", () => {
  closeEditor();
  rememberThenSwitch();
  deck = blankDeck();
  drawStyle = { ...DEFAULT_STYLE };
  persist();
  renderAll();
  toast("New file. The earlier talk stays on this device.");
});

$("#device-files").addEventListener("click", () => {
  persist();
  const list = $("#file-list");
  list.replaceChildren();
  const files = [...library.files].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  for (const file of files) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${file.title || "Untitled talk"} · ${file.sheets.length} sheets`;
    if (file.id === fileId) button.setAttribute("aria-current", "true");
    button.addEventListener("click", () => {
      if (file.id !== fileId) {
        fileId = file.id;
        deck = {
          title: file.title,
          index: clamp(file.index || 0, 0, file.sheets.length - 1),
          sheets: adoptSheets(JSON.parse(JSON.stringify(file.sheets))),
        };
        drawStyle = { ...DEFAULT_STYLE, ...(file.style || {}) };
        selected = new Set();
        focusMember = null;
        undoStack.length = 0;
        redoStack.length = 0;
        closeEditor();
        persist();
        renderAll();
      }
      $("#files-dialog").close();
    });
    list.append(button);
  }
  $("#files-dialog").showModal();
});

async function exportSheets() {
  closeEditor();
  const images = [];
  for (let index = 0; index < deck.sheets.length; index += 1) {
    const offscreen = document.createElement("canvas");
    paint(offscreen, rough.canvas(offscreen), deck.sheets[index].elements || [], `${index + 1}  /  ${deck.sheets.length}`, 1280, false, deck.sheets[index].background, deck.sheets[index].backgroundOpacity, deck.sheets[index]);
    const blob = await new Promise((resolve) => offscreen.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) throw new Error("Could not draw a sheet.");
    images.push({
      bytes: new Uint8Array(await blob.arrayBuffer()),
      width: offscreen.width,
      height: offscreen.height,
    });
  }
  return images;
}

$("#export-pdf").addEventListener("click", async () => {
  try {
    toast("Preparing the PDF…");
    downloadBytes(pdfFromJpegs(await exportSheets()), fileSlug("pdf"), "application/pdf");
  } catch (error) {
    toast(error instanceof Error ? error.message : "Could not make the PDF.");
  }
});

$("#export-pptx").addEventListener("click", async () => {
  try {
    toast("Preparing the PowerPoint…");
    downloadBytes(
      pptxFromJpegs(await exportSheets(), deck.title),
      fileSlug("pptx"),
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
  } catch (error) {
    toast(error instanceof Error ? error.message : "Could not make the PowerPoint.");
  }
});

$("#open-folio").addEventListener("click", () => $("#file-input").click());
$("#file-input").addEventListener("change", async () => {
  const file = $("#file-input").files && $("#file-input").files[0];
  $("#file-input").value = "";
  if (!file) return;
  try {
    const next = parseFolio(await file.text());
    rememberThenSwitch();
    next.sheets = adoptSheets(next.sheets);
    deck = next;
    closeEditor();
    persist();
    renderAll();
    toast("Opened as a new file. The earlier talk stays on this device.");
  } catch (error) {
    toast(error instanceof Error ? error.message : "Could not open that file.");
  }
});

let pasteAt = null;

function copySelection() {
  const copies = elements().filter((element) => selected.has(element.id)).map((element) => clone(element));
  if (!copies.length) return;
  clipboard = copies;
  pasteCount = 0;
}

function deleteSelection() {
  if (!selected.size) return;
  beginChange();
  sheet().elements = elements().filter((element) => !selected.has(element.id));
  selected = new Set();
  focusMember = null;
  endChange(true);
}

function cutSelection() {
  copySelection();
  deleteSelection();
}

function duplicateSelection() {
  if (!selected.size) return;
  beginChange();
  const copies = duplicateElements(elements(), [...selected]);
  sheet().elements = elements().concat(copies);
  selected = new Set(copies.map((copy) => copy.id));
  endChange(true);
}

async function placeImageFiles(files, at) {
  const list = [...(files || [])];
  if (!list.length) return false;
  try {
    const origin = at || { x: SHEET.width / 2, y: SHEET.height / 2 };
    const made = await filesToImageElements(list, {
      x: origin.x - 160,
      y: origin.y - 120,
    }, drawStyle, 560);
    if (!made.length) {
      toast("No images found in that drop.");
      return false;
    }
    beginChange();
    sheet().elements = elements().concat(made);
    selected = new Set(made.map((element) => element.id));
    focusMember = null;
    setTool("selection");
    endChange(true);
    toast(made.length === 1 ? "Image placed on the sheet." : `${made.length} images placed on the sheet.`);
    return true;
  } catch (error) {
    toast(error && error.message ? error.message : "Could not import that image.");
    return false;
  }
}

async function importImages(at) {
  const files = await pickImageFiles({ multiple: true });
  if (!files.length) return;
  await placeImageFiles(files, at);
}

async function pasteClipboard(point) {
  const images = await clipboardImageFiles();
  if (images.length) {
    await placeImageFiles(images, point || { x: SHEET.width / 2, y: SHEET.height / 2 });
    return;
  }
  if (!clipboard.length) return;
  beginChange();
  pasteCount += 1;
  const copies = clipboard.map((element) => ({
    ...clone(element),
    id: uid(),
    seed: Math.floor(Math.random() * 2 ** 31),
  }));
  if (point) {
    const minX = Math.min(...copies.map((element) => element.x));
    const minY = Math.min(...copies.map((element) => element.y));
    copies.forEach((element) => {
      element.x += point.x - minX;
      element.y += point.y - minY;
    });
  } else {
    copies.forEach((element) => {
      element.x += 16 * pasteCount;
      element.y += 16 * pasteCount;
    });
  }
  sheet().elements = elements().concat(copies);
  selected = new Set(copies.map((element) => element.id));
  endChange(true);
}

function hideContextMenu() {
  const menu = $("#context-menu");
  if (menu) menu.hidden = true;
  hideSheetMenu();
}

function canUnmerge() {
  if (selected.size !== 1) return false;
  const element = selectedElements()[0];
  return element.type === "group" || (LABEL_TYPES.includes(element.type) && String(element.text || "").trim());
}

function mergeSelection() {
  const picked = selectedElements();
  if (picked.length < 2) return;
  beginChange();
  const shape = picked.find((element) => LABEL_TYPES.includes(element.type));
  const writing = picked.find((element) => element.type === "text" || element.type === "list");
  if (picked.length === 2 && shape && writing) {
    const text = writing.type === "list" ? (writing.items || []).filter((item) => item.trim()).join("\n") : writing.text || "";
    sheet().elements = elements()
      .filter((element) => element.id !== writing.id)
      .map((element) => (element.id === shape.id ? { ...element, text, fontSize: writing.fontSize || element.fontSize } : element));
    selected = new Set([shape.id]);
    endChange(true);
    return;
  }
  const boxes = picked.map((element) => boxOf(element));
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const width = Math.max(1, Math.max(...boxes.map((box) => box.x + box.width)) - x);
  const height = Math.max(1, Math.max(...boxes.map((box) => box.y + box.height)) - y);
  const ids = new Set(picked.map((element) => element.id));
  const group = {
    id: uid(),
    type: "group",
    x,
    y,
    width,
    height,
    opacity: 100,
    seed: Math.floor(Math.random() * 2 ** 31),
    children: picked.map((element) => {
      const child = clone(element);
      child.x -= x;
      child.y -= y;
      return child;
    }),
  };
  sheet().elements = elements().filter((element) => !ids.has(element.id)).concat(group);
  selected = new Set([group.id]);
  endChange(true);
}

function unmergeSelection() {
  const element = selectedElements()[0];
  if (!element || !canUnmerge()) return;
  beginChange();
  if (element.type === "group") {
    const children = (element.children || []).map((child) => ({
      ...clone(child),
      id: uid(),
      x: element.x + child.x,
      y: element.y + child.y,
    }));
    sheet().elements = elements().filter((item) => item.id !== element.id).concat(children);
    selected = new Set(children.map((child) => child.id));
    endChange(true);
    return;
  }
  const text = createElement("text", element.x + 18, element.y + 18, { ...element, backgroundColor: "transparent" });
  text.text = element.text;
  text.fontSize = element.fontSize || 24;
  text.width = Math.max(80, element.width - 36);
  text.align = "left";
  text.height = blockHeight(text);
  sheet().elements = elements().map((item) => (item.id === element.id ? { ...item, text: "" } : item)).concat(text);
  selected = new Set([element.id, text.id]);
  endChange(true);
}

function openContextMenu(x, y) {
  const menu = $("#context-menu");
  menu.querySelectorAll("[data-need='selection']").forEach((button) => {
    button.disabled = selected.size === 0;
  });
  const mergeItem = menu.querySelector("[data-action='merge']");
  const unmergeItem = menu.querySelector("[data-action='unmerge']");
  if (mergeItem) mergeItem.disabled = selected.size < 2;
  if (unmergeItem) unmergeItem.disabled = !canUnmerge();
  menu.querySelector("[data-action='paste']").disabled = clipboard.length === 0;
  menu.hidden = false;
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
}

stage.addEventListener("contextmenu", (event) => {
  if (document.body.classList.contains("presenting") || event.target === editor) return;
  event.preventDefault();
  const world = pointerOnSheet(event);
  const hit = hitTest(elements(), world.x, world.y, 8);
  if (hit && !selected.has(hit.id)) {
    focusMember = null;
    selected = new Set([hit.id]);
  }
  pasteAt = world;
  paintMain();
  openContextMenu(event.clientX, event.clientY);
});

$("#context-menu").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  const point = pasteAt;
  hideContextMenu();
  if (button.dataset.action === "copy") copySelection();
  if (button.dataset.action === "cut") cutSelection();
  if (button.dataset.action === "paste") pasteClipboard(point);
  if (button.dataset.action === "duplicate") duplicateSelection();
  if (button.dataset.action === "delete") deleteSelection();
  if (button.dataset.action === "merge") mergeSelection();
  if (button.dataset.action === "unmerge") unmergeSelection();
});

$("#sheet-menu").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  const index = sheetMenuIndex;
  const action = button.dataset.sheetAction;
  hideSheetMenu();
  if (action === "duplicate") {
    mutate((next) => {
      next.sheets.splice(index + 1, 0, duplicateSheet(next.sheets[index]));
      next.index = index + 1;
    });
    return;
  }
  if (action === "copy") {
    sheetClipboard = duplicateSheet(deck.sheets[index]);
    toast("Sheet copied.");
    return;
  }
  if (action === "paste") {
    if (!sheetClipboard) return;
    mutate((next) => {
      next.sheets.splice(index + 1, 0, duplicateSheet(sheetClipboard));
      next.index = index + 1;
    });
    return;
  }
  if (action === "earlier") {
    const moved = reorderSheets(deck.sheets, index, -1);
    if (moved.index === index) return;
    commit({ ...deck, sheets: moved.sheets, index: moved.index });
    return;
  }
  if (action === "later") {
    const moved = reorderSheets(deck.sheets, index, 1);
    if (moved.index === index) return;
    commit({ ...deck, sheets: moved.sheets, index: moved.index });
    return;
  }
  if (action === "remove") {
    if (deck.sheets.length < 2) {
      toast("A folio keeps at least one sheet.");
      return;
    }
    mutate((next) => {
      next.sheets.splice(index, 1);
      next.index = clamp(index, 0, next.sheets.length - 1);
    });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Control" && event.key !== "Meta") return;
  ctrlHeld = true;
  if (lastPointer) updateCursor(lastPointer.world, lastPointer.clientX, lastPointer.clientY);
});
document.addEventListener("keyup", (event) => {
  if (event.key !== "Control" && event.key !== "Meta") return;
  ctrlHeld = false;
  if (!moveIsDuplicate) hideDupMark();
  if (lastPointer) updateCursor(lastPointer.world, lastPointer.clientX, lastPointer.clientY);
});
window.addEventListener("blur", () => {
  ctrlHeld = false;
  if (!moveIsDuplicate) hideDupMark();
});

stage.addEventListener("wheel", (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  if (document.body.classList.contains("presenting")) return;
  const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
  zoomAt(event.clientX, event.clientY, zoom * factor);
}, { passive: false });

$("#zoom-out").addEventListener("click", () => {
  const box = stage.getBoundingClientRect();
  zoomAt(box.left + box.width / 2, box.top + box.height / 2, zoom / 1.15);
});
$("#zoom-in").addEventListener("click", () => {
  const box = stage.getBoundingClientRect();
  zoomAt(box.left + box.width / 2, box.top + box.height / 2, zoom * 1.15);
});
$("#zoom-level").addEventListener("click", fitZoom);

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target === editor || target === titleInput || target === noteInput || target === $("#prompt")) return;
  if (target instanceof Element && (target.closest("#properties") || target.closest("dialog") || target.closest("#context-menu"))) return;
  const key = event.key.toLowerCase();
  if (event.key === "Escape") hideContextMenu();
  if ((event.ctrlKey || event.metaKey) && key === "z") {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && key === "y") {
    event.preventDefault();
    redo();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && key === "c") {
    event.preventDefault();
    copySelection();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && key === "x") {
    event.preventDefault();
    cutSelection();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && key === "v") {
    event.preventDefault();
    pasteClipboard(null);
    return;
  }
  if ((event.ctrlKey || event.metaKey) && key === "d") {
    event.preventDefault();
    duplicateSelection();
    return;
  }
  if (event.key === "Escape" && document.body.classList.contains("presenting")) {
    exitPresent();
    return;
  }
  if (key === "n" && document.body.classList.contains("presenting")) {
    notePeek = !notePeek;
    syncFields();
    return;
  }
  if (!document.body.classList.contains("presenting") && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if ((event.key === "Delete" || event.key === "Backspace") && (selected.size || focusMember)) {
      event.preventDefault();
      const member = focusedChild();
      if (member) {
        beginChange();
        member.group.children = (member.group.children || []).filter((child) => child.id !== member.child.id);
        focusMember = null;
        if (!member.group.children.length) {
          sheet().elements = elements().filter((element) => element.id !== member.group.id);
          selected = new Set();
        }
        endChange(true);
        return;
      }
      beginChange();
      sheet().elements = elements().filter((element) => !selected.has(element.id));
      selected = new Set();
      focusMember = null;
      endChange(true);
      return;
    }
    if (key === "q") {
      document.querySelector('#tools [data-tool="lock"]')?.click();
      return;
    }
    if (selected.size === 1 && event.key.length === 1) {
      const member = focusedChild();
      const element = member ? member.child : selectedElements()[0];
      if (canWrite(element)) {
        event.preventDefault();
        openTextEditor(element, member ? member.group : null);
        const base = element.type === "list" ? (element.items || []).join("\n") : element.text || "";
        editor.value = `${base}${event.key}`;
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        editor.setSelectionRange(editor.value.length, editor.value.length);
        return;
      }
    }
    const shortcut = TOOLS.find((item) => item.keys.includes(key));
    if (shortcut) {
      if (shortcut.id === "image") importImages();
      else setTool(shortcut.id);
      return;
    }
    if (selected.size && event.key.startsWith("Arrow")) {
      event.preventDefault();
      const dx = event.key === "ArrowLeft" ? -12 : event.key === "ArrowRight" ? 12 : 0;
      const dy = event.key === "ArrowUp" ? -12 : event.key === "ArrowDown" ? 12 : 0;
      const member = focusedChild();
      beginChange();
      if (member) {
        member.child.x += dx;
        member.child.y += dy;
        fitGroup(member.group);
      } else {
        sheet().elements = elements().map((element) => (selected.has(element.id) ? translate(element, dx, dy) : element));
      }
      endChange(true);
      return;
    }
  }
  if (event.key === " " && event.target.closest("button, a")) return;
  if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
    event.preventDefault();
    step(1);
  }
  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    step(-1);
  }
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && document.body.classList.contains("presenting")) {
    document.body.classList.remove("presenting");
    notePeek = false;
    renderAll();
  }
});

window.addEventListener("resize", () => paintMain());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persist();
});
window.addEventListener("pagehide", persist);

function boot() {
  const local = readLocal();
  if (local) useLibrary(local);
  const booted = JSON.stringify(deck);
  buildTools();
  buildProperties();
  const closeRail = $("#close-rail");
  const openRail = $("#open-rail");
  const openProps = $("#open-properties");
  const scrim = $("#panel-scrim");
  if (closeRail) closeRail.addEventListener("click", () => { railOpen = false; syncRail(); });
  if (openRail) openRail.addEventListener("click", () => { railOpen = true; syncRail(); });
  if (openProps) openProps.addEventListener("click", () => { propertiesOpen = true; syncProperties(); });
  if (scrim) scrim.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 800px)").matches) {
      railOpen = false;
      propertiesOpen = false;
      syncProperties();
    }
  });
  window.matchMedia("(max-width: 800px)").addEventListener("change", (event) => {
    propertiesOpen = !event.matches;
    railOpen = !event.matches;
    syncProperties();
  });
  syncRail();
  renderAll();
  readIdb().then((stored) => {
    if (stored && stored.savedAt > (local ? local.savedAt : 0) && JSON.stringify(deck) === booted) {
      useLibrary(stored);
      renderAll();
    }
    persist();
  }).catch(() => {});
}

boot();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => renderAll());
