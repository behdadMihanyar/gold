import assert from "node:assert/strict";
import { test } from "node:test";
import { nameKey } from "../src/modules/prices/automap.js";

test("nameKey ignores digit script, letter variants, half-spaces and word order", () => {
  assert.equal(nameKey("تمام سکه ۸۶"), nameKey("سکه تمام 86"));
  assert.equal(nameKey("تمام‌سکه ۸۶"), nameKey("تمام سکه 86"));
  assert.equal(nameKey("شمش نقره ۱۰۰۰ گرمی اماراتي"), nameKey("شمش نقره 1000 گرمی اماراتی"));
  assert.equal(nameKey("  ربع  سکه ٨٦ "), nameKey("ربع سکه 86"));
});

test("nameKey keeps different products apart", () => {
  assert.notEqual(nameKey("تمام سکه ۸۶"), nameKey("نیم سکه ۸۶"));
  assert.notEqual(nameKey("نقد فردا"), nameKey("نقد پس فردا"));
  assert.notEqual(nameKey("شمش نقره ۱۰۰۰ گرمی نادیر"), nameKey("شمش نقره ۱۰۰۰ گرمی اماراتی"));
  assert.equal(nameKey(""), "");
});
