// Visarjan Ghat Watch dashboard: overview (map, ghat panel, table, counts, alerts), ghat detail with trends,
// cross-ghat comparison, alerts, CPCB report and notes on the data. All text comes from i18n.js.
(function () {
  const cfg = window.CONFIG, S = window.Scoring, A = window.Alerts, T = window.I18N;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FEATURES = Object.fromEntries(BUNDLED.ghats.features.map((f) => [f.properties.site, f]));
  const SITES = Object.keys(FEATURES);
  const ICON = { critical: "!!", warning: "!", advisory: "~", normal: "✓", nodata: "?" };
  const PH = ["pre", "during", "after"];
  const KEY_PARAMS = ["pH", "Dissolved oxygen", "BOD", "Turbidity"];
  const qs = new URLSearchParams(location.search);
  const NOW = qs.get("now") ? new Date(qs.get("now")) : new Date();

  const state = { uploads: [], readings: [], results: null, alerts: [], rep: null, pdfUrls: {}, selected: null,
    bm: null, pins: {}, places: [], popup: null, compare: { param: "Dissolved oxygen", season: null }, tables: {},
    nameHi: (site) => T.ghatIn(site, "hi") };

  // ---------- data ----------
  function applyData(uploads) {
    // ?until=2024 drops later years from the bundled data, to rehearse adding a new report.
    const until = Number(qs.get("until")) || Infinity;
    let base = BUNDLED.readings.filter((r) => Number(r.year) <= until).map((r) => ({ ...r }));
    Object.values(state.pdfUrls).forEach((u) => URL.revokeObjectURL(u));
    state.pdfUrls = {};
    for (const u of uploads) {
      const keys = new Set(u.readings.map((r) => `${r.year}|${r.festival}|${r.site}`));
      base = base.filter((r) => !keys.has(`${r.year}|${r.festival}|${r.site}`)).concat(u.readings.map((r) => ({ ...r, uploadId: u.id })));
      if (u.pdf) state.pdfUrls[u.id] = URL.createObjectURL(u.pdf);
    }
    state.uploads = uploads;
    state.readings = S.prepare(base);
    state.results = S.scoreAll(state.readings, SITES, cfg);
    state.alerts = A.evaluateAll(state.readings, SITES, cfg, NOW);
    state.rep = S.cpcbReport(state.readings, cfg);
    if (!state.selected) state.selected = state.alerts[0].site;
  }
  const alertOf = (site) => state.alerts.find((a) => a.site === site);
  const histOf = (site) => state.results.ghats.find((g) => g.site === site);
  function srcHref(r) {
    if (r.uploadId && state.pdfUrls[r.uploadId]) return `${state.pdfUrls[r.uploadId]}#page=${r.source_page}`;
    const rep = BUNDLED.reports[String(r.year)];
    return rep ? `../resources/${rep.file}#page=${r.source_page}` : null;
  }
  const seasonLabel = (s) => (s ? `${T.fest(s.festival)} ${s.year}` : "–");
  const dateLabel = (iso) => (iso ? new Date(iso + "T00:00:00Z").toLocaleDateString(T.lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "–");
  const lvChip = (a) => `<span class="lv lv-${a.level}">${ICON[a.level]} ${esc(T.level(a.level))}</span>` +
    (a.stale ? ` <span class="lv lv-stale">⌛ ${esc(T.t("outdated"))}</span>` : "");
  function limitText(p) {
    const l = cfg.limits[p];
    if (!l) return T.t("noLimit");
    return l.type === "min" ? `≥ ${l.value}` : l.type === "max" ? `≤ ${l.value}` : `${l.min}–${l.max}`;
  }
  const unit = (p) => cfg.units[p] || "";
  const span = () => { const ys = [...new Set(state.readings.map((r) => r.year))].sort(); return `${ys[0]}–${ys[ys.length - 1]}`; };
  function newest() {
    const dated = state.readings.filter((r) => r.value !== null).map((r) => ({ r, d: A.sampleDate(r, cfg.alerts) }));
    const top = dated.sort((a, b) => b.d - a.d)[0];
    return top ? { season: { year: top.r.year, festival: top.r.festival }, date: top.d.toISOString().slice(0, 10) } : null;
  }
  const sourceLine = () => {
    const n = newest();
    return `${esc(T.t("source", { span: span() }))} ${n ? esc(T.t("freshness", { season: seasonLabel(n.season), date: dateLabel(n.date) })) : ""}`;
  };
  function triggerText(t) {
    // Show the value against the CPCB bathing limit; name the tier that set the alert level.
    const cp = cfg.limits[t.parameter] ? limitText(t.parameter) : t.limit;
    return `${esc(T.param(t.parameter))}, ${esc(T.phase(t.phase).toLowerCase())}: <b>${esc(S.fmt(t.value))}${unit(t.parameter) ? " " + esc(unit(t.parameter)) : ""}</b> ` +
      `<span class="small">(${esc(T.t("limit"))} ${esc(cp)})</span> <span class="lv-word txt-${t.level}">${esc(T.level(t.level))}</span>` +
      `${t.source === "team" ? ` <span class="tag-team">${esc(T.t("teamRule"))}: ${esc(t.limit)}</span>` : ""}` +
      `${t.page ? ` · <a href="${esc(srcHref(state.readings[t.id]) || "#")}" target="_blank">p. ${t.page}</a>` : ""}`;
  }
  const actionList = (a, max) => `<ul class="actions">${a.actions.slice(0, max || 99).map((x) =>
    `<li>${esc(T.action(x.key, T.lang))}<span class="hi" lang="${T.lang === "hi" ? "en" : "hi"}">${esc(T.action(x.key, T.lang === "hi" ? "en" : "hi"))}</span></li>`).join("")}</ul>`;

  // ---------- i18n + theme ----------
  function applyText() {
    document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = T.t(el.dataset.t)));
    document.querySelectorAll("[data-alt]").forEach((el) => (el.alt = T.t(el.dataset.alt)));
    document.querySelectorAll("[data-t-title]").forEach((el) => { el.title = T.t(el.dataset.tTitle); el.setAttribute("aria-label", el.title); });
    document.querySelectorAll("[data-lang-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.langBtn === T.lang)));
    const th = document.documentElement.getAttribute("data-theme");
    document.querySelectorAll("[data-theme-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeBtn === th)));
    $("countdown").textContent = T.t("daysToGo", { n: Brief.daysLeft(cfg) });
    const nw = newest();
    if (nw) { const age = Math.floor((NOW - new Date(nw.date + "T00:00:00Z")) / 86400000);
      $("age-badge").textContent = T.t("daysOld", { n: age }); $("age-badge").classList.toggle("old", age > cfg.alerts.staleDays);
      $("age-badge").parentElement.title = T.t("freshness", { season: seasonLabel(nw.season), date: dateLabel(nw.date) }); }
    // Date range of the data on screen (sampling dates are approximate: festival days).
    const ds = state.readings.filter((r) => r.value !== null).map((r) => A.sampleDate(r, cfg.alerts)).sort((x, y) => x - y);
    const m = (d) => d.toLocaleDateString(T.lang === "hi" ? "hi-IN" : "en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
    if (ds.length) $("data-range").textContent = `${m(ds[0])} – ${m(ds[ds.length - 1])}`;
  }

  // ---------- map ----------
  const LV_COLOR = { critical: "var(--crit)", warning: "var(--warn)", advisory: "var(--adv)", normal: "var(--ok)", nodata: "var(--data)" };
  function initMap() {
    if (!window.maplibregl || !$("map")) return;
    state.bm = Basemap.create($("map"), { base: localStorage.getItem("vgw-base") || "satellite", lang: T.lang,
      theme: document.documentElement.getAttribute("data-theme"), pitch: 0 });
    state.bm.map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    markBase();
  }
  function fitGhats() {
    const b = new maplibregl.LngLatBounds();
    SITES.forEach((s) => b.extend(FEATURES[s].geometry.coordinates));
    const map = state.bm.map, narrow = window.innerWidth < 760;
    map.resize();
    map.fitBounds(b, { padding: narrow ? { top: 90, bottom: 70, left: 40, right: 110 } : { top: 80, bottom: 60, left: 60, right: 190 }, duration: 0, pitch: 0 });
    const collapse = () => document.querySelectorAll("#map .maplibregl-ctrl-attrib").forEach((el) => el.classList.remove("maplibregl-compact-show"));
    if (narrow) { collapse(); map.once("idle", collapse); }
    state.fitted = true;
  }
  function markBase() {
    $("btn-layer").setAttribute("aria-pressed", String(state.bm.base === "streets"));
    $("btn-layer").title = T.t(state.bm.base === "satellite" ? "streets" : "satellite");
    $("map").classList.toggle("streets", state.bm.base === "streets");
    $("map-note").textContent = `${T.t("approx")}: ${T.lang === "hi" ? "घाटों की स्थिति अनुमानित है" : "ghat locations are approximate"}`;
  }
  // Teardrop pin coloured by alert level, with an icon (never colour alone) and a dark name label.
  const pinSVG = (a) => `<svg class="tear" viewBox="0 0 32 42" aria-hidden="true"><path d="M16 1C8 1 2 7 2 15c0 10.5 14 26 14 26s14-15.5 14-26C30 7 24 1 16 1z" fill="${LV_COLOR[a.level]}" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15" r="8.5" fill="#fff"/><text x="16" y="19.5" text-anchor="middle" font-size="12" font-weight="800" fill="${LV_COLOR[a.level]}">${ICON[a.level]}</text></svg>`;
  function renderPins() {
    if (!state.bm) return;
    Object.values(state.pins).forEach((m) => m.remove());
    state.places.forEach((m) => m.remove());
    state.pins = {}; state.places = [];
    for (const p of T.PLACES) {
      const el = document.createElement("div");
      el.className = `place ${p.size}`; el.textContent = T.lang === "hi" ? p.hi : p.en;
      state.places.push(new maplibregl.Marker({ element: el, opacityWhenCovered: "1" }).setLngLat(p.lngLat).addTo(state.bm.map));
    }
    for (const a of state.alerts) {
      const el = document.createElement("button");
      el.className = `pin2${a.stale ? " stale" : ""}${a.site === state.selected ? " sel" : ""}`;
      el.setAttribute("aria-label", `${T.ghat(a.site)}: ${T.level(a.level)}${a.stale ? ", " + T.t("outdated") : ""}`);
      el.innerHTML = `${pinSVG(a)}<span class="plbl">${esc(T.ghat(a.site))}</span>`;
      el.addEventListener("click", (e) => { e.stopPropagation(); select(a.site, true); });
      state.pins[a.site] = new maplibregl.Marker({ element: el, anchor: "bottom-left", offset: [-16, 0], opacityWhenCovered: "1" }).setLngLat(FEATURES[a.site].geometry.coordinates).addTo(state.bm.map);
    }
  }
  // Thumbnail: the report photo if one exists (only Bairagarh), otherwise the satellite tile around the site.
  function thumb(site, cls) {
    const img = window.GHAT_IMAGES && GHAT_IMAGES[site] && GHAT_IMAGES[site].card;
    if (img && img.kind === "photo") return `<img class="${cls}" src="${esc(img.src)}" alt="${esc(T.t("photoThumb"))}" title="${esc(T.t("photoThumb"))}">`;
    const [lng, lat] = FEATURES[site].geometry.coordinates, z = 14, n = 2 ** z;
    const xf = ((lng + 180) / 360) * n, yf = ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n;
    const x = Math.floor(xf), y = Math.floor(yf), px = Math.round((xf - x) * 256), py = Math.round((yf - y) * 256);
    const url = `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/${z}/${y}/${x}.jpg`;
    return `<span class="${cls} sat" role="img" aria-label="${esc(T.t("satThumb"))}" title="${esc(T.t("satThumb"))}" style="background-image:url('${url}');background-position:calc(50% - ${px - 128}px) calc(50% - ${py - 128}px)"></span>`;
  }
  function statusChip(a) {
    const meets = a.level === "normal";
    return `<span class="chip2 lvc-${a.level}"><span class="cdot" aria-hidden="true">${ICON[a.level]}</span>${esc(T.level(a.level))}</span>` +
      (a.level !== "nodata" ? `<span class="chip2-sub">${esc(T.t(meets ? "meetsB" : "breaksB"))}</span>` : "") +
      (a.stale ? ` <span class="lv lv-stale">⌛ ${esc(T.t("outdated"))}</span>` : "");
  }
  function mini(a, p) {
    const r = latestOf(a.site, a.season, p);
    if (!r) return `<div><span>${esc(T.param(p, true))}</span><b class="txt-nodata">–</b><small>${esc(T.t("notTested"))}</small></div>`;
    const br = S.breach(r, cfg) === true;
    return `<div><span>${esc(T.param(p, true))}</span><b class="${br ? "txt-critical" : ""}">${S.isBDL(r) ? "BDL" : S.fmt(r.value)}</b><small>${esc(unit(p))}</small></div>`;
  }
  function popupHTML(a) {
    return `<div class="pop2">${thumb(a.site, "pop-thumb")}<div class="pop-main"><h3>${esc(T.ghat(a.site))}</h3>
      <div class="small muted">${esc(T.water(FEATURES[a.site].properties.water_body))}</div>
      <div class="pop-st"><span class="chip2 lvc-${a.level}"><span class="cdot">${ICON[a.level]}</span>${esc(T.level(a.level))}</span><span class="small muted">${esc(seasonLabel(a.season))}</span></div></div>
      <div class="pop-grid">${KEY_PARAMS.map((p) => mini(a, p)).join("")}</div>
      <a class="pop-link" href="#ghat=${encodeURIComponent(a.site)}">${esc(T.t("viewDetails"))} →</a></div>`;
  }
  function select(site, fromMap) {
    state.selected = site;
    renderGhatPanel(); renderSitesTable();
    Object.entries(state.pins).forEach(([s, m]) => m.getElement().classList.toggle("sel", s === site));
    if (state.bm && fromMap !== "table-only") {
      if (state.popup) state.popup.remove();
      state.popup = new maplibregl.Popup({ offset: [0, -40], maxWidth: "300px", className: "pop2-wrap" }).setLngLat(FEATURES[site].geometry.coordinates).setHTML(popupHTML(alertOf(site))).addTo(state.bm.map);
      state.bm.map.easeTo({ center: FEATURES[site].geometry.coordinates, zoom: Math.max(state.bm.map.getZoom(), 12), duration: 900 });
    }
  }

  // ---------- overview ----------
  function latestOf(site, season, p) {
    return state.readings.filter((r) => r.site === site && season && r.year === season.year && r.festival === season.festival && r.parameter === p)
      .sort((x, y) => PH.indexOf(y.phase) - PH.indexOf(x.phase)).find((r) => r.value !== null || S.isBDL(r));
  }
  state.tab = "overview";
  function renderGhatPanel() {
    const a = alertOf(state.selected), f = FEATURES[a.site].properties;
    const tile = (p) => {
      const r = latestOf(a.site, a.season, p);
      const lim = cfg.limits[p] ? `(${limitText(p)})` : "—";
      if (!r) return `<div class="mt missing"><b>–</b><span class="mt-n">${esc(T.param(p, true))}</span><span class="mt-l">${esc(T.t("notTested"))}</span></div>`;
      const br = S.breach(r, cfg) === true;
      return `<div class="mt${br ? " breach" : ""}"><b>${S.isBDL(r) ? "BDL" : S.fmt(r.value)}${unit(p) ? ` <small>${esc(unit(p))}</small>` : ""}</b><span class="mt-n">${esc(T.param(p))}</span><span class="mt-l">${esc(lim)}</span></div>`;
    };
    const pages = [...new Set(state.readings.filter((r) => r.site === a.site && a.season && r.year === a.season.year && r.festival === a.season.festival).map((r) => r.source_page))];
    const tabs = ["overview", "params", "trends", "reports"];
    const tabLabel = { overview: "tabOverview", params: "tabParams", trends: "tabTrends", reports: "tabReports" };
    let body = "";
    if (state.tab === "overview") {
      body = `<div class="mtiles">${KEY_PARAMS.map(tile).join("")}</div>
        <dl class="facts2">
          <dt><svg class="i" viewBox="0 0 24 24"><path d="M2 12c3-3 5-3 8 0s5 3 8 0 4-2 4-2M2 17c3-3 5-3 8 0s5 3 8 0 4-2 4-2"/></svg>${esc(T.t("waterBody"))}</dt><dd>${esc(T.water(f.water_body))}</dd>
          <dt><svg class="i" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>${esc(T.t("lastUpdated"))}</dt><dd>≈ ${esc(dateLabel(a.recordedAt))}${a.ageDays !== null ? ` · <span class="${a.stale ? "age-old" : ""}">${esc(T.t("daysAgo", { n: a.ageDays }))}</span>` : ""}</dd>
          <dt><svg class="i" viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>${esc(T.t("dataSource"))}</dt><dd>MPPCB (${esc(seasonLabel(a.season))}${pages.length ? `, p. ${pages.join(", ")}` : ""})</dd>
        </dl>
        <div class="gp-btns"><button class="btn btn-outline" id="gp-export"><svg class="i" viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>${esc(T.t("downloadCsv"))}</button></div>`;
    } else if (state.tab === "params") {
      body = `<table class="tbl ptbl"><tbody>${cfg.parameterOrder.map((p) => { const r = latestOf(a.site, a.season, p); const br = r && S.breach(r, cfg) === true;
        return `<tr><td>${esc(T.param(p))}</td><td class="num ${!r ? "txt-nodata" : br ? "txt-critical" : ""}">${!r ? esc(T.t("notTested")) : S.isBDL(r) ? "BDL" : (br ? "▲ " : "") + S.fmt(r.value)}</td><td class="muted small">${esc(unit(p))}</td><td class="muted small">${esc(cfg.limits[p] ? limitText(p) : T.t("noLimit"))}</td></tr>`; }).join("")}</tbody></table>
        <p class="small muted">${esc(seasonLabel(a.season))} · ${esc(T.lang === "hi" ? "सबसे बाद का चरण" : "latest phase tested")}</p>`;
    } else if (state.tab === "trends") {
      body = ["Dissolved oxygen", "BOD"].map((p) => { const pts = trendPoints(a.site, p);
        return `<div class="chart-title">${esc(T.param(p))} (${esc(unit(p))})</div><div class="chart-sub">${esc(trendSummary(pts, p))}</div>` +
          Charts.trend({ points: pts, limit: cfg.limits[p], unit: unit(p), height: 150, labels: { aria: `${T.param(p)}: ${trendSummary(pts, p)}`, limit: T.t("limit"), phases: "" } }); }).join("") +
        `<a class="pop-link" href="#ghat=${encodeURIComponent(a.site)}">${esc(T.t("viewDetails"))} →</a>`;
    } else {
      body = `<div class="gp-btns col"><button class="btn btn-primary" data-report="${esc(a.site)}">${esc(T.t("rsOpen"))}</button>
        <button class="btn btn-outline" id="gp-brief">${esc(T.t("brief"))}</button>
        <button class="btn btn-outline" id="gp-export">${esc(T.t("downloadCsv"))}</button></div>`;
    }
    $("ghat-panel").innerHTML = `<div class="gp2-head">${thumb(a.site, "gp-thumb")}<div class="gp2-name"><h2>${esc(T.ghat(a.site))}</h2>
        <div class="small muted">${esc(T.water(f.water_body))}</div><div class="gp2-st">${statusChip(a)}</div></div>
        <button class="gp-close" id="gp-close" aria-label="${esc(T.t("closePanel"))}">✕</button></div>
      <div class="tabs2" role="tablist">${tabs.map((t) => `<button role="tab" data-tab="${t}" aria-selected="${t === state.tab}">${esc(T.t(tabLabel[t]))}</button>`).join("")}</div>
      <div class="gp2-body">${body}</div>`;
    $("ghat-panel").querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { state.tab = b.dataset.tab; renderGhatPanel(); $("ghat-panel").querySelector(`[data-tab="${state.tab}"]`).focus(); }));
    const ex = $("gp-export"); if (ex) ex.onclick = () => exportReadings(state.readings.filter((r) => r.site === a.site), `${a.site.split(" ")[0].toLowerCase()}_readings.csv`);
    const br = $("gp-brief"); if (br) br.onclick = () => $("btn-brief").click();
    $("gp-close").onclick = () => { if (state.popup) state.popup.remove(); if (state.bm) fitGhats(); };
  }
  function renderSitesTable() {
    const gaps = new Set(state.results.ghats.filter((g) => g.latestGap).map((g) => g.site));
    $("sites-table").innerHTML = `<table class="tbl sites2"><thead><tr><th>${esc(T.lang === "hi" ? "घाट" : "Site")}</th><th>${esc(T.t("waterBody"))}</th><th>${esc(T.t("status"))}</th><th>${esc(T.t("lastUpdated"))}</th></tr></thead><tbody>
      ${SITES.map((s) => alertOf(s)).map((a) => `<tr data-site="${esc(a.site)}" class="${a.site === state.selected ? "sel" : ""}${gaps.has(a.site) ? " gap" : ""}" tabindex="0"${gaps.has(a.site) ? ` title="${esc(T.lang === "hi" ? "दुर्गा 2025 में जाँच नहीं हुई" : "Not tested at Durga 2025")}"` : ""}>
        <td>${esc(T.ghat(a.site))}</td><td>${esc(T.water(FEATURES[a.site].properties.water_body))}</td>
        <td><span class="sdot" style="background:${LV_COLOR[a.level]}" aria-hidden="true"></span>${esc(T.level(a.level))}</td>
        <td>${a.recordedAt ? esc(new Date(a.recordedAt + "T00:00:00Z").toLocaleDateString(T.lang === "hi" ? "hi-IN" : "en-IN", { month: "short", year: "numeric", timeZone: "UTC" })) : "—"}${a.stale ? ` <span class="txt-stale" title="${esc(T.t("outdated"))}">⌛</span>` : ""}</td></tr>`).join("")}</tbody></table>`;
    document.querySelectorAll("#sites-table tr[data-site]").forEach((tr) => {
      tr.onclick = () => select(tr.dataset.site, true);
      tr.onkeydown = (e) => { if (e.key === "Enter") select(tr.dataset.site, true); };
    });
    $("ov-source").innerHTML = sourceLine();
  }
  // Donut of ghats by alert level, total in the middle, legend with counts beside it.
  function renderCounts() {
    const order = ["normal", "advisory", "warning", "critical", "nodata"];
    const n = Object.fromEntries(order.map((l) => [l, state.alerts.filter((a) => a.level === l).length]));
    const total = state.alerts.length, stale = state.alerts.filter((a) => a.stale).length;
    const R = 70, C = 2 * Math.PI * R, gap = 3;
    let off = 0;
    const segs = order.filter((l) => n[l]).map((l) => {
      const len = (n[l] / total) * C, mid = off + len / 2, ang = (mid / C) * 2 * Math.PI - Math.PI / 2;
      const s = `<circle r="${R}" cx="90" cy="90" fill="none" stroke="${LV_COLOR[l]}" stroke-width="26" stroke-dasharray="${Math.max(len - gap, 0)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)"><title>${esc(T.level(l))}: ${n[l]}</title></circle>
        <text x="${90 + R * Math.cos(ang)}" y="${90 + R * Math.sin(ang) + 5}" text-anchor="middle" class="dn">${n[l]}</text>`;
      off += len; return s;
    }).join("");
    $("counts").innerHTML = `<div class="donut-wrap"><svg class="donut" viewBox="0 0 180 180" role="img" aria-label="${order.map((l) => `${T.level(l)} ${n[l]}`).join(", ")}">${segs}
        <text x="90" y="84" text-anchor="middle" class="dt">${esc(T.t("totalSites"))}</text><text x="90" y="112" text-anchor="middle" class="dv">${total}</text></svg>
      <ul class="legend2">${order.map((l) => `<li><span class="sdot" style="background:${LV_COLOR[l]}"></span>${esc(T.level(l))}<b>${n[l]}</b></li>`).join("")}
        <li><span class="sdot stale-dot"></span>${esc(T.t("outdated"))}<b>${stale}</b></li></ul></div>
      <p class="small muted">${esc(T.lang === "hi" ? `हर घाट की अंतिम जाँच पर आधारित। ${cfg.alerts.staleDays} दिन से पुरानी जाँच "डेटा पुराना"।` : `Based on each ghat's latest test. Tests older than ${cfg.alerts.staleDays} days are "Data outdated".`)}</p>`;
  }
  function alertItem(a, full) {
    const top = a.triggers[0];
    const what = top ? triggerText(top) : esc(a.level === "nodata" ? T.action("testMissing") : T.t("noTriggers"));
    return `<li class="alert lv-b-${a.level}" data-site="${esc(a.site)}" tabindex="0">
      <div class="r1"><b>${esc(T.ghat(a.site))}</b> ${lvChip(a)}<span class="when">${esc(seasonLabel(a.season))} · ${esc(dateLabel(a.recordedAt))}</span></div>
      <p>${what}</p>${full ? `${a.triggers.length > 1 ? `<ul class="triggers">${a.triggers.slice(1).map((t) => `<li>${triggerText(t)}</li>`).join("")}</ul>` : ""}
      ${a.missing.length ? `<p class="txt-nodata">${esc(T.t("missingParams", { p: a.missing.map((p) => T.param(p)).join(", ") }))}</p>` : ""}
      <div class="small muted" style="margin-top:6px">${esc(T.t("actions"))}</div>${actionList(a)}` : `<p class="small">→ ${esc(T.action(a.actions[0].key))}</p>`}</li>`;
  }
  function bindAlerts(root) {
    root.querySelectorAll(".alert[data-site], .al2[data-site]").forEach((li) => {
      const go = (e) => { if (e.target.closest("a, button")) return; location.hash = `ghat=${encodeURIComponent(li.dataset.site)}`; };
      li.onclick = go; li.onkeydown = (e) => { if (e.key === "Enter") go(e); };
    });
  }
  // Recent alerts in the reference style: icon, ghat, what triggered it, date, severity; then "schedule inspection" cards.
  function renderAlertList() {
    const sev = { critical: "sevHigh", warning: "sevHigh", advisory: "sevMedium" };
    const short = (t) => `${T.param(t.parameter)} ${S.fmt(t.value)}${unit(t.parameter) ? " " + unit(t.parameter) : ""} (${T.t("limit")} ${limitText(t.parameter)})`;
    const tri = `<svg viewBox="0 0 24 24"><path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18v.5" stroke="#fff" stroke-width="2.2"/></svg>`;
    const exc = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 16.5v.5" stroke="#fff" stroke-width="2.2"/></svg>`;
    const cal = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M8.5 15l2 2 4-4"/></svg>`;
    const items = state.alerts.filter((a) => sev[a.level]).slice(0, 3).map((a) => `<li class="al2" data-site="${esc(a.site)}" tabindex="0">
      <span class="al-ico ai-${a.level}">${a.level === "advisory" ? exc : tri}</span>
      <div class="al-txt"><b>${esc(T.ghat(a.site))}</b><span>${esc(short(a.triggers[0]))}</span></div>
      <div class="al-meta"><span>${esc(dateLabel(a.recordedAt))}</span><span class="sev sev-${sev[a.level]}">${esc(T.t(sev[a.level]))}</span></div></li>`);
    const gaps = state.results.ghats.filter((g) => g.latestGap).slice(0, 2).map((g) => `<li class="al2 al-gap" data-site="${esc(g.site)}" tabindex="0">
      <span class="al-ico ai-gap">${cal}</span>
      <div class="al-txt"><b>${esc(T.ghat(g.site))}</b><span>${esc(T.t("noDurgaTest"))}</span></div>
      <div class="al-meta"><span class="sev sev-sevHigh">${esc(T.t("sevHigh"))}</span><button class="btn btn-outline btn-sm" data-inspect="${esc(g.site)}">${esc(T.t("scheduleInspection"))}</button></div></li>`);
    $("alert-list").innerHTML = items.concat(gaps).join("");
    bindAlerts($("alert-list"));
    $("alert-list").querySelectorAll("[data-inspect]").forEach((b) => (b.onclick = async (e) => {
      e.stopPropagation();
      const site = b.dataset.inspect, en = `Inspection request: ${T.ghatIn(site, "en")} was not tested at Durga 2025. Please sample DO, BOD and pH before 20 Oct 2026. (JalDrishti)`;
      const hi = `निरीक्षण अनुरोध: ${T.ghatIn(site, "hi")} की दुर्गा 2025 में जाँच नहीं हुई। कृपया 20 अक्टूबर 2026 से पहले ऑक्सीजन, बीओडी और पीएच का नमूना लें। (जलदृष्टि)`;
      try { await navigator.clipboard.writeText(`${en}\n${hi}`); } catch (err) {}
      toast(T.t("inspectionCopied"));
    }));
  }

  // ---------- ghat detail ----------
  function trendPoints(site, p) {
    const pts = [];
    for (const s of S.seasons(state.readings)) for (const ph of PH) {
      const r = state.readings.find((x) => x.site === site && x.year === s.year && x.festival === s.festival && x.parameter === p && x.phase === ph);
      const lab = `${seasonLabel(s)}, ${T.phase(ph)}`;
      if (!r || S.isMissing(r)) pts.push({ group: `${T.fest(s.festival).slice(0, 1)}${String(s.year).slice(2)}`, state: "missing", title: `${lab}: ${T.t("notTested")}` });
      else if (S.isBDL(r)) pts.push({ group: `${T.fest(s.festival).slice(0, 1)}${String(s.year).slice(2)}`, state: "bdl", value: 0, title: `${lab}: BDL` });
      else pts.push({ group: `${T.fest(s.festival).slice(0, 1)}${String(s.year).slice(2)}`, value: r.value, state: S.breach(r, cfg) ? "breach" : "ok", title: `${lab}: ${S.fmt(r.value)} ${unit(p)} (p. ${r.source_page})` });
    }
    return pts;
  }
  function chartBlock(id, title, sub, svg, tableHTML) {
    const showTable = state.tables[id];
    return `<div class="card"><div class="chart-title">${esc(title)}</div><div class="chart-sub">${esc(sub)}</div>
      ${showTable ? tableHTML : svg}<button class="toggle-table" data-toggle="${id}">${esc(T.t(showTable ? "chartView" : "tableView"))}</button></div>`;
  }
  function trendTable(pts, p) {
    return `<table class="tbl"><thead><tr><th>${esc(T.t("season"))}</th><th class="num">${esc(T.param(p))} ${esc(unit(p))}</th></tr></thead><tbody>
      ${pts.map((x) => `<tr><td>${esc(x.title.split(":")[0])}</td><td class="num ${x.state === "breach" ? "txt-critical" : x.state === "missing" ? "txt-nodata" : ""}">${x.state === "missing" ? esc(T.t("notTested")) : x.state === "bdl" ? "BDL" : (x.state === "breach" ? "▲ " : "") + S.fmt(x.value)}</td></tr>`).join("")}</tbody></table>`;
  }
  function trendSummary(pts, p) {
    const tested = pts.filter((x) => x.state !== "missing"), br = pts.filter((x) => x.state === "breach").length;
    const miss = pts.length - tested.length;
    return T.lang === "hi"
      ? `${tested.length} जाँचों में से ${br} में CPCB सीमा से बाहर; ${miss} बार जाँच नहीं हुई।`
      : `${br} of ${tested.length} tests break the CPCB limit; ${miss} not tested.`;
  }
  function renderGhat(site, filters = {}) {
    site = SITES.includes(site) ? site : state.selected;
    state.selected = site;
    const a = alertOf(site), h = histOf(site), f = FEATURES[site].properties;
    const charts = ["Dissolved oxygen", "BOD", "pH"].map((p) => {
      const pts = trendPoints(site, p), lim = cfg.limits[p];
      const id = `trend-${p}`;
      return chartBlock(id, `${T.param(p)} (${unit(p) || "–"})`, trendSummary(pts, p),
        Charts.trend({ points: pts, limit: lim, unit: unit(p), labels: { aria: `${T.param(p)}: ${trendSummary(pts, p)}`, limit: T.t("limit"),
          phases: T.lang === "hi" ? "हर मौसम में: पहले · दौरान · 1 सप्ताह बाद" : "Each season: before · during · 1 week after" } }),
        trendTable(pts, p));
    }).join("");
    // All 13 parameters, every season, with source links.
    const rows = state.readings.filter((r) => r.site === site);
    const years = [...new Set(rows.map((r) => r.year))].sort((x, y) => y - x);
    const fy = filters.year || "all", ff = filters.festival || "all";
    const seasons = S.seasons(state.readings).reverse().filter((s) => (fy === "all" || s.year == fy) && (ff === "all" || s.festival === ff));
    const cell = (r) => {
      if (!r || S.isMissing(r)) return `<td class="missing">${esc(T.t("notTested"))}</td>`;
      const href = srcHref(r), tip = `${r.value_as_printed} · ${r.unit_assumed || "–"} · p. ${r.source_page}`;
      const lnk = (txt) => (href ? `<a href="${href}" target="_blank" title="${esc(tip)}">${txt}</a>` : esc(txt));
      if (S.isBDL(r)) return `<td class="bdl">${lnk("BDL")}</td>`;
      return `<td class="${S.breach(r, cfg) ? "breach" : "ok"}">${lnk(S.fmt(r.value))}</td>`;
    };
    const tables = seasons.map((s) => {
      const sr = rows.filter((r) => r.year === s.year && r.festival === s.festival);
      const pages = [...new Set(sr.map((r) => r.source_page))].join(", ");
      return `<div class="season-h">${esc(seasonLabel(s))} ${pages ? `<span class="small muted">· p. ${pages}</span>` : `<span class="lv lv-nodata">? ${esc(T.t("notTested"))}</span>`}</div>
        <table class="readings"><tr><th>${esc(T.t("parameter"))}</th>${PH.map((ph) => `<th>${esc(T.phase(ph))}</th>`).join("")}</tr>
        ${cfg.parameterOrder.map((p) => `<tr><td>${esc(T.param(p))}<span class="lim">${esc(limitText(p))}${unit(p) ? " · " + esc(unit(p)) : ""}</span></td>${PH.map((ph) => cell(sr.find((r) => r.parameter === p && r.phase === ph))).join("")}</tr>`).join("")}</table>`;
    }).join("");
    $("view-ghat").innerHTML = `<div class="filters"><label>${esc(T.t("sites"))} <select id="g-site">${SITES.map((s) => `<option value="${esc(s)}" ${s === site ? "selected" : ""}>${esc(T.ghat(s))}</option>`).join("")}</select></label></div>
      <div class="grid detail-grid">
        <div class="card"><h2 style="font-size:20px">${esc(T.ghat(site))}</h2><div class="small muted">${esc(T.water(f.water_body))}${f.note ? ` · ⚠ ${esc(f.note)}` : ""}</div>
          <p>${lvChip(a)}</p>${a.stale && a.ageDays !== null ? `<div class="stale-note">⌛ ${esc(T.t("outdatedLong", { d: a.ageDays, w: cfg.alerts.staleDays }))}</div>` : ""}
          <dl class="facts"><dt>${esc(T.t("lastTested"))}</dt><dd>${esc(seasonLabel(a.season))} · ${esc(dateLabel(a.recordedAt))} (${esc(T.t("approx"))})</dd></dl>
          <div class="small muted">${esc(T.t("triggered"))}</div>
          ${a.triggers.length ? `<ul class="triggers">${a.triggers.map((t) => `<li>${triggerText(t)}</li>`).join("")}</ul>` : `<p>${esc(T.t("noTriggers"))}</p>`}
          ${a.missing.length ? `<p class="txt-nodata">${esc(T.t("missingParams", { p: a.missing.map((p) => T.param(p)).join(", ") }))}</p>` : ""}</div>
        <div class="card"><h2>${esc(T.t("actions"))}</h2>${actionList(a)}
          <h3 style="font-size:14px;margin:14px 0 4px">${esc(T.lang === "hi" ? "2023–25 का पैटर्न" : "Pattern over all seasons")}</h3>
          <ul class="triggers">${h.reasons.map((r) => `<li class="${r.gap ? "txt-nodata" : ""}">${esc(T.lang === "hi" ? r.hi : r.en)}</li>`).join("")}</ul></div>
      </div>
      <h2 style="font-size:17px;margin:18px 0 8px">${esc(T.t("trend"))}</h2>
      <div class="grid small-multiples">${charts}</div>
      <div class="legend-keys"><span>● ${esc(T.lang === "hi" ? "सीमा के भीतर" : "within limit")}</span><span class="txt-critical">◆ ${esc(T.lang === "hi" ? "सीमा से बाहर" : "breaks limit")}</span><span class="txt-nodata">✕ ${esc(T.t("notTested"))}</span><span>○ BDL</span><span>- - ${esc(T.t("limit"))}</span></div>
      <div class="card" style="margin-top:16px"><h2>${esc(T.lang === "hi" ? "सभी 13 मापदंड" : "All 13 parameters")}</h2>
        <div class="filters">${esc(T.t("season"))} <select id="f-year"><option value="all">–</option>${years.map((y) => `<option ${fy == y ? "selected" : ""}>${y}</option>`).join("")}</select>
          <select id="f-fest"><option value="all">–</option>${["Durga", "Ganesh"].map((x) => `<option value="${x}" ${ff === x ? "selected" : ""}>${esc(T.fest(x))}</option>`).join("")}</select>
          <button class="btn" id="btn-export-ghat">⬇ ${esc(T.t("exportCsv"))}</button></div>
        ${tables}<div class="meta-line">${sourceLine()}</div></div>`;
    $("g-site").onchange = (e) => { location.hash = `ghat=${encodeURIComponent(e.target.value)}`; };
    const re = () => renderGhat(site, { year: $("f-year").value, festival: $("f-fest").value });
    $("f-year").onchange = re; $("f-fest").onchange = re;
    $("btn-export-ghat").onclick = () => exportReadings(rows.filter((r) => (fy === "all" || r.year == fy) && (ff === "all" || r.festival === ff)), `${site.split(" ")[0].toLowerCase()}_readings.csv`);
    $("view-ghat").querySelectorAll("[data-toggle]").forEach((b) => (b.onclick = () => { state.tables[b.dataset.toggle] = !state.tables[b.dataset.toggle]; renderGhat(site, filters); }));
  }

  // ---------- compare ----------
  function renderCompare() {
    // Newest first, by sampling date (Durga comes after Ganesh in the same year).
    const sd = (s) => A.sampleDate({ year: s.year, festival: s.festival, phase: "during" }, cfg.alerts);
    const seasons = S.seasons(state.readings).sort((x, y) => sd(y) - sd(x));
    const c = state.compare;
    if (!c.season) c.season = `${seasons[0].year}|${seasons[0].festival}`;
    const [yr, fest] = c.season.split("|"), p = c.param, lim = cfg.limits[p];
    const rows = SITES.map((site) => {
      const values = {};
      for (const ph of PH) {
        const r = state.readings.find((x) => x.site === site && x.year == yr && x.festival === fest && x.parameter === p && x.phase === ph);
        values[ph] = !r || S.isMissing(r) ? { state: "missing" } : S.isBDL(r) ? { state: "bdl", value: 0, title: "BDL" }
          : { value: r.value, state: S.breach(r, cfg) ? "breach" : "ok", title: `${T.ghat(site, true)} · ${T.phase(ph)}: ${S.fmt(r.value)} ${unit(p)} (p. ${r.source_page})` };
      }
      const worst = Object.values(values).filter((v) => v.state !== "missing").map((v) => v.value);
      return { site, label: T.ghat(site, true), values, sortKey: worst.length ? (lim && lim.type === "min" ? Math.min(...worst) : Math.max(...worst)) : null };
    });
    // Worst first: lowest for DO (a minimum limit), highest otherwise; untested ghats last.
    rows.sort((x, y) => (x.sortKey === null) - (y.sortKey === null) || (lim && lim.type === "min" ? x.sortKey - y.sortKey : y.sortKey - x.sortKey));
    const nBreach = rows.filter((r) => Object.values(r.values).some((v) => v.state === "breach")).length;
    const nMiss = rows.filter((r) => Object.values(r.values).every((v) => v.state === "missing")).length;
    const title = T.lang === "hi"
      ? `${seasonLabel({ year: yr, festival: fest })}: ${rows.length} में से ${nBreach} घाट ${T.param(p)} की CPCB सीमा से बाहर${nMiss ? `; ${nMiss} की जाँच नहीं` : ""}`
      : `${seasonLabel({ year: yr, festival: fest })}: ${nBreach} of ${rows.length} ghats break the CPCB ${T.param(p)} limit${nMiss ? `; ${nMiss} not tested` : ""}`;
    const table = `<table class="tbl"><thead><tr><th>${esc(T.t("sites"))}</th>${PH.map((ph) => `<th class="num">${esc(T.phase(ph))}</th>`).join("")}</tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(r.label)}</td>${PH.map((ph) => { const v = r.values[ph]; return `<td class="num ${v.state === "breach" ? "txt-critical" : v.state === "missing" ? "txt-nodata" : ""}">${v.state === "missing" ? esc(T.t("notTested")) : v.state === "bdl" ? "BDL" : (v.state === "breach" ? "▲ " : "") + S.fmt(v.value)}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`;
    const svg = Charts.compare({ rows, limit: lim, unit: `${T.param(p)}${unit(p) ? " (" + unit(p) + ")" : ""}`,
      labels: { aria: title, limit: T.t("limit"), notTested: T.t("notTested"), pre: T.t("before"), during: T.t("during"), after: T.t("after"), breach: T.lang === "hi" ? "सीमा से बाहर" : "breaks limit" } });
    $("view-compare").innerHTML = `<div class="card"><h2>${esc(T.t("compareTitle"))}</h2>
      <div class="filters"><label>${esc(T.t("parameter"))} <select id="c-param">${cfg.parameterOrder.map((x) => `<option value="${esc(x)}" ${x === p ? "selected" : ""}>${esc(T.param(x))}${cfg.limits[x] ? "" : " (" + esc(T.t("noLimit")) + ")"}</option>`).join("")}</select></label>
        <label>${esc(T.t("season"))} <select id="c-season">${seasons.map((s) => `<option value="${s.year}|${s.festival}" ${c.season === `${s.year}|${s.festival}` ? "selected" : ""}>${esc(seasonLabel(s))}</option>`).join("")}</select></label></div>
      <div class="chart-title">${esc(title)}</div><div class="chart-sub">${esc(lim ? `${T.t("limit")} ${limitText(p)} ${unit(p)}` : T.t("noLimit"))}</div>
      ${state.tables.compare ? table : svg}<button class="toggle-table" data-toggle="compare">${esc(T.t(state.tables.compare ? "chartView" : "tableView"))}</button>
      <div class="meta-line">${sourceLine()}</div></div>`;
    $("c-param").onchange = (e) => { c.param = e.target.value; renderCompare(); };
    $("c-season").onchange = (e) => { c.season = e.target.value; renderCompare(); };
    $("view-compare").querySelector("[data-toggle]").onclick = () => { state.tables.compare = !state.tables.compare; renderCompare(); };
  }

  // ---------- alerts, report, about ----------
  function renderAlertsView() {
    $("view-alerts").innerHTML = `<div class="card"><h2>${esc(T.t("recentAlerts"))}</h2>
      <p class="sub">${esc(T.lang === "hi" ? "हर घाट की अंतिम जाँच पर नियम-आधारित अलर्ट। सीमाएँ config.js में।" : "Rules-based alerts on each ghat's latest tested season. Thresholds live in config.js.")}</p>
      <ul class="alerts">${state.alerts.map((a) => alertItem(a, true)).join("")}</ul><div class="meta-line">${sourceLine()}</div></div>`;
    bindAlerts($("view-alerts"));
  }
  function renderReport() {
    const rep = state.rep;
    const meter = (n, d) => `<span class="meter" role="img" aria-label="${n} / ${d}"><i style="width:${d ? (100 * n) / d : 0}%"></i></span>`;
    const per = state.alerts.map((a) => {
      const r = S.cpcbReport(state.readings, cfg, a.site), c = (p) => `${r[p].breaches}/${r[p].sampled}`;
      return `<tr><td>${esc(T.ghat(a.site))}</td><td class="num">${c("Dissolved oxygen")}</td><td class="num">${c("BOD")}</td><td class="num">${c("pH")}</td><td class="num txt-nodata">${Object.values(r).reduce((x, v) => x + v.missing, 0)}</td></tr>`;
    }).join("");
    $("view-report").innerHTML = `<div class="card"><h2>${esc(T.t("navReport"))}</h2>
      <p class="sub">${esc(T.lang === "hi" ? "श्रेणी B (संगठित बाहरी स्नान): घाट पर श्रद्धालु पानी में उतरते हैं। गिनती = जाँचे गए मापों में सीमा से बाहर।" : "Class B (organised outdoor bathing), because devotees enter the water at ghats. Counts are readings that break the limit, out of readings actually tested.")}</p>
      <table class="tbl"><thead><tr><th>${esc(T.t("parameter"))}</th><th>${esc(T.t("limit"))}</th><th class="num">${esc(T.lang === "hi" ? "सीमा से बाहर" : "Breaches")}</th><th class="num">${esc(T.t("notTested"))}</th></tr></thead><tbody>
      ${Object.entries(rep).map(([p, v]) => `<tr><td>${esc(T.param(p))}</td><td>${esc(limitText(p))} ${esc(unit(p))}</td><td class="num">${v.breaches} / ${v.sampled}${meter(v.breaches, v.sampled)}</td><td class="num txt-nodata">${v.missing}</td></tr>`).join("")}</tbody></table>
      <h3 style="font-size:15px;margin:16px 0 6px">${esc(T.lang === "hi" ? "घाट के अनुसार (सीमा से बाहर / जाँचे गए)" : "By ghat (breaches / tested)")}</h3>
      <table class="tbl"><thead><tr><th>${esc(T.t("sites"))}</th><th class="num">${esc(T.param("Dissolved oxygen", true))}</th><th class="num">BOD</th><th class="num">pH</th><th class="num">${esc(T.t("notTested"))}</th></tr></thead><tbody>${per}</tbody></table>
      <p style="margin-top:12px"><button class="btn" id="btn-export-report">⬇ ${esc(T.t("exportCsv"))}</button> <button class="btn" id="btn-export-all">⬇ ${esc(T.lang === "hi" ? "सभी माप CSV" : "All readings CSV")}</button></p>
      <div class="meta-line">${sourceLine()}</div></div>`;
    $("btn-export-all").onclick = () => exportReadings(state.readings, "bhopal_ghat_readings.csv");
    $("btn-export-report").onclick = () => download(toCSV(state.alerts.map((a) => {
      const r = S.cpcbReport(state.readings, cfg, a.site);
      return { site: a.site, alert_level: a.level, data_outdated: a.stale ? "yes" : "no", last_tested: seasonLabel(a.season), last_tested_date_approx: a.recordedAt,
        do_below_5: r["Dissolved oxygen"].breaches, do_tested: r["Dissolved oxygen"].sampled, bod_above_3: r.BOD.breaches, bod_tested: r.BOD.sampled,
        ph_outside: r.pH.breaches, ph_tested: r.pH.sampled, not_tested: Object.values(r).reduce((x, v) => x + v.missing, 0),
        actions: a.actions.map((x) => T.action(x.key, "en")).join("; ") };
    })), "cpcb_class_b_report.csv");
  }
  function renderAbout() {
    const hi = T.lang === "hi";
    const rules = Object.entries(cfg.alerts.rules).map(([p, rs]) => `<tr><td>${esc(T.param(p))}</td>${["advisory", "warning", "critical"].map((lv) => {
      const r = rs.find((x) => x.level === lv);
      return `<td>${r ? `${r.op === "outside" ? `${hi ? "बाहर" : "outside"} ${r.min}–${r.max}` : `${r.op} ${r.value}`} <span class="small muted">${r.source === "team" ? esc(T.t("teamRule")) : "CPCB " + r.source.split("-")[1]}</span>` : "–"}</td>`;
    }).join("")}</tr>`).join("");
    const gaps = state.results.ghats.filter((g) => g.gaps.length).map((g) => `${T.ghat(g.site)} (${g.gaps.map((x) => seasonLabel(x)).join(", ")})`);
    const items = hi ? [
      "इन रिपोर्टों में कोलीफॉर्म (बैक्टीरिया) की जाँच नहीं है, जबकि CPCB श्रेणी B में इसकी सीमा है। इंजन में इसकी सीमा रखी है, पर डेटा नहीं है।",
      "केवल 4 धातुएँ जाँची गईं; धातुओं, सीओडी, ठोस पदार्थ और गंदलेपन की स्नान सीमा तय नहीं है, इसलिए इन पर अलर्ट नहीं बनता।",
      "रिपोर्ट में इकाइयाँ और नमूने की तारीख नहीं छपी है। तारीखें त्योहार के दिन से अनुमानित हैं।",
      gaps.length ? `जाँच नहीं हुई (डेटा की कमी, साफ़ पानी नहीं): ${gaps.join("; ")}।` : null,
      "\"रानी कमलापति घाट / कमला पार्क कुंड\" दो अलग स्थान हो सकते हैं।",
      "यह पिछले माप हैं, 2026 का पूर्वानुमान नहीं। कोई स्वास्थ्य दावा नहीं किया गया है।",
      "नक्शे पर घाटों की स्थिति अनुमानित है।",
    ] : [
      "No coliform (bacteria) tests in these reports, although CPCB Class B sets a coliform limit. The engine has the limit ready, but there is no data.",
      "Only 4 metals were tested. Metals, COD, solids and turbidity have no bathing limit, so they never trigger an alert.",
      "The reports print no units and no sampling dates. Dates are approximated from the festival day.",
      gaps.length ? `Not tested (missing, never clean): ${gaps.join("; ")}.` : null,
      "“Rani Kamlapati ghat / Kamla Park kund” may be two places.",
      "These are past readings, not a forecast for 2026. No health effects are claimed.",
      "Ghat locations on the map are approximate.",
    ];
    $("view-about").innerHTML = `<div class="grid detail-grid">
      <div class="limits-box"><h2>${esc(T.t("limitsTitle"))}</h2><ul>${items.filter(Boolean).map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
      <div class="card"><h2>${esc(hi ? "अलर्ट के नियम" : "Alert rules")}</h2>
        <table class="tbl"><thead><tr><th>${esc(T.t("parameter"))}</th><th>${esc(T.level("advisory"))}</th><th>${esc(T.level("warning"))}</th><th>${esc(T.level("critical"))}</th></tr></thead><tbody>${rules}</tbody></table>
        <p class="small muted">${esc(hi ? `"टीम द्वारा तय स्तर" CPCB के नहीं हैं; यह हमारा अनुमान है। ${cfg.alerts.staleDays} दिन से पुराना डेटा "डेटा पुराना" दिखता है।` : `"Team-defined tier" thresholds are not CPCB's; they are our judgement. Data older than ${cfg.alerts.staleDays} days shows "Data outdated".`)}</p></div>
      <div class="card"><h2>${esc(hi ? "स्रोत और श्रेय" : "Sources and credits")}</h2><ul class="small">
        <li>MPPCB Ganesh and Durga visarjan reports 2023–2025 (<a href="https://www.mppcb.mp.gov.in/proc/mon/Ganesh_and_Durga_visarjan_report-2025.pdf">2025</a>, <a href="https://www.mppcb.mp.gov.in/proc/mon/Ganesh_and_Durga_visarjan_report-2024.pdf">2024</a>, <a href="https://www.mppcb.mp.gov.in/proc/mon/Idol_immer._Report_23_CPCB.pdf">2023</a>)</li>
        <li><a href="https://cpcb.gov.in/water-quality-criteria/">CPCB water-quality criteria</a></li>
        <li>Satellite: <a href="https://s2maps.eu">Sentinel-2 cloudless 2023</a> by EOX IT Services GmbH (contains modified Copernicus Sentinel data), CC BY-NC-SA 4.0</li>
        <li>Terrain: <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Mapzen / AWS Terrain Tiles</a> (SRTM, GMTED2010, ETOPO1)</li>
        <li>Streets: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://openfreemap.org">OpenFreeMap</a></li>
        <li>Font: Mukta by Ek Type (SIL OFL). Map: MapLibre GL JS. PDF reading: pdf.js.</li></ul></div></div>`;
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
    a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function exportReadings(rows, name) {
    download(toCSV(rows.map((r) => ({ year: r.year, festival: r.festival, site: r.site, site_hi: T.ghatIn(r.site, "hi"), water_body: r.water_body,
      phase: r.phase, parameter: r.parameter, value: r.value, unit_assumed: r.unit_assumed, flag: r.flag, value_as_printed: r.value_as_printed,
      cpcb_class_b_limit: cfg.limits[r.parameter] ? limitText(r.parameter) : "", breaches_limit: S.breach(r, cfg) === true ? "yes" : S.breach(r, cfg) === false ? "no" : "",
      sample_date_approx: A.sampleDate(r, cfg.alerts).toISOString().slice(0, 10), source_file: r.source_file, source_page: r.source_page }))), name);
  }

  // ---------- brief ----------
  let briefLang = "en";
  function renderBrief() {
    const en = Brief.build(state, "en"), hi = Brief.build(state, "hi");
    const block = (t, l) => `<div lang="${l}"><pre>${esc(t)}</pre></div>`;
    $("brief-body").innerHTML = briefLang === "en" ? block(en, "en") : briefLang === "hi" ? block(hi, "hi") : block(en, "en") + block(hi, "hi");
    $("brief-status").textContent = `${(briefLang === "hi" ? hi : en).split(/\s+/).length} words`;
    $("print-area").innerHTML = (briefLang === "hi" ? [hi] : briefLang === "en" ? [en] : [en, hi]).map((t) => `<div class="page"><pre>${esc(t)}</pre></div>`).join("");
    return briefLang === "en" ? en : briefLang === "hi" ? hi : en + "\n\n" + hi;
  }

  // ---------- routing ----------
  function route() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && document.startViewTransition && route.ready) { document.startViewTransition(() => showRoute()); return; }
    showRoute();
    route.ready = true;
  }
  function showRoute() {
    const h = decodeURIComponent(location.hash.slice(1));
    let view = h.split("=")[0] || "overview";
    if (!["overview", "map", "ghat", "compare", "alerts", "report", "about", "brief"].includes(view)) view = "overview";
    const navView = view;
    if (view === "map") { view = "overview"; setTimeout(() => $("map-card").scrollIntoView({ behavior: "smooth", block: "start" }), 50); }
    if (view === "brief") { view = "overview"; setTimeout(() => $("btn-brief").click(), 50); }
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("on", v.id === `view-${view}`));
    document.querySelectorAll(".nav a.item").forEach((a) => (a.getAttribute("aria-current") === "page" && a.removeAttribute("aria-current"), a.dataset.view === navView && a.setAttribute("aria-current", "page")));
    if (view === "ghat") renderGhat(h.startsWith("ghat=") ? h.slice(5) : state.selected);
    if (view === "compare") renderCompare();
    if (view === "alerts") renderAlertsView();
    if (view === "report") renderReport();
    if (view === "about") renderAbout();
    if (view === "overview" && state.bm) setTimeout(() => {
      if (state.fitted) return state.bm.map.resize();
      fitGhats();
      // Fonts and the wrapped header can change the layout after the first fit; fit again once settled.
      state.bm.map.once("idle", () => { state.bm.map.resize(); fitGhats(); });
    }, 0);
    $("nav").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 5000); }
  function refresh() {
    applyText(); renderGhatPanel(); renderSitesTable(); renderCounts(); renderAlertList(); renderPins();
    if (state.bm) markBase();
    route();
  }

  // ---------- events ----------
  document.querySelectorAll("[data-lang-btn]").forEach((b) => (b.onclick = () => { T.set(b.dataset.langBtn); if (state.bm) state.bm.setLang(T.lang); refresh(); }));
  document.querySelectorAll("[data-theme-btn]").forEach((b) => (b.onclick = () => window.setTheme(b.dataset.themeBtn)));
  document.addEventListener("themechange", (e) => { applyText(); if (state.bm) state.bm.setTheme(e.detail); });
  $("btn-layer").onclick = () => { const nb = state.bm.base === "satellite" ? "streets" : "satellite"; state.bm.setBase(nb); localStorage.setItem("vgw-base", nb); markBase(); };
  $("btn-zin").onclick = () => state.bm && state.bm.map.zoomIn();
  $("btn-zout").onclick = () => state.bm && state.bm.map.zoomOut();
  $("btn-home").onclick = () => state.bm && fitGhats();
  $("btn-full").onclick = () => { const c = $("map-card"); document.fullscreenElement ? document.exitFullscreen() : c.requestFullscreen && c.requestFullscreen(); };
  document.addEventListener("fullscreenchange", () => setTimeout(() => state.bm && state.bm.map.resize(), 100));
  $("btn-statewide").onclick = () => toast(T.t("statewideSoon"));
  $("nav-toggle").onclick = () => $("nav").classList.toggle("open");
  document.querySelectorAll("dialog [data-close]").forEach((b) => (b.onclick = () => b.closest("dialog").close()));
  $("btn-brief").onclick = () => { renderBrief(); $("dlg-brief").showModal(); };
  document.querySelectorAll("#dlg-brief .seg button").forEach((b) => (b.onclick = () => {
    briefLang = b.dataset.lang;
    document.querySelectorAll("#dlg-brief .seg button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    renderBrief();
  }));
  $("btn-copy").onclick = async () => {
    const text = renderBrief();
    try { await navigator.clipboard.writeText(text); toast("Brief copied. Paste it into WhatsApp."); }
    catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); toast("Brief copied."); }
  };
  $("btn-print").onclick = () => { renderBrief(); window.print(); };
  window.addEventListener("hashchange", route);

  window.App = { state, applyData, refresh, toast, select, toCSV, SITES };

  (async function start() {
    applyData([]);
    initMap();
    refresh();
    const uploads = await Store.all();
    if (uploads.length) { applyData(uploads); refresh(); }
  })();
})();
