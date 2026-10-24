import { clamp, createElement, normalizeBox } from "./model.js";

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml";

const bitmapCache = new Map();
const pendingLoads = new Map();

function isImageFile(file) {
  return Boolean(file) && String(file.type || "").startsWith("image/");
}

export function displaySize(width, height, maxEdge = 480) {
  const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
  return {
    width: Math.max(24, Math.round(width * scale)),
    height: Math.max(24, Math.round(height * scale)),
  };
}

async function readBitmap(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* SVG and some GIF frames fall through. */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error("Could not read that image."));
      node.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function dataUrlBytes(src) {
  const comma = src.indexOf(",");
  if (comma < 0) return src.length;
  return Math.ceil((src.length - comma - 1) * 0.75);
}

export async function encodeImageFile(file, options = {}) {
  if (!isImageFile(file)) throw new Error("That file is not an image.");
  const maxEdge = options.maxEdge || 1600;
  const quality = options.quality ?? 0.82;
  const maxBytes = options.maxBytes || 900000;
  const bitmap = await readBitmap(file);
  const naturalWidth = bitmap.width || 1;
  const naturalHeight = bitmap.height || 1;
  let edge = Math.min(maxEdge, Math.max(naturalWidth, naturalHeight));
  let src = "";
  let width = 0;
  let height = 0;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const scale = Math.min(1, edge / Math.max(naturalWidth, naturalHeight, 1));
    width = Math.max(1, Math.round(naturalWidth * scale));
    height = Math.max(1, Math.round(naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0, width, height);
    const keepAlpha = file.type === "image/png" || file.type === "image/gif" || file.type === "image/svg+xml";
    src = keepAlpha && attempt === 0
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", clamp(quality - attempt * 0.08, 0.5, 0.92));
    if (dataUrlBytes(src) <= maxBytes) break;
    edge = Math.round(edge * 0.72);
  }

  if (bitmap.close) bitmap.close();
  if (!src || dataUrlBytes(src) > maxBytes * 1.35) {
    throw new Error("That image is too large to keep in this browser.");
  }

  bitmapCache.set(src, (() => {
    const node = new Image();
    node.src = src;
    return node;
  })());

  return {
    src,
    width,
    height,
    naturalWidth,
    naturalHeight,
  };
}

export function makeImageElement(data, x, y, style = {}, maxEdge = 480) {
  const size = displaySize(data.width, data.height, maxEdge);
  const element = createElement("image", x, y, style);
  element.src = data.src;
  element.width = size.width;
  element.height = size.height;
  element.naturalWidth = data.naturalWidth;
  element.naturalHeight = data.naturalHeight;
  return element;
}

export async function filesToImageElements(files, origin, style = {}, maxEdge = 480) {
  const list = [...(files || [])].filter(isImageFile);
  const made = [];
  let offset = 0;
  for (const file of list) {
    const data = await encodeImageFile(file);
    made.push(makeImageElement(data, origin.x + offset, origin.y + offset, style, maxEdge));
    offset += 28;
  }
  return made;
}

export function pickImageFiles({ multiple = true } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = IMAGE_ACCEPT;
    input.multiple = multiple;
    input.addEventListener("change", () => resolve([...(input.files || [])]));
    input.addEventListener("cancel", () => resolve([]));
    input.click();
  });
}

export async function clipboardImageFiles() {
  if (!navigator.clipboard || !navigator.clipboard.read) return [];
  try {
    const items = await navigator.clipboard.read();
    const files = [];
    for (const item of items) {
      const type = item.types.find((entry) => entry.startsWith("image/"));
      if (!type) continue;
      const blob = await item.getType(type);
      const extension = type.split("/")[1] || "png";
      files.push(new File([blob], `paste.${extension}`, { type }));
    }
    return files;
  } catch {
    return [];
  }
}

export function loadBitmap(src) {
  if (!src) return Promise.reject(new Error("Missing image."));
  if (bitmapCache.has(src)) return Promise.resolve(bitmapCache.get(src));
  if (pendingLoads.has(src)) return pendingLoads.get(src);
  const task = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      bitmapCache.set(src, image);
      pendingLoads.delete(src);
      resolve(image);
    };
    image.onerror = () => {
      pendingLoads.delete(src);
      reject(new Error("Could not load image."));
    };
    image.src = src;
  });
  pendingLoads.set(src, task);
  return task;
}

export function paintImage(context, element, onReady) {
  if (element.type !== "image" || !element.src) return;
  const box = normalizeBox(element.x, element.y, element.width, element.height);
  if (box.width < 1 || box.height < 1) return;
  const cached = bitmapCache.get(element.src);
  if (cached && cached.complete) {
    context.drawImage(cached, box.x, box.y, box.width, box.height);
    return;
  }
  context.save();
  context.fillStyle = "rgba(30, 30, 36, 0.06)";
  context.fillRect(box.x, box.y, box.width, box.height);
  context.strokeStyle = "rgba(30, 30, 36, 0.28)";
  context.lineWidth = 1.5;
  context.strokeRect(box.x + 0.75, box.y + 0.75, Math.max(0, box.width - 1.5), Math.max(0, box.height - 1.5));
  context.restore();
  loadBitmap(element.src)
    .then(() => {
      if (typeof onReady === "function") onReady();
    })
    .catch(() => {});
}

export function dataTransferImageFiles(transfer) {
  if (!transfer) return [];
  const fromFiles = [...(transfer.files || [])].filter(isImageFile);
  if (fromFiles.length) return fromFiles;
  const items = [...(transfer.items || [])];
  const files = [];
  for (const item of items) {
    if (item.kind !== "file" || !String(item.type || "").startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return files;
}
