import test from "node:test";
import assert from "node:assert/strict";
import { pdfFromJpegs, pptxFromJpegs, zipStore } from "../js/folio-export.js";

const image = { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), width: 8, height: 4 };

test("a folio pdf starts as a pdf", () => {
  const pdf = pdfFromJpegs([image, image]);
  assert.equal(new TextDecoder().decode(pdf.slice(0, 8)), "%PDF-1.4");
  assert.ok(pdf.includes(0xff));
});

test("a folio powerpoint is a zip package", () => {
  const pptx = pptxFromJpegs([image], "Seeds & rain");
  assert.equal(pptx[0], 0x50);
  assert.equal(pptx[1], 0x4b);
  const zip = zipStore([{ name: "hello.txt", data: new TextEncoder().encode("quire") }]);
  assert.equal(zip[0], 0x50);
});
