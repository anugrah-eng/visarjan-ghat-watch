// Upload a new MPPCB report (PDF, parsed in the browser) or a CSV, review it, then re-score and redraw.
(function () {
  const cfg = window.CONFIG, $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SITES = () => App.SITES;
  let job = null; // { kind, file, raw, year, decisions, mapped }

  function stepDrop(msg) {
    job = null;
    $("upload-body").innerHTML = `
      <p>Drop the MPPCB <b>Ganesh and Durga Visarjan report (PDF)</b> here. The tool reads every water-test table,
      picks out the 7 Bhopal ghats and shows you what it found before anything changes.</p>
      <label class="drop" id="drop">
        <p style="font-size:30px;margin:0">⬆</p>
        <p><b>Drop a PDF or CSV here</b>, or click to choose a file</p>
        <p class="muted">PDF: the MPPCB report as published. CSV: same columns as data/bhopal_ghats_2023_2025.csv</p>
        <input type="file" id="file-in" accept=".pdf,.csv,application/pdf,text/csv" hidden>
      </label>
      ${msg ? `<p class="err">${msg}</p>` : ""}
      <p class="muted">Nothing is sent anywhere. The file stays in this browser.</p>`;
    const drop = $("drop");
    $("file-in").onchange = (e) => e.target.files[0] && handle(e.target.files[0]);
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
    drop.ondragleave = () => drop.classList.remove("over");
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("over"); e.dataTransfer.files[0] && handle(e.dataTransfer.files[0]); };
  }

  function progress(text, frac) {
    $("upload-body").innerHTML = `<p>${esc(text)}</p><div class="progress"><i style="width:${Math.round(frac * 100)}%"></i></div>`;
  }

  async function handle(file) {
    try {
      if (/\.csv$/i.test(file.name) || file.type === "text/csv") return await handleCSV(file);
      if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return stepDrop("Please choose a PDF or CSV file.");
      progress("Loading the PDF reader…", 0.02);
      let pdfjsLib;
      try {
        pdfjsLib = await import(new URL("vendor/pdfjs/pdf.min.js", location.href).href);
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("vendor/pdfjs/pdf.worker.min.js", location.href).href;
      } catch (e) {
        return stepDrop("The PDF reader could not start. Open the tool through the local server (see README step 3: <code>python -m http.server</code>), or upload a CSV instead.");
      }
      const data = new Uint8Array(await file.arrayBuffer());
      const pages = await PdfParse.extractPages(pdfjsLib, data, (n, total) => progress(`Reading page ${n} of ${total}…`, n / total));
      const raw = PdfParse.parseTables(pages);
      if (!raw.length) return stepDrop(`No water-test tables found in “${esc(file.name)}”. Is this an MPPCB immersion report? If it is scanned (an image), upload a CSV instead.`);
      job = { kind: "pdf", file, raw, year: PdfParse.detectYear(pages, file.name), decisions: {} };
      remap(); review();
    } catch (e) {
      console.error(e);
      stepDrop(`Could not read the file: ${esc(e.message)}`);
    }
  }

  function remap() {
    job.mapped = job.kind === "pdf"
      ? PdfParse.mapRows(job.raw, { year: job.year, cfg, siteAliases: BUNDLED.siteAliases, ghats: BUNDLED.ghats,
          sourceFile: job.file.name, decisions: job.decisions })
      : mapCSV(job.csvRows, job.decisions);
  }

  // ---------- CSV ----------
  function parseCSV(text) {
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    const head = (rows.shift() || []).map((h) => h.trim().replace(/^﻿/, ""));
    return { head, rows: rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()]))) };
  }

  async function handleCSV(file) {
    const { head, rows } = parseCSV(await file.text());
    const need = ["year", "festival", "site", "phase", "parameter", "value", "flag", "source_page"];
    const missing = need.filter((c) => !head.includes(c));
    if (missing.length) return stepDrop(`This CSV is missing columns: ${missing.join(", ")}. Use the same columns as data/bhopal_ghats_2023_2025.csv.`);
    job = { kind: "csv", file, csvRows: rows, year: Number(rows[0] && rows[0].year), decisions: {} };
    remap();
    if (job.mapped.bad.length) {
      return stepDrop(`Rejected: ${job.mapped.bad.length} row(s) are not valid. Nothing was changed.<br><small>${job.mapped.bad.slice(0, 8).map(esc).join("<br>")}</small>`);
    }
    review();
  }

  function mapCSV(rows, decisions) {
    const bad = [], readings = [], unmatched = {}, unknownParams = new Set();
    const wb = Object.fromEntries(BUNDLED.ghats.features.map((f) => [f.properties.site, f.properties.water_body]));
    rows.forEach((r, i) => {
      const line = i + 2;
      if (!/^20\d\d$/.test(r.year)) return bad.push(`Line ${line}: year “${r.year}”`);
      if (!["Ganesh", "Durga"].includes(r.festival)) return bad.push(`Line ${line}: festival “${r.festival}” (use Ganesh or Durga)`);
      if (!["pre", "during", "after"].includes(r.phase)) return bad.push(`Line ${line}: phase “${r.phase}” (use pre, during or after)`);
      if (r.value !== "" && isNaN(Number(r.value))) return bad.push(`Line ${line}: value “${r.value}” is not a number`);
      if (r.value === "" && !r.flag) return bad.push(`Line ${line}: empty value needs a flag (BDL, not sampled, …)`);
      if (!/^\d+$/.test(r.source_page)) return bad.push(`Line ${line}: source_page “${r.source_page}”`);
      let site = SITES().includes(r.site) ? r.site : (r.site in decisions ? decisions[r.site] : null);
      if (site === null && !(r.site in decisions)) {
        const u = (unmatched[r.site] ||= { site_as_printed: r.site, festivals: new Set(), pages: new Set() });
        u.festivals.add(r.festival); u.pages.add(Number(r.source_page)); return;
      }
      if (!site) return;
      const param = cfg.parameterOrder.includes(r.parameter) ? r.parameter : cfg.paramKeys[r.parameter.toLowerCase().replace(/[^a-z]/g, "")];
      if (!param) { unknownParams.add(r.parameter); return; }
      readings.push({ year: Number(r.year), festival: r.festival, site, water_body: wb[site], phase: r.phase, parameter: param,
        value: r.value === "" ? null : Number(r.value), unit_assumed: cfg.units[param], flag: r.flag,
        value_as_printed: r.value_as_printed || r.value || r.flag, parameter_as_printed: r.parameter_as_printed || r.parameter,
        site_as_printed: r.site_as_printed || r.site, site_match_confidence: r.site_match_confidence || "high",
        source_page: Number(r.source_page), source_file: r.source_file || job.file.name });
    });
    return { readings, bad, unknownParams: [...unknownParams], outside: 0,
      unmatched: Object.values(unmatched).map((u) => ({ ...u, festivals: [...u.festivals], pages: [...u.pages] })) };
  }

  // ---------- review ----------
  function review() {
    const m = job.mapped, R = m.readings;
    const seasons = [...new Set(R.map((r) => `${r.year}|${r.festival}`))].sort();
    const tested = (site, s, p) => R.some((r) => r.site === site && `${r.year}|${r.festival}` === s && r.parameter === p && (r.value !== null || r.flag === "BDL" || r.flag === "ND"));
    const has = (site, s) => R.some((r) => r.site === site && `${r.year}|${r.festival}` === s);
    const existing = new Set(App.state.readings.map((r) => `${r.year}|${r.festival}|${r.site}`));
    const replaces = [...new Set(R.map((r) => `${r.year}|${r.festival}|${r.site}`))].filter((k) => existing.has(k));
    const flags = R.reduce((a, r) => { if (r.flag) a[r.flag] = (a[r.flag] || 0) + 1; return a; }, {});
    const opts = (cur) => `<option value="">Not one of the 7 ghats (skip)</option>` +
      SITES().map((s) => `<option ${cur === s ? "selected" : ""}>${esc(s)}</option>`).join("");

    $("upload-body").innerHTML = `<div class="review">
      <p><b>${esc(job.file.name)}</b> · ${job.kind === "pdf" ? `${job.raw.length} values read from the report` : `${job.csvRows.length} CSV rows`}.
      Report year: <input id="rv-year" type="number" value="${job.year}" style="width:80px" ${job.kind === "csv" ? "disabled" : ""}> <span class="muted">(check this)</span></p>
      <table><tr><th>Ghat</th>${seasons.map((s) => `<th>${s.replace("|", " ")}</th>`).join("")}</tr>
      ${SITES().map((site) => `<tr><td>${esc(site)}</td>${seasons.map((s) => !has(site, s)
        ? `<td style="color:#4c1d95;font-weight:600">? not in report</td>`
        : `<td>${R.filter((r) => r.site === site && `${r.year}|${r.festival}` === s).length} values${tested(site, s, "Dissolved oxygen") && tested(site, s, "BOD") ? " ✓ DO, BOD" : ' <span style="color:#4c1d95">· DO/BOD missing</span>'}</td>`).join("")}</tr>`).join("")}
      </table>
      <p class="muted">Codes found: ${Object.entries(flags).map(([k, v]) => `${esc(k)} × ${v}`).join(", ") || "none"}. BDL = below detection (low, not missing). Blank, “_”, “-”, “*” = not tested (missing, never clean).</p>
      ${m.unmatched.length ? `<div class="gapbox"><b>Site names the tool did not recognise (${m.unmatched.length}).</b> Choose a ghat if one of these is a Bhopal ghat, for example a new BMC ghat with a new name. Nothing is guessed.
        <table>${m.unmatched.map((u) => `<tr><td>${esc(u.site_as_printed)}<br><span class="muted">${u.festivals.join(", ")} · page ${u.pages.join(", ")}</span></td>
          <td><select data-site="${esc(u.site_as_printed)}">${opts(job.decisions[u.site_as_printed])}</select></td></tr>`).join("")}</table></div>` : ""}
      ${Object.keys(job.decisions).length ? `<p class="muted">Your choices: ${Object.entries(job.decisions).map(([k, v]) => `${esc(k)} → ${esc(v || "skipped")}`).join("; ")} <a href="#" id="rv-undo">undo</a></p>` : ""}
      ${m.unknownParams.length ? `<div class="warnbox">Parameters not recognised and left out: ${m.unknownParams.map(esc).join(", ")}</div>` : ""}
      ${m.outside ? `<p class="muted">${m.outside} values from sites outside Bhopal were left out.</p>` : ""}
      ${replaces.length ? `<div class="warnbox">This replaces existing data for ${replaces.length} ghat-season(s): ${[...new Set(replaces.map((k) => k.split("|").slice(0, 2).join(" ")))].join(", ")}.</div>` : ""}
      ${R.length ? "" : `<p class="err">No readings for the 7 Bhopal ghats were found. Map a site above or check the file.</p>`}
      <div class="dlg-foot" style="padding:12px 0 0">
        <button class="btn" id="rv-cancel">Cancel</button>
        <button class="btn btn-primary" id="rv-ok" ${R.length ? "" : "disabled"}>Confirm: add ${R.length} readings and update the map</button>
      </div></div>`;

    document.querySelectorAll(".review select[data-site]").forEach((s) => (s.onchange = () => { job.decisions[s.dataset.site] = s.value; remap(); review(); }));
    const undo = $("rv-undo"); if (undo) undo.onclick = (e) => { e.preventDefault(); job.decisions = {}; remap(); review(); };
    $("rv-year").onchange = (e) => { job.year = Number(e.target.value); remap(); review(); };
    $("rv-cancel").onclick = () => stepDrop();
    $("rv-ok").onclick = confirm;
  }

  async function confirm() {
    const before = Object.fromEntries(App.state.alerts.map((a) => [a.site, a.level]));
    const rec = { fileName: job.file.name, kind: job.kind, year: job.year, addedAt: new Date().toISOString(),
      readings: job.mapped.readings, pdf: job.kind === "pdf" ? job.file : null };
    let uploads;
    try { await Store.add(rec); uploads = await Store.all(); }
    catch (e) { uploads = [...App.state.uploads, { ...rec, id: Date.now() }]; App.toast("Could not save in this browser; the update lasts until you close the page."); }
    App.applyData(uploads);
    App.refresh();
    const changed = App.state.alerts.filter((a) => before[a.site] !== a.level);
    const seasons = [...new Set(rec.readings.map((r) => `${r.festival} ${r.year}`))].join(" and ");
    $("dlg-upload").close();
    App.toast(`${seasons} added from ${rec.fileName}: ${changed.length} ghat${changed.length === 1 ? "" : "s"} changed alert level${changed.length ? ` (${changed.map((g) => g.site.split(" (")[0]).join(", ")})` : ""}.`);
  }

  $("btn-upload").onclick = () => { stepDrop(); $("dlg-upload").showModal(); };
})();
