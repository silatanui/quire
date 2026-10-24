import { DEFAULT_STYLE, clone, createElement, uid } from "./model.js";

export const SHEET = { width: 1280, height: 720 };

const INK = "#1e1e1e";
const QUIET = "#5c564c";
const PAPER = "#fff6d8";

function clip(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function textBlock(text, x, y, width, fontSize, role, color = INK) {
  const element = createElement("text", x, y, {
    ...DEFAULT_STYLE,
    strokeColor: color,
    fontSize,
    roughness: 0,
  });
  element.text = text;
  element.width = width;
  element.role = role;
  element.height = Math.max(fontSize * 1.35, String(text).split("\n").length * fontSize * 1.25);
  return element;
}

function rule(x, y, width) {
  const element = createElement("rectangle", x, y, {
    ...DEFAULT_STYLE,
    strokeColor: INK,
    backgroundColor: INK,
    fillStyle: "solid",
    strokeWidth: 1,
    roughness: 2,
  });
  element.width = width;
  element.height = 5;
  element.role = "rule";
  return element;
}

function card(x, y, width, height) {
  const element = createElement("rectangle", x, y, {
    ...DEFAULT_STYLE,
    strokeColor: "#2a2620",
    backgroundColor: PAPER,
    fillStyle: "hachure",
    strokeWidth: 1,
    roughness: 1,
    roundness: 1,
  });
  element.width = width;
  element.height = height;
  element.role = "card";
  return element;
}

function listBlock(items, x, y, width, fontSize, listStyle = "bullet") {
  const lines = items.filter((item) => String(item || "").trim());
  const element = createElement("list", x, y, {
    ...DEFAULT_STYLE,
    strokeColor: INK,
    backgroundColor: "transparent",
    fontSize,
    roughness: 0,
  });
  element.items = lines.length ? lines : [""];
  element.listStyle = listStyle;
  element.role = "list";
  element.align = "left";
  element.width = width;
  element.height = Math.max(fontSize * 1.45, element.items.length * fontSize * 1.45);
  return element;
}

export function createList(items, x = 80, y = 250, width = 980, fontSize = 30, listStyle = "bullet") {
  return listBlock(items, x, y, width, fontSize, listStyle);
}

function pointsLayout(spec, leftWidth) {
  const elements = [];
  let y = 64;
  if (spec.kicker) {
    elements.push(textBlock(spec.kicker, 80, y, leftWidth, 22, "kicker", QUIET));
    y = 108;
  }
  elements.push(textBlock(spec.heading, 80, y, leftWidth, 48, "heading"));
  elements.push(rule(80, y + 78, 88));
  if (spec.lines.length) elements.push(listBlock(spec.lines, 80, y + 118, leftWidth, 30));
  return elements;
}

export function gatherLists(elements) {
  if (!Array.isArray(elements)) return [];
  const next = [];
  let index = 0;
  const part = (element) => element && (element.role === "line" || element.role === "mark");
  while (index < elements.length) {
    if (!part(elements[index])) {
      next.push(elements[index]);
      index += 1;
      continue;
    }
    const chunk = [];
    while (index < elements.length && part(elements[index])) {
      chunk.push(elements[index]);
      index += 1;
    }
    const lines = chunk.filter((element) => element.role === "line" && element.type === "text");
    const marks = chunk.filter((element) => element.role === "mark");
    if (!lines.length || (lines.length === 1 && !marks.length)) {
      next.push(...chunk);
      continue;
    }
    const first = lines[0];
    const left = Math.min(first.x, ...marks.map((mark) => mark.x));
    const right = Math.max(...lines.map((line) => line.x + line.width));
    const fontSize = first.fontSize || 30;
    const items = lines.map((line) => line.text || "");
    next.push({
      ...first,
      id: first.id,
      type: "list",
      role: "list",
      x: left,
      y: Math.min(...lines.map((line) => line.y)),
      width: Math.max(80, right - left),
      height: Math.max(fontSize * 1.45, items.length * fontSize * 1.45),
      items,
      listStyle: marks.length ? "bullet" : "plain",
      align: first.align || "left",
      text: "",
    });
  }
  return next;
}

export function sheetFromSpec(spec) {
  const role = spec.role;
  let elements = [];
  if (role === "open") {
    const y = spec.kicker ? 200 : 230;
    if (spec.kicker) elements.push(textBlock(spec.kicker, 80, 150, 1000, 24, "kicker", QUIET));
    elements.push(textBlock(spec.heading, 80, y, 1080, 64, "heading"));
    if (spec.lines[0]) elements.push(textBlock(spec.lines[0], 80, y + 130, 980, 32, "line", QUIET));
  } else if (role === "close") {
    elements.push(textBlock(spec.heading, 80, 230, 1080, 60, "heading"));
    elements.push(rule(80, 330, 88));
    if (spec.lines[0]) elements.push(textBlock(spec.lines[0], 80, 370, 980, 32, "line"));
  } else if (role === "pair") {
    elements = pointsLayout(spec, 560);
    if (spec.aside) {
      elements.push(card(700, 230, 490, 360));
      elements.push(textBlock(spec.aside, 728, 262, 436, 28, "aside"));
    }
  } else {
    elements = pointsLayout(spec, 1080);
  }
  return {
    id: uid(),
    note: spec.note,
    elements,
  };
}

export function normalizeTalk(raw) {
  if (!raw || typeof raw !== "object") throw new Error("The talk came back empty.");
  const source = Array.isArray(raw.sheets) ? raw.sheets : Array.isArray(raw.slides) ? raw.slides : [];
  if (!source.length) throw new Error("The talk came back with no sheets.");
  const sheets = source.slice(0, 12).map((sheet, index) => {
    const lines = sheet.lines || sheet.bullets || sheet.points || [];
    let role = ["open", "points", "pair", "close"].includes(sheet.role) ? sheet.role : "";
    if (!role) role = index === 0 ? "open" : "points";
    return {
      role,
      kicker: clip(sheet.kicker, 42),
      heading: clip(sheet.heading || sheet.title, 90) || `Sheet ${index + 1}`,
      lines: (Array.isArray(lines) ? lines : []).map((line) => clip(line, 110)).filter(Boolean).slice(0, 5),
      aside: clip(sheet.aside, 220),
      note: clip(sheet.note, 400),
    };
  });
  return {
    title: clip(raw.title, 80) || "Untitled talk",
    sheets,
  };
}

export function deckFromTalk(raw) {
  const talk = normalizeTalk(raw);
  return {
    title: talk.title,
    index: 0,
    chrome: defaultChrome(),
    sheets: talk.sheets.map((spec) => withChrome(sheetFromSpec(spec))),
  };
}

export const SHEET_TEMPLATES = [
  { id: "none", label: "Blank" },
  { id: "title", label: "Title" },
  { id: "bullets", label: "Bullets" },
  { id: "split", label: "Split" },
  { id: "closing", label: "Closing" },
];

export function defaultChrome() {
  return {
    header: "",
    footer: "",
    showHeader: false,
    showFooter: false,
    template: "none",
  };
}

function withChrome(sheet, chrome = {}) {
  const base = defaultChrome();
  return {
    ...sheet,
    background: sheet.background || "plain",
    backgroundOpacity: sheet.backgroundOpacity ?? 100,
    header: clip(chrome.header != null ? chrome.header : (sheet.header ?? base.header), 80),
    footer: clip(chrome.footer != null ? chrome.footer : (sheet.footer ?? base.footer), 80),
    showHeader: chrome.showHeader != null ? Boolean(chrome.showHeader) : Boolean(sheet.showHeader),
    showFooter: chrome.showFooter != null ? Boolean(chrome.showFooter) : Boolean(sheet.showFooter),
    template: chrome.template || sheet.template || base.template,
  };
}

export function sheetFromTemplate(templateId = "none", chrome = {}) {
  const id = SHEET_TEMPLATES.some((item) => item.id === templateId) ? templateId : "none";
  let sheet;
  if (id === "none") {
    sheet = { id: uid(), note: "", elements: [] };
  } else if (id === "title") {
    sheet = sheetFromSpec({
      role: "open",
      kicker: "Talk title",
      heading: "Say the big idea",
      lines: ["One line under the title."],
      aside: "",
      note: "",
    });
  } else if (id === "split") {
    sheet = sheetFromSpec({
      role: "pair",
      kicker: "Section",
      heading: "Two sides of it",
      lines: ["Point on the left", "Another point"],
      aside: "A note or sketch cue on the right.",
      note: "",
    });
  } else if (id === "closing") {
    sheet = sheetFromSpec({
      role: "close",
      kicker: "",
      heading: "What to do next",
      lines: ["One clear ask."],
      aside: "",
      note: "",
    });
  } else {
    sheet = sheetFromSpec({
      role: "points",
      kicker: "Agenda",
      heading: "What we cover",
      lines: ["First point", "Second point", "Third point"],
      aside: "",
      note: "",
    });
  }
  return withChrome(sheet, { ...chrome, template: id });
}

export function blankSheet(heading = "New sheet") {
  return withChrome(sheetFromSpec({
    role: "points",
    kicker: "",
    heading,
    lines: ["A line to say out loud."],
    aside: "",
    note: "",
  }), { template: "bullets" });
}

export function blankDeck() {
  return {
    title: "Untitled talk",
    index: 0,
    chrome: defaultChrome(),
    sheets: [blankSheet("A talk with no title yet")],
  };
}

export function reorderSheets(sheets, index, delta) {
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= sheets.length) return { sheets, index };
  const next = sheets.slice();
  const [sheet] = next.splice(index, 1);
  next.splice(nextIndex, 0, sheet);
  return { sheets: next, index: nextIndex };
}

export function duplicateSheet(sheet) {
  const copy = clone(sheet);
  copy.id = uid();
  copy.elements = (copy.elements || []).map((element) => ({
    ...element,
    id: uid(),
    seed: Math.floor(Math.random() * 2 ** 31),
  }));
  return copy;
}

export function serializeFolio(deck) {
  return JSON.stringify({
    type: "quire-folio",
    version: 1,
    title: deck.title,
    chrome: { ...defaultChrome(), ...(deck.chrome || {}) },
    sheets: deck.sheets,
  }, null, 2);
}

export function parseFolio(text) {
  const data = JSON.parse(text);
  if (!data || data.type !== "quire-folio" || !Array.isArray(data.sheets) || !data.sheets.length) {
    throw new Error("This file is not a Quire folio.");
  }
  const chrome = { ...defaultChrome(), ...(data.chrome && typeof data.chrome === "object" ? data.chrome : {}) };
  chrome.header = clip(chrome.header, 80);
  chrome.footer = clip(chrome.footer, 80);
  const sheets = data.sheets.slice(0, 40).map((sheet) => withChrome({
    id: typeof sheet.id === "string" && sheet.id ? sheet.id : uid(),
    note: clip(sheet.note, 800),
    elements: Array.isArray(sheet.elements) ? sheet.elements.map((element) => ({ ...element })) : [],
    background: typeof sheet.background === "string" ? sheet.background : "plain",
    backgroundOpacity: Number.isFinite(Number(sheet.backgroundOpacity)) ? Number(sheet.backgroundOpacity) : 100,
    header: sheet.header,
    footer: sheet.footer,
    showHeader: sheet.showHeader,
    showFooter: sheet.showFooter,
    template: sheet.template,
  }, {
    header: sheet.header,
    footer: sheet.footer,
    showHeader: sheet.showHeader,
    showFooter: sheet.showFooter,
    template: sheet.template,
  }));
  return {
    title: clip(data.title, 80) || "Untitled talk",
    index: 0,
    chrome,
    sheets,
  };
}

export function sheetHeading(sheet) {
  const heading = (sheet.elements || []).find((element) => element.role === "heading" && element.text);
  if (heading) return heading.text;
  const text = (sheet.elements || []).find((element) => element.type === "text" && element.text);
  return text ? text.text : "Sheet";
}
