import test from "node:test";
import assert from "node:assert/strict";
import {
  boxOf,
  constrainBox,
  createElement,
  hitHandle,
  hitTest,
  hitsElement,
  normalizeBox,
  parseScene,
  reorder,
  resizeBox,
  serializeScene,
  snapAngle,
  withAbsPoints,
} from "../js/model.js";

test("normalizeBox flips negative drag sizes", () => {
  assert.deepEqual(normalizeBox(40, 30, -20, -10), { x: 20, y: 20, width: 20, height: 10 });
});

test("shift constraint keeps a square in the drag direction", () => {
  assert.deepEqual(constrainBox(0, 0, 30, -10), { width: 30, height: -30 });
});

test("closed shapes can be selected from their interior", () => {
  const rect = createElement("rectangle", 0, 0, { backgroundColor: "transparent", fillStyle: "hachure", strokeWidth: 2 });
  rect.width = 100;
  rect.height = 60;
  assert.equal(hitsElement(rect, 50, 30, 4), true);
  assert.equal(hitsElement(rect, -30, -30, 4), false);
});

test("hitTest returns the topmost element", () => {
  const lower = createElement("rectangle", 0, 0);
  lower.width = 80;
  lower.height = 80;
  lower.backgroundColor = "#a5d8ff";
  const upper = createElement("ellipse", 20, 20);
  upper.width = 40;
  upper.height = 40;
  upper.backgroundColor = "#ffc9c9";
  const hit = hitTest([lower, upper], 40, 40, 4);
  assert.equal(hit.id, upper.id);
});

test("line endpoints resize from absolute points", () => {
  let line = createElement("line", 10, 10);
  line = withAbsPoints(line, [
    { x: 10, y: 10 },
    { x: 80, y: 40 },
  ]);
  assert.equal(hitHandle(line, 80, 40, 6), "end");
  const moved = withAbsPoints(line, [
    { x: 10, y: 10 },
    { x: 100, y: 10 },
  ]);
  assert.deepEqual(boxOf(moved), { x: 10, y: 10, width: 90, height: 0 });
});

test("resizeBox moves the dragged corner and can keep ratio", () => {
  const start = { x: 10, y: 10, width: 40, height: 20 };
  assert.deepEqual(resizeBox(start, "se", { x: 70, y: 50 }, false), { x: 10, y: 10, width: 60, height: 40 });
  assert.deepEqual(resizeBox(start, "se", { x: 70, y: 20 }, true), { x: 10, y: 10, width: 60, height: 30 });
});

test("snapAngle locks a line to 15 degree steps", () => {
  const point = snapAngle(0, 0, 10, 1);
  assert.ok(Math.abs(point.y) < 0.01);
  assert.ok(Math.abs(point.x - Math.hypot(10, 1)) < 0.01);
});

test("reorder sends a shape to the front", () => {
  const elements = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(reorder(elements, ["a"], "front").map((element) => element.id), ["b", "c", "a"]);
  assert.deepEqual(reorder(elements, ["c"], "back").map((element) => element.id), ["c", "a", "b"]);
});

test("scene json round trips", () => {
  const rect = createElement("rectangle", 5, 6);
  rect.width = 12;
  rect.height = 8;
  const parsed = parseScene(serializeScene([rect]));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].width, 12);
  assert.equal(parsed[0].type, "rectangle");
});
