// End-to-end check in a real Chrome: upload the 2025 PDF into a 2023-24 view, review, confirm, brief, CSV rejection.
// Run: python -m http.server 8765  (in the repo root), then: node tests/e2e.js
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");
const os = require("os");

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.BASE || "http://localhost:8765/site/app.html";
const OUT = path.join(os.tmpdir(), "vgw-shots");
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.join(__dirname, "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); if (!ok) process.exitCode = 1; };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--window-size=1440,900"], defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => sessionStorage.setItem("vgw.intro", "seen")); // the opening video is tested separately
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/tile|Failed to load resource/i.test(m.text())) errors.push(m.text()); });

  await page.goto(`${BASE}?until=2024`, { waitUntil: "networkidle2" });
  await page.evaluate(() => Store.clear());
  await page.reload({ waitUntil: "networkidle2" });
  const rowsBefore = await page.$$eval("#sites-table tr[data-site]", (els) => els.length);
  check(rowsBefore === 7, `7 ghats listed in the 2023-24 view (${rowsBefore})`);

  // Upload the 2025 PDF
  await page.click("#btn-upload");
  const input = await page.waitForSelector("#file-in");
  await input.uploadFile(path.join(ROOT, "resources", "Ganesh_and_Durga_visarjan_report-2025.pdf"));
  await page.waitForSelector("#rv-ok", { timeout: 60000 });
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, "upload-review.png") });
  const okText = await page.$eval("#rv-ok", (b) => b.textContent);
  check(/add 453 readings/.test(okText), `review offers the 453 Bhopal readings from 2025 (“${okText.trim()}”)`);
  const year = await page.$eval("#rv-year", (i) => i.value);
  check(year === "2025", `year detected as 2025 (${year})`);
  await page.click("#rv-ok");
  await page.waitForSelector("#toast:not([hidden])");
  const toast = await page.$eval("#toast", (t) => t.textContent);
  console.log("   toast:", toast);
  check(/Durga 2025|Ganesh 2025/.test(toast), "toast reports the added seasons");
  const nReadings = await page.evaluate(() => App.state.readings.length);
  check(nReadings === 1524, `after upload the data has all 1524 readings (${nReadings})`);
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "after-upload.png") });

  // Persisted after reload
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(500);
    check(await page.evaluate(() => App.state.uploads.length === 1), "uploaded report persists after reload");

  // Source link of an uploaded value points at the stored PDF
  await page.goto(`${BASE}?until=2024#ghat=Khatlapura%20ghat`, { waitUntil: "networkidle2" });
  await sleep(800);
  const href = await page.$eval("#view-ghat td.breach a, #view-ghat td.ok a", (a) => a.getAttribute("href"));
  check(/^blob:.*#page=\d+$/.test(href), `uploaded values link to the stored PDF page (${href.slice(0, 40)}…)`);
  await page.screenshot({ path: path.join(OUT, "detail-popup.png") });

  // Brief
  await page.click("#btn-brief");
  await sleep(300);
  const en = await page.$eval("#brief-body", (e) => e.textContent);
  check(/PRIORITY GHATS/.test(en) && /Missing, not clean/.test(en), "English brief lists priorities and data gaps");
  await page.screenshot({ path: path.join(OUT, "brief-en.png") });
  await page.click('#dlg-brief .seg button[data-lang="hi"]');
  const hi = await page.$eval("#brief-body", (e) => e.textContent);
  check(/प्राथमिकता/.test(hi), "Hindi brief renders");
  await page.screenshot({ path: path.join(OUT, "brief-hi.png") });
  await page.click("#dlg-brief [data-close]");

  // Bad CSV is rejected and nothing changes
  const bad = path.join(OUT, "bad.csv");
  fs.writeFileSync(bad, "year,festival,site,phase,parameter,value,flag,source_page\n2026,Diwali,Khatlapura ghat,pre,BOD,abc,,x\n");
  await page.click("#btn-upload");
  const input2 = await page.waitForSelector("#file-in");
  await input2.uploadFile(bad);
  await page.waitForSelector("#upload-body .err");
  const err = await page.$eval("#upload-body .err", (e) => e.textContent);
  check(/Rejected/.test(err), `bad CSV rejected (“${err.slice(0, 60)}…”)`);

  // Reset
  await page.evaluate(() => Store.clear());
  check(errors.length === 0, `no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  console.log("Screenshots in", OUT);
  await browser.close();
})();
