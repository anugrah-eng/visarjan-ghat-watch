// Report sidebar: pick a ghat, year, festival and phase, see the readings, then generate a report (PDF via print, or CSV)
// in English or Hindi, for this ghat or all 7. Layout follows the sidebar design reference; data is the dashboard's own.
(function () {
  const cfg = window.CONFIG, S = window.Scoring, A = window.Alerts, T = window.I18N;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const PH = ["pre", "during", "after"];
  const st = { open: false, site: null, year: null, fest: "Durga", phase: "during", param: "Dissolved oxygen", lang: T.lang, fmt: "pdf", scope: "one", trigger: null };
  let root, backdrop;

  const app = () => window.App.state;
  const sites = () => window.App.SITES;
  const years = () => [...new Set(app().readings.map((r) => r.year))].sort();
  const reading = (site, y, f, p, ph) => app().readings.find((r) => r.site === site && r.year === y && r.festival === f && r.parameter === p && r.phase === ph);
  const val = (r) => (!r || S.isMissing(r) ? null : S.isBDL(r) ? "BDL" : S.fmt(r.value));
  const limitText = (p) => { const l = cfg.limits[p]; return !l ? T.t("noLimit") : l.type === "min" ? `≥ ${l.value}` : l.type === "max" ? `≤ ${l.value}` : `${l.min}–${l.max}`; };
  const unit = (p) => cfg.units[p] || "–";

  function build() {
    backdrop = document.createElement("div"); backdrop.className = "rs-backdrop"; backdrop.hidden = true;
    root = document.createElement("aside"); root.className = "rs"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-labelledby", "rs-title");
    document.body.append(backdrop, root);
    backdrop.onclick = close;
    root.addEventListener("keydown", (e) => {
      if (e.key === "Tab") { // keep focus inside the sidebar
        const f = [...root.querySelectorAll("button, select, input, a[href]")].filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  function render() {
    const site = st.site, a = app().alerts.find((x) => x.site === site);
    const f = window.BUNDLED.ghats.features.find((x) => x.properties.site === site).properties;
    const has = (y, fe) => app().readings.some((r) => r.site === site && r.year === y && r.festival === fe);
    const cards = cfg.parameterOrder.map((p) => {
      const r = reading(site, st.year, st.fest, p, st.phase), v = val(r), br = r && S.breach(r, cfg) === true;
      return `<button class="rs-card${v === null ? " missing" : br ? " breach" : ""}" data-param="${esc(p)}" aria-pressed="${p === st.param}">
        <span class="k">${esc(T.param(p, true))}</span><span class="v">${v === null ? esc(T.t("notTested")) : esc(v)}</span><span class="u">${esc(unit(p))}</span></button>`;
    }).join("");
    const bda = PH.map((ph) => { const r = reading(site, st.year, st.fest, st.param, ph); return { ph, v: val(r), n: r && !S.isMissing(r) && !S.isBDL(r) ? r.value : null, page: r && r.source_page }; });
    const delta = bda[0].n !== null && bda[1].n !== null ? (bda[1].n - bda[0].n) : null;
    const pages = [...new Set(bda.filter((x) => x.page).map((x) => x.page))];
    root.innerHTML = `<div class="rs-scroll"><div class="rs-head">
        <div class="rs-eyebrow"><span>${esc(T.t("rsEyebrow"))}</span><button class="rs-close" data-close aria-label="${esc(T.t("rsClose"))}">✕</button></div>
        <label class="sr-only" for="rs-site">${esc(T.t("sites"))}</label>
        <select class="rs-select" id="rs-site">${sites().map((s) => `<option value="${esc(s)}" ${s === site ? "selected" : ""}>${esc(T.ghat(s))}</option>`).join("")}</select>
        <h2 class="rs-title" id="rs-title">${esc(T.ghat(site))}</h2>
        <div class="rs-loc"><span aria-hidden="true">◎</span> ${esc(T.water(f.water_body))} · ${esc(T.t("bhopal"))}</div></div>
      <div class="rs-sec">
        <div class="rs-row"><span class="rs-label" id="rs-yl">${esc(T.t("rsYear"))}</span>
          <div class="rs-years" role="group" aria-labelledby="rs-yl">${years().map((y) => `<button data-year="${y}" aria-pressed="${y === st.year}">${y}</button>`).join("")}</div></div>
        <div class="rs-tabs" role="group" aria-label="${esc(T.t("season"))}">${["Ganesh", "Durga"].map((fe) => `<button data-fest="${fe}" aria-pressed="${fe === st.fest}">${esc(T.fest(fe))} ${esc(T.t("rsVisarjan"))}${has(st.year, fe) ? "" : " ·  ?"}</button>`).join("")}</div>
        <div class="rs-h"><b>${esc(T.t("rsParams"))}</b><div class="rs-phase" role="group" aria-label="${esc(T.t("rsPhase"))}">${PH.map((ph) => `<button data-phase="${ph}" aria-pressed="${ph === st.phase}">${esc(T.phase(ph))}</button>`).join("")}</div></div>
        ${has(st.year, st.fest) ? "" : `<p class="rs-msg err">${esc(T.t("rsNoTable", { s: `${T.fest(st.fest)} ${st.year}` }))}</p>`}
        <div class="rs-grid">${cards}</div>
        <div class="rs-detail" aria-live="polite"><div class="t">${esc(T.param(st.param))}</div><div class="s">${esc(unit(st.param))} · ${esc(T.t("limit"))} ${esc(limitText(st.param))}${pages.length ? ` · p. ${pages.join(", ")}` : ""}</div>
          <div class="rs-bda">${bda.map((x) => `<div><b>${x.v === null ? "–" : esc(x.v)}</b><span>${esc(T.phase(x.ph))}</span></div>`).join("")}</div>
          <div class="rs-delta">${esc(T.t("before"))} → ${esc(T.t("during"))}: ${delta === null ? "–" : (delta > 0 ? "+" : "") + S.fmt(delta)}</div></div>
        <div class="rs-alert"><b>${esc(T.t("status"))}:</b> <span class="lv lv-${a.level}">${esc(T.level(a.level))}</span>${a.stale ? ` <span class="lv lv-stale">⌛ ${esc(T.t("outdated"))}</span>` : ""}
          <ul>${a.actions.slice(0, 3).map((x) => `<li>${esc(T.action(x.key))}</li>`).join("")}</ul></div>
        <p class="rs-note">${esc(T.t("rsNote"))}</p></div></div>
      <div class="rs-foot">
        <div class="rs-row"><span class="rs-label">${esc(T.t("rsScope"))}</span><div class="rs-scope">
          <label><input type="radio" name="rs-scope" value="one" ${st.scope === "one" ? "checked" : ""}> ${esc(T.t("rsThisGhat"))}</label>
          <label><input type="radio" name="rs-scope" value="all" ${st.scope === "all" ? "checked" : ""}> ${esc(T.t("rsAllGhats"))}</label></div></div>
        <div class="rs-row"><span class="rs-label">${esc(T.t("rsFormat"))}</span><div class="rs-opts" role="group" aria-label="${esc(T.t("rsFormat"))}">
          <button data-fmt="pdf" aria-pressed="${st.fmt === "pdf"}">PDF</button><button data-fmt="csv" aria-pressed="${st.fmt === "csv"}">CSV</button></div></div>
        <div class="rs-row"><span class="rs-label">${esc(T.t("rsLanguage"))}</span><div class="rs-opts" role="group" aria-label="${esc(T.t("rsLanguage"))}">
          <button data-rlang="en" aria-pressed="${st.lang === "en"}" lang="en">English</button><button data-rlang="hi" aria-pressed="${st.lang === "hi"}" lang="hi">हिंदी</button></div></div>
        <button class="rs-go" id="rs-go">${esc(T.t("rsGenerate"))}</button>
        <div class="rs-progress" hidden><i></i></div><div class="rs-msg" id="rs-msg" role="status"></div></div>`;
    root.querySelector("[data-close]").onclick = close;
    $("rs-site").onchange = (e) => { st.site = e.target.value; latestSeason(); render(); $("rs-site").focus(); };
    const on = (sel, fn) => root.querySelectorAll(sel).forEach((b) => (b.onclick = () => { fn(b); render(); const again = root.querySelector(`${sel.replace("]", `="${b.dataset[Object.keys(b.dataset)[0]]}"]`)}`); if (again) again.focus(); }));
    on("[data-year]", (b) => (st.year = Number(b.dataset.year)));
    on("[data-fest]", (b) => (st.fest = b.dataset.fest));
    on("[data-phase]", (b) => (st.phase = b.dataset.phase));
    on("[data-param]", (b) => (st.param = b.dataset.param));
    on("[data-fmt]", (b) => (st.fmt = b.dataset.fmt));
    on("[data-rlang]", (b) => (st.lang = b.dataset.rlang));
    root.querySelectorAll('input[name="rs-scope"]').forEach((r) => (r.onchange = () => (st.scope = r.value)));
    $("rs-go").onclick = generate;
  }

  // Start on the ghat's newest season that has a table, not on a season it was never tested in.
  function latestSeason() {
    const a = app().alerts.find((x) => x.site === st.site);
    if (a && a.season) { st.year = a.season.year; st.fest = a.season.festival; }
  }
  function open(site, trigger) {
    if (!root) build();
    const s = st.site || site || app().selected;
    st.site = site || s; st.trigger = trigger || document.activeElement; st.lang = T.lang;
    st.year = years()[years().length - 1]; latestSeason();
    render();
    root.hidden = backdrop.hidden = false;
    requestAnimationFrame(() => { root.classList.add("on"); backdrop.classList.add("on"); });
    st.open = true;
    root.querySelector("[data-close]").focus();
  }
  function close() {
    if (!st.open) return;
    st.open = false;
    root.classList.remove("on"); backdrop.classList.remove("on");
    const done = () => { root.hidden = backdrop.hidden = true; };
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? done() : setTimeout(done, 220);
    if (st.trigger && st.trigger.focus) st.trigger.focus();
  }

  // ---------- report ----------
  const step = (pct, msg) => new Promise((res) => {
    const bar = root.querySelector(".rs-progress"); bar.hidden = false; bar.querySelector("i").style.width = pct + "%";
    $("rs-msg").className = "rs-msg"; $("rs-msg").textContent = msg; setTimeout(res, 120);
  });
  async function generate() {
    const btn = $("rs-go"); btn.disabled = true;
    const L = st.lang, prev = T.lang;
    let win = null;
    try {
      if (st.fmt === "pdf") { win = window.open("", "_blank"); if (!win) throw new Error(T.t("rsPopup")); }
      await step(20, T.t("rsStep1"));
      const chosen = st.scope === "all" ? sites() : [st.site];
      T.set(L); // build the report in the chosen language
      await step(55, T.t("rsStep2"));
      if (st.fmt === "csv") csv(chosen); else pdf(win, chosen);
      T.set(prev);
      await step(100, T.t("rsDone"));
    } catch (e) {
      T.set(prev);
      if (win) win.close();
      $("rs-msg").className = "rs-msg err"; $("rs-msg").textContent = `${T.t("rsFailed")} ${e.message}`;
    } finally { btn.disabled = false; }
  }

  function csv(chosen) {
    const rows = app().readings.filter((r) => chosen.includes(r.site) && r.year === st.year && r.festival === st.fest).map((r) => ({
      ghat: T.ghat(r.site), year: r.year, festival: T.fest(r.festival), phase: T.phase(r.phase), parameter: T.param(r.parameter),
      value: r.value ?? "", flag: r.flag, unit: r.unit_assumed, cpcb_limit: cfg.limits[r.parameter] ? limitText(r.parameter) : "",
      breaks_limit: S.breach(r, cfg) === true ? "yes" : S.breach(r, cfg) === false ? "no" : "", source_file: r.source_file, source_page: r.source_page }));
    if (!rows.length) throw new Error(T.t("rsNoTable", { s: `${T.fest(st.fest)} ${st.year}` }));
    const text = window.App.toCSV(rows);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
    a.download = `jaldrishti_report_${st.year}_${st.fest.toLowerCase()}_${st.scope === "all" ? "all_ghats" : st.site.split(" ")[0].toLowerCase()}_${st.lang}.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function pdf(win, chosen) {
    const base = new URL(".", location.href).href;
    const now = new Date().toLocaleString(T.lang === "hi" ? "hi-IN" : "en-IN", { dateStyle: "long", timeStyle: "short" });
    const ys = years(), alerts = app().alerts.filter((a) => chosen.includes(a.site));
    const season = `${T.fest(st.fest)} ${st.year}`;
    const table = (site) => {
      const rows = cfg.parameterOrder.map((p) => `<tr><td>${esc(T.param(p))}</td><td>${esc(unit(p))}</td><td>${esc(limitText(p))}</td>${PH.map((ph) => {
        const r = reading(site, st.year, st.fest, p, ph), v = val(r);
        return `<td class="${v === null ? "m" : r && S.breach(r, cfg) ? "b" : ""}">${v === null ? esc(T.t("notTested")) : (r && S.breach(r, cfg) ? "▲ " : "") + esc(v)}</td>`;
      }).join("")}</tr>`).join("");
      const pages = [...new Set(app().readings.filter((r) => r.site === site && r.year === st.year && r.festival === st.fest).map((r) => r.source_page))];
      return `<table><thead><tr><th>${esc(T.t("parameter"))}</th><th>${esc(T.lang === "hi" ? "इकाई" : "Unit")}</th><th>${esc(T.t("limit"))}</th>${PH.map((ph) => `<th>${esc(T.phase(ph))}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
        <p class="src">${pages.length ? `MPPCB ${st.year}, p. ${pages.join(", ")}` : esc(T.t("rsNoTable", { s: season }))}</p>`;
    };
    const ghatBlock = (a) => `<section><h2>${esc(T.ghat(a.site))}</h2>
      <p><b>${esc(T.t("status"))}:</b> ${esc(T.level(a.level))}${a.stale ? ` · ⌛ ${esc(T.t("outdated"))}` : ""} · ${esc(T.t("lastTested"))}: ${a.season ? esc(`${T.fest(a.season.festival)} ${a.season.year}`) : "–"} (${esc(a.recordedAt || "–")}, ${esc(T.t("approx"))})</p>
      ${a.triggers.length ? `<ul>${a.triggers.slice(0, 4).map((t) => `<li>${esc(T.param(t.parameter))}, ${esc(T.phase(t.phase))}: ${esc(S.fmt(t.value))} ${esc(unit(t.parameter))} (${esc(T.t("limit"))} ${esc(limitText(t.parameter))}) – p. ${t.page}</li>`).join("")}</ul>` : ""}
      <p><b>${esc(T.t("actions"))}:</b></p><ul>${a.actions.map((x) => `<li>${esc(T.action(x.key))}</li>`).join("")}</ul>
      <h3>${esc(season)}</h3>${table(a.site)}</section>`;
    const html = `<!doctype html><html lang="${T.lang}"><head><meta charset="utf-8"><title>JalDrishti – ${esc(season)}</title>
      <base href="${base}"><link rel="stylesheet" href="fonts/fonts.css">
      <style>body{font-family:Mukta,"Nirmala UI","Noto Sans Devanagari",sans-serif;color:#13212b;margin:24px;font-size:12.5pt;line-height:1.45}
      header{display:flex;gap:12px;align-items:center;border-bottom:2px solid #1d4e89;padding-bottom:10px;margin-bottom:12px}
      h1{font-size:20pt;margin:0}h2{font-size:15pt;margin:18px 0 4px;color:#1d4e89}h3{font-size:12pt;margin:10px 0 4px}
      table{border-collapse:collapse;width:100%;font-size:10.5pt}th,td{border:1px solid #c8d3d8;padding:4px 6px;text-align:left}th{background:#eef3f4}
      td.b{color:#9c1a4c;font-weight:700}td.m{color:#5b21b6;background:#f3edfd}.meta{font-size:10.5pt;color:#3d4d57}.src{font-size:9.5pt;color:#5d6d76}
      section{page-break-inside:avoid}footer{margin-top:18px;font-size:9.5pt;color:#5d6d76;border-top:1px solid #c8d3d8;padding-top:8px}
      @media print{body{margin:10mm}}</style></head><body>
      <header><svg width="34" height="40" viewBox="0 0 30 34" role="img" aria-label="${esc(T.t("logoAlt"))}"><path d="M15 1C15 1 3 15 3 22a12 12 0 0 0 24 0C27 15 15 1 15 1Z" fill="#2f86d1"/><path d="M8 24h14M10 28h10" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
      <div><h1>JalDrishti · ${esc(T.t("appName"))}</h1><div class="meta">${esc(T.t("rsReportTitle"))}</div></div></header>
      <p class="meta"><b>${esc(T.t("sites"))}:</b> ${esc(chosen.map((s) => T.ghat(s)).join(", "))}<br>
      <b>${esc(T.t("season"))}:</b> ${esc(season)} · <b>${esc(T.t("rsGenerated"))}:</b> ${esc(now)}<br>
      <b>${esc(T.lang === "hi" ? "स्रोत" : "Source")}:</b> MPPCB ${ys[0]}–${ys[ys.length - 1]} · ${esc(T.t("rsFresh", { n: cfg.alerts.staleDays }))}<br>
      <b>${esc(T.t("limit"))}:</b> CPCB Class B: ${esc(T.param("Dissolved oxygen"))} ≥ 5 mg/l, BOD ≤ 3 mg/l, pH 6.5–8.5</p>
      ${alerts.map(ghatBlock).join("")}
      <footer>${esc(T.t("rsFooter"))}</footer>
      <script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`;
    win.document.open(); win.document.write(html); win.document.close();
  }

  // Escape closes the sidebar even when focus has left it (e.g. after the report window closes).
  document.addEventListener("keydown", (e) => { if (st.open && e.key === "Escape") { e.preventDefault(); close(); } });
  // Any element with data-report opens the sidebar (data-report="<site>" preselects a ghat).
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-report]");
    if (t) { e.preventDefault(); open(t.dataset.report || null, t); }
  });
  window.ReportSidebar = { open, close };
})();
