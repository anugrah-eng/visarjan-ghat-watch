# PRD: Visarjan Ghat Watch

**Version 2.0 (redesign) · 11 Oct 2026.** Version 1.0 (the one-screen risk map, brief and upload) is shipped. Version 2 adds the following without dropping any v1 feature:
- a satellite + 3D terrain map
- Hindi/English place names across the map and UI
- a redesigned water-quality dashboard
- a rules-based alert engine with bilingual action plans
- light/dark themes
- a landing page

Sections marked **[v2]** are new or changed. Items marked **⚑ Needs decision** need approval before implementation (collected in §14).

## 1. Problem
Three years of ghat water tests (2023–25, 1,524 readings, 7 ghats) are buried in PDFs. Nobody lines them up against CPCB limits or compares one year with the next.

At Bairagarh, DO read 0 mg/l four times. Across Bhopal, 42 of 116 DO readings are below 5, and 100 of 112 BOD readings are above 3. The NGT has banned immersion in the Upper and Lower Lakes, and BMC is building new ghats. The officer has 9 days and no consolidated view.

**[v2]** v1 answers "which ghats are most at risk". It does not:
- turn the latest readings into a clear alert with an action plan
- read comfortably for Hindi-first field staff and the public
- show how values move over time against the safe limit

## 2. Users and jobs-to-be-done
- **Primary user:** the BMC officer who plans Durga visarjan logistics at the ghats. Not technical. Uses a desktop browser and WhatsApp.
  - **Job:** "Before 20 Oct, show me which ghats are most at risk and why. Tell me where to send aeration, cleaning and testing teams. Give me a brief I can forward to my seniors and field staff."
- **[v2] Field staff:** BMC/MPPCB staff at the ghats. Use mid-range Android phones on mobile data and are often more comfortable in Hindi.
  - **Job:** "Tell me what the alert at my ghat is and what I should do now."
- **[v2] Members of the public:** many read Hindi first.
  - **Job:** "Is the water at this ghat within limits, and how recent is that information?"
- **Secondary user (yearly):** a BMC or MPPCB data person who loads the new MPPCB report each year.

## 3. Goals and non-goals
**Goals**
- G1: The officer sees a colour-coded map of the 7 ghats within 10 seconds of opening the dashboard.
- G2: Every status, rank, alert and number traces back to the reading, the CPCB limit and the **PDF page**.
- G3: Missing, stale and out-of-range data is always marked as such, never shown as clean or normal.
- G4: A one-page bilingual (Hindi + English) brief that can be forwarded, plus CSV export.
- G5: Each new year's report can be added without changing code.
- **[v2] G6:** Every ghat has an alert level (Normal / Advisory / Warning / Critical / Data outdated) with a bilingual action plan.
- **[v2] G7:** Every place name, alert and UI label can be read in Devanagari or English, and Devanagari is shaped correctly.
- **[v2] G8:** Charts answer one question each: current status, trend, cross-ghat comparison, or compliance. They work without colour.
- **[v2] G9:** Light and dark themes, both WCAG AA, with no flash of the wrong theme on load.
- **[v2] G10:** A distinctive landing page that loads fast on a mid-range Android phone over 4G.

**Non-goals**
- Health-effect claims.
- Live government system integration.
- A multi-user portal or login.
- Real-time sensors.
- Forecasting 2026 values (only past patterns are shown).
- **[v2]** Ghats outside Bhopal. The brief mentions "Madhya Pradesh ghat sites", but the data covers only the 7 Bhopal ghats. The landing flyover shows MP for context only. **⚑ Needs decision** if more districts are expected.
- **[v2]** New npm dependencies, a bundler, or a framework. v2 stays a static, vanilla-JS site.

## 4. Functional requirements

### 4.1 v1 requirements (kept; changes noted)

| ID | Requirement | Priority |
|---|---|---|
| F1 | **MapLibre GL JS map** centred on Bhopal with the 7 ghat markers, from `ghats.geojson`, with coordinates labelled "approximate" until verified. **[v2]** Satellite basemap + 3D terrain (see F20) | P0 |
| F2 | **[v2 changed] Marker colour = alert level** (§5.2), not the historical risk score. Every level has a colour, an icon shape and a text label, so it reads without colour. "Data outdated" and "Data needed" use **violet with a pulsing dashed ring**, so they read as "urgent action: collect data" and never as neutral, grey or safe. The pulse is static under `prefers-reduced-motion`. A legend is always visible. The historical risk rank (§5.1) still sets the list order and appears as "#rank" | P0 |
| F3 | **Popup** on marker click: ghat name (in the active language), water body, **[v2]** alert level, triggering parameters with how far they are past the limit, the round and date the data was recorded, the top recommended action, and a "View details" button | P0 |
| F4 | **Sidebar / overview**: (a) ghats ranked by alert level, then by risk rank, with status chips (click → fly to the marker and open details); (b) detail view with all **13 parameters** in a year × festival × phase table, filterable by year and festival. **[v2]** Superseded by the dashboard views F30–F33, but the table stays inside the detail view | P0 |
| F5 | **Cell semantics**: value red when it breaches the limit; "BDL" shown as "BDL (below detection)"; `not sampled` / `*` / `**` shown as a violet-hatched "Not tested", the same urgency colour as the data-needed status; parameters with no Class B limit shown as values only, marked "no CPCB bathing limit". **[v2]** "Red" becomes the `--alert-critical` token plus a ✕ glyph and the text "breach", so it is not colour-only | P0 |
| F6 | **Source traceability**: every value links to `resources/<year report>.pdf#page=N`, with the official MPPCB URL as fallback | P0 |
| F7 | **CPCB report**: an assessment for pH, DO and BOD against Class B, per ghat and across all ghats (breach counts, worst reading, recovery after a week) | P0 |
| F8 | **Export to CSV**: exports the currently filtered readings, or the full ranked summary, with source pages included. **[v2]** Adds alert level and triggers | P0 |
| F9 | **Bilingual brief** (EN/HI toggle): top-risk ghats with reason and recommended action, data gaps, limitations, sources. Buttons: **Copy for WhatsApp** and **Print / Save as PDF** (one A4 page). **[v2]** The actions come from the alert engine (F40), so the brief and the UI never disagree | P0 |
| F10 | **Upload a new MPPCB report (PDF) in the web interface and parse it automatically.** The browser does the work, with no server and no Python:<br>1. Extract text with positions (pdf.js).<br>2. Parse every Pre/During/After table (JS port of `tools/parse_visarjan.py`).<br>3. Detect the year and festival. The user confirms the year.<br>4. Map parameter names to the 13 standard names.<br>5. Match site names to the 7 ghats using the known aliases.<br>6. **Review screen:** rows per ghat, BDL / not-sampled flags, and unmatched site names. The user resolves each unmatched name; nothing is guessed silently.<br>7. **Confirm:** the data is merged, re-scored and **[v2] re-alerted**, and every view is redrawn.<br>The parsed data and the PDF are kept in IndexedDB, so the source links work for uploaded reports too. **Reset to bundled data** undoes the upload | P0 |
| F11 | **CSV upload** (same schema as the Bhopal CSV), as a fallback if a new report layout defeats the parser. Same review and confirm flow as F10 | P0 |
| F11b | **CLI ingest** `python pipeline/ingest.py <report.pdf> <year>`, used to cross-check the browser parser and as an offline backup | P2 |
| F12 | **Recommended actions** per ghat. **[v2]** Replaced by the alert engine action plans (F40–F44). The v1 rules carry over: low DO → aeration; high BOD or no recovery → extra cleaning and fast removal of idol material; data gap → send a testing team before 20 Oct | P0 |
| F13 | **"What this data does not tell you"** panel, always reachable (see §8) | P0 |
| F14 | Countdown header: "Durga Visarjan 20 Oct 2026: N days" | P1 |
| F15 | Optional Claude polish of the English/Hindi brief at build time (`ANTHROPIC_API_KEY` env var). The output is rejected if it contains any number not found in the data. **[v2]** Never applied to alert text or actions, which come only from the content file | P2 |
| F16 | Parsing scanned (image-only) PDFs with OCR | Out of scope; the CSV fallback covers it |

### 4.2 [v2] Map: satellite base and 3D terrain

| ID | Requirement | Priority |
|---|---|---|
| F20 | **Satellite imagery is the default basemap** on every map: the landing hero, the dashboard map and the detail-view mini map | P0 |
| F21 | **Basemap toggle** Satellite ⇄ Streets. Streets is the existing OpenFreeMap vector style, with the OSM raster fallback kept. The choice is persisted in `localStorage` | P0 |
| F22 | Add a `raster-dem` source with the id exactly **`raster-dem-source`**, and set the style's terrain to exactly **`{"source": "raster-dem-source", "exaggeration": 0.5}`**. The values are defined once in `config.js` and asserted by a test | P0 |
| F23 | **Style reload safety:** on every `style.load` (basemap toggle, theme change, fallback to raster), re-add the DEM source, terrain, hillshade (if used), the ghat overlay layers and the active-language label expressions. One idempotent function, `applyOverlays(map)`, does this | P0 |
| F24 | **Attribution** for every active source, kept current when the basemap changes (§10.3). On mobile it is compact but expandable | P0 |
| F25 | **Legible over imagery:** text halos (`text-halo-width ≥ 1.5`, halo colour from a theme token), markers with a white 2px outer ring plus a dark 1px inner ring and a drop shadow so they read on light and dark imagery, and HTML labels on a semi-opaque theme surface | P0 |
| F26 | **Graceful degradation:** without WebGL, or if tiles fail, the overview list, detail, comparison, alerts and brief still work, and a notice explains that the map is unavailable. On low-end devices (`navigator.deviceMemory ≤ 2` or `hardwareConcurrency ≤ 4`), terrain starts off and the user can switch it on | P1 |

### 4.3 [v2] Bilingual place names

| ID | Requirement | Priority |
|---|---|---|
| F27 | **Language toggle** "EN / हिंदी", always visible in the header (landing and dashboard). It is persisted in `localStorage` (`vgw.lang`). On a first visit the default is Hindi if `navigator.language` starts with `hi`, else English. Sets `<html lang>` | P0 |
| F28 | **Map labels** switch via `setLayoutProperty(layer, "text-field", expr)` on every symbol layer that shows a name. Hindi: `["coalesce", ["get", "name:hi"], ["get", "name:en"], ["get", "name"]]`. English: `["coalesce", ["get", "name:en"], ["get", "name"]]`, with `name:hi` as the last fallback. This is re-applied after every `style.load` | P0 |
| F29 | **Devanagari shaping check** (see §9): render "मध्य प्रदेश", "नर्मदा", "क्षिप्रा", "भोपाल" and every ghat name, take screenshots, and compare them with browser-shaped text. If conjuncts or matras break (expected in MapLibre 4.x), ghat names and key places are shown as **HTML overlays** (`maplibregl.Marker` with a custom element), which the browser shapes correctly | P0 |
| F29b | **Single content file** `site/js/i18n.js` holds every UI label, ghat name (en/hi), alert level name, trigger sentence and action, in both languages. Components look strings up by key. No user-facing literals stay in components, `config.js` or `ghats.geojson` (which keeps only `id` and coordinates; names move to `i18n.js`) | P0 |

### 4.4 [v2] Water-quality dashboard

Chart forms follow the Data plugin and `dataviz` skill guidance: one question per view; the simplest form that answers it; thresholds drawn as reference lines; no pie, gauge or 3D charts.

| ID | View / question | Form | Priority |
|---|---|---|---|
| F30 | **Overview: "What is the status of every ghat right now?"** | (a) **Status strip:** a count of ghats at each alert level, as text plus an icon and colour (no donut). (b) **Ghat table/list:** name, alert chip, triggering parameters, data round and age, risk rank. Sorted by severity, then rank. A row click selects the ghat on the (c) **map**, where markers are coloured by alert level. A **freshness line** shows the source report, last round and age in days | P0 |
| F31 | **Ghat detail: "What is each parameter doing at this ghat, and is it within the limit?"** | (a) **Alert card** with level, triggers (value, limit, difference and % past the limit), recorded round/date, and actions in the active language with a toggle to show both. (b) **Latest-value tiles**, one per scored parameter, showing value + unit, limit, a pass/breach glyph and text, and the round. (c) **Trend small multiples:** one chart per parameter (DO, BOD, pH first, then the others). x = round (year × festival) with pre/during/after as three ticks per round. Dots joined only within a round. The **CPCB limit is drawn as a labelled reference line**, and the out-of-limit region is lightly shaded with a hatch. **Missing points are shown as hollow "not tested" markers on the baseline, never interpolated.** BDL is shown as a marker at the detection floor, labelled "BDL". (d) The v1 13-parameter table | P0 |
| F32 | **Comparison: "How do the ghats compare on parameter X?"** | A parameter selector (DO, BOD, pH, plus the unscored parameters marked "no CPCB limit"). A **dot plot**: one row per ghat, sorted by value. Latest round dot filled, earlier rounds as faint dots behind (shows range). Limit reference line, direct value labels, and missing ghats listed as "not tested" rows at the bottom | P0 |
| F33 | **Compliance: "How often does each ghat breach the standard?"** | A **breach table**: ghat × parameter, "n breached / n tested", with a bar-in-cell (heat-table form), plus the v1 CPCB report. A heat table is chosen over a chart because officers read exact counts | P1 |
| F34 | **Every view shows** units, the round/date of the data, the source (report name + PDF page link), and freshness ("data from Durga 2025 after-phase, N days old"). Stale data carries a violet "outdated" badge everywhere it appears | P0 |
| F35 | **Missing / stale / out-of-range marking:** missing = hatched "Not tested"; stale = violet "Outdated" badge; out of range = breach glyph ✕ + "breach" text + `--alert-*` colour; implausible values (e.g. pH < 0 or > 14, DO > 20 mg/l, negative concentrations) = "⚠ check value", excluded from alerts and listed for review | P0 |
| F36 | **Accessible charts:** each SVG has `role="img"`, a `<title>`, and an `aria-describedby` text summary (e.g. "BOD at Khatlapura breached 3 mg/l in 5 of 6 tested rounds; latest 7.2 mg/l, Durga 2025"). Each chart has a **"Show table"** toggle with a real `<table>`. Series use shape + dash as well as colour. Keyboard focus moves between data points and shows the tooltip. Targets are ≥ 44×44 px on touch | P0 |
| F37 | **Charts restyle with the theme:** all chart colours come from CSS variables (`--chart-*`). On theme change the charts re-read the variables and re-render (no hardcoded hex in `charts.js`) | P0 |
| F38 | Charts are hand-built SVG in `site/js/charts.js`. There is no chart library in the repo, and one would be a new dependency. The data is small (at most 18 points per parameter per ghat), so SVG is enough | P0 |
| F39 | **Routing:** `dashboard.html#ghat=<id>`, `#compare=<param>` and `#compliance` are deep-linkable, so a WhatsApp link opens the right view. Back/forward work | P1 |

### 4.5 [v2] Action-plan alerts

| ID | Requirement | Priority |
|---|---|---|
| F40 | **Alert engine** `site/js/alerts.js`: a pure function `evaluate(readingsForGhat, config, now) → Alert`. It has no DOM access, so Node can test it, the same as `scoring.js`. Rules are in §5.2 | P0 |
| F41 | **Alert object:** `{ ghatId, level, levelRank, stale, dataGap, recordedRound, recordedDate, recordedDateApprox, ageDays, triggers: [{ parameter, value, unit, limit, limitType, delta, deltaPct, severity, sourcePage }], missing: [parameter], notEvaluated: [parameter], implausible: [...], lastKnownLevel, actions: [actionKey] }`. Text is looked up from `i18n.js` by key, so the engine has no language logic | P0 |
| F42 | **Thresholds in one place:** `CONFIG.alerts` in `site/js/config.js` (Class B limits, severity bands, stale window, action mapping). The existing `CONFIG.limits` is reused, not duplicated | P0 |
| F43 | **Where alerts appear:** overview table and status strip, map marker colour and popup, ghat detail alert card, the brief, and the CSV export | P0 |
| F44 | **Actions** are concrete and bilingual, keyed in `i18n.js` (§5.3). Each action names who acts (BMC zone office, MPPCB lab, ghat in-charge) | P0 |
| F45 | **Unit tests** `site/js/alerts.test.js` (`node --test`). They cover: every level; exact boundaries (DO 5.0 / 4.99 / 4.0 / 3.99 / 0; BOD 3.0 / 3.01 / 6.0 / 6.01; pH 6.5 / 6.49 / 8.5 / 8.51 / 6.0 / 9.0); escalation; missing DO, BOD or pH; all parameters missing; BDL for BOD (compliant) and for DO (flag); stale at window − 1 day / window / window + 1 day; stale + last-known Critical; implausible values; and that the terrain config equals the exact required object | P0 |

### 4.6 [v2] Light and dark mode

| ID | Requirement | Priority |
|---|---|---|
| F50 | **Theme tokens** in `site/css/tokens.css`, on `:root[data-theme="light"]` and `:root[data-theme="dark"]`: surface (3 levels), text (3 levels), border, accent, focus ring, 5 alert levels (fill, ink-on-fill, tint), chart palette (series, grid, axis, reference line, out-of-limit shading), map overlays (label text, halo, popup surface). **No hex values in components**; `style.css`, `print.css` and the JS read tokens. The current colours in `config.js` `status.*.color` move to tokens | P0 |
| F51 | **First visit** follows `prefers-color-scheme`. Toggle in the header (☀ / ☾ with text label). Persisted in `localStorage` (`vgw.theme`). A small inline `<script>` in `<head>` sets `data-theme` before the first paint, so there is no flash of the wrong theme. `color-scheme` is set for native controls | P0 |
| F52 | **Adapts to theme:** map popups, HTML labels, symbol halos (`setPaintProperty` on theme change and after `style.load`), the Streets style (light: Positron; dark: a dark OpenFreeMap style, **⚑ verify which**), legend, charts, alerts, modals and the print view (always light) | P0 |
| F53 | **WCAG AA in both themes:** text 4.5:1; large text and UI glyphs 3:1; alert chips use ink-on-fill pairs checked to ≥ 4.5:1 (amber/yellow use dark ink). A contrast check script (`node tests/contrast.js`, no new deps) checks every token pair and fails the test run below AA | P0 |

### 4.7 [v2] Landing page

| ID | Requirement | Priority |
|---|---|---|
| F60 | `site/index.html` becomes the landing page. The current one-screen app moves to `site/dashboard.html` (`index.html?until=…` links redirect). The design follows the **frontend-design** skill: a committed visual direction, not a generic hero/feature-grid template | P0 |
| F61 | **Hero = the region map.** Satellite + terrain, with a slow camera flyover: MP context → Narmada and Bhopal → along the Upper and Lower Lakes past each ghat. Each ghat's marker is shown in its live alert colour. A static, pre-rendered poster image (WebP/AVIF, < 120 KB) shows first; the map loads only after first paint, when visible, and not on Save-Data | P0 |
| F62 | **Live alert summary** over the hero: "7 ghats · 2 Critical · 3 Warning · 2 Data outdated · data from Durga 2025". Computed from bundled data by the same alert engine. Each count links to the filtered dashboard | P0 |
| F63 | **Clear entry points:** primary "Open dashboard / डैशबोर्ड खोलें"; secondary "Today's brief" and "How we judge water quality" (methodology) | P0 |
| F64 | **Motion:** under `prefers-reduced-motion: reduce` there is no flyover (static framed view or poster) and no pulsing. The flyover always has a visible Pause button (WCAG 2.2.2) and stops on user interaction | P0 |
| F65 | **Performance budget** (mid-range Android, Fast 4G, Lighthouse mobile): LCP ≤ 2.5 s, CLS ≤ 0.05, ≤ 150 KB transferred before the map loads (HTML + CSS + JS + fonts + poster). Fonts are subset (Devanagari + Basic Latin), `woff2`, `font-display: swap`, with the primary weight preloaded. MapLibre JS/CSS load only with the map | P0 |
| F66 | Fully responsive from 360 px to wide desktop. Supports the language toggle and both themes | P0 |

## 5. Risk, alert and status rules (CPCB Class B: organised outdoor bathing)
**Class choice:** devotees enter the water at ghats, so bathing contact applies. This reason is documented in `docs/methodology.md`.

### 5.1 Historical risk score (v1, unchanged; now used for ranking only)

| Parameter | Class B limit | Breach |
|---|---|---|
| Dissolved oxygen | ≥ 5 mg/l | < 5. Severe if < 4. Critical if = 0 ("no oxygen") |
| BOD | ≤ 3 mg/l | > 3. Severe if > 6 |
| pH | 6.5–8.5 | outside the range |

**Points** for each sampled reading:
- DO < 5 = 2, DO < 4 = +1, DO = 0 = +3
- BOD > 3 = 1, BOD > 6 = +1
- pH out of range = 1

**Weights and extras:**
- Weight ×1.5 for **Durga**, because the coming event is Durga.
- Recency weights: 2025 ×1.0, 2024 ×0.8, 2023 ×0.6. They are computed relative to the latest year in the data, so they still work after an upload.
- +1 for **no recovery** (DO or BOD in the after phase is worse than pre) per festival-year.
- The score is normalised by the number of sampled readings. Missing readings never lower risk.

**Risk bands** (v1 "At risk / Watch / Within limits / Data needed") stay in the CPCB report and brief as "historical risk". **[v2]** Marker colour now shows the alert level (§5.2). Both are shown together, e.g. "Warning · historical risk #2", so the officer sees both "now" and "pattern".

**Handling rules:**
- BDL / ND = very low but present. For BOD and the metals, treat it as compliant. If BDL shows up for DO, show "BDL" and flag it for review, because very low DO would be a breach, not a pass.
- `not sampled`, `*`, `**`, blank = missing.
- Metals, COD, solids, turbidity and conductivity are shown but **never scored or alerted**. Conductivity can be compared to the Class E cap of 2250 for context.

### 5.2 [v2] Alert engine rules
**Input:** each ghat's **latest round**, meaning the most recent year × festival with any reading. Within that round, each parameter uses its **latest tested phase** (after > during > pre). The *during* value is shown alongside as the peak. **⚑ Needs decision:** evaluate the latest phase (current state) or the worst phase of the round (peak load).

**Per-parameter severity** (thresholds live in `CONFIG.alerts`):

| Parameter | In our data? | Class B limit (CPCB) | Advisory | Warning | Critical | Confidence |
|---|---|---|---|---|---|---|
| pH | Yes | 6.5–8.5 | outside by ≤ 0.5 (6.0–<6.5 or >8.5–9.0) | outside by > 0.5 | none | Class B range is CPCB. ⚑ The 0.5 Advisory/Warning split is **project-defined** |
| Dissolved oxygen | Yes | ≥ 5 mg/l | 4 ≤ DO < 5 | DO < 4 | DO = 0 / reported "nil" | Limit is CPCB. The 4 and 0 bands reuse v1 scoring bands (DO 4 = Class C/D minimum). ⚑ Confirm, or choose a cut such as < 2 mg/l |
| BOD | Yes | ≤ 3 mg/l | 3 < BOD ≤ 6 | BOD > 6 | none | Limit is CPCB. The 6 band reuses v1 (2× limit). ⚑ project-defined |
| Faecal coliform | **No: never tested** | ≤ 500 MPN/100 ml desirable; ≤ 2500 maximum permissible | > 500 | — | > 2500 | CPCB bathing criteria. **Configured but not evaluated.** Always shown as "Not measured". ⚑ `data/cpcb_water_quality_criteria.csv` says *Total* coliform 500 for Class B. Correct it to faecal coliform, citing the CPCB bathing-water criteria |
| COD, total/dissolved/suspended solids, turbidity, chromium, lead, zinc, copper | Yes | **No Class B limit** | — | — | — | Not alerted. Listed under "not evaluated". ⚑ No limits invented. Add one only with a cited standard |
| Conductivity | Yes | No Class B limit (Class E ≤ 2250 µS/cm, context only) | — | — | — | Context note only |

**Ghat level** (highest that applies):
1. **Critical:** any parameter at Critical, **or** ≥ 2 of DO/BOD/pH at Warning. ⚑ The escalation rule is project-defined.
2. **Warning:** any parameter at Warning, **or** ≥ 2 at Advisory.
3. **Advisory:** exactly one parameter at Advisory.
4. **Normal (within tested limits):** DO, BOD and pH all tested and within limits. Always labelled "within *tested* limits", because coliform is not measured.
5. **Data needed:** DO or BOD missing in the latest round and nothing breaches. A ghat never shows as Normal with a core parameter untested. If something does breach, the level stands and a "data gap" flag is added (this replaces the v1 violet data-gap badge).

**Staleness:**
- `CONFIG.alerts.staleAfterDays` sets the window. If the latest round's date is older than this, `stale = true` and the displayed level becomes **Data outdated**.
- `lastKnownLevel` keeps the computed level and is always shown ("Data outdated · last known: Critical, Durga 2025").
- If the last known level is Warning or Critical, the marker keeps that colour with a violet hatched ring, so a stale data point never hides a known problem. If it is Normal or Advisory, the marker is violet.

**Round dates:**
- The CSV has year/festival/phase but no sampling date.
- Plan: add a `roundDates` table to `config.js` (visarjan date per year × festival, read from the report pages and cited), and mark derived dates "approx."
- Add an optional `sample_date` column if the reports print one. **⚑ Verify in the PDFs.**

**⚑ Needs decision: stale window.** Today (11 Oct 2026) the newest round, Durga 2025, is about 1 year old. A 30-day window would mark **every** ghat Data outdated, which is honest but means "test now". A 400-day window (proposed default: one festival cycle) treats Durga 2025 as current. The UI shows age in days either way.

### 5.3 [v2] Action plans (keys in `i18n.js`, EN + HI)

| Trigger | Action keys (examples) |
|---|---|
| Any Advisory | `monitor_closely` (ghat in-charge watches for odour, floating material, fish kill), `resample_before_event` (MPPCB lab resamples before 20 Oct) |
| DO Warning/Critical | `deploy_aeration` (BMC deploys aerators/fountains), `advise_against_bathing` (signboards + announcements in Hindi), `notify_municipal_body` (BMC zone office and MPPCB regional office informed the same day) |
| BOD Warning/Critical | `remove_idol_material` (remove flowers, cloth and idol debris within 24 h), `extra_cleaning`, `use_artificial_kund` (divert immersion to a lined kund) |
| pH Warning | `check_discharge` (check nearby drains/outfalls), `resample_48h` |
| Critical (any) | All Warning actions + `restrict_immersion` (recommend that immersion be moved or limited, for officer decision) + `daily_testing` |
| Data needed / outdated | `send_testing_team` (collect DO, BOD and pH before 20 Oct), `report_results_upload` (upload the new report to refresh the alert) |
| Always | `cite_source` (each alert shows the report page) |

Actions are recommendations, worded as such. The tool advises; the officer decides. No health claims are made.

## 6. Data
- **Input:** `bhopal_ghats_2023_2025.csv` (schema in DATA_DICTIONARY.md) and `cpcb_water_quality_criteria.csv`.
- **Coverage:** 1,524 readings, 7 ghats, 13 parameters (pH, DO, BOD, COD, total, dissolved and suspended solids, turbidity, conductivity, chromium, lead, zinc, copper), 6 rounds (Ganesh and Durga, 2023–25). Durga 2025 has 180 rows against 273 in a full round.
- **Locations:** `ghats.geojson` with the 7 ghats. **[v2]** Adds a stable `id` slug (e.g. `khatlapura`). Names move to `i18n.js`; the geojson keeps `site` for joins. Properties: `id`, `site`, `water_body`, `coord_status` (`approximate` / `verified`), `note`.
- **[v2] Key places** for HTML labels (landing + map): मध्य प्रदेश / Madhya Pradesh, भोपाल / Bhopal, बड़ा तालाब / Upper Lake, छोटा तालाब / Lower Lake, नर्मदा / Narmada. Coordinates are in `data/places.geojson`; names are in `i18n.js`.
- **Upload: PDF (primary).** The browser parser outputs rows in the Bhopal CSV schema, adding `source_file` and `parsed_in_browser=yes`.
  - Site aliases come from every `site_as_printed` value already in the CSV. They are stored in `site/js/aliases.js`.
  - The parameter map comes from DATA_DICTIONARY.md, for example `D.Oxygen` → `Dissolved oxygen`.
- **Upload: CSV (fallback).** Same columns as the Bhopal CSV. Required: `year`, `festival`, `site`, `phase`, `parameter`, `value`, `flag`, `source_page`.
- Both paths go through the same validation and review screen. Duplicate year+festival rows prompt "replace existing?".
- **Sanity check** shown in the README and tested: the data reproduces **42/116 DO < 5** and **100/112 BOD > 3**.

## 7. [v2] Theming approach
- Tokens live in `tokens.css`, selected by `data-theme` on `<html>`. Semantic names only: `--surface-1`, `--text-2`, `--alert-warning-fill`, `--chart-ref-line`. No raw palette names in components.
- The alert palette is chosen for AA in both themes:
  - Critical: red with white ink
  - Warning: orange with dark ink
  - Advisory: yellow with dark ink
  - Normal: teal with white ink
  - Data outdated / needed: violet with white ink
  - Each level also has a distinct glyph (✕ ▲ ! ✓ ?) and a text label.
- The chart palette follows the `dataviz` skill palette method, validated for both themes with its validator. There is one reference-line style for every limit across all charts.
- The map reads tokens through `getComputedStyle` for halos and popups. The satellite basemap is theme-independent; Streets swaps light/dark styles.

## 8. Honesty / limitations (shown in the UI and the brief)
- No coliform data was tested, although it is a Class B criterion. **[v2]** That is why "Normal" says "within tested limits".
- Only 4 metals were tested, and there are no Class B limits for metals.
- The reports print no units. Units are assumed.
- Bairagarh and Malikhedi have **no Durga 2025** data. Suspended solids is missing for Durga 2023 and 2025.
- "Rani Kamlapati ghat / Kamla Park kund" may be two places: Ganesh tables say Kamla Park kund, Durga tables say Lower Lake ghat. The UI shows a ⚠ badge.
- The new BMC ghats have no history. Ranking reflects past readings, not a prediction.
- No health effects are claimed. The tool reports readings against limits only.
- Map locations are approximate unless marked verified.
- **[v2]** Sampling dates are not printed per reading. Round dates are approximate, so data age is approximate.
- **[v2]** Severity bands beyond the CPCB limit (Advisory/Warning/Critical cut-offs) are project-defined and are labelled as such in the methodology.

## 9. [v2] Devanagari rendering approach
- **Fonts:** **Mukta** (Devanagari + Latin in one family, OFL 1.1, light and clear at small sizes), self-hosted as subset `woff2` (weights 400/600/700) in `site/vendor/fonts/`, with the OFL licence file. Fallback stack: `"Mukta", "Noto Sans Devanagari", "Nirmala UI", "Mangal", system-ui, sans-serif`. The display face for the landing page is chosen during design (frontend-design skill) and must also cover Devanagari or pair with Mukta. **⚑ Needs decision:** font files are static assets, not npm packages, but approval is requested as they are new third-party files.
- **Known MapLibre limit:** MapLibre GL JS 4.x renders symbol text from pre-rendered SDF glyphs, without complex-script shaping. Devanagari conjuncts (क्ष, ध्य, द्र) and pre-base matras (ि) usually render broken or out of order. The `mapbox-gl-rtl-text` plugin covers only Arabic and Hebrew.
- **Plan:**
  1. Implement F28 (`setLayoutProperty` + coalesce) for basemap labels.
  2. Screenshot the test strings.
  3. If they are broken, render **ghat names and the key places** as HTML overlays, which are browser-shaped and correct.
  4. In Hindi mode, basemap symbol layers fall back to their English/Latin names, so no broken Devanagari is ever shown.
- **Tradeoff:** HTML overlays don't collide with or hide basemap labels, cost a DOM node each (fine for about 12), and don't tilt with the 3D camera. They stay upright and readable. Basemap street and village names stay in Latin script in Hindi mode.

## 10. Tech

### 10.1 Stack (unchanged)
- **Static site:** HTML + vanilla JS + MapLibre GL JS 4.7 (vendored in `site/vendor/maplibre`). No framework, bundler or new npm dependency.
  - If tiles fail, the overview, detail, comparison, alerts, report and brief still work.
- **Scoring in JS** (`site/js/scoring.js`) so that uploads re-score in the browser. It is a single source of truth. **[v2]** `site/js/alerts.js` follows the same pattern.
- **In-browser PDF parsing:** `pdf.js` (pdfjs-dist), vendored in `site/vendor/` so it works offline.
  - `site/js/pdfparse.js` groups text items into lines by y position (each page is one `source_page`).
  - It finds the Pre/During/After header row, records each column's x position, and assigns each value token to the nearest column.
  - pdf.js runs in its own worker. Table parsing is light (a 118-page report takes about a second).
  - Uploaded PDFs and rows are stored in IndexedDB.
- **Bundled data:** `site/data/bundled.js` (`window.BUNDLED = {...}`), generated by `pipeline/build_data.py` from the CSVs.
- **Python** is used only for the bundle build, the optional CLI ingest cross-check and the optional Claude polish.
- Run with `python -m http.server 8765` (pdf.js workers and fonts need HTTP).

### 10.2 [v2] Environment and keys
- There is no `.env.example` and no tile API key in the repo yet. The current sources (OpenFreeMap, OSM raster) need no key.
- `pipeline/build_data.py` reads `.env` (gitignored) and writes `site/data/env.js` (gitignored) with **only** whitelisted public variables (`MAPTILER_KEY`). Pages read `window.ENV`. No key ever goes in source.
- New `.env.example`:
  ```
  # Optional. Satellite imagery from MapTiler. Restrict the key to your domain in the MapTiler dashboard.
  MAPTILER_KEY=
  # Optional. Build-time brief polish (F15).
  ANTHROPIC_API_KEY=
  ```
- **Note:** any key used by a browser map is visible to users. That is normal for tile keys, but it must be **domain-restricted**.

### 10.3 [v2] Tile and DEM sources (⚑ Needs decision)

| Use | Source | Key | Licence / terms | Attribution string |
|---|---|---|---|---|
| **DEM (terrain)**: proposed | AWS Terrain Tiles (Mapzen/Tilezen) `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`, `encoding: "terrarium"`, `tileSize: 256`, maxzoom 15 | None | Open data (Registry of Open Data on AWS); the source datasets need attribution | "Terrain: Mapzen / Tilezen, SRTM, GMTED2010, ETOPO1 (AWS Open Data)" |
| **Satellite**, option A (recommended if a key is approved) | MapTiler Satellite (raster tiles) | `MAPTILER_KEY` | Free tier allows non-commercial/limited use; government public use **⚑ check plan terms** | "© MapTiler © OpenStreetMap contributors" plus imagery credit |
| **Satellite**, option B (no key; default fallback) | EOX Sentinel-2 cloudless (WMTS) | None | 2016 mosaic CC BY 4.0; 2018+ mosaics CC BY-NC-SA 4.0 (non-commercial). Ten-metre resolution is blurry at ghat zoom (≥ 15) | "Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data)" |
| Satellite, option C (not proposed) | Esri World Imagery | Account/ToS | Use outside ArcGIS products requires an Esri account and terms; risky for this deployment | "Esri, Maxar, Earthstar Geographics…" |
| Streets (existing) | OpenFreeMap Positron (+ a dark style) | None | Free; OpenMapTiles schema | "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" |
| Streets fallback (existing) | OSM raster tiles | None | OSMF tile usage policy (light use only) | "© OpenStreetMap contributors" |

**Proposed:** satellite = MapTiler if `MAPTILER_KEY` is set, else EOX s2cloudless (with a "low-resolution imagery" note); DEM = AWS Terrain Tiles. A lake/ghat label overlay comes from our own GeoJSON as HTML (see §9).

### 10.4 [v2] Implementation plan (files)

| File | Change |
|---|---|
| `site/index.html` | **Rewritten** as the landing page (F60–F66). Inline theme bootstrap script |
| `site/dashboard.html` | **New**. The current app shell moved from `index.html`, plus a view switcher (Overview / Ghat / Compare / Compliance), theme + language + basemap toggles |
| `site/css/tokens.css` | **New**. Light/dark tokens (F50) |
| `site/css/style.css`, `print.css` | Replace hex values with tokens; new dashboard layout; responsive breakpoints |
| `site/css/landing.css` | **New** |
| `site/js/config.js` | Add `alerts` (bands, stale window, round dates, action mapping), `map` (source ids, terrain object, URLs without keys). Remove labels and colours (moved to i18n/tokens) |
| `site/js/i18n.js` | **New**. Single content file (F29b) |
| `site/js/alerts.js` + `alerts.test.js` | **New**. Engine + tests (F40–F45) |
| `site/js/map.js` | **New**. Extracted from `app.js`: style building, DEM/terrain, `applyOverlays` on `style.load`, basemap toggle, language expressions, HTML labels, theme halos |
| `site/js/charts.js` | **New**. SVG trend, dot plot and heat-table, plus table fallbacks |
| `site/js/theme.js`, `site/js/lang.js` | **New**. Toggles + persistence + change events |
| `site/js/landing.js` | **New**. Lazy map, flyover, live summary, reduced-motion handling |
| `site/js/app.js` | Use alerts, i18n, map.js, charts.js; views and hash routing. Scoring, upload and parser logic unchanged |
| `site/js/brief.js` | Actions and labels from the alert engine and i18n |
| `site/vendor/fonts/` | **New** (pending approval). Mukta subset woff2 + OFL.txt |
| `data/ghats.geojson`, `data/places.geojson` | Add `id`; new key-places file |
| `data/cpcb_water_quality_criteria.csv` | Correct the Class B coliform row (pending ⚑) |
| `pipeline/build_data.py` | Also emit `site/data/env.js` from `.env` |
| `.env.example`, `.gitignore` | New example; ignore `site/data/env.js` |
| `tests/e2e.js` | Point to `dashboard.html`; add theme/language/view checks and screenshots at 1440 and 390 widths |
| `tests/contrast.js` | **New**. AA contrast check for token pairs |
| `docs/methodology.md`, `README.md` | Alert rules, sources, attributions, run steps |

### 10.5 Tests and verification
- `npm test` (`node --test site/js/`) covers scoring (sanity figures, BDL, missing, deterministic ranking), the PDF parser against all 3 reports, and **[v2]** the alert engine (F45) and the exact terrain config.
- `node tests/contrast.js` **[v2]** must pass in both themes.
- `npm run e2e` (puppeteer-core, already a devDependency; Playwright is not installed) covers the upload flow and **[v2]** screenshots of landing / dashboard / ghat detail / map × light/dark × EN/HI × desktop/mobile, saved to `docs/screenshots/` and reviewed by hand, including the Devanagari test strings on the map.
- **Type checker / linter:** the repo has none, and adding one would be a new dependency. Instead, run `node --check` on every JS file as a syntax gate. **⚑** Approve adding ESLint or `tsc --checkJs` if wanted.
- `npm run build` (bundle + env.js) must succeed.
- Lighthouse mobile run on the landing page against F65.
- MIT LICENSE. No secrets in the code. `.env` and `site/data/env.js` are gitignored.

## 11. UX flow

**Landing (`index.html`)**
```
┌ Visarjan Ghat Watch        [EN | हिंदी] [☀/☾]                          ┐
│  ███ satellite + terrain flyover of Bhopal lakes, ghat markers ███      │
│  "भोपाल के विसर्जन घाटों के पानी की जाँच" / headline                      │
│  Live: 7 ghats · 2 Critical · 3 Warning · 2 Data outdated · Durga 2025  │
│  [Open dashboard]  [Today's brief]  [How we judge water]    [❚❚ Pause]  │
├──────────────────────────────────────────────────────────────────────────┤
│  Alert-level explainer (what each level means + who acts) · Sources     │
└──────────────────────────────────────────────────────────────────────────┘
```

**Dashboard (`dashboard.html`)**
```
┌ Header: name · Durga Visarjan 20 Oct 2026 – 9 days · [EN|हिं] [☀/☾] [Upload] [Brief] ┐
│ Tabs: Overview | Ghat detail | Compare | Compliance     Data: Durga 2025 · N days old  │
│ Overview:                                                                              │
│  Status strip: ✕ Critical 2 · ▲ Warning 3 · ! Advisory 0 · ✓ Normal 0 · ? Outdated 2  │
│  ┌ Ghat table (sorted by severity, rank) ┐ ┌ Map [Satellite|Streets] [Terrain on/off] ┐ │
│  │ name · chip · triggers · round · age  │ │ markers by alert level, legend, popup     │ │
│  └───────────────────────────────────────┘ └───────────────────────────────────────────┘ │
│ Ghat detail: alert card + actions · latest tiles · trend small multiples · 13-param table │
│ Compare: parameter ▾ · dot plot with limit line · table toggle                          │
│ Compliance: breach heat-table · CPCB report                                             │
│ "What this data does not tell you" (always reachable)                                   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
On mobile (< 768 px), tabs become a bottom bar, the map becomes a collapsible panel above the list, and detail charts stack one per row.

The brief and the 3-step upload modal are unchanged from v1 (Drop → Review → Confirm; the toast now also reports alert changes, e.g. "2026 Durga added: 2 ghats changed alert level").

## 12. Success metrics
- **Demo:** the officer goes from opening the tool to a forwarded Hindi brief in under 2 minutes.
- 100% of displayed numbers carry a source page. 5 random spot checks match the PDF.
- 0 missing or stale cells are rendered as numbers, green or "Normal".
- A fresh clone runs in 5 steps or fewer, offline except for map tiles.
- **[v2]** Every alert-engine test passes; the terrain config assertion passes.
- **[v2]** All token pairs pass AA in both themes. Charts are usable in grayscale (manual check).
- **[v2]** Devanagari test strings render correctly wherever Hindi is shown (screenshots in `docs/screenshots/`).
- **[v2]** The landing page meets F65 on Lighthouse mobile.

## 13. Milestones
1. The scored ranking is correct (tests pass). ✅ v1
2. Map + markers + popups + legend. ✅ v1
3. Sidebar with detail table, source links and CSV export. ✅ v1
4. CPCB report + bilingual brief + print/copy. ✅ v1
5. In-browser PDF upload → parse → review → re-score → redraw. ✅ v1
6. README and recording. ✅ v1
7. **[v2]** Approve this plan and resolve §14.
8. **[v2]** Alert engine + config + tests (F40–F45), content file `i18n.js` (F29b).
9. **[v2]** Tokens + theme toggle + contrast test (F50–F53).
10. **[v2]** Map module: satellite/DEM/terrain, basemap toggle, style-reload safety, attribution, Devanagari check + HTML labels (F20–F29).
11. **[v2]** Dashboard views + SVG charts + routing (F30–F39).
12. **[v2]** Landing page (F60–F66).
13. **[v2]** Verification: tests, `node --check`, build, e2e screenshots in both themes and languages at both widths, Lighthouse; update README/methodology.

## 14. [v2] Open decisions and risks

**Decisions needed before implementation**
1. **Satellite provider:** MapTiler (key, sharper, check plan terms) vs EOX s2cloudless (no key, 10 m, licence varies by year) (§10.3).
2. **Stale window:** 400 days (proposed) vs a short window that marks every ghat outdated today (§5.2).
3. **Severity bands** beyond the CPCB limits (pH ± 0.5, DO 4 / 0, BOD 6, the escalation rule), all project-defined (§5.2).
4. **Latest phase vs worst phase** of the latest round as alert input (§5.2).
5. **Coliform row** in `cpcb_water_quality_criteria.csv`: total → faecal, 500 / 2500 (§5.2).
6. **Font files:** self-host Mukta (OFL) subset in `site/vendor/fonts/` (§9).
7. **Linter / type checker:** none today; add one, or keep `node --check` (§10.5).
8. **Scope:** Bhopal's 7 ghats only, or other MP districts (§3).
9. **URL change:** the landing page takes `index.html` and the app moves to `dashboard.html` (old links redirect).

**Risks**
- **Devanagari in MapLibre** will likely break. Mitigation: HTML overlays + Latin basemap labels in Hindi mode (§9).
- **Terrain + satellite on low-end Android:** GPU/memory pressure and data cost. Mitigation: lazy load, poster image, terrain off on low-memory devices, cap DEM maxzoom, no flyover on Save-Data.
- **Tile licensing/quotas:** free tiers can rate-limit on launch day. Mitigation: OSM/vector fallback, the app works without tiles, attribution kept exact.
- **Key exposure:** browser keys are public. Mitigation: domain restriction; never commit `.env` or `env.js`.
- **Alert vs historical risk confusion:** two different signals. Mitigation: always shown together with plain labels ("now" vs "past pattern"), explained on the landing page and in the methodology.
- **False reassurance:** "Normal" without coliform data. Mitigation: label "within tested limits" and an always-visible limitation.
- **Approximate dates:** the stale logic depends on round dates that the CSV lacks. Mitigation: cited `roundDates` table, "approx." label.
- **Skills:** the `frontend-design` skill is installed on disk but was not listed as active in this session. Enable it, or confirm its path, before the landing-page design starts.
