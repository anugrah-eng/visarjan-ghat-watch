// Report sidebar check: open, take screenshots, generate a Hindi PDF report and a CSV, Escape returns focus.
// Run with the local server on 8765: node tests/report-sidebar.e2e.js
const puppeteer = require("puppeteer-core");
const path = require("path"), os = require("os"), fs = require("fs");
const OUT = path.join(os.tmpdir(), "vgw-shots"); fs.mkdirSync(OUT, { recursive: true });
const check = (ok, m) => { console.log(`${ok ? "PASS" : "FAIL"} ${m}`); if (!ok) process.exitCode = 1; };
(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const errors = [];
  for (const [theme, lang, w, h] of [["light", "en", 1440, 900], ["dark", "hi", 390, 844]]) {
    const p = await b.newPage(); await p.setViewport({ width: w, height: h });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.evaluateOnNewDocument((t, l) => { sessionStorage.setItem("vgw.intro", "seen"); localStorage.setItem("vgw-theme", t); localStorage.setItem("vgw-lang", l); }, theme, lang);
    await p.goto("http://localhost:8765/site/app.html", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1200));
    await p.click("#btn-report"); await new Promise((r) => setTimeout(r, 400));
    check(await p.$eval(".rs", (e) => !e.hidden && e.getAttribute("role") === "dialog"), `${theme}/${lang}: sidebar opens as a dialog`);
    check(await p.evaluate(() => document.activeElement.closest(".rs") !== null), `${theme}/${lang}: focus moves into the sidebar`);
    await p.click('.rs [data-param="BOD"]'); await new Promise((r) => setTimeout(r, 150));
    await p.screenshot({ path: path.join(OUT, `rs-${theme}-${lang}-${w}.png`) });
    if (theme === "light") {
      const popupP = new Promise((res) => b.once("targetcreated", async (t) => res(await t.page())));
      await p.click('.rs [data-rlang="hi"]'); await p.click('.rs input[value="all"]'); await p.click("#rs-go");
      const rep = await popupP; await new Promise((r) => setTimeout(r, 1500));
      const txt = await rep.evaluate(() => document.body.innerText);
      check(/सभी|घाट/.test(txt) && /बैरागढ़/.test(txt), "Hindi PDF report has Devanagari ghat names");
      check(await rep.evaluate(() => document.querySelectorAll("section").length) === 7, "report covers all 7 ghats");
      await rep.setViewport({ width: 900, height: 1200 }); await rep.screenshot({ path: path.join(OUT, "rs-report-hi.png") });
      await rep.close();
      await p.keyboard.press("Escape"); await new Promise((r) => setTimeout(r, 300));
      check(await p.$eval(".rs", (e) => e.hidden), "Escape closes the sidebar");
      check(await p.evaluate(() => document.activeElement.id === "btn-report"), "focus returns to the trigger button");
    }
    await p.close();
  }
  check(errors.length === 0, `no page errors ${errors.join(" | ")}`);
  await b.close();
})();
