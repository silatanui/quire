import test from "node:test";
import assert from "node:assert/strict";
import {
  blankDeck,
  deckFromTalk,
  duplicateSheet,
  gatherLists,
  parseFolio,
  reorderSheets,
  serializeFolio,
  SHEET,
} from "../js/folio.js";

test("a talk becomes one sheet per entry", () => {
  const deck = deckFromTalk({
    title: "Seeds",
    sheets: [
      { role: "open", heading: "Seeds", lines: ["Start small"], note: "Pause." },
      { role: "points", kicker: "Today", heading: "Why", lines: ["One", "Two"] },
      { role: "pair", heading: "Split", lines: ["Left"], aside: "Right note" },
      { role: "close", heading: "Go", lines: ["Begin."] },
    ],
  });
  assert.equal(deck.sheets.length, 4);
  assert.equal(deck.title, "Seeds");
  assert.equal(deck.sheets[0].note, "Pause.");
  assert.ok(deck.sheets[0].elements.some((element) => element.text === "Seeds"));
  assert.deepEqual(deck.sheets[1].elements.find((element) => element.type === "list").items, ["One", "Two"]);
  assert.ok(deck.sheets[2].elements.some((element) => element.text === "Right note"));
  assert.ok(deck.sheets[2].elements.some((element) => element.role === "card"));
  for (const sheet of deck.sheets) {
    for (const element of sheet.elements) {
      assert.ok(element.x + element.width <= SHEET.width);
      assert.ok(element.y < SHEET.height);
    }
  }
});

test("talk input is clipped and extra lines are dropped", () => {
  const deck = deckFromTalk({
    title: "x".repeat(200),
    slides: [{ role: "points", heading: "y".repeat(200), bullets: ["a", "b", "c", "d", "e", "f"] }],
  });
  assert.ok(deck.title.length <= 80);
  const heading = deck.sheets[0].elements.find((element) => element.role === "heading");
  assert.ok(heading.text.length <= 90);
  assert.equal(deck.sheets[0].elements.find((element) => element.type === "list").items.length, 5);
});

test("separate bullet lines become one list", () => {
  const gathered = gatherLists([
    { id: "h", type: "text", role: "heading", text: "Title", x: 80, y: 64, width: 400, fontSize: 48 },
    { id: "m1", type: "rectangle", role: "mark", x: 82, y: 180, width: 16, height: 16 },
    { id: "l1", type: "text", role: "line", text: "One", x: 116, y: 170, width: 900, fontSize: 30, strokeColor: "#111" },
    { id: "m2", type: "rectangle", role: "mark", x: 82, y: 258, width: 16, height: 16 },
    { id: "l2", type: "text", role: "line", text: "Two", x: 116, y: 248, width: 900, fontSize: 30, strokeColor: "#111" },
    { id: "gap", type: "rectangle", role: "card", x: 0, y: 320, width: 10, height: 10 },
    { id: "note", type: "text", role: "line", text: "Just a line", x: 80, y: 400, width: 400, fontSize: 28 },
  ]);
  assert.equal(gathered.length, 4);
  assert.equal(gathered[0].text, "Title");
  assert.equal(gathered[1].type, "list");
  assert.deepEqual(gathered[1].items, ["One", "Two"]);
  assert.equal(gathered[1].listStyle, "bullet");
  assert.equal(gathered[3].text, "Just a line");
});

test("an empty talk is refused", () => {
  assert.throws(() => deckFromTalk({ title: "No" }), /no sheets/);
});

test("sheets move and a folio file round-trips", () => {
  const deck = blankDeck();
  deck.sheets.push(duplicateSheet(deck.sheets[0]));
  deck.sheets[1].elements.find((element) => element.role === "heading").text = "Second";
  const moved = reorderSheets(deck.sheets, 1, -1);
  assert.equal(moved.index, 0);
  assert.equal(moved.sheets[0].elements.find((element) => element.role === "heading").text, "Second");
  const restored = parseFolio(serializeFolio({ title: "Kept", sheets: moved.sheets }));
  assert.equal(restored.title, "Kept");
  assert.equal(restored.sheets.length, 2);
});
