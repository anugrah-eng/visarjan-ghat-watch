// Visarjan Ghat Watch: map, ranked list, ghat detail, CPCB report, CSV export and brief.
(function () {
  const cfg = window.CONFIG, S = window.Scoring;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FEATURES = Object.fromEntries(BUNDLED.ghats.features.map((f) => [f.properties.site, f]));
  const SITES = Object.keys(FEATURES);
  const ICON = { red: "!", amber: "▲", green: "✓", violet: "?" };
  const PH_ORDER = ["pre", "during", "after"];
  const PH_SHORT = { pre: "Before", during: "During", after: "1 week after" };

  const state = { uploads: [], readings: [], results: null, rep: null, pdfUrls: {}, markers: {}, map: null, popup: null,
    nameHi: (site) => (FEATURES[site] ? FEATURES[site].properties.name_hi : site) };

  // ---------- data ----------
  function applyData(uploads) {
    // ?until=2024 drops later years from the bundled data, to rehearse adding a new report.
    const until = Number(new URLSearchParams(location.search).get("until")) || Infinity;
    let base = BUNDLED.readings.filter((r) => Number(r.year) <= until).map((r) => ({ ...r }));
    Object.values(state.pdfUrls).forEach((u) => URL.revokeObjectURL(u));
    state.pdfUrls = {};
    for (const u of uploads) {
      // An uploaded season replaces the same year + festival + ghat from earlier data.
      const keys = new Set(u.readings.map((r) => `${r.year}|${r.festival}|${r.site}`));
      base = base.filter((r) => !keys.has(`${r.year}|${r.festival}|${r.site}`))
        .concat(u.readings.map((r) => ({ ...r, uploadId: u.id })));
      if (u.pdf) state.pdfUrls[u.id] = URL.createObjectURL(u.pdf);
    }
    state.uploads = uploads;
    state.readings = S.prepare(base);
    state.results = S.scoreAll(state.readings, SITES, cfg);
    state.rep = S.cpcbReport(state.readings, cfg);
  }

  function srcHref(r) {
    if (r.uploadId && state.pdfUrls[r.uploadId]) return `${state.pdfUrls[r.uploadId]}#page=${r.source_page}`;
    const rep = BUNDLED.reports[String(r.year)];
    return rep ? `../resources/${rep.file}#page=${r.source_page}` : null;
  }
  function officialHref(r) {
    const rep = BUNDLED.reports[String(r.year)];
    return rep ? `${rep.url}#page=${r.source_page}` : null;
  }
  const ghatOf = (site) => state.results.ghats.find((g) => g.site === site);
  const statusChip = (s, hi) => `<span class="status ${s}">${ICON[s]} ${esc(hi ? cfg.status[s].label_hi : cfg.status[s].label)}</span>`;
  function limitText(p) {
    const l = cfg.limits[p];
    if (!l) return "no bathing limit";
    return l.type === "min" ? `limit ≥ ${l.value}` : l.type === "max" ? `limit ≤ ${l.value}` : `limit ${l.min}–${l.max}`;
  }

  // ---------- header, list, limitations ----------
  function renderHeader() {
    const d = Brief.daysLeft(cfg);
    $("countdown").textContent = `Durga Visarjan 20 Oct 2026 · ${d} day${d === 1 ? "" : "s"} left`;
    const years = [...new Set(state.readings.map((r) => r.year))].sort();
    const up = state.uploads.length ? ` · includes ${state.uploads.length} uploaded report${state.uploads.length > 1 ? "s" : ""} (<a href="#" id="reset-data">reset to bundled data</a>)` : "";
    $("data-note").innerHTML = `${state.readings.length} readings, ${years[0]}–${years[years.length - 1]}, Ganesh and Durga. Ranked by weighted breaches of CPCB Class B limits; Durga and recent years count more.${up}`;
    const reset = $("reset-data");
    if (reset) reset.onclick = async (e) => { e.preventDefault(); await Store.clear(); applyData([]); refresh(); toast("Back to the bundled 2023–25 data."); };
  }

  function renderList() {
    $("ghat-list").innerHTML = state.results.ghats.map((g) => {
      const reason = (g.reasons.find((r) => !r.gap) || g.reasons[0] || {}).en || "No breaches in the data.";
      const amb = FEATURES[g.site].properties.note ? `<span class="chip warn" title="${esc(FEATURES[g.site].properties.note)}">⚠ may be two sites</span>` : "";
      const gap = g.gaps.length ? `<span class="chip gap">? Not tested: ${g.gaps.map((x) => `${x.festival} ${x.year}`).join(", ")}</span>` : "";
      return `<li class="ghat-card" data-site="${esc(g.site)}" style="border-left-color:${cfg.status[g.status].color}">
        <div class="row1"><span class="rank">#${g.rank}</span><span class="name">${esc(g.site)}</span>${statusChip(g.status)}</div>
        <div class="reason">${esc(reason)}</div>
        <div class="chips">${gap}${g.actions.map((a) => `<span class="chip action">→ ${esc(a.en)}</span>`).join("")}${amb}</div>
      </li>`;
    }).join("");
    document.querySelectorAll(".ghat-card").forEach((el) => (el.onclick = () => selectGhat(el.dataset.site)));
  }

  function renderLimits() {
    const gapGhats = state.results.ghats.filter((g) => g.gaps.length)
      .map((g) => `${g.site} (${g.gaps.map((x) => `${x.festival} ${x.year}`).join(", ")})`);
    const items = [
      "No coliform (bacteria) tests in these reports, although CPCB Class B sets a coliform limit.",
      "Only 4 metals were tested (chromium, lead, zinc, copper). CPCB sets no bathing limit for them, so they are shown but not scored.",
      "The reports print no units. Standard units are assumed (mg/l, NTU, µS/cm).",
      gapGhats.length ? `Not tested, so shown as missing, never as clean: ${gapGhats.join("; ")}.` : null,
      "Suspended solids is missing from some Durga tables.",
      "“Rani Kamlapati ghat / Kamla Park kund” may be two places: Ganesh tables say Kamla Park kund, Durga tables say Lower Lake ghat.",
      "The new BMC ghats have no test history. The ranking reflects past readings and is not a forecast for 2026.",
      "No health effects are claimed. The tool only compares readings with CPCB limits.",
      "Map locations are approximate until checked on the ground.",
    ].filter(Boolean);
    $("limits-list").innerHTML = items.map((t) => `<li>${esc(t)}</li>`).join("");
  }

  // ---------- map ----------
  const RASTER = { version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] };

  function initMap() {
    if (!window.maplibregl) { $("map-notice").hidden = false; return; }
    const map = new maplibregl.Map({ container: "map", style: "https://tiles.openfreemap.org/styles/positron",
      center: [77.40, 23.255], zoom: 11, attributionControl: { compact: true } });
    state.map = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    let fellBack = false, errors = 0;
    const fallback = () => { if (!fellBack) { fellBack = true; map.setStyle(RASTER); } };
    const t = setTimeout(() => { if (!map.isStyleLoaded()) fallback(); }, 6000);
    map.on("load", () => clearTimeout(t));
    map.on("error", () => { errors++; if (!map.isStyleLoaded()) fallback(); if (errors > 6) $("map-notice").hidden = false; });
    const b = new maplibregl.LngLatBounds();
    SITES.forEach((s) => b.extend(FEATURES[s].geometry.coordinates));
    map.fitBounds(b, { padding: { top: 70, bottom: 70, left: 70, right: 220 }, duration: 0 });
  }

  function renderMarkers() {
    if (!state.map) return;
    Object.values(state.markers).forEach((m) => m.remove());
    state.markers = {};
    for (const g of state.results.ghats) {
      const el = document.createElement("div");
      el.className = `mk ${g.status}`;
      el.title = `${g.site}: ${cfg.status[g.status].label}`;
      el.innerHTML = `${ICON[g.status]}${g.latestGap && g.status !== "violet" ? '<span class="gapring"></span>' : ""}<span class="mk-label">#${g.rank} ${esc(g.site.split(" (")[0].split(" /")[0])}</span>`;
      el.addEventListener("click", (e) => { e.stopPropagation(); selectGhat(g.site); });
      state.markers[g.site] = new maplibregl.Marker({ element: el }).setLngLat(FEATURES[g.site].geometry.coordinates).addTo(state.map);
    }
  }

  function renderLegend() {
    const sw = (s) => `<span class="sw" style="background:${cfg.status[s].color};${s === "amber" ? "color:#1c1c1a" : ""}">${ICON[s]}</span>`;
    $("legend").innerHTML = ["red", "amber", "green", "violet"].map((s) => `<div>${sw(s)} ${esc(cfg.status[s].label)}</div>`).join("") +
      `<div class="foot">Dashed violet ring = recent Durga data missing.<br>Locations approximate.</div>`;
  }

  function popupHTML(g) {
    const f = FEATURES[g.site].properties, latest = state.results.ctx.latestAhead;
    // If the latest Durga was not tested, say so and show the last Durga that was.
    const testedYears = [...new Set(state.readings.filter((x) => x.site === g.site && x.festival === cfg.festivalAhead &&
      (x.parameter === "Dissolved oxygen" || x.parameter === "BOD") && !S.isMissing(x)).map((x) => x.year))].sort((a, b) => b - a);
    const yr = testedYears[0] ?? latest;
    const gapNote = yr !== latest ? `<p style="color:#4c1d95;font-weight:600">? ${cfg.festivalAhead} ${latest}: not tested (missing, not clean). Showing ${cfg.festivalAhead} ${yr}.</p>` : "";
    const cell = (p, ph) => {
      const r = state.readings.find((x) => x.site === g.site && x.year === yr && x.festival === cfg.festivalAhead && x.parameter === p && x.phase === ph);
      if (!r || S.isMissing(r)) return `<td class="m">Not tested</td>`;
      if (S.isBDL(r)) return `<td>BDL</td>`;
      return `<td class="${S.breach(r, cfg) ? "b" : ""}">${S.fmt(r.value)}</td>`;
    };
    const reason = (g.reasons.find((r) => !r.gap) || g.reasons[0] || {}).en || "";
    return `<div class="pop"><h3>${esc(g.site)}</h3><div class="meta">${esc(f.water_body)} · rank #${g.rank} of ${SITES.length}</div>
      ${statusChip(g.status)}<p>${esc(reason)}</p>${gapNote}
      <table><tr><td><b>${cfg.festivalAhead} ${yr}</b></td><td>Before</td><td>During</td><td>After</td></tr>
      ${["Dissolved oxygen", "BOD", "pH"].map((p) => `<tr><td>${p === "Dissolved oxygen" ? "DO" : p} <span class="nolimit">${limitText(p)}</span></td>${PH_ORDER.map((ph) => cell(p, ph)).join("")}</tr>`).join("")}</table>
      ${g.actions.length ? `<p><b>Action:</b> ${g.actions.map((a) => esc(a.en)).join("; ")}</p>` : ""}
      <button class="btn btn-primary" onclick="App.showDetail('${esc(g.site).replace(/'/g, "\\'")}')">View all 13 parameters →</button></div>`;
  }

  function selectGhat(site) {
    const g = ghatOf(site);
    showDetail(site);
    if (!state.map) return;
    if (state.popup) state.popup.remove();
    state.popup = new maplibregl.Popup({ offset: 22, maxWidth: "320px" }).setLngLat(FEATURES[site].geometry.coordinates)
      .setHTML(popupHTML(g)).addTo(state.map);
    state.map.flyTo({ center: FEATURES[site].geometry.coordinates, zoom: Math.max(state.map.getZoom(), 12), speed: 1.4 });
  }

  // ---------- views ----------
  function show(view) {
    for (const v of ["view-list", "view-detail", "view-report"]) $(v).hidden = v !== view;
    $("sidebar").scrollTop = 0;
  }

  function showDetail(site, filters = {}) {
    const g = ghatOf(site), f = FEATURES[site].properties;
    const rows = state.readings.filter((r) => r.site === site);
    const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a);
    const fy = filters.year || "all", ff = filters.festival || "all";
    const seasons = S.seasons(state.readings).reverse()
      .filter((s) => (fy === "all" || s.year == fy) && (ff === "all" || s.festival === ff));

    const cell = (r) => {
      if (!r || S.isMissing(r)) return `<td class="missing" title="${r ? `As printed: '${esc(r.value_as_printed || "blank")}' · page ${r.source_page}` : "No table in the report"}">Not tested</td>`;
      const href = srcHref(r), off = officialHref(r);
      const tip = `As printed: ${r.value_as_printed} · ${r.unit_assumed || "no unit"} (assumed) · report page ${r.source_page}${r.uploadId ? " · uploaded" : ""}`;
      const a = (txt) => href ? `<a href="${href}" target="_blank" title="${esc(tip)}" data-official="${esc(off || "")}">${txt}</a>` : esc(txt);
      if (S.isBDL(r)) return `<td class="bdl">${a("BDL")}</td>`;
      return `<td class="${S.breach(r, cfg) ? "breach" : "ok"}">${a(S.fmt(r.value))}</td>`;
    };

    const tables = seasons.map((s) => {
      const sr = rows.filter((r) => r.year === s.year && r.festival === s.festival);
      const page = sr.length ? [...new Set(sr.map((r) => r.source_page))].join(", ") : null;
      const body = cfg.parameterOrder.map((p) => {
        const byPh = Object.fromEntries(PH_ORDER.map((ph) => [ph, sr.find((r) => r.parameter === p && r.phase === ph)]));
        return `<tr><td>${esc(p)}<span class="lim">${limitText(p)}${cfg.units[p] ? " · " + cfg.units[p] : ""}</span></td>${PH_ORDER.map((ph) => cell(byPh[ph])).join("")}</tr>`;
      }).join("");
      return `<div class="season">${s.festival} ${s.year} ${page ? `<span class="muted">· report page ${page}</span>` : `<span class="chip gap">? No table in the report: not tested</span>`}</div>
        <table class="readings"><tr><th>Parameter</th>${PH_ORDER.map((ph) => `<th>${PH_SHORT[ph]}</th>`).join("")}</tr>${body}</table>`;
    }).join("");

    $("view-detail").innerHTML = `<button class="back" id="back">← All ghats</button>
      <div class="detail-head"><h2>${esc(site)}</h2>
        <div class="meta">${esc(f.name_hi)} · ${esc(f.water_body)} · rank #${g.rank} · score ${g.score} · ${g.counts.sampled} of ${g.counts.scored} DO/BOD/pH readings tested</div>
        ${statusChip(g.status)} ${f.note ? `<span class="chip warn">⚠ ${esc(f.note)}</span>` : ""}</div>
      <ol class="reasons">${g.reasons.map((r) => `<li class="${r.gap ? "gap" : ""}">${esc(r.en)}</li>`).join("") || "<li>No breaches in the data.</li>"}</ol>
      <div class="chips">${g.actions.map((a) => `<span class="chip action">→ ${esc(a.en)}</span>`).join("")}</div>
      <div class="filters">Year <select id="f-year"><option value="all">All</option>${years.map((y) => `<option ${fy == y ? "selected" : ""}>${y}</option>`).join("")}</select>
        Festival <select id="f-fest"><option value="all">All</option>${["Durga", "Ganesh"].map((x) => `<option ${ff === x ? "selected" : ""}>${x}</option>`).join("")}</select>
        <button class="btn" id="btn-export-ghat">⬇ Export these readings CSV</button></div>
      <p class="muted">Red ▲ = breaks the CPCB bathing limit. Click any value to open the MPPCB report at that page. Violet "Not tested" = no reading: missing, not clean.</p>
      ${tables}`;
    $("back").onclick = () => show("view-list");
    const re = () => showDetail(site, { year: $("f-year").value, festival: $("f-fest").value });
    $("f-year").onchange = re; $("f-fest").onchange = re;
    $("btn-export-ghat").onclick = () => exportReadings(rows.filter((r) => (fy === "all" || r.year == fy) && (ff === "all" || r.festival === ff)),
      `${site.split(" ")[0].toLowerCase()}_readings.csv`);
    show("view-detail");
  }

  function showReport() {
    const rep = state.rep;
    const meter = (n, d) => `<span class="meter" role="img" aria-label="${n} of ${d}"><i style="width:${d ? (100 * n) / d : 0}%"></i></span>`;
    const rowsAll = Object.entries(rep).map(([p, v]) => `<tr><td>${p}</td><td>${limitText(p)}</td>
      <td class="num">${v.breaches} of ${v.sampled}${meter(v.breaches, v.sampled)}</td><td class="num">${v.missing}</td></tr>`).join("");
    const per = state.results.ghats.map((g) => {
      const r = S.cpcbReport(state.readings, cfg, g.site);
      const c = (p) => `${r[p].breaches}/${r[p].sampled}`;
      const miss = Object.values(r).reduce((a, v) => a + v.missing, 0);
      return `<tr><td>${statusChip(g.status)}<br>${esc(g.site)}</td><td class="num">${c("Dissolved oxygen")}</td><td class="num">${c("BOD")}</td><td class="num">${c("pH")}</td><td class="num">${miss}</td></tr>`;
    }).join("");
    $("view-report").innerHTML = `<button class="back" id="back2">← All ghats</button>
      <h2 style="font-size:17px">CPCB report: pH, dissolved oxygen, BOD</h2>
      <p class="muted">Class B (organised outdoor bathing) is used because devotees enter the water at ghats. Limits: DO 5 mg/l or more, BOD 3 mg/l or less, pH 6.5–8.5 (CPCB water-quality criteria). Counts are readings that break the limit, out of readings actually tested. BDL counts as within the BOD limit.</p>
      <table class="rep-table"><tr><th>Parameter</th><th>Class B limit</th><th>Breaches</th><th>Not tested</th></tr>${rowsAll}</table>
      <h3 style="font-size:14.5px">By ghat (breaches / tested)</h3>
      <table class="rep-table"><tr><th>Ghat</th><th>DO</th><th>BOD</th><th>pH</th><th>Not tested</th></tr>${per}</table>
      <button class="btn" id="btn-export-report">⬇ Export this report CSV</button>`;
    $("back2").onclick = () => show("view-list");
    $("btn-export-report").onclick = () => {
      const out = state.results.ghats.map((g) => {
        const r = S.cpcbReport(state.readings, cfg, g.site);
        return { rank: g.rank, site: g.site, status: cfg.status[g.status].label,
          do_below_5: r["Dissolved oxygen"].breaches, do_tested: r["Dissolved oxygen"].sampled,
          bod_above_3: r.BOD.breaches, bod_tested: r.BOD.sampled, ph_outside: r.pH.breaches, ph_tested: r.pH.sampled,
          not_tested: Object.values(r).reduce((a, v) => a + v.missing, 0) };
      });
      download(toCSV(out), "cpcb_class_b_report.csv");
    };
    show("view-report");
  }

  // ---------- CSV ----------
  function toCSV(rows) {
    if (!rows.length) return "";
    const cols = Object.keys(rows[0]);
    const q = (v) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return [cols.join(","), ...rows.map((r) => cols.map((c) => q(r[c])).join(","))].join("\r\n");
  }
  function download(text, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function exportReadings(rows, name) {
    download(toCSV(rows.map((r) => ({
      year: r.year, festival: r.festival, site: r.site, water_body: r.water_body, phase: r.phase, parameter: r.parameter,
      value: r.value, unit_assumed: r.unit_assumed, flag: r.flag, value_as_printed: r.value_as_printed,
      cpcb_class_b_limit: cfg.limits[r.parameter] ? limitText(r.parameter).replace("limit ", "") : "",
      breaches_limit: S.breach(r, cfg) === true ? "yes" : S.breach(r, cfg) === false ? "no" : "",
      source_file: r.source_file, source_page: r.source_page,
    }))), name);
  }
  function exportSummary() {
    download(toCSV(state.results.ghats.map((g) => ({
      rank: g.rank, site: g.site, status: cfg.status[g.status].label, score: g.score,
      reason: (g.reasons.find((r) => !r.gap) || g.reasons[0] || {}).en || "",
      not_tested: g.gaps.map((x) => `${x.festival} ${x.year}`).join("; "),
      actions: g.actions.map((a) => a.en).join("; "),
      dod_bod_ph_tested: `${g.counts.sampled} of ${g.counts.scored}`,
      lat: FEATURES[g.site].geometry.coordinates[1], lon: FEATURES[g.site].geometry.coordinates[0],
      location: FEATURES[g.site].properties.coord_status,
    }))), "ghat_risk_ranking.csv");
  }

  // ---------- brief ----------
  let briefLang = "en";
  function renderBrief() {
    const en = Brief.build(state, "en"), hi = Brief.build(state, "hi");
    const block = (t, l) => `<div class="lang-${l}"><pre>${esc(t)}</pre></div>`;
    $("brief-body").innerHTML = briefLang === "en" ? block(en, "en") : briefLang === "hi" ? block(hi, "hi") : block(en, "en") + block(hi, "hi");
    const words = (briefLang === "hi" ? hi : en).split(/\s+/).length;
    $("brief-status").textContent = `${words} words · built from the data shown on the map`;
    $("print-area").innerHTML = (briefLang === "hi" ? [hi] : briefLang === "en" ? [en] : [en, hi])
      .map((t) => `<div class="page"><pre>${esc(t)}</pre></div>`).join("");
    return briefLang === "en" ? en : briefLang === "hi" ? hi : en + "\n\n" + hi;
  }

  // ---------- misc ----------
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 5000);
  }

  function refresh() {
    renderHeader(); renderList(); renderLimits(); renderMarkers(); renderLegend();
    if (!$("view-report").hidden) showReport();
    if (!$("view-detail").hidden) show("view-list");
  }

  document.querySelectorAll("dialog [data-close]").forEach((b) => (b.onclick = () => b.closest("dialog").close()));
  $("btn-brief").onclick = () => { renderBrief(); $("dlg-brief").showModal(); };
  document.querySelectorAll("#dlg-brief .seg button").forEach((b) => (b.onclick = () => {
    briefLang = b.dataset.lang;
    document.querySelectorAll("#dlg-brief .seg button").forEach((x) => x.classList.toggle("on", x === b));
    renderBrief();
  }));
  $("btn-copy").onclick = async () => {
    const text = renderBrief();
    try { await navigator.clipboard.writeText(text); toast("Brief copied. Paste it into WhatsApp."); }
    catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); toast("Brief copied."); }
  };
  $("btn-print").onclick = () => { renderBrief(); window.print(); };
  $("btn-report").onclick = showReport;
  $("btn-export-summary").onclick = exportSummary;
  $("btn-export-all").onclick = () => exportReadings(state.readings, "bhopal_ghat_readings.csv");

  window.App = { state, applyData, refresh, toast, showDetail, selectGhat, toCSV, SITES };

  (async function start() {
    applyData([]);
    initMap();
    refresh();
    const uploads = await Store.all();
    if (uploads.length) { applyData(uploads); refresh(); }
    // Deep links: #ghat=<name>, #report, #brief
    const h = decodeURIComponent(location.hash.slice(1));
    if (h.startsWith("ghat=") && FEATURES[h.slice(5)]) setTimeout(() => selectGhat(h.slice(5)), 300);
    else if (h === "report") showReport();
    else if (h === "brief") $("btn-brief").click();
  })();
})();
