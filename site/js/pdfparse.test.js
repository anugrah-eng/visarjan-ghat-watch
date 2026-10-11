// Parses each MPPCB PDF the way the browser does and compares with the checked CSV.
// Run: node --test site/js/   (needs `npm install` once, for pdfjs-dist)
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
globalThis.window = globalThis;
for (const f of ["site/js/config.js", "site/data/bundled.js"])
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), "utf8"));
const PdfParse = require("./pdfparse.js");

const key = (r) => [r.year, r.festival, r.site, r.phase, r.parameter].join("|");

for (const [year, rep] of Object.entries(BUNDLED.reports)) {
  test(`browser parser matches the checked CSV for ${year}`, { timeout: 120000 }, async () => {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(fs.readFileSync(path.join(ROOT, "resources", rep.file)));
    const pages = await PdfParse.extractPages(pdfjsLib, data);
    assert.strictEqual(PdfParse.detectYear(pages, rep.file), Number(year));
    const raw = PdfParse.parseTables(pages);
    const mapped = PdfParse.mapRows(raw, { year: Number(year), cfg: CONFIG, siteAliases: BUNDLED.siteAliases,
      ghats: BUNDLED.ghats, sourceFile: rep.file });
    const got = new Map(mapped.readings.map((r) => [key(r), r]));
    const want = BUNDLED.readings.filter((r) => r.year === year);
    const bad = [];
    for (const w of want) {
      const g = got.get(key({ ...w, year: Number(year) }));
      const same = g && g.value === w.value && g.source_page === w.source_page &&
        (w.value !== null || g.flag === w.flag);
      if (!same) bad.push(`${key(w)}: want ${w.value ?? w.flag} p${w.source_page}, got ${g ? (g.value ?? g.flag) + " p" + g.source_page : "nothing"}`);
    }
    const share = 1 - bad.length / want.length;
    console.log(`${year}: ${want.length - bad.length}/${want.length} match (${(share * 100).toFixed(1)}%). Unmatched Bhopal sites: ${mapped.unmatched.map((u) => u.site_as_printed).join("; ") || "none"}`);
    if (bad.length) console.log(bad.slice(0, 15).join("\n"));
    assert.ok(share >= 0.95, `only ${(share * 100).toFixed(1)}% of ${year} rows match`);
  });
}
