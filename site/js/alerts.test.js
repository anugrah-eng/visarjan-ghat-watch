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
const A = require("./alerts.js");

const SITE = "Test ghat";
const FRESH = new Date("2025-10-20T00:00:00Z"); // 11 days after Durga 2025 "after" sampling
// One Durga 2025 season; override any parameter value per test.
function season(over = {}, phases = ["pre", "during", "after"]) {
  const base = { "Dissolved oxygen": 6, BOD: 2, pH: 7.5 };
  const v = { ...base, ...over };
  return phases.flatMap((phase) => Object.entries(v).map(([parameter, value]) => ({
    site: SITE, year: 2025, festival: "Durga", phase, parameter,
    value: value === null ? null : value, flag: value === null ? "not sampled" : "", source_page: 64 })));
}
const run = (rows, now = FRESH) => A.evaluate(SITE, rows, CONFIG, now);

test("normal when every reading meets Class B", () => {
  const a = run(season());
  assert.strictEqual(a.level, "normal");
  assert.strictEqual(a.stale, false);
  assert.deepStrictEqual(a.triggers, []);
  assert.deepStrictEqual(a.actions.map((x) => x.key), ["monitor"]);
});

test("advisory, warning and critical levels for DO", () => {
  assert.strictEqual(run(season({ "Dissolved oxygen": 4.5 })).level, "advisory");
  assert.strictEqual(run(season({ "Dissolved oxygen": 3.5 })).level, "warning");
  assert.strictEqual(run(season({ "Dissolved oxygen": 0 })).level, "critical");
});

test("DO boundaries: exactly at a limit does not trigger it", () => {
  assert.strictEqual(run(season({ "Dissolved oxygen": 5 })).level, "normal");
  assert.strictEqual(run(season({ "Dissolved oxygen": 4 })).level, "advisory");
  assert.strictEqual(run(season({ "Dissolved oxygen": 2 })).level, "warning");
  assert.strictEqual(run(season({ "Dissolved oxygen": 1.99 })).level, "critical");
});

test("BOD boundaries", () => {
  assert.strictEqual(run(season({ BOD: 3 })).level, "normal");
  assert.strictEqual(run(season({ BOD: 3.1 })).level, "advisory");
  assert.strictEqual(run(season({ BOD: 6 })).level, "advisory");
  assert.strictEqual(run(season({ BOD: 6.1 })).level, "warning");
  assert.strictEqual(run(season({ BOD: 12 })).level, "warning");
  assert.strictEqual(run(season({ BOD: 12.1 })).level, "critical");
});

test("pH boundaries (range limits are inclusive)", () => {
  assert.strictEqual(run(season({ pH: 6.5 })).level, "normal");
  assert.strictEqual(run(season({ pH: 8.5 })).level, "normal");
  assert.strictEqual(run(season({ pH: 8.6 })).level, "advisory");
  assert.strictEqual(run(season({ pH: 6.2 })).level, "advisory");
  assert.strictEqual(run(season({ pH: 9.2 })).level, "warning");
  assert.strictEqual(run(season({ pH: 5.9 })).level, "warning");
});

test("trigger says which parameter, phase, how much over, and the page", () => {
  const rows = season({ BOD: 2 }).map((r) => (r.parameter === "BOD" && r.phase === "after" ? { ...r, value: 8 } : r));
  const a = run(rows);
  assert.strictEqual(a.level, "warning");
  assert.deepStrictEqual(
    { p: a.triggers[0].parameter, ph: a.triggers[0].phase, ex: a.triggers[0].excess, lim: a.triggers[0].limit, page: a.triggers[0].page },
    { p: "BOD", ph: "after", ex: 2, lim: "≤ 6", page: 64 });
  assert.strictEqual(a.triggers[0].source, "team");
});

test("worst level wins across parameters and its actions are listed", () => {
  const a = run(season({ "Dissolved oxygen": 1, BOD: 4 }));
  assert.strictEqual(a.level, "critical");
  assert.deepStrictEqual(a.actions.map((x) => x.key), ["noBathing", "notify", "aerate", "clean", "resample48"]);
  assert.ok(a.triggers.some((t) => t.parameter === "BOD" && t.level === "advisory"));
});

test("missing parameter is listed and adds a testing action, never counts as a pass", () => {
  const a = run(season({ "Dissolved oxygen": null }));
  assert.deepStrictEqual(a.missing, ["Dissolved oxygen"]);
  assert.strictEqual(a.actions[0].key, "testMissing");
});

test("BDL counts as tested (low), not missing", () => {
  const rows = season().map((r) => (r.parameter === "BOD" ? { ...r, value: null, flag: "BDL" } : r));
  const a = run(rows);
  assert.deepStrictEqual(a.missing, []);
  assert.strictEqual(a.level, "normal");
});

test("no tested data at all gives nodata, stale, with a testing action", () => {
  const a = run(season({ "Dissolved oxygen": null, BOD: null, pH: null }));
  assert.strictEqual(a.level, "nodata");
  assert.strictEqual(a.stale, true);
  assert.ok(a.actions.some((x) => x.key === "testMissing"));
});

test("stale data: older than the window is outdated, even if the last result was normal", () => {
  const a = run(season(), new Date("2026-10-11T00:00:00Z"));
  assert.strictEqual(a.stale, true);
  assert.strictEqual(a.level, "normal"); // last result kept for context...
  assert.strictEqual(a.actions[0].key, "testNow"); // ...but the first action is to test again
});

test("stale boundary: exactly staleDays old is still current; one day more is outdated", () => {
  const after = A.sampleDate({ year: 2025, festival: "Durga", phase: "after" }, CONFIG.alerts);
  const at = new Date(after.getTime() + CONFIG.alerts.staleDays * 86400000);
  assert.strictEqual(run(season(), at).stale, false);
  assert.strictEqual(run(season(), new Date(at.getTime() + 86400000)).stale, true);
});

test("uses the latest season: a clean 2025 overrides a bad 2024", () => {
  const old = season({ "Dissolved oxygen": 0 }).map((r) => ({ ...r, year: 2024 }));
  const a = run([...old, ...season()]);
  assert.strictEqual(a.level, "normal");
  assert.deepStrictEqual(a.season, { year: 2025, festival: "Durga" });
});

test("real data: Bairagarh's latest tested season is Ganesh 2025 with DO 0 (critical)", () => {
  const rows = BUNDLED.readings.map((r, id) => ({ ...r, id }));
  const a = A.evaluate("Bairagarh (Sant Hirdaram) kund", rows, CONFIG, FRESH);
  assert.deepStrictEqual(a.season, { year: 2025, festival: "Ganesh" });
  assert.strictEqual(a.level, "critical");
  assert.strictEqual(a.triggers[0].parameter, "Dissolved oxygen");
  assert.strictEqual(a.triggers[0].value, 0);
});

test("coliform has thresholds but is skipped when absent from the data", () => {
  assert.ok(CONFIG.alerts.rules["Faecal coliform"]);
  const a = run(season());
  assert.ok(!a.missing.includes("Faecal coliform"));
});
