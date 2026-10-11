// Reads an MPPCB idol-immersion report PDF into readings, in the browser.
// A port of tools/parse_visarjan.py from the organisers' data pack, using pdf.js text positions
// instead of pdftotext character columns. Works on the 2023, 2024 and 2025 report layouts.
(function (root) {
  const SKIP = /water (quality )?monitoring report|idol immersion|visarjan 20\d\d|^\s*r\.?\s?o\.?\b|^\s*(20\d\d\s*)+$|s\.\s*no|^\s*parameter\s*$/i;
  const NUM = /^-?\d+(\.\d+)?$/;

  // 1. PDF -> pages of positioned text items.
  async function extractPages(pdfjsLib, data, onProgress) {
    const doc = await pdfjsLib.getDocument({ data, verbosity: 0 }).promise;
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const tc = await (await doc.getPage(n)).getTextContent();
      pages.push(tc.items.filter((i) => i.str && i.str.trim())
        .map((i) => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width || i.str.length * 5 })));
      if (onProgress) onProgress(n, doc.numPages);
    }
    return pages;
  }

  // Split items into words, each with its own centre x (proportional within the item).
  function words(items) {
    const out = [];
    for (const it of items) {
      const re = /\S+/g; let m;
      while ((m = re.exec(it.s))) {
        const c = it.x + it.w * ((m.index + m[0].length / 2) / it.s.length);
        out.push({ t: m[0], c, x0: it.x + it.w * (m.index / it.s.length),
          x1: it.x + it.w * ((m.index + m[0].length) / it.s.length) });
      }
    }
    return out.sort((a, b) => a.c - b.c);
  }

  function toLines(items) {
    const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = []; let cur = null;
    for (const it of sorted) {
      if (!cur || Math.abs(cur.y - it.y) > 3) { cur = { y: it.y, items: [] }; lines.push(cur); }
      cur.items.push(it);
    }
    for (const l of lines) {
      l.items.sort((a, b) => a.x - b.x);
      // Wide gaps become 3+ spaces, so a right-aligned 'R.O. Bhopal' can be split off the site name.
      let text = "", end = null;
      for (const it of l.items) {
        if (end !== null) text += it.x - end > 20 ? "     " : " ";
        text += it.s; end = it.x + it.w;
      }
      l.text = text;
    }
    return lines;
  }

  function cleanSite(line) {
    let s = line.trim().split(/\s{3,}/)[0];
    s = s.replace(/^location\s*[-:]\s*/i, "");
    return s.trim().replace(/\.$/, "").trim();
  }

  function parsePrinted(tokens) {
    const printed = tokens.join(" ");
    const joined = tokens.join("");
    if (!tokens.length || /^[_\-–—]+$/.test(joined)) return { value: null, flag: "not sampled", printed };
    if (NUM.test(joined)) return { value: Number(joined), flag: "", printed };
    if (/^b\.?d\.?l\.?$/i.test(joined) || /^</.test(joined)) return { value: null, flag: "BDL", printed };
    if (/^n\.?d\.?$/i.test(joined)) return { value: null, flag: "ND", printed };
    return { value: null, flag: joined, printed }; // '*', '**' and anything unreadable stay missing
  }

  // 2. Pages -> raw table rows (site and parameter as printed).
  function parseTables(pages) {
    const rows = [];
    let festival = "", ro = "", cols = null, site = null, miss = 0, recent = [], lastParam = null, pending = null;
    pages.forEach((items, idx) => {
      const pageNo = idx + 1;
      lastParam = null; pending = null;
      for (const line of toLines(items)) {
        const low = line.text.toLowerCase();
        if (/ganesh[a]?\s+(idol|visarjan)/.test(low)) festival = "Ganesh";
        if (/durga\s+(idol|visarjan)/.test(low) && !low.includes("location")) festival = "Durga";
        const m = line.text.match(/\b(R\.\s?O\.?\s*[-:]?\s*[A-Z][a-z]+|RO-[A-Z][a-z]+)/);
        if (m) ro = m[1].replace(/\s+/g, " ").replace("RO-", "R.O. ").trim();

        const ws = words(line.items);
        if (/pre\s*immersion/.test(low) && low.includes("during")) {
          const find = (re) => { const w = ws.find((w) => re.test(w.t)); return w ? w.c : null; };
          const pre = find(/^pre$/i), during = find(/^during$/i), after = find(/^after$/i);
          // Header words 'Pre Immersion' sit left of their values; use the phrase centre.
          const phraseCentre = (re, span) => { const i = ws.findIndex((w) => re.test(w.t));
            return i < 0 ? null : (ws[i].x0 + ws[Math.min(i + span, ws.length - 1)].x1) / 2; };
          cols = [["pre", pre !== null ? phraseCentre(/^pre$/i, 1) : null],
                  ["during", during !== null ? phraseCentre(/^during$/i, 1) : null],
                  ["after", after !== null ? phraseCentre(/^after$/i, 2) : null]].filter((c) => c[1] !== null);
          const loc = recent.filter((l) => /location/i.test(l));
          const cand = recent.filter((l) => l.trim() && !SKIP.test(l));
          site = cleanSite(loc.length ? loc[loc.length - 1] : cand.length ? cand[cand.length - 1] : "UNKNOWN");
          recent = []; miss = 0;
          continue;
        }

        if (cols) {
          const gap = cols.length > 1 ? cols[1][1] - cols[0][1] : 100;
          const boundary = cols[0][1] - gap / 2;
          const label = ws.filter((w) => w.c < boundary).map((w) => w.t).join(" ");
          const pm = label.match(/^(\d{1,2})\s*[.)]?\s+([A-Za-z][A-Za-z .\-/()]*)$/);
          const assign = (list) => {
            const byCol = Object.fromEntries(cols.map((c) => [c[0], []]));
            for (const w of list) {
              let best = cols[0], d = Infinity;
              for (const c of cols) if (Math.abs(w.c - c[1]) < d) { d = Math.abs(w.c - c[1]); best = c; }
              byCol[best[0]].push(w.t);
            }
            return byCol;
          };
          // Some cells are printed a few points above or below their row. Attach them to the
          // nearest parameter row, but only to a cell that is otherwise empty.
          const fill = (target, byCol) => {
            for (const [phase, toks] of Object.entries(byCol)) {
              const r = target.rows[phase];
              if (toks.length && r && r.value_as_printed === "") {
                const v = parsePrinted(toks);
                Object.assign(r, { value: v.value, flag: v.flag, value_as_printed: v.printed });
              }
            }
          };
          if (pm) {
            const byCol = assign(ws.filter((w) => w.c >= boundary));
            const group = { y: line.y, rows: {} };
            for (const [phase] of cols) {
              const v = parsePrinted(byCol[phase]);
              const row = { festival, regional_office: ro, site_as_printed: site, phase,
                parameter_as_printed: pm[2].trim(), value: v.value, flag: v.flag,
                value_as_printed: v.printed, source_page: pageNo };
              rows.push(row); group.rows[phase] = row;
            }
            if (pending && Math.abs(pending.y - line.y) < 9) fill(group, pending.byCol);
            pending = null; lastParam = group;
            miss = 0;
            continue;
          }
          if (!label && ws.length && ws.every((w) => /^([\d.]+|BDL|ND|[*_\-]+)$/i.test(w.t))) {
            const byCol = assign(ws);
            if (lastParam && Math.abs(lastParam.y - line.y) < 9) fill(lastParam, byCol);
            else pending = { y: line.y, byCol };
            continue;
          }
          // A table ends after two non-parameter text lines in a row.
          if (line.text.trim() && !SKIP.test(line.text)) { if (++miss >= 2) cols = null; }
        }
        recent = [...recent, line.text].slice(-6);
      }
    });
    return rows;
  }

  function detectYear(pages, fileName) {
    const f = (fileName || "").match(/20\d\d/);
    const counts = {};
    for (const items of pages.slice(0, 40))
      for (const it of items) for (const y of it.s.match(/\b20[2-3]\d\b/g) || []) counts[y] = (counts[y] || 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (f) return Number(f[0]);
    if (/_23_|report_23|-23\b/i.test(fileName || "")) return 2023;
    return top ? Number(top[0]) : new Date().getFullYear();
  }

  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  // 3. Raw rows -> standard readings for the 7 Bhopal ghats. Unmatched Bhopal-looking sites go to review.
  function mapRows(raw, opts) {
    const { year, cfg, siteAliases, ghats, sourceFile, decisions = {} } = opts;
    const aliasMap = {};
    for (const [printed, std] of Object.entries(siteAliases)) aliasMap[norm(printed)] = std;
    const waterBody = Object.fromEntries(ghats.features.map((f) => [f.properties.site, f.properties.water_body]));

    const matchSite = (printed) => {
      if (printed in decisions) return { site: decisions[printed] || null, how: "chosen in review" };
      const n = norm(printed);
      if (aliasMap[n]) return { site: aliasMap[n], how: "known spelling" };
      for (const [std, kws] of Object.entries(cfg.siteKeywords))
        if (kws.some((k) => n.includes(k))) return { site: std, how: "name match" };
      return { site: null, how: "" };
    };
    const matchParam = (printed) => cfg.paramKeys[printed.toLowerCase().replace(/[^a-z]/g, "")] || null;

    const readings = [], unmatched = {}, unknownParams = new Set(), siteMatches = {};
    let outside = 0;
    for (const r of raw) {
      const m = matchSite(r.site_as_printed);
      if (!m.site) {
        const bhopalish = /bhopal/i.test(r.site_as_printed);
        if (bhopalish && !(r.site_as_printed in decisions)) {
          const u = (unmatched[r.site_as_printed] ||= { site_as_printed: r.site_as_printed, festivals: new Set(), pages: new Set() });
          u.festivals.add(r.festival); u.pages.add(r.source_page);
        } else outside++;
        continue;
      }
      const param = matchParam(r.parameter_as_printed);
      if (!param) { unknownParams.add(r.parameter_as_printed); continue; }
      siteMatches[r.site_as_printed] = { site: m.site, how: m.how };
      readings.push({ year, festival: r.festival, site: m.site, water_body: waterBody[m.site] || "",
        phase: r.phase, parameter: param, value: r.value, unit_assumed: cfg.units[param] || "",
        flag: r.flag, value_as_printed: r.value_as_printed, parameter_as_printed: r.parameter_as_printed,
        site_as_printed: r.site_as_printed, site_match_confidence: m.how === "known spelling" ? "high" : "medium",
        source_page: r.source_page, source_file: sourceFile });
    }
    return {
      readings,
      unmatched: Object.values(unmatched).map((u) => ({ ...u, festivals: [...u.festivals], pages: [...u.pages] })),
      unknownParams: [...unknownParams], siteMatches, outside,
    };
  }

  const api = { extractPages, parseTables, detectYear, mapRows, toLines, parsePrinted };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PdfParse = api;
})(typeof window !== "undefined" ? window : globalThis);
