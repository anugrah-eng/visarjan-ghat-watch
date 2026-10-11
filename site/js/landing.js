// Landing page: live alert summary for the 7 ghats and a slow satellite + terrain flyover.
// The map library loads only after the page is shown, and not at all on data-saver or 2G connections.
(function () {
  const cfg = window.CONFIG, T = window.I18N, A = window.Alerts;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ICON = { critical: "!!", warning: "!", advisory: "~", normal: "✓", nodata: "?" };
  const FEATURES = Object.fromEntries(ALERT_DATA.ghats.features.map((f) => [f.properties.site, f]));
  const SITES = Object.keys(FEATURES);
  const readings = ALERT_DATA.readings.map((r, id) => ({ ...r, id }));
  const alerts = A.evaluateAll(readings, SITES, cfg, new Date());
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let motionOff = reduced; try { motionOff = motionOff || localStorage.getItem("vgw-motion") === "off"; } catch (e) {}
  let here = -1, map = null, timer = null;

  function daysLeft() {
    return Math.max(0, Math.round((new Date(cfg.visarjanDate + "T00:00:00") - new Date(new Date().toDateString())) / 86400000));
  }
  const season = (a) => (a.season ? `${T.fest(a.season.festival)} ${a.season.year}` : T.t("notTested"));

  function render() {
    document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = T.t(el.dataset.t)));
    document.querySelectorAll("[data-lang-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.langBtn === T.lang)));
    const th = document.documentElement.getAttribute("data-theme");
    document.querySelectorAll("[data-theme-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeBtn === th)));
    const n = (l) => alerts.filter((a) => a.level === l).length;
    const stale = alerts.filter((a) => a.stale).length;
    const bad = n("critical") + n("warning");
    $("hero-date").textContent = T.t("countdown", { n: daysLeft() });
    $("hero-h").textContent = T.t("heroTitle");
    $("hero-lede").textContent = T.t("heroLede");
    $("cta-alerts").textContent = T.t("heroAlerts", { n: bad });
    $("gauge-h").textContent = T.t("gaugeTitle");
    $("gauge-list").innerHTML = alerts.map((a, i) => `<li data-i="${i}" class="${i === here ? "here" : ""}">
      <span class="g-dot dot lv-${a.level}" aria-hidden="true">${ICON[a.level]}</span>
      <a href="app.html#ghat=${encodeURIComponent(a.site)}">${esc(T.ghat(a.site, true))}<span class="g-sub">${esc(season(a))}${a.stale ? " · ⌛ " + esc(T.t("outdated")) : ""}</span></a>
      <span class="g-lv c-${a.level}">${esc(T.level(a.level))}</span></li>`).join("");
    $("gauge-note").textContent = stale ? T.t("gaugeStale", { n: stale, w: cfg.alerts.staleDays }) : "";
    $("band-h").textContent = T.t("bandTitle", { bad, total: SITES.length });
    $("band-p").textContent = T.t("bandText");
    $("band-facts").innerHTML = [
      { t: T.t("factLimits") }, { t: T.t("factTrace") },
      { t: T.t("factStale", { n: stale, w: cfg.alerts.staleDays }), gap: true }, { t: T.t("factNoColiform") },
    ].map((f) => `<li class="${f.gap ? "gap" : ""}">${esc(f.t)}</li>`).join("");
    $("foot-p").textContent = T.t("footText");
    const mb = $("motion-btn");
    if (map && !reduced) { mb.hidden = false; mb.textContent = T.t(timer ? "pauseTour" : "playTour"); }
    if (map) renderLabels();
    if (peek) peek.setHTML(peekHTML(alerts[peekI]));
  }

  // ---------- map ----------
  let labels = [];
  function renderLabels() {
    labels.forEach((m) => m.remove());
    labels = alerts.map((a, i) => {
      const el = document.createElement("div");
      el.className = "pin" + (a.stale ? " stale" : "");
      el.innerHTML = `<span class="dot lv-${a.level}">${ICON[a.level]}</span><span class="lbl">${esc(T.ghat(a.site, true))}</span>`;
      el.addEventListener("mouseenter", () => showPeek(i));
      el.addEventListener("mouseleave", hidePeek);
      el.addEventListener("click", () => showPeek(i)); // touch screens have no hover
      return new maplibregl.Marker({ element: el, anchor: "top" }).setLngLat(FEATURES[a.site].geometry.coordinates).addTo(map);
    });
  }

  // ---------- hover card: the ghat's image over the map ----------
  // A photo when the MPPCB reports have one (only Bairagarh), otherwise the ghat's newest water-test table.
  // Opens on pin hover or tap, and on hover or focus of the ghat's row in the alert list. Pauses the tour while open.
  const IMAGES = window.GHAT_IMAGES || {};
  let peek = null, peekI = -1, hideT = null, resumeTour = false;
  function peekHTML(a) {
    const c = IMAGES[a.site].card, name = T.ghat(a.site);
    const when = c.festival ? `${T.fest(c.festival)} ${c.year}` : "";
    const date = c.date ? new Date(c.date + "T00:00:00").toLocaleDateString(T.lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
    const alt = c.kind === "photo" ? T.t("peekPhotoAlt", { name }) : T.t("peekTableAlt", { name, season: when });
    const cap = c.kind === "photo" ? T.t("peekPhoto", { year: c.year, page: c.page, date }) : T.t("peekNoPhoto", { season: when, page: c.page });
    return `<figure class="peek-fig"><img src="${esc(c.src)}" alt="${esc(alt)}"></figure>
      <div class="peek-body">
        <div class="peek-h"><span class="dot lv-${a.level}" aria-hidden="true">${ICON[a.level]}</span><strong>${esc(name)}</strong></div>
        <div class="peek-sub">${esc(T.level(a.level))} · ${esc(season(a))}</div>
        <p class="peek-cap">${esc(cap)}</p>
        <a class="peek-link" href="app.html#ghat=${encodeURIComponent(a.site)}">${esc(T.t("viewGhat"))} →</a>
      </div>`;
  }
  function setTourBtn() { const mb = $("motion-btn"); if (!mb.hidden) mb.textContent = T.t(timer ? "pauseTour" : "playTour"); }
  function showPeek(i, fromList) {
    clearTimeout(hideT);
    if (!map || !IMAGES[alerts[i].site] || (peek && peekI === i)) return;
    if (timer) { resumeTour = true; clearTimeout(timer); timer = null; map.stop(); setTourBtn(); }
    const c = FEATURES[alerts[i].site].geometry.coordinates;
    if (fromList) { // bring an off-screen pin into view
      const p = map.project(c), box = map.getContainer();
      if (p.x < 0 || p.y < 0 || p.x > box.clientWidth || p.y > box.clientHeight) map.easeTo({ center: c, duration: 800, essential: false });
    }
    if (peek) peek.remove();
    peekI = i;
    peek = new maplibregl.Popup({ closeButton: false, closeOnClick: false, focusAfterOpen: false, offset: 8, maxWidth: "none",
      className: `peek peek-${IMAGES[alerts[i].site].card.kind}` }).setLngLat(c).setHTML(peekHTML(alerts[i])).addTo(map);
    const el = peek.getElement();
    el.addEventListener("mouseenter", () => clearTimeout(hideT)); // the card itself can be hovered, so its link is reachable
    el.addEventListener("mouseleave", hidePeek);
  }
  function hidePeek() { clearTimeout(hideT); hideT = setTimeout(closePeek, 250); }
  function closePeek() {
    clearTimeout(hideT);
    if (!peek) return;
    peek.remove(); peek = null; peekI = -1;
    if (resumeTour) { resumeTour = false; timer = setTimeout(() => visit(here + 1), 2500); setTourBtn(); }
  }
  function overview() {
    const b = new maplibregl.LngLatBounds();
    SITES.forEach((s) => b.extend(FEATURES[s].geometry.coordinates));
    const wide = window.innerWidth > 860;
    map.fitBounds(b, { padding: wide ? { top: 90, bottom: 90, left: window.innerWidth * 0.42, right: window.innerWidth * 0.3 } : { top: 80, bottom: window.innerHeight * 0.55, left: 30, right: 30 }, duration: 0 });
    map.jumpTo({ pitch: 50, bearing: -12 });
  }
  function visit(i) {
    here = i % alerts.length;
    document.querySelectorAll("#gauge-list li").forEach((li) => li.classList.toggle("here", Number(li.dataset.i) === here));
    const c = FEATURES[alerts[here].site].geometry.coordinates;
    const wide = window.innerWidth > 860;
    map.flyTo({ center: c, zoom: 13.6, pitch: 62, bearing: -20 + here * 26, duration: 7000, essential: false,
      offset: wide ? [window.innerWidth * 0.12, 0] : [0, -window.innerHeight * 0.18] });
    timer = setTimeout(() => visit(here + 1), 9500);
  }
  function play() { if (!timer) visit(here + 1); render(); }
  function pause() { clearTimeout(timer); timer = null; map.stop(); render(); }

  function loadMap() {
    const c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) return; // keep the static hero on slow or capped data
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "vendor/maplibre/maplibre-gl.css"; document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "vendor/maplibre/maplibre-gl.js";
    s.onload = () => {
      const b = document.createElement("script");
      b.src = "js/basemap.js";
      b.onload = () => {
        const bm = Basemap.create($("hero-map"), { base: "satellite", interactive: false, pitch: 50, zoom: 11 });
        map = bm.map;
        map.once("load", () => {
          overview(); renderLabels(); render();
          Object.values(IMAGES).forEach((g) => (new Image().src = g.card.src)); // so the first hover shows at once
          if (!motionOff) setTimeout(play, 1200);
        });
      };
      document.body.appendChild(b);
    };
    document.body.appendChild(s);
  }

  document.querySelectorAll("[data-lang-btn]").forEach((b) => (b.onclick = () => { T.set(b.dataset.langBtn); render(); }));
  document.querySelectorAll("[data-theme-btn]").forEach((b) => (b.onclick = () => { window.setTheme(b.dataset.themeBtn); render(); }));
  $("motion-btn").onclick = () => { resumeTour = false; timer ? pause() : play(); };
  const gl = $("gauge-list"), row = (e) => e.target.closest("li[data-i]");
  gl.addEventListener("mouseover", (e) => row(e) && showPeek(Number(row(e).dataset.i), true));
  gl.addEventListener("mouseleave", hidePeek);
  gl.addEventListener("focusin", (e) => row(e) && showPeek(Number(row(e).dataset.i), true));
  gl.addEventListener("focusout", hidePeek);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePeek(); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".pin, .maplibregl-popup, #gauge-list")) closePeek(); });
  render();
  if (document.readyState === "complete") (window.requestIdleCallback || setTimeout)(loadMap);
  else window.addEventListener("load", () => (window.requestIdleCallback || setTimeout)(loadMap));
})();
