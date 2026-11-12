import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateAiBom, validateCbom, validateVsbom } from "../dist/index.js";

function load(rel) {
  return JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8"));
}

const cases = [
  ["ai-bom", validateAiBom, "../examples/valid/ai-bom.json", "../examples/invalid/ai-bom-bad.json"],
  ["cbom", validateCbom, "../examples/valid/cbom.json", "../examples/invalid/cbom-bad.json"],
  ["vsbom", validateVsbom, "../examples/valid/vsbom.json", "../examples/invalid/vsbom-bad.json"],
];

for (const [name, validate, validPath, invalidPath] of cases) {
  test(`${name} valid fixture passes Ajv and Zod`, () => {
    const result = validate(load(validPath));
    assert.equal(result.ok, true, JSON.stringify(result.errors ?? result));
  });

  test(`${name} invalid fixture fails Ajv and Zod with structured errors`, () => {
    const result = validate(load(invalidPath));
    assert.equal(result.ok, false);
    assert.ok(Array.isArray(result.errors.ajv) && result.errors.ajv.length > 0);
    assert.ok(Array.isArray(result.errors.zod) && result.errors.zod.length > 0);
    assert.equal(typeof result.errors.ajv[0].instancePath, "string");
    assert.ok(result.errors.zod[0].path || result.errors.zod[0].code);
  });
}

test("mutated AI-BOM evidence state is rejected by both checkers", () => {
  const doc = load("../examples/valid/ai-bom.json");
  doc.model.evaluation.state = "guessed";
  const result = validateAiBom(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.ajv.length > 0);
  assert.ok(result.errors.zod.length > 0);
});

test("oversize AI-BOM name is rejected and not truncated", () => {
  const doc = load("../examples/valid/ai-bom.json");
  doc.model.name = "n".repeat(257);
  const result = validateAiBom(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.ajv.length > 0);
  assert.ok(result.errors.zod.length > 0);
});

test("empty input is rejected", () => {
  for (const validate of [validateAiBom, validateCbom, validateVsbom]) {
    const result = validate(undefined);
    assert.equal(result.ok, false);
    assert.ok(result.errors.ajv.length > 0);
    assert.ok(result.errors.zod.length > 0);
  }
});

test("unknown AI-BOM field is rejected", () => {
  const doc = load("../examples/valid/ai-bom.json");
  doc.extra = "no";
  const result = validateAiBom(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.ajv.length > 0);
  assert.ok(result.errors.zod.length > 0);
});

test("single VSBOM posture is enough", () => {
  const result = validateVsbom({
    schema: "presencis-vsbom-v1",
    subject: "one",
    postures: [{ kind: "fixed_vsbom", evidence: { state: "untested" } }],
  });
  assert.equal(result.ok, true);
});

test("non-integer component count is rejected", () => {
  const doc = load("../examples/valid/vsbom.json");
  doc.postures[0].component_count = 1.5;
  const result = validateVsbom(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.ajv.length > 0);
  assert.ok(result.errors.zod.length > 0);
});
