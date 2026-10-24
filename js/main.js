import {
  DEFAULT_STYLE,
  absPoints,
  boxOf,
  clamp,
  clone,
  constrainBox,
  createElement,
  diamondPoly,
  duplicateElements,
  handlesFor,
  hitHandle,
  hitTest,
  normalizeBox,
  parseScene,
  reorder,
  resizeBox,
  sceneBounds,
  serializeScene,
  snapAngle,
  translate,
  withAbsPoints,
  intersects,
} from "./model.js";

const FONT = '"Patrick Hand", "Comic Sans MS", cursive';
const STORAGE_KEY = "drawexcal-v1";
const NOTE_KEY = "drawexcal-note-dismissed";
const PAPERS = ["#ffffff", "#f4f1ea", "#e7f2fb", "#fff4c2", "#fde8ef", "#e8f6ef", "#1e1e24"];
const COPY = {
  en: {
    open: "Open a file", save: "Keep a copy…", export: "Picture export…", pass: "Pass a snapshot", paste: "Take a snapshot",
    palette: "Jump bar", find: "Look up words", help: "How this works", fresh: "Start fresh", shelf: "Studio shelf",
    grid: "Dot grid", snap: "Snap to dots", about: "About this board", mood: "Mood", wording: "Wording", paper: "Paper",
    mark: "Your mark", hint: "To move the canvas, hold the scroll wheel or Space while dragging, or use the hand tool.",
    storage: "Drawings stay in this browser. Keep a copy so clearing site data does not take them.", dismiss: "Dismiss",
    helpTitle: "How this works", credit: "DrawExcal is a local board. Sketch strokes use rough.js. Nothing here signs you in or phones a server.",
    close: "Close", exportTitle: "Picture export", exportHint: "A still of the whole drawing, on the paper color you picked.",
    downloadPng: "Download PNG", copyPicture: "Copy picture", palettePlaceholder: "Jump to a command", findTitle: "Look up words",
    findPlaceholder: "Words on the board", aboutTitle: "About this board",
    aboutBody: "This is a private studio on your machine. Pass a snapshot when you want someone else to have a copy. There is no account, no chat room, and no live session.",
    freshTitle: "Start fresh?", freshBody: "The board clears. Undo can bring the drawing back.", keep: "Keep it", clearIt: "Clear it",
    fit: "Frame the drawing", copied: "Snapshot copied. Another DrawExcal tab can take it from the jump bar.",
    copyFail: "Could not copy. The browser blocked the clipboard.", pasted: "Snapshot placed on the board.",
    pasteFail: "Clipboard did not hold a drawing.", pictureCopied: "Picture copied.", noMatches: "No words match.",
    markPlaceholder: "A name in the corner",
  },
  es: {
    open: "Abrir un archivo", save: "Guardar una copia…", export: "Exportar imagen…", pass: "Pasar una copia", paste: "Tomar una copia",
    palette: "Barra de salto", find: "Buscar palabras", help: "Cómo funciona", fresh: "Empezar de cero", shelf: "Estante del estudio",
    grid: "Grilla de puntos", snap: "Imantar a los puntos", about: "Sobre este tablero", mood: "Ambiente", wording: "Idioma", paper: "Papel",
    mark: "Tu firma", hint: "Para mover el lienzo, mantén la rueda o Espacio mientras arrastras, o usa la mano.",
    storage: "Los dibujos viven en este navegador. Guarda una copia antes de borrar los datos del sitio.", dismiss: "Ocultar",
    helpTitle: "Cómo funciona", credit: "DrawExcal es un tablero local. Los trazos usan rough.js. No hay cuenta ni servidor.",
    close: "Cerrar", exportTitle: "Exportar imagen", exportHint: "Una foto de todo el dibujo, sobre el papel que elegiste.",
    downloadPng: "Descargar PNG", copyPicture: "Copiar imagen", palettePlaceholder: "Saltar a un comando", findTitle: "Buscar palabras",
    findPlaceholder: "Palabras en el tablero", aboutTitle: "Sobre este tablero",
    aboutBody: "Este estudio queda en tu máquina. Pasa una copia cuando quieras compartir el dibujo. No hay cuenta, chat ni sesión en vivo.",
    freshTitle: "¿Empezar de cero?", freshBody: "El tablero se vacía. Deshacer puede devolver el dibujo.", keep: "Conservar", clearIt: "Vaciar",
    fit: "Encuadrar el dibujo", copied: "Copia lista. Otra pestaña de DrawExcal puede tomarla desde la barra de salto.",
    copyFail: "El navegador bloqueó el portapapeles.", pasted: "Copia colocada en el tablero.",
    pasteFail: "El portapapeles no tenía un dibujo.", pictureCopied: "Imagen copiada.", noMatches: "Ninguna palabra coincide.",
    markPlaceholder: "Un nombre en la esquina",
  },
  fr: {
    open: "Ouvrir un fichier", save: "Garder une copie…", export: "Exporter l'image…", pass: "Passer un instantané", paste: "Prendre un instantané",
    palette: "Barre de saut", find: "Chercher des mots", help: "Mode d'emploi", fresh: "Repartir à zéro", shelf: "Établi",
    grid: "Grille de points", snap: "Aimant sur les points", about: "À propos", mood: "Ambiance", wording: "Langue", paper: "Papier",
    mark: "Votre signature", hint: "Pour déplacer la toile, gardez la molette ou Espace en glissant, ou prenez la main.",
    storage: "Les dessins restent dans ce navigateur. Gardez une copie avant d'effacer les données du site.", dismiss: "Masquer",
    helpTitle: "Mode d'emploi", credit: "DrawExcal est un tableau local. Les traits viennent de rough.js. Pas de compte, pas de serveur.",
    close: "Fermer", exportTitle: "Exporter l'image", exportHint: "Une image de tout le dessin, sur la couleur de papier choisie.",
    downloadPng: "Télécharger PNG", copyPicture: "Copier l'image", palettePlaceholder: "Aller à une commande", findTitle: "Chercher des mots",
    findPlaceholder: "Mots sur le tableau", aboutTitle: "À propos",
    aboutBody: "Cet atelier reste sur votre machine. Passez un instantané pour donner une copie. Pas de compte, pas de salon, pas de session live.",
    freshTitle: "Repartir à zéro ?", freshBody: "Le tableau se vide. Annuler peut le ramener.", keep: "Garder", clearIt: "Vider",
    fit: "Cadrer le dessin", copied: "Instantané copié. Un autre onglet DrawExcal peut le prendre depuis la barre de saut.",
    copyFail: "Le presse-papiers a été bloqué.", pasted: "Instantané posé sur le tableau.",
    pasteFail: "Le presse-papiers ne contenait pas de dessin.", pictureCopied: "Image copiée.", noMatches: "Aucun mot ne correspond.",
    markPlaceholder: "Un nom dans le coin",
  },
};
const STROKE_COLORS = ["#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00", "#6741d9", "#0c8599", "#c2255c"];
const FILL_COLORS = ["transparent", "#ffc9c9", "#b2f2bb", "#a5d8ff", "#ffec99", "#e5dbff", "#ffd8a8", "#ffffff"];

const TOOLS = [
  { id: "hand", label: "Hand (panning tool)", keys: ["h"], title: "H" },
  { id: "selection", label: "Selection", keys: ["v", "1"], title: "V or 1" },
  { id: "rectangle", label: "Rectangle", keys: ["r", "2"], title: "R or 2" },
  { id: "diamond", label: "Diamond", keys: ["d", "3"], title: "D or 3" },
  { id: "ellipse", label: "Ellipse", keys: ["o", "4"], title: "O or 4" },
  { id: "arrow", label: "Arrow", keys: ["a", "5"], title: "A or 5" },
  { id: "line", label: "Line", keys: ["l", "6"], title: "L or 6" },
  { id: "freedraw", label: "Draw", keys: ["p", "7"], title: "P or 7" },
  { id: "text", label: "Text", keys: ["t", "8"], title: "T or 8" },
  { id: "sticky", label: "Sticky note", keys: ["n"], title: "N" },
  { id: "eraser", label: "Eraser", keys: ["e", "0"], title: "E or 0" },
];

const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const rc = rough.canvas(canvas);
const editor = document.querySelector("#text-editor");
const toolsHost = document.querySelector("#tools");
const propertiesHost = document.querySelector("#properties");
const hint = document.querySelector("#hint");
const storageNote = document.querySelector("#storage-note");
const zoomReset = document.querySelector("#zoom-reset");
const undoButton = document.querySelector("#undo");
const redoButton = document.querySelector("#redo");
const menu = document.querySelector("#menu");
const menuButton = document.querySelector("#menu-button");
const helpDialog = document.querySelector("#help-dialog");
const fileInput = document.querySelector("#file-input");

let elements = [];
let selected = new Set();
let style = { ...DEFAULT_STYLE };
let tool = "selection";
let lockTool = false;
let grid = false;
let snap = false;
let theme = "day";
let language = "en";
let paper = "#fffdf8";
let mark = "";
let zoom = 1;
let panX = 0;
let panY = 0;
let mode = null;
let draft = null;
let editing = null;
let pending = null;
let styleGesture = false;
let marquee = null;
let spaceDown = false;
let pointerStart = null;
let moveOrigins = [];
let resizeHandle = null;
let resizeStart = null;
let marqueeBase = new Set();
let eraserPointer = null;
const undoStack = [];
const redoStack = [];
let persistTimer = 0;
let frame = 0;

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
  eraser: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 15.5 12.5 7l5 5L9 20.5H5.5Z"/><path d="M8 13.5 13 18.5"/></svg>',
  lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="10" width="12" height="9" rx="1.5"/><path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2"/></svg>',
};

function $(id) {
  return document.querySelector(id);
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved.elements)) elements = saved.elements;
    if (saved && saved.style) style = { ...DEFAULT_STYLE, ...saved.style };
    if (saved && typeof saved.grid === "boolean") grid = saved.grid;
    if (saved && typeof saved.snap === "boolean") snap = saved.snap;
    if (saved && ["day", "dusk", "device"].includes(saved.theme)) theme = saved.theme;
    if (saved && COPY[saved.language]) language = saved.language;
    if (saved && typeof saved.paper === "string") paper = saved.paper;
    if (saved && typeof saved.mark === "string") mark = saved.mark;
  } catch {
    elements = [];
  }
  if (localStorage.getItem(NOTE_KEY) === "1") storageNote.hidden = true;
  applyChrome();
}

function persistSoon() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ elements, style, grid, snap, theme, language, paper, mark }));
    } catch {
      /* private mode or a full quota */
    }
  }, 200);
}

function beginChange() {
  if (!pending) pending = clone(elements);
}

function endChange() {
  if (!pending) return;
  if (JSON.stringify(pending) !== JSON.stringify(elements)) {
    undoStack.push(pending);
    if (undoStack.length > 100) undoStack.shift();
    redoStack.length = 0;
  }
  pending = null;
  styleGesture = false;
  persistSoon();
  syncHistory();
}

function undo() {
  if (pending || !undoStack.length) return;
  redoStack.push(clone(elements));
  elements = undoStack.pop();
  selected = new Set();
  persistSoon();
  syncHistory();
  requestRender();
}

function redo() {
  if (pending || !redoStack.length) return;
  undoStack.push(clone(elements));
  elements = redoStack.pop();
  selected = new Set();
  persistSoon();
  syncHistory();
  requestRender();
}

function syncHistory() {
  undoButton.disabled = !undoStack.length || Boolean(pending);
  redoButton.disabled = !redoStack.length || Boolean(pending);
}

function screenToWorld(x, y) {
  return { x: (x - panX) / zoom, y: (y - panY) / zoom };
}

function worldToScreen(x, y) {
  return { x: x * zoom + panX, y: y * zoom + panY };
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function requestRender() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    render();
  });
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  requestRender();
}

function centerView() {
  panX = canvas.clientWidth / 2;
  panY = canvas.clientHeight / 2;
}

function zoomAt(next, cx, cy) {
  const world = screenToWorld(cx, cy);
  zoom = clamp(next, 0.1, 8);
  panX = cx - world.x * zoom;
  panY = cy - world.y * zoom;
  requestRender();
}

function zoomToFit() {
  const bounds = sceneBounds(elements);
  if (!bounds || bounds.width < 1 || bounds.height < 1) {
    zoom = 1;
    centerView();
    requestRender();
    return;
  }
  const pad = 80;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  zoom = clamp(Math.min((width - pad) / bounds.width, (height - pad) / bounds.height), 0.1, 2);
  panX = (width - bounds.width * zoom) / 2 - bounds.x * zoom;
  panY = (height - bounds.height * zoom) / 2 - bounds.y * zoom;
  requestRender();
}

function setTool(next) {
  tool = next;
  for (const button of toolsHost.querySelectorAll("[data-tool]")) {
    button.setAttribute("aria-pressed", String(button.dataset.tool === tool));
  }
  updateCursor();
  syncProperties();
  requestRender();
}

function updateCursor(world) {
  if (spaceDown || tool === "hand" || mode === "pan") {
    canvas.style.cursor = "grab";
    return;
  }
  if (tool === "text") {
    canvas.style.cursor = "text";
    return;
  }
  if (tool === "eraser") {
    canvas.style.cursor = "none";
    return;
  }
  if (tool === "selection" && world && selected.size === 1) {
    const element = elements.find((item) => selected.has(item.id));
    const handle = element && hitHandle(element, world.x, world.y, 8 / zoom);
    const cursors = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", start: "grab", end: "grab" };
    if (handle && cursors[handle]) {
      canvas.style.cursor = cursors[handle];
      return;
    }
  }
  canvas.style.cursor = tool === "selection" ? "default" : "crosshair";
}

function selectedElements() {
  return elements.filter((element) => selected.has(element.id));
}

function applyStyle(partial, commit) {
  style = { ...style, ...partial };
  if (selected.size) {
    if (!styleGesture) {
      beginChange();
      styleGesture = true;
    }
    elements = elements.map((element) => (selected.has(element.id) ? { ...element, ...partial } : element));
  }
  if (commit && styleGesture) endChange();
  if (commit && !selected.size) persistSoon();
  syncProperties();
  requestRender();
}

function buildTools() {
  const lock = document.createElement("button");
  lock.type = "button";
  lock.className = "tool-button";
  lock.dataset.tool = "lock";
  lock.title = "Keep selected tool active after drawing — Q";
  lock.setAttribute("aria-label", "Keep selected tool active after drawing");
  lock.setAttribute("aria-pressed", "false");
  lock.innerHTML = ICONS.lock;
  lock.addEventListener("click", () => {
    lockTool = !lockTool;
    lock.setAttribute("aria-pressed", String(lockTool));
  });
  toolsHost.append(lock);

  for (const item of TOOLS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tool-button";
    button.dataset.tool = item.id;
    button.title = `${item.label} — ${item.title}`;
    button.setAttribute("aria-label", item.label);
    button.setAttribute("aria-keyshortcuts", item.title);
    button.setAttribute("aria-pressed", String(item.id === tool));
    button.innerHTML = ICONS[item.id];
    button.addEventListener("click", () => setTool(item.id));
    toolsHost.append(button);
  }
}

function swatch(color, kind) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `swatch${color === "transparent" ? " none" : ""}`;
  button.style.background = color === "transparent" ? "" : color;
  button.dataset.color = color;
  button.dataset.kind = kind;
  button.title = color === "transparent" ? "Transparent" : color;
  button.setAttribute("aria-label", color === "transparent" ? "Transparent background" : color);
  button.addEventListener("click", () => {
    applyStyle(kind === "stroke" ? { strokeColor: color } : { backgroundColor: color }, true);
  });
  return button;
}

function choice(label, group, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "choice";
  button.dataset.group = group;
  button.dataset.value = String(value);
  button.textContent = label;
  button.addEventListener("click", () => applyChoice(group, value));
  return button;
}

function iconChoice(markup, group, value, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "choice icon-choice";
  button.dataset.group = group;
  button.dataset.value = String(value);
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = markup;
  button.addEventListener("click", () => applyChoice(group, value));
  return button;
}

function applyChoice(groupName, value) {
  const numeric = ["strokeWidth", "roughness", "fontSize", "roundness"].includes(groupName);
  applyStyle({ [groupName]: numeric ? Number(value) : value }, true);
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
  const radius = round ? 3.5 : 0.5;
  return `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="2.5" y="2.5" width="13" height="13" rx="${radius}" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
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

function colorPicker(kind) {
  const input = document.createElement("input");
  input.type = "color";
  input.className = "color-picker";
  input.dataset.kind = kind;
  input.value = kind === "stroke" ? style.strokeColor : "#ffffff";
  input.title = kind === "stroke" ? "Custom ink" : "Custom wash";
  input.setAttribute("aria-label", input.title);
  input.addEventListener("input", () => {
    applyStyle(kind === "stroke" ? { strokeColor: input.value } : { backgroundColor: input.value }, false);
  });
  input.addEventListener("change", () => applyStyle({}, true));
  return input;
}

function buildProperties() {
  const stroke = group("Ink", "color-row");
  STROKE_COLORS.slice(0, 5).forEach((color) => stroke.row.append(swatch(color, "stroke")));
  stroke.row.append(colorPicker("stroke"));
  const fill = group("Wash", "color-row");
  FILL_COLORS.slice(0, 5).forEach((color) => fill.row.append(swatch(color, "fill")));
  fill.row.append(colorPicker("fill"));
  const texture = group("Texture");
  texture.row.append(choice("Lines", "fillStyle", "hachure"), choice("Cross", "fillStyle", "cross-hatch"), choice("Flat", "fillStyle", "solid"));
  const width = group("Weight");
  width.row.append(
    iconChoice(lineIcon(1.4), "strokeWidth", 1, "Hairline"),
    iconChoice(lineIcon(2.4), "strokeWidth", 2, "Marker"),
    iconChoice(lineIcon(4), "strokeWidth", 4, "Brush"),
  );
  const strokeStyle = group("Rhythm");
  strokeStyle.row.append(
    iconChoice(lineIcon(1.8), "strokeStyle", "solid", "Continuous"),
    iconChoice(lineIcon(1.8, "5 3"), "strokeStyle", "dashed", "Broken"),
    iconChoice(lineIcon(2.4, "0.5 4"), "strokeStyle", "dotted", "Dotted"),
  );
  const rough = group("Wobble");
  rough.row.append(
    iconChoice(wobbleIcon(0), "roughness", 0, "Steady"),
    iconChoice(wobbleIcon(1), "roughness", 1, "Loose"),
    iconChoice(wobbleIcon(2), "roughness", 2, "Wild"),
  );
  const edges = group("Corners");
  edges.row.append(
    iconChoice(cornerIcon(false), "roundness", 0, "Square corners"),
    iconChoice(cornerIcon(true), "roundness", 1, "Soft corners"),
  );
  const opacity = group("Fade");
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.value = String(style.opacity);
  slider.id = "opacity";
  slider.setAttribute("aria-label", "Fade");
  slider.addEventListener("input", () => applyStyle({ opacity: Number(slider.value) }, false));
  slider.addEventListener("change", () => applyStyle({}, true));
  const scale = document.createElement("div");
  scale.className = "opacity-scale";
  scale.innerHTML = "<span>0</span><span>100</span>";
  opacity.row.className = "opacity-wrap";
  opacity.row.append(slider, scale);
  const font = group("Lettering");
  font.row.append(choice("S", "fontSize", 16), choice("M", "fontSize", 24), choice("L", "fontSize", 40));
  const layers = group("Stack");
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
    layers.row.append(button);
  });
  propertiesHost.append(stroke.wrap, fill.wrap, texture.wrap, width.wrap, strokeStyle.wrap, rough.wrap, edges.wrap, opacity.wrap, font.wrap, layers.wrap);
}

function group(label, rowClass = "choice-row") {
  const wrap = document.createElement("div");
  wrap.className = "prop-group";
  const name = document.createElement("span");
  name.className = "prop-label";
  name.textContent = label;
  const row = document.createElement("div");
  row.className = rowClass;
  wrap.append(name, row);
  return { wrap, row };
}

function syncProperties() {
  const show = selected.size > 0 || !["selection", "hand", "eraser"].includes(tool);
  propertiesHost.hidden = !show;
  const current = selectedElements();
  const read = (key) => {
    if (!current.length) return style[key];
    const first = current[0][key];
    return current.every((element) => element[key] === first) ? first : null;
  };
  for (const button of propertiesHost.querySelectorAll(".swatch")) {
    const value = read(button.dataset.kind === "stroke" ? "strokeColor" : "backgroundColor");
    button.setAttribute("aria-pressed", String(value === button.dataset.color));
  }
  for (const button of propertiesHost.querySelectorAll(".choice[data-group]")) {
    const value = read(button.dataset.group);
    button.setAttribute("aria-pressed", String(String(value) === button.dataset.value));
  }
  const opacity = propertiesHost.querySelector("#opacity");
  const opacityValue = read("opacity");
  if (opacity && opacityValue != null && document.activeElement !== opacity) opacity.value = String(opacityValue);
  for (const input of propertiesHost.querySelectorAll(".color-picker")) {
    const value = read(input.dataset.kind === "stroke" ? "strokeColor" : "backgroundColor");
    if (value && value !== "transparent" && document.activeElement !== input) input.value = value;
  }
}

function changeOrder(direction) {
  if (!selected.size) return;
  beginChange();
  elements = reorder(elements, [...selected], direction);
  endChange();
  requestRender();
}

function deleteSelection() {
  if (!selected.size) return;
  beginChange();
  elements = elements.filter((element) => !selected.has(element.id));
  selected = new Set();
  endChange();
  syncProperties();
  requestRender();
}

function duplicateSelection() {
  if (!selected.size) return;
  beginChange();
  const copies = duplicateElements(elements, [...selected]);
  elements = elements.concat(copies);
  selected = new Set(copies.map((element) => element.id));
  endChange();
  syncProperties();
  requestRender();
}

function isFilled(element) {
  return Boolean(element.backgroundColor) && element.backgroundColor !== "transparent";
}

function roughOptions(element) {
  const options = {
    seed: element.seed || 1,
    roughness: element.roughness ?? 1,
    stroke: element.strokeColor,
    strokeWidth: element.strokeWidth,
    bowing: element.roughness ? 1 : 0,
    disableMultiStroke: element.roughness === 0,
  };
  if (element.strokeStyle === "dashed") options.strokeLineDash = [12, 10];
  if (element.strokeStyle === "dotted") options.strokeLineDash = [2, 8];
  if (isFilled(element)) {
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

function shapeDrawable(generator, element) {
  if (element.type === "text") return null;
  const options = roughOptions(element);
  const box = normalizeBox(element.x, element.y, element.width, element.height);
  if ((element.type === "rectangle" || element.type === "sticky" || element.type === "ellipse" || element.type === "diamond") && (box.width < 1 || box.height < 1)) {
    return null;
  }
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
  if (element.type === "ellipse") return generator.ellipse(box.x + box.width / 2, box.y + box.height / 2, box.width, box.height, options);
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
    const head = 12 + element.strokeWidth * 2;
    const length = Math.hypot(end.x - prev.x, end.y - prev.y) || 1;
    const keep = Math.max(0, length - head * 0.65) / length;
    path = points.slice(0, -1).concat([{ x: prev.x + (end.x - prev.x) * keep, y: prev.y + (end.y - prev.y) * keep }]);
  }
  return generator.linearPath(path.map((point) => [point.x, point.y]), options);
}

function arrowHeadDrawable(generator, element) {
  if (element.type !== "arrow") return null;
  const points = absPoints(element);
  if (points.length < 2) return null;
  const end = points[points.length - 1];
  const prev = points[points.length - 2];
  const length = Math.hypot(end.x - prev.x, end.y - prev.y);
  if (length < 8) return null;
  const angle = Math.atan2(end.y - prev.y, end.x - prev.x);
  const head = 16 + element.strokeWidth * 2;
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

function wrapLines(context, text, maxWidth) {
  const lines = [];
  for (const paragraph of String(text || "").split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = words[0];
    for (let index = 1; index < words.length; index++) {
      const next = `${line} ${words[index]}`;
      if (context.measureText(next).width > maxWidth && line) {
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

function drawLabel(context, element) {
  if (!element.text || (editing && editing.id === element.id)) return;
  const box = boxOf(element);
  const fontSize = element.fontSize || 24;
  context.save();
  context.fillStyle = element.strokeColor;
  context.font = `${fontSize}px ${FONT}`;
  const padding = element.type === "text" ? 4 : 14;
  const lines = wrapLines(context, element.text, Math.max(20, box.width - padding * 2));
  const lineHeight = fontSize * 1.25;
  context.textBaseline = "top";
  if (element.type === "text") {
    context.textAlign = "left";
    lines.forEach((line, index) => context.fillText(line, box.x + 2, box.y + index * lineHeight));
  } else {
    context.textAlign = "center";
    const start = box.y + Math.max(padding, (box.height - lines.length * lineHeight) / 2);
    lines.forEach((line, index) => context.fillText(line, box.x + box.width / 2, start + index * lineHeight));
  }
  context.restore();
}

function drawElement(context, roughCanvas, element) {
  context.save();
  context.globalAlpha = clamp(element.opacity ?? 100, 0, 100) / 100;
  const body = shapeDrawable(roughCanvas.generator, element);
  if (body) roughCanvas.draw(body);
  const head = arrowHeadDrawable(roughCanvas.generator, element);
  if (head) roughCanvas.draw(head);
  drawLabel(context, element);
  context.restore();
}

function paperIsDark(color) {
  const hex = color.replace("#", "");
  if (hex.length < 6) return false;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 < 150;
}

function drawGrid(context, width, height) {
  const gap = 24 * zoom;
  if (gap < 8) return;
  const offsetX = ((panX % gap) + gap) % gap;
  const offsetY = ((panY % gap) + gap) % gap;
  context.fillStyle = paperIsDark(paper) ? "rgba(255,255,255,0.18)" : "#e4e4ea";
  for (let x = offsetX; x < width; x += gap) {
    for (let y = offsetY; y < height; y += gap) context.fillRect(x, y, 1.4, 1.4);
  }
}

function phrases() {
  return COPY[language] || COPY.en;
}

function applyChrome() {
  const dusk = theme === "dusk" || (theme === "device" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dusk ? "dusk" : "day";
  document.documentElement.lang = language;
  document.documentElement.style.setProperty("--paper", paper);
  const copy = phrases();
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const value = copy[node.dataset.i18n];
    if (value) node.textContent = value;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const value = copy[node.dataset.i18nPlaceholder];
    if (value) node.placeholder = value;
  });
  const languageSelect = $("#language");
  if (languageSelect) languageSelect.value = language;
  const markInput = $("#mark-input");
  if (markInput && document.activeElement !== markInput) {
    markInput.value = mark;
    markInput.placeholder = copy.markPlaceholder;
  }
  $("#action-grid")?.setAttribute("aria-pressed", String(grid));
  $("#action-snap")?.setAttribute("aria-pressed", String(snap));
  document.querySelectorAll("[data-theme]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.theme === theme));
  });
  document.querySelectorAll("[data-paper]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.paper.toLowerCase() === paper.toLowerCase()));
  });
}

let toastTimer = 0;
function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    node.hidden = true;
  }, 2400);
}

function maybeSnap(point) {
  if (!snap) return point;
  const gap = 24;
  return { x: Math.round(point.x / gap) * gap, y: Math.round(point.y / gap) * gap };
}

function render() {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  if (grid) drawGrid(ctx, width, height);
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * panX, dpr * panY);
  for (const element of elements) drawElement(ctx, rc, element);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawChrome();
  if (mark.trim()) {
    ctx.save();
    ctx.font = `15px ${getComputedStyle(document.body).fontFamily}`;
    ctx.fillStyle = paperIsDark(paper) ? "rgba(255,255,255,0.55)" : "rgba(30,30,36,0.45)";
    ctx.textAlign = "right";
    ctx.fillText(mark.trim(), width - 16, height - 20);
    ctx.restore();
  }
  zoomReset.textContent = `${Math.round(zoom * 100)}%`;
  hint.hidden = elements.length > 0;
  if (editing) positionEditor();
}

function drawChrome() {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#6965db";
  ctx.fillStyle = "#ffffff";
  if (marquee) {
    const origin = worldToScreen(marquee.x, marquee.y);
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(origin.x, origin.y, marquee.width * zoom, marquee.height * zoom);
    ctx.setLineDash([]);
  }
  for (const element of elements) {
    if (!selected.has(element.id)) continue;
    const box = boxOf(element);
    const origin = worldToScreen(box.x, box.y);
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(origin.x - 4, origin.y - 4, box.width * zoom + 8, box.height * zoom + 8);
    ctx.setLineDash([]);
    if (selected.size === 1) {
      for (const handle of handlesFor(element)) {
        const point = worldToScreen(handle.x, handle.y);
        ctx.fillRect(point.x - 4, point.y - 4, 8, 8);
        ctx.strokeRect(point.x - 4, point.y - 4, 8, 8);
      }
    }
  }
  if (tool === "eraser" && eraserPointer) {
    ctx.beginPath();
    ctx.arc(eraserPointer.x, eraserPointer.y, 10, 0, Math.PI * 2);
    ctx.strokeStyle = "#e03131";
    ctx.stroke();
  }
  ctx.restore();
}

function positionEditor() {
  if (!editing) return;
  const element = elements.find((item) => item.id === editing.id);
  if (!element) return;
  const box = boxOf(element);
  const origin = worldToScreen(box.x, box.y);
  editor.style.left = `${origin.x}px`;
  editor.style.top = `${origin.y}px`;
  editor.style.width = `${Math.max(80, box.width * zoom)}px`;
  editor.style.height = `${Math.max(element.fontSize * zoom * 1.4, box.height * zoom)}px`;
  editor.style.fontSize = `${element.fontSize * zoom}px`;
  editor.style.color = element.strokeColor;
  editor.style.fontFamily = FONT;
}

function openEditor(element) {
  if (editing && editing.id !== element.id) commitEditor();
  beginChange();
  editing = element;
  selected = new Set([element.id]);
  editor.hidden = false;
  editor.value = element.text || "";
  positionEditor();
  setTimeout(() => {
    if (editing && editing.id === element.id) editor.focus({ preventScroll: true });
  }, 0);
  syncProperties();
  requestRender();
}

function commitEditor() {
  if (!editing) return;
  const element = elements.find((item) => item.id === editing.id);
  editing = null;
  editor.hidden = true;
  if (element && element.type === "text" && !String(element.text || "").trim()) {
    elements = elements.filter((item) => item.id !== element.id);
    selected = new Set();
  }
  endChange();
  if (!lockTool && (tool === "text" || tool === "sticky")) setTool("selection");
  syncProperties();
  requestRender();
}

function updateDraft(element, world, shiftKey) {
  if (element.type !== "freedraw") world = maybeSnap(world);
  if (element.type === "line" || element.type === "arrow") {
    let end = world;
    if (shiftKey) end = snapAngle(element.x, element.y, world.x, world.y);
    const next = withAbsPoints(element, [
      { x: element.x, y: element.y },
      end,
    ]);
    Object.assign(element, next);
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
  if (element.type === "rectangle" || element.type === "diamond" || element.type === "ellipse" || element.type === "sticky") {
    const box = normalizeBox(element.x, element.y, element.width, element.height);
    const tiny = box.width < 4 && box.height < 4;
    if (element.type === "sticky" && tiny) {
      element.width = 200;
      element.height = 180;
    } else if (tiny) {
      elements = elements.filter((item) => item.id !== element.id);
      return;
    } else {
      Object.assign(element, box);
    }
    selected = new Set([element.id]);
    if (element.type === "sticky") openEditor(element);
    return;
  }
  const box = boxOf(element);
  const tiny = box.width < 4 && box.height < 4;
  const shortDraw = element.type === "freedraw" && absPoints(element).length < 3;
  if (tiny || shortDraw) {
    elements = elements.filter((item) => item.id !== element.id);
    return;
  }
  selected = new Set([element.id]);
}

function eraseAt(world) {
  const before = elements.length;
  elements = elements.filter((element) => !hitTest([element], world.x, world.y, 10 / zoom));
  if (elements.length !== before) {
    selected = new Set([...selected].filter((id) => elements.some((element) => element.id === id)));
  }
}

function onPointerDown(event) {
  if (event.button !== 0 && event.button !== 1) return;
  if (editing && event.target === canvas) commitEditor();
  canvas.setPointerCapture(event.pointerId);
  const screen = pointerPosition(event);
  const world = screenToWorld(screen.x, screen.y);
  pointerStart = { screen, world, shift: event.shiftKey };
  eraserPointer = screen;

  if (event.button === 1 || spaceDown || tool === "hand") {
    mode = "pan";
    canvas.style.cursor = "grabbing";
    return;
  }
  if (tool === "eraser") {
    mode = "erase";
    beginChange();
    eraseAt(world);
    requestRender();
    return;
  }
  if (tool === "text") {
    mode = "text";
    return;
  }
  if (tool === "selection") {
    const only = selected.size === 1 ? elements.find((element) => selected.has(element.id)) : null;
    const handle = only && hitHandle(only, world.x, world.y, 8 / zoom);
    if (handle) {
      mode = "resize";
      resizeHandle = handle;
      resizeStart = clone(only);
      beginChange();
      return;
    }
    const hit = hitTest(elements, world.x, world.y, 8 / zoom);
    if (hit) {
      if (event.shiftKey) {
        if (selected.has(hit.id)) selected.delete(hit.id);
        else selected.add(hit.id);
      } else if (!selected.has(hit.id)) {
        selected = new Set([hit.id]);
      }
      mode = "move";
      moveOrigins = selectedElements().map((element) => clone(element));
      beginChange();
      syncProperties();
      requestRender();
      return;
    }
    mode = "marquee";
    marqueeBase = event.shiftKey ? new Set(selected) : new Set();
    if (!event.shiftKey) selected = new Set();
    marquee = { x: world.x, y: world.y, width: 0, height: 0 };
    beginChange();
    syncProperties();
    requestRender();
    return;
  }

  beginChange();
  const origin = tool === "freedraw" ? world : maybeSnap(world);
  const element = createElement(tool, origin.x, origin.y, style);
  if (tool !== "sticky") {
    element.width = 0;
    element.height = 0;
  }
  elements = elements.concat(element);
  draft = element;
  mode = "create";
  selected = new Set([element.id]);
  requestRender();
}

function onPointerMove(event) {
  const screen = pointerPosition(event);
  const world = screenToWorld(screen.x, screen.y);
  eraserPointer = screen;
  if (!mode) {
    updateCursor(world);
    if (tool === "eraser") requestRender();
    return;
  }
  if (mode === "pan") {
    panX += event.movementX;
    panY += event.movementY;
    requestRender();
    return;
  }
  if (mode === "erase") {
    eraseAt(world);
    requestRender();
    return;
  }
  if (mode === "create" && draft) {
    updateDraft(draft, world, event.shiftKey);
    requestRender();
    return;
  }
  if (mode === "move") {
    const dx = world.x - pointerStart.world.x;
    const dy = world.y - pointerStart.world.y;
    const origins = new Map(moveOrigins.map((element) => [element.id, element]));
    elements = elements.map((element) => {
      const origin = origins.get(element.id);
      return origin ? translate(origin, dx, dy) : element;
    });
    requestRender();
    return;
  }
  if (mode === "resize" && resizeStart) {
    elements = elements.map((element) => {
      if (element.id !== resizeStart.id) return element;
      if (resizeHandle === "start" || resizeHandle === "end") {
        const points = absPoints(resizeStart);
        const index = resizeHandle === "start" ? 0 : points.length - 1;
        let next = world;
        const anchor = points[index === 0 ? points.length - 1 : 0];
        if (event.shiftKey) next = snapAngle(anchor.x, anchor.y, world.x, world.y);
        points[index] = next;
        return withAbsPoints(resizeStart, points);
      }
      const box = resizeBox(boxOf(resizeStart), resizeHandle, world, event.shiftKey);
      return { ...resizeStart, ...box };
    });
    requestRender();
    return;
  }
  if (mode === "marquee") {
    marquee = normalizeBox(pointerStart.world.x, pointerStart.world.y, world.x - pointerStart.world.x, world.y - pointerStart.world.y);
    const hits = elements.filter((element) => intersects(boxOf(element), marquee)).map((element) => element.id);
    selected = new Set([...marqueeBase, ...hits]);
    requestRender();
  }
}

function onPointerUp(event) {
  if (mode === "text") {
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    const screen = pointerPosition(event);
    const world = screenToWorld(screen.x, screen.y);
    const hit = hitTest(elements, world.x, world.y, 8 / zoom);
    if (hit && ["text", "sticky", "rectangle", "diamond", "ellipse"].includes(hit.type)) openEditor(hit);
    else {
      const spot = maybeSnap(world);
      const element = createElement("text", spot.x, spot.y, style);
      elements = elements.concat(element);
      openEditor(element);
    }
  }
  if (mode === "create" && draft) {
    const created = draft;
    draft = null;
    finalizeDraft(created);
    if (!lockTool && !editing) setTool("selection");
  }
  if (mode === "marquee" && marquee && marquee.width < 3 && marquee.height < 3) {
    selected = new Set(marqueeBase);
  }
  const keepHistoryOpen = Boolean(editing);
  mode = null;
  marquee = null;
  draft = null;
  resizeStart = null;
  if (!keepHistoryOpen) endChange();
  updateCursor(screenToWorld(pointerPosition(event).x, pointerPosition(event).y));
  syncProperties();
  requestRender();
}

editor.addEventListener("input", () => {
  if (!editing) return;
  const element = elements.find((item) => item.id === editing.id);
  if (!element) return;
  element.text = editor.value;
  ctx.font = `${element.fontSize}px ${FONT}`;
  const lines = wrapLines(ctx, element.text, Math.max(20, element.width - 8));
  if (element.type === "text") element.height = Math.max(element.fontSize * 1.25, lines.length * element.fontSize * 1.25);
  requestRender();
});

editor.addEventListener("blur", () => commitEditor());
editor.addEventListener("keydown", (event) => {
  if (event.key === "Escape" || (event.key === "Enter" && (event.metaKey || event.ctrlKey))) {
    event.preventDefault();
    editor.blur();
  }
  event.stopPropagation();
});

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("dblclick", (event) => {
  const screen = pointerPosition(event);
  const world = screenToWorld(screen.x, screen.y);
  const hit = hitTest(elements, world.x, world.y, 8 / zoom);
  if (hit && ["text", "sticky", "rectangle", "diamond", "ellipse"].includes(hit.type)) openEditor(hit);
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const screen = pointerPosition(event);
  if (event.ctrlKey || event.metaKey) {
    zoomAt(zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08), screen.x, screen.y);
  } else {
    panX -= event.deltaX || (event.shiftKey ? event.deltaY : 0);
    panY -= event.shiftKey ? 0 : event.deltaY;
    requestRender();
  }
}, { passive: false });

window.addEventListener("keydown", (event) => {
  const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
  if (event.code === "Space" && !typing) {
    spaceDown = true;
    updateCursor();
    event.preventDefault();
  }
  if (typing) return;
  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && key === "z") {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && key === "y") {
    event.preventDefault();
    redo();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && key === "d") {
    event.preventDefault();
    duplicateSelection();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && key === "a") {
    event.preventDefault();
    selected = new Set(elements.map((element) => element.id));
    syncProperties();
    requestRender();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && key === "s") {
    event.preventDefault();
    saveFile();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && key === "o") {
    event.preventDefault();
    closeMenu();
    fileInput.click();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === "KeyE") {
    event.preventDefault();
    openExport();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.code === "KeyF") {
    event.preventDefault();
    openFind();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.code === "Slash" && !event.shiftKey) {
    event.preventDefault();
    openPalette();
    return;
  }
  if (key === "q") {
    lockTool = !lockTool;
    toolsHost.querySelector('[data-tool="lock"]').setAttribute("aria-pressed", String(lockTool));
    return;
  }
  if (key === "?" || (event.shiftKey && event.key === "/")) {
    helpDialog.showModal();
    return;
  }
  if (key === "delete" || key === "backspace") {
    deleteSelection();
    return;
  }
  if (key === "escape") {
    selected = new Set();
    menu.hidden = true;
    syncProperties();
    requestRender();
    return;
  }
  const arrows = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] };
  if (arrows[key] && selected.size) {
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    beginChange();
    elements = elements.map((element) => (selected.has(element.id) ? translate(element, arrows[key][0] * step, arrows[key][1] * step) : element));
    endChange();
    requestRender();
    return;
  }
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const match = TOOLS.find((item) => item.keys.includes(key));
  if (match) setTool(match.id);
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    spaceDown = false;
    updateCursor();
  }
});

function saveFile() {
  const blob = new Blob([serializeScene(elements)], { type: "application/json" });
  download("drawing.drawexcal.json", blob);
}

function exportPng() {
  renderedPicture().toBlob((blob) => {
    if (blob) download("drawing.png", blob);
  });
}

function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function replaceScene(next) {
  beginChange();
  elements = next;
  selected = new Set();
  endChange();
  zoomToFit();
  syncProperties();
}

function closeMenu() {
  menu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
}

menuButton.addEventListener("click", () => {
  menu.hidden = !menu.hidden;
  menuButton.setAttribute("aria-expanded", String(!menu.hidden));
});

document.addEventListener("pointerdown", (event) => {
  if (!menu.hidden && !menu.contains(event.target) && event.target !== menuButton) closeMenu();
});

$("#action-open").addEventListener("click", () => {
  closeMenu();
  fileInput.click();
});
$("#action-save").addEventListener("click", () => {
  closeMenu();
  saveFile();
});
$("#action-export").addEventListener("click", () => {
  closeMenu();
  openExport();
});
$("#action-pass").addEventListener("click", () => {
  closeMenu();
  passSnapshot();
});
$("#action-palette").addEventListener("click", () => {
  closeMenu();
  openPalette();
});
$("#action-find").addEventListener("click", () => {
  closeMenu();
  openFind();
});
$("#action-help").addEventListener("click", () => {
  closeMenu();
  helpDialog.showModal();
});
$("#action-about").addEventListener("click", () => {
  closeMenu();
  $("#about-dialog").showModal();
});
$("#action-grid").addEventListener("click", () => {
  grid = !grid;
  applyChrome();
  persistSoon();
  requestRender();
});
$("#action-snap").addEventListener("click", () => {
  snap = !snap;
  applyChrome();
  persistSoon();
});
$("#action-clear").addEventListener("click", () => {
  closeMenu();
  if (!elements.length) return;
  $("#reset-dialog").showModal();
});
$("#reset-dialog").addEventListener("close", () => {
  if ($("#reset-dialog").returnValue !== "ok") return;
  beginChange();
  elements = [];
  selected = new Set();
  endChange();
  syncProperties();
  requestRender();
});

document.querySelectorAll("[data-theme]").forEach((button) => {
  button.addEventListener("click", () => {
    theme = button.dataset.theme;
    applyChrome();
    persistSoon();
  });
});
$("#language").addEventListener("change", () => {
  language = $("#language").value;
  applyChrome();
  persistSoon();
});
$("#mark-input").addEventListener("input", () => {
  mark = $("#mark-input").value;
  persistSoon();
  requestRender();
});

function buildPaperSwatches() {
  const host = $("#paper-swatches");
  for (const color of PAPERS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.paper = color;
    button.style.background = color;
    button.setAttribute("aria-label", color);
    button.addEventListener("click", () => choosePaper(color));
    host.append(button);
  }
  const custom = document.createElement("input");
  custom.type = "color";
  custom.value = paper;
  custom.id = "paper-custom";
  custom.setAttribute("aria-label", "Custom paper");
  custom.addEventListener("input", () => choosePaper(custom.value));
  host.append(custom);
}

function choosePaper(color) {
  paper = color;
  applyChrome();
  persistSoon();
  requestRender();
}

function openExport() {
  $("#export-dialog").showModal();
}

function renderedPicture() {
  const bounds = sceneBounds(elements) || { x: -200, y: -120, width: 400, height: 240 };
  const pad = 28;
  const scale = 2;
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = Math.max(1, Math.ceil((bounds.width + pad * 2) * scale));
  exportCanvas.height = Math.max(1, Math.ceil((bounds.height + pad * 2) * scale));
  const exportContext = exportCanvas.getContext("2d");
  const exportRough = rough.canvas(exportCanvas);
  exportContext.fillStyle = paper;
  exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportContext.setTransform(scale, 0, 0, scale, (pad - bounds.x) * scale, (pad - bounds.y) * scale);
  for (const element of elements) drawElement(exportContext, exportRough, element);
  return exportCanvas;
}

async function passSnapshot() {
  try {
    await navigator.clipboard.writeText(serializeScene(elements));
    toast(phrases().copied);
  } catch {
    toast(phrases().copyFail);
  }
}

async function pasteSnapshot() {
  try {
    replaceScene(parseScene(await navigator.clipboard.readText()));
    toast(phrases().pasted);
  } catch {
    toast(phrases().pasteFail);
  }
}

function commandItems() {
  const copy = phrases();
  return [
    { name: copy.open, hint: "Ctrl+O", run: () => fileInput.click() },
    { name: copy.save, hint: "Ctrl+S", run: saveFile },
    { name: copy.export, hint: "Ctrl+Shift+E", run: openExport },
    { name: copy.pass, run: passSnapshot },
    { name: copy.paste, run: pasteSnapshot },
    { name: copy.find, hint: "Ctrl+F", run: openFind },
    { name: copy.help, hint: "?", run: () => helpDialog.showModal() },
    { name: copy.fresh, run: () => elements.length && $("#reset-dialog").showModal() },
    { name: copy.grid, run: () => { grid = !grid; applyChrome(); persistSoon(); requestRender(); } },
    { name: copy.snap, run: () => { snap = !snap; applyChrome(); persistSoon(); } },
    { name: copy.fit, run: zoomToFit },
    ...TOOLS.map((item) => ({ name: item.label, hint: item.title, run: () => setTool(item.id) })),
  ];
}

function fillChoiceList(host, items, onPick) {
  host.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "credit";
    empty.textContent = phrases().noMatches;
    host.append(empty);
    return;
  }
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    const name = document.createElement("span");
    name.textContent = item.name;
    button.append(name);
    if (item.hint) {
      const hint = document.createElement("span");
      hint.textContent = item.hint;
      button.append(hint);
    }
    button.addEventListener("click", () => onPick(item));
    host.append(button);
  }
}

function openPalette() {
  const dialog = $("#palette-dialog");
  const input = $("#palette-input");
  const renderList = () => {
    const query = input.value.trim().toLowerCase();
    fillChoiceList($("#palette-list"), commandItems().filter((item) => item.name.toLowerCase().includes(query)), (item) => {
      dialog.close();
      item.run();
    });
  };
  input.oninput = renderList;
  input.onkeydown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const first = $("#palette-list button");
    if (first) first.click();
  };
  dialog.showModal();
  input.value = "";
  renderList();
  input.focus();
}

function focusElement(element) {
  const box = boxOf(element);
  panX = canvas.clientWidth / 2 - (box.x + box.width / 2) * zoom;
  panY = canvas.clientHeight / 2 - (box.y + box.height / 2) * zoom;
  selected = new Set([element.id]);
  syncProperties();
  requestRender();
}

function openFind() {
  const dialog = $("#find-dialog");
  const input = $("#find-input");
  const renderList = () => {
    const query = input.value.trim().toLowerCase();
    const matches = elements
      .filter((element) => query && String(element.text || "").toLowerCase().includes(query))
      .map((element) => ({ name: element.text.trim() || element.type, hint: element.type, element }));
    fillChoiceList($("#find-results"), matches, (item) => {
      dialog.close();
      focusElement(item.element);
    });
  };
  input.oninput = renderList;
  input.onkeydown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const first = $("#find-results button");
    if (first) first.click();
  };
  dialog.showModal();
  input.value = "";
  renderList();
  input.focus();
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files && fileInput.files[0];
  fileInput.value = "";
  if (!file) return;
  try {
    replaceScene(parseScene(await file.text()));
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Could not open that file.");
  }
});

$("#zoom-out").addEventListener("click", () => zoomAt(zoom / 1.1, canvas.clientWidth / 2, canvas.clientHeight / 2));
$("#zoom-in").addEventListener("click", () => zoomAt(zoom * 1.1, canvas.clientWidth / 2, canvas.clientHeight / 2));
zoomReset.addEventListener("click", () => zoomAt(1, canvas.clientWidth / 2, canvas.clientHeight / 2));
undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
$("#export-png").addEventListener("click", exportPng);
$("#export-copy").addEventListener("click", async () => {
  try {
    const blob = await new Promise((resolve) => renderedPicture().toBlob(resolve, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    toast(phrases().pictureCopied);
  } catch {
    toast(phrases().copyFail);
  }
});
$("#dismiss-note").addEventListener("click", () => {
  storageNote.hidden = true;
  localStorage.setItem(NOTE_KEY, "1");
});

function buildHelp() {
  const list = $("#help-list");
  const rows = [
    ["Keep tool", "Q"],
    ...TOOLS.map((item) => [item.label, item.title]),
    ["Select all", "Ctrl+A"],
    ["Duplicate", "Ctrl+D"],
    ["Undo / redo", "Ctrl+Z / Ctrl+Shift+Z"],
    ["Nudge", "Arrow keys"],
    ["Keep a copy / open", "Ctrl+S / Ctrl+O"],
    ["Jump bar", "Ctrl+/"],
    ["Look up words", "Ctrl+F"],
    ["Picture export", "Ctrl+Shift+E"],
    ["Pan", "Space, middle mouse, or wheel"],
    ["Zoom", "Ctrl+wheel"],
  ];
  for (const [label, shortcut] of rows) {
    const name = document.createElement("strong");
    name.textContent = label;
    const keys = document.createElement("span");
    keys.textContent = shortcut;
    list.append(name, keys);
  }
}

window.__drawexcal = {
  getState() {
    return {
      elements: clone(elements),
      tool,
      zoom,
      selected: [...selected],
      grid,
    };
  },
};

load();
buildTools();
buildProperties();
buildPaperSwatches();
buildHelp();
applyChrome();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (theme === "device") applyChrome();
});
syncProperties();
syncHistory();
resizeCanvas();
if (elements.length) zoomToFit();
else centerView();
window.addEventListener("resize", resizeCanvas);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestRender);
