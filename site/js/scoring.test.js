// Run: node --test site/js/
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
globalThis.window = globalThis;
for (const f of ["site/js/config.js", "site/data/bundled.js"])
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), "utf8"));
const S = require("./scoring.js");

const R = S.prepare(BUNDLED.readings);
const SITES = BUNDLED.ghats.features.map((f) => f.properties.site);

test("reproduces the problem statement: 42 of 116 DO below 5, 100 of 112 BOD above 3", () => {
  const rep = S.cpcbReport(R, CONFIG);
  assert.deepStrictEqual([rep["Dissolved oxygen"].breaches, rep["Dissolved oxygen"].sampled], [42, 116]);
  assert.deepStrictEqual([rep.BOD.breaches, rep.BOD.sampled], [100, 112]);
});

test("BDL counts as within limit for BOD, unknown for DO; missing is never a pass", () => {
  const base = { year: 2025, festival: "Durga", site: "x", phase: "pre", value: null };
  assert.strictEqual(S.breach({ ...base, parameter: "BOD", flag: "BDL" }, CONFIG), false);
  assert.strictEqual(S.breach({ ...base, parameter: "Dissolved oxygen", flag: "BDL" }, CONFIG), null);
  for (const flag of ["not sampled", "*", "**"]) {
    assert.ok(S.isMissing({ ...base, parameter: "BOD", flag }));
    assert.strictEqual(S.breach({ ...base, parameter: "BOD", flag }, CONFIG), null);
  }
});

test("missing readings do not lower a ghat's risk", () => {
  const site = "Khatlapura ghat";
  const before = S.scoreAll(R, [site], CONFIG).ghats[0].score;
  const extra = S.prepare([...BUNDLED.readings, ...BUNDLED.readings.filter((r) => r.site === site)
    .map((r) => ({ ...r, value: null, flag: "not sampled" }))]);
  assert.strictEqual(S.scoreAll(extra, [site], CONFIG).ghats[0].score, before);
});

test("Bairagarh and Malikhedi carry the Durga 2025 data gap and a testing action", () => {
  const { ghats } = S.scoreAll(R, SITES, CONFIG);
  for (const name of ["Bairagarh (Sant Hirdaram) kund", "Malikhedi kund"]) {
    const g = ghats.find((x) => x.site === name);
    assert.ok(g.latestGap, name);
    assert.ok(g.actions.some((a) => a.key === "testing"), name);
    assert.notStrictEqual(g.status, "green", name);
  }
  const others = ghats.filter((g) => !g.latestGap);
  assert.strictEqual(others.length, 5);
});

test("every point of evidence points at a real reading", () => {
  const { ghats } = S.scoreAll(R, SITES, CONFIG);
  for (const g of ghats) for (const e of g.evidence) {
    const r = R[e.id];
    assert.strictEqual(r.site, g.site);
    assert.ok(r.source_page > 0);
  }
});

test("ranking is deterministic and Bairagarh is at the top", () => {
  const a = S.scoreAll(R, SITES, CONFIG).ghats.map((g) => g.site);
  const b = S.scoreAll(R, [...SITES].reverse(), CONFIG).ghats.map((g) => g.site);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a[0], "Bairagarh (Sant Hirdaram) kund");
});
