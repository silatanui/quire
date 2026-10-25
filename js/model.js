export const DEFAULT_STYLE = {
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  fillStyle: "hachure",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  fontSize: 24,
  fontFamily: "round",
  roundness: 0,
  textFill: "transparent",
  borderColor: "transparent",
};

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createElement(type, x, y, style = DEFAULT_STYLE) {
  const element = {
    id: uid(),
    type,
    x,
    y,
    width: 0,
    height: 0,
    seed: Math.floor(Math.random() * 2 ** 31),
    text: "",
    strokeColor: style.strokeColor,
    backgroundColor: style.backgroundColor,
    fillStyle: style.fillStyle,
    strokeWidth: style.strokeWidth,
    strokeStyle: style.strokeStyle,
    roughness: style.roughness,
    opacity: style.opacity,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily || "round",
    roundness: style.roundness || 0,
  };
  if (type === "line" || type === "arrow" || type === "elbow" || type === "curve" || type === "freedraw") {
    element.points = [{ x: 0, y: 0 }];
  }
  if (type === "sticky") {
    element.width = 200;
    element.height = 180;
    element.fillStyle = "solid";
    if (!element.backgroundColor || element.backgroundColor === "transparent") {
      element.backgroundColor = "#fff3bf";
    }
  }
  if (type === "text") {
    element.width = 240;
    element.height = element.fontSize * 1.25;
    element.textFill = style.textFill || "transparent";
    element.borderColor = style.borderColor || "transparent";
  }
  if (type === "image") {
    element.width = 240;
    element.height = 180;
    element.src = "";
    element.naturalWidth = 0;
    element.naturalHeight = 0;
    element.strokeColor = "transparent";
    element.backgroundColor = "transparent";
  }
  return element;
}

export function normalizeBox(x, y, width, height) {
  if (width < 0) {
    x += width;
    width = -width;
  }
  if (height < 0) {
    y += height;
    height = -height;
  }
  return { x, y, width, height };
}

export function constrainBox(x, y, width, height) {
  const size = Math.max(Math.abs(width), Math.abs(height));
  return {
    width: Math.sign(width || 1) * size,
    height: Math.sign(height || 1) * size,
  };
}

export function absPoints(element) {
  if (element.points && element.points.length) {
    return element.points.map((point) => ({
      x: element.x + point.x,
      y: element.y + point.y,
    }));
  }
  return [
    { x: element.x, y: element.y },
    { x: element.x + element.width, y: element.y + element.height },
  ];
}

export function withAbsPoints(element, points) {
  const origin = points[0] || { x: element.x, y: element.y };
  const end = points[points.length - 1] || origin;
  return {
    ...element,
    x: origin.x,
    y: origin.y,
    width: end.x - origin.x,
    height: end.y - origin.y,
    points: points.map((point) => ({ x: point.x - origin.x, y: point.y - origin.y })),
  };
}

export function isArrowType(type) {
  return type === "arrow" || type === "elbow" || type === "curve";
}

export function isLinearType(type) {
  return type === "line" || type === "freedraw" || isArrowType(type);
}

export function boxOf(element) {
  if (isLinearType(element.type)) {
    const points = absPoints(element);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    if (!points.length || minX === Infinity) {
      return { x: element.x, y: element.y, width: 0, height: 0 };
    }
    return { x: minX, y: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) };
  }
  return normalizeBox(element.x, element.y, element.width, element.height);
}

export function sceneBounds(elements) {
  if (!elements.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const element of elements) {
    const box = worldBounds(element);
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function diamondPoly(box) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return [
    { x: cx, y: box.y },
    { x: box.x + box.width, y: cy },
    { x: cx, y: box.y + box.height },
    { x: box.x, y: cy },
  ];
}

export function trianglePoly(box) {
  return [
    { x: box.x + box.width / 2, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height },
  ];
}

export function trapezoidPoly(box) {
  const inset = Math.max(0, box.width * 0.18);
  return [
    { x: box.x + inset, y: box.y },
    { x: box.x + box.width - inset, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height },
  ];
}

export function parallelogramPoly(box) {
  const skew = Math.max(0, box.width * 0.22);
  return [
    { x: box.x + skew, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width - skew, y: box.y + box.height },
    { x: box.x, y: box.y + box.height },
  ];
}

export function regularPoly(box, sides, rotation = -Math.PI / 2) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rx = Math.max(0.5, box.width / 2);
  const ry = Math.max(0.5, box.height / 2);
  const points = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + (index * Math.PI * 2) / sides;
    points.push({ x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
  }
  return points;
}

export function starPoly(box, tips = 5, inner = 0.42) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rx = Math.max(0.5, box.width / 2);
  const ry = Math.max(0.5, box.height / 2);
  const points = [];
  for (let index = 0; index < tips * 2; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / tips;
    const scale = index % 2 === 0 ? 1 : inner;
    points.push({ x: cx + Math.cos(angle) * rx * scale, y: cy + Math.sin(angle) * ry * scale });
  }
  return points;
}

export function closedShapePoly(element) {
  const box = boxOf(element);
  if (element.type === "diamond") return diamondPoly(box);
  if (element.type === "triangle") return trianglePoly(box);
  if (element.type === "trapezoid") return trapezoidPoly(box);
  if (element.type === "parallelogram") return parallelogramPoly(box);
  if (element.type === "pentagon") return regularPoly(box, 5);
  if (element.type === "hexagon") return regularPoly(box, 6);
  if (element.type === "star") return starPoly(box);
  return null;
}

export function elbowPoints(start, end) {
  const midX = (start.x + end.x) / 2;
  return [
    { x: start.x, y: start.y },
    { x: midX, y: start.y },
    { x: midX, y: end.y },
    { x: end.x, y: end.y },
  ];
}

export function curveControl(start, end) {
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const offset = len * 0.35;
  return {
    x: mx - (dy / len) * offset,
    y: my + (dx / len) * offset,
  };
}

export function connectorPoints(element) {
  const points = absPoints(element);
  if (points.length < 2) return points;
  const start = points[0];
  const end = points[points.length - 1];
  if (element.type === "elbow") return elbowPoints(start, end);
  if (element.type === "curve") return [start, curveControl(start, end), end];
  return points;
}

function sampleQuadratic(a, b, c, steps = 16) {
  const out = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const u = 1 - t;
    out.push({
      x: u * u * a.x + 2 * u * t * b.x + t * t * c.x,
      y: u * u * a.y + 2 * u * t * b.y + t * t * c.y,
    });
  }
  return out;
}

export function strokePoints(element) {
  if (element.type === "curve") {
    const points = absPoints(element);
    if (points.length < 2) return points;
    const start = points[0];
    const end = points[points.length - 1];
    return sampleQuadratic(start, curveControl(start, end), end);
  }
  if (element.type === "elbow") return connectorPoints(element);
  return absPoints(element);
}

export function distToSegment(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - a.x) * dx + (py - a.y) * dy) / len2, 0, 1);
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function elementAngle(element) {
  return Number(element && element.angle) || 0;
}

export function elementCenter(element) {
  const box = boxOf(element);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export function localToWorld(element, x, y) {
  const center = elementCenter(element);
  let lx = x - center.x;
  let ly = y - center.y;
  if (element && element.flipX) lx = -lx;
  if (element && element.flipY) ly = -ly;
  const angle = elementAngle(element);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: center.x + lx * cos - ly * sin,
    y: center.y + lx * sin + ly * cos,
  };
}

export function worldToLocal(element, x, y) {
  const center = elementCenter(element);
  let lx = x - center.x;
  let ly = y - center.y;
  const angle = elementAngle(element);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  let rx = lx * cos - ly * sin;
  let ry = lx * sin + ly * cos;
  if (element && element.flipX) rx = -rx;
  if (element && element.flipY) ry = -ry;
  return { x: center.x + rx, y: center.y + ry };
}

export function applyElementTransform(context, element) {
  const center = elementCenter(element);
  context.translate(center.x, center.y);
  context.rotate(elementAngle(element));
  context.scale(element && element.flipX ? -1 : 1, element && element.flipY ? -1 : 1);
  context.translate(-center.x, -center.y);
}

export function hasTransform(element) {
  return Boolean(elementAngle(element) || (element && element.flipX) || (element && element.flipY));
}

export function rotatedCorners(element) {
  const box = boxOf(element);
  return [
    localToWorld(element, box.x, box.y),
    localToWorld(element, box.x + box.width, box.y),
    localToWorld(element, box.x + box.width, box.y + box.height),
    localToWorld(element, box.x, box.y + box.height),
  ];
}

export function worldBounds(element) {
  if (!hasTransform(element)) return boxOf(element);
  const corners = rotatedCorners(element);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const corner of corners) {
    minX = Math.min(minX, corner.x);
    minY = Math.min(minY, corner.y);
    maxX = Math.max(maxX, corner.x);
    maxY = Math.max(maxY, corner.y);
  }
  return { x: minX, y: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) };
}

export function hitsElement(element, x, y, pad) {
  const local = worldToLocal(element, x, y);
  const px = local.x;
  const py = local.y;
  const strokePad = pad + (element.strokeWidth || 1);
  if (isLinearType(element.type)) {
    const points = strokePoints(element);
    for (let i = 1; i < points.length; i++) {
      if (distToSegment(px, py, points[i - 1], points[i]) <= strokePad) return true;
    }
    return points.length === 1 && Math.hypot(px - points[0].x, py - points[0].y) <= strokePad;
  }

  const box = boxOf(element);
  if (element.type === "ellipse") {
    const rx = box.width / 2;
    const ry = box.height / 2;
    if (rx < 0.5 || ry < 0.5) return false;
    const nx = (px - (box.x + rx)) / (rx + pad);
    const ny = (py - (box.y + ry)) / (ry + pad);
    return nx * nx + ny * ny <= 1;
  }

  const poly = closedShapePoly(element);
  if (poly) return pointInPoly(px, py, poly);

  return (
    px >= box.x - pad &&
    py >= box.y - pad &&
    px <= box.x + box.width + pad &&
    py <= box.y + box.height + pad
  );
}

export function hitTest(elements, x, y, pad) {
  for (let i = elements.length - 1; i >= 0; i--) {
    if (hitsElement(elements[i], x, y, pad)) return elements[i];
  }
  return null;
}

export function handlesFor(element) {
  if (isLinearType(element.type)) {
    const points = absPoints(element);
    return [
      { id: "start", ...localToWorld(element, points[0].x, points[0].y) },
      { id: "end", ...localToWorld(element, points[points.length - 1].x, points[points.length - 1].y) },
    ];
  }
  const box = boxOf(element);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const locals = [
    { id: "nw", x: box.x, y: box.y },
    { id: "n", x: cx, y: box.y },
    { id: "ne", x: box.x + box.width, y: box.y },
    { id: "e", x: box.x + box.width, y: cy },
    { id: "se", x: box.x + box.width, y: box.y + box.height },
    { id: "s", x: cx, y: box.y + box.height },
    { id: "sw", x: box.x, y: box.y + box.height },
    { id: "w", x: box.x, y: cy },
  ];
  const handles = locals.map((handle) => ({ id: handle.id, ...localToWorld(element, handle.x, handle.y) }));
  const lift = Math.max(28, Math.min(box.width, box.height) * 0.18 + 18);
  handles.push({ id: "rotate", ...localToWorld(element, cx, box.y - lift) });
  return handles;
}

export function hitHandle(element, x, y, pad) {
  for (const handle of handlesFor(element)) {
    const reach = handle.id === "rotate" ? pad * 1.35 : pad;
    if (Math.abs(x - handle.x) <= reach && Math.abs(y - handle.y) <= reach) return handle.id;
  }
  return null;
}

export function rotateElements(elements, ids, delta, snap = false) {
  const selected = new Set(ids);
  return elements.map((element) => {
    if (!selected.has(element.id)) return element;
    let angle = elementAngle(element) + delta;
    if (snap) {
      const step = Math.PI / 12;
      angle = Math.round(angle / step) * step;
    }
    return { ...element, angle };
  });
}

export function flipElements(elements, ids, axis) {
  const selected = new Set(ids);
  return elements.map((element) => {
    if (!selected.has(element.id)) return element;
    if (axis === "h") return { ...element, flipX: !element.flipX };
    if (axis === "v") return { ...element, flipY: !element.flipY };
    return element;
  });
}

export function resizeBox(start, handle, pointer, keepRatio) {
  let x1 = start.x;
  let y1 = start.y;
  let x2 = start.x + start.width;
  let y2 = start.y + start.height;
  const movesW = handle.includes("w");
  const movesE = handle.includes("e");
  const movesN = handle.includes("n");
  const movesS = handle.includes("s");
  if (movesW) x1 = pointer.x;
  if (movesE) x2 = pointer.x;
  if (movesN) y1 = pointer.y;
  if (movesS) y2 = pointer.y;

  if (keepRatio && start.width > 0 && start.height > 0) {
    const ratio = start.width / start.height;
    if (movesE || movesW) {
      const width = x2 - x1;
      const height = Math.sign(y2 - y1 || 1) * Math.abs(width / ratio);
      if (movesN && !movesS) y1 = y2 - height;
      else y2 = y1 + height;
    } else if (movesN || movesS) {
      const height = y2 - y1;
      const width = Math.sign(x2 - x1 || 1) * Math.abs(height * ratio);
      if (movesW && !movesE) x1 = x2 - width;
      else x2 = x1 + width;
    }
  }
  return normalizeBox(x1, y1, x2 - x1, y2 - y1);
}

export function translate(element, dx, dy) {
  return { ...element, x: element.x + dx, y: element.y + dy };
}

export function snapAngle(x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const step = Math.PI / 12;
  const snapped = Math.round(angle / step) * step;
  const distance = Math.hypot(x2 - x1, y2 - y1);
  return {
    x: x1 + Math.cos(snapped) * distance,
    y: y1 + Math.sin(snapped) * distance,
  };
}

export function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function reorder(elements, ids, mode) {
  const selected = new Set(ids);
  if (mode === "front") {
    return [...elements.filter((element) => !selected.has(element.id)), ...elements.filter((element) => selected.has(element.id))];
  }
  if (mode === "back") {
    return [...elements.filter((element) => selected.has(element.id)), ...elements.filter((element) => !selected.has(element.id))];
  }
  const next = elements.slice();
  if (mode === "forward") {
    for (let i = next.length - 2; i >= 0; i--) {
      if (selected.has(next[i].id) && !selected.has(next[i + 1].id)) {
        [next[i], next[i + 1]] = [next[i + 1], next[i]];
      }
    }
  }
  if (mode === "backward") {
    for (let i = 1; i < next.length; i++) {
      if (selected.has(next[i].id) && !selected.has(next[i - 1].id)) {
        [next[i - 1], next[i]] = [next[i], next[i - 1]];
      }
    }
  }
  return next;
}

export function duplicateElements(elements, ids) {
  const copies = [];
  for (const element of elements) {
    if (!ids.includes(element.id)) continue;
    copies.push({
      ...clone(element),
      id: uid(),
      seed: Math.floor(Math.random() * 2 ** 31),
      x: element.x + 16,
      y: element.y + 16,
    });
  }
  return copies;
}

export function serializeScene(elements) {
  return JSON.stringify({ type: "drawexcal", version: 1, elements }, null, 2);
}

export function parseScene(text) {
  const data = JSON.parse(text);
  const elements = Array.isArray(data) ? data : data.elements;
  if (!Array.isArray(elements)) throw new Error("This file has no elements.");
  return elements.map((element) => ({ ...element }));
}
