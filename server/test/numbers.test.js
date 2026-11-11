import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeJalaliDate,
  parseInteger,
  toLatinDigits,
} from "../src/utils/numbers.js";

test("toLatinDigits converts Persian and Arabic-Indic digits", () => {
  assert.equal(toLatinDigits("۱۴۰۵/۰۸/۲۰"), "1405/08/20");
  assert.equal(toLatinDigits("٣٤٥"), "345");
  assert.equal(toLatinDigits("abc 12"), "abc 12");
});

test("parseInteger handles formatted amounts", () => {
  assert.equal(parseInteger(1250), 1250);
  assert.equal(parseInteger("12,500,000"), 12500000);
  assert.equal(parseInteger("12/500/000"), 12500000);
  assert.equal(parseInteger("۱۲/۵۰۰/۰۰۰"), 12500000);
  assert.ok(Number.isNaN(parseInteger("")));
  assert.ok(Number.isNaN(parseInteger(null)));
  assert.ok(Number.isNaN(parseInteger(1.5)));
});

test("normalizeJalaliDate pads and validates", () => {
  assert.equal(normalizeJalaliDate("۱۴۰۵/۸/۲"), "1405/08/02");
  assert.equal(normalizeJalaliDate("1405-08-20"), "1405/08/20");
  assert.equal(normalizeJalaliDate("1405/13/01"), null);
  assert.equal(normalizeJalaliDate("2026/11/11"), null);
  assert.equal(normalizeJalaliDate("garbage"), null);
  assert.equal(normalizeJalaliDate(undefined), null);
});
