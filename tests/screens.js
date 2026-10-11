// Screenshot matrix for review: pages x themes x languages x widths.
// Run: python -m http.server 8765 (repo root), then: node tests/screens.js [filter]
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");
const os = require("os");

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.BASE || "http://localhost:8765/site/";
const OUT = path.join(os.tmpdir(), "vgw-shots");
fs.mkdirSync(OUT, { recursive: true });
const filter = process.argv[2] || "";

const PAGES = [
  ["landing", "index.html"],
  ["overview", "app.html#overview"],
  ["ghat", "app.html#ghat=Rani%20Kamlapati%20ghat%20%2F%20Kamla%20Park%20kund"],
  ["compare", "app.html#compare"],
  ["alerts", "app.html#alerts"],
];
const WIDTHS = { desktop: [1440, 900], mobile: [390, 844] };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const errors = [];
  for (const [name, url] of PAGES) for (const theme of ["light", "dark"]) for (const lang of ["en", "hi"]) for (const [w, [vw, vh]] of Object.entries(WIDTHS)) {
    const id = `${name}-${theme}-${lang}-${w}`;
    if (filter && !id.includes(filter)) continue;
    const page = await browser.newPage();
    await page.setViewport({ width: vw, height: vh });
    page.on("pageerror", (e) => errors.push(`${id}: ${e.message}`));
    await page.evaluateOnNewDocument((t, l) => { localStorage.setItem("vgw-theme", t); localStorage.setItem("vgw-lang", l); localStorage.setItem("vgw-motion", "off"); }, theme, lang);
    await page.goto(BASE + url, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, name === "landing" ? 6000 : 2500));
    await page.screenshot({ path: path.join(OUT, `${id}.png`), fullPage: name !== "overview" && name !== "landing" });
    await page.close();
  }
  console.log(errors.length ? errors.join("\n") : "no page errors");
  console.log("Screenshots in", OUT);
  await browser.close();
})();
