// Opening sequence: plays in full as soon as the site opens, cannot be skipped, then the dashboard appears.
// Run: node tests/intro.e2e.js   (BASE defaults to the local server; BASE=https://.../site/ tests the live site)
const puppeteer = require("puppeteer-core");
const BASE = process.env.BASE || "http://localhost:8765/site/";
const check = (ok, m) => { console.log(`${ok ? "PASS" : "FAIL"} ${m}`); if (!ok) process.exitCode = 1; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
  const p = await b.newPage(); await p.setViewport({ width: 1280, height: 760 });
  await p.goto(BASE + "app.html#compare", { waitUntil: "domcontentloaded" }); // any starting link
  check(await p.evaluate(() => document.documentElement.getAttribute("data-intro") === "1" && !!document.getElementById("intro")), "intro plays as soon as the site opens");
  check(await p.evaluate(() => !document.querySelector(".intro-skip")), "there is no skip control");
  await sleep(2500);
  const t = await p.evaluate(() => { const v = document.querySelector("#intro video"); return v ? v.currentTime : -1; });
  check(t > 0.5, `video is playing (t=${t.toFixed(2)}s)`);
  await p.mouse.click(640, 380); await p.keyboard.press("Escape"); await p.keyboard.press("Enter"); await sleep(800);
  check(await p.evaluate(() => !!document.getElementById("intro")), "clicks and keys do not end it");
  const start = Date.now();
  await p.waitForFunction(() => !document.getElementById("intro"), { timeout: 15000 });
  check(true, `dashboard shows right after the video ends (${((Date.now() - start) / 1000 + 3.3).toFixed(1)}s after opening)`);
  check(await p.evaluate(() => getComputedStyle(document.querySelector(".shell")).opacity === "1"), "dashboard is fully visible");
  await p.reload({ waitUntil: "domcontentloaded" });
  check(await p.evaluate(() => !document.getElementById("intro")), "does not replay on refresh within the same session");
  const r = await b.newPage(); await r.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await r.goto(BASE + "app.html", { waitUntil: "domcontentloaded" });
  check(await r.evaluate(() => document.documentElement.getAttribute("data-intro-still") === "1"), "reduced motion shows the still opening frame");
  await r.waitForFunction(() => !document.getElementById("intro"), { timeout: 6000 });
  check(true, "then the dashboard follows");
  await b.close();
})();
