// Opening sequence: plays on first dashboard visit, can be skipped, then never again this session.
// Run with the local server on 8765: node tests/intro.e2e.js
const puppeteer = require("puppeteer-core");
const check = (ok, m) => { console.log(`${ok ? "PASS" : "FAIL"} ${m}`); if (!ok) process.exitCode = 1; };
(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
  const p = await b.newPage(); await p.setViewport({ width: 1280, height: 760 });
  await p.goto("http://localhost:8765/site/app.html", { waitUntil: "domcontentloaded" });
  check(await p.evaluate(() => document.documentElement.getAttribute("data-intro") === "1" && !!document.getElementById("intro")), "intro shows on first dashboard visit");
  await new Promise((r) => setTimeout(r, 2500));
  const t = await p.evaluate(() => { const v = document.querySelector("#intro video"); return v ? v.currentTime : -1; });
  check(t > 0.5, `video is playing (t=${t.toFixed(2)}s)`);
  await p.screenshot({ path: require("path").join(require("os").tmpdir(), "vgw-shots", "intro-video.png") });
  await p.click(".intro-skip"); await new Promise((r) => setTimeout(r, 900));
  check(await p.evaluate(() => !document.getElementById("intro") && !document.documentElement.hasAttribute("data-intro")), "Skip removes the intro and shows the dashboard");
  await p.reload({ waitUntil: "domcontentloaded" });
  check(await p.evaluate(() => !document.getElementById("intro")), "intro does not play again in the same session");
  const r = await b.newPage(); await r.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await r.goto("http://localhost:8765/site/app.html", { waitUntil: "domcontentloaded" });
  check(await r.evaluate(() => !document.getElementById("intro")), "reduced motion skips the intro");
  await b.close();
})();
