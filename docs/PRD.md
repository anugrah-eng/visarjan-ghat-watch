# PRD: Visarjan Ghat Watch

## 1. Problem
Three years of ghat water tests (2023–25, 1,524 readings, 7 ghats) are buried in PDFs. Nobody lines them up against CPCB limits or compares one year with the next.

At Bairagarh, DO read 0 mg/l four times. Across Bhopal, 42 of 116 DO readings are below 5, and 100 of 112 BOD readings are above 3. The NGT has banned immersion in the Upper and Lower Lakes, and BMC is building new ghats. The officer has 9 days and no consolidated view.

## 2. User and job-to-be-done
- **Primary user:** the BMC officer who plans Durga visarjan logistics at the ghats. Not technical. Uses a desktop browser and WhatsApp.
- **Job:** "Before 20 Oct, show me which ghats are most at risk and why. Tell me where to send aeration, cleaning and testing teams. Give me a brief I can forward to my seniors and field staff."
- **Secondary user (yearly):** a BMC or MPPCB data person who loads the new MPPCB report each year.

## 3. Goals and non-goals
**Goals**
- G1: The officer sees a risk-ranked, colour-coded map of the 7 ghats within 10 seconds of opening the tool.
- G2: Every status, rank and number traces back to the reading, the CPCB limit and the **PDF page**.
- G3: Missing data is always shown as missing, never as clean.
- G4: A one-page bilingual (Hindi + English) brief that can be forwarded, plus CSV export.
- G5: Each new year's report can be added without changing code.

**Non-goals**
- Health-effect claims.
- Live government system integration.
- A multi-user portal or login.
- Real-time sensors.
- Forecasting 2026 values (only past patterns are shown).

## 4. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| F1 | **MapLibre GL JS map** centred on Bhopal with the 7 ghat markers, from `ghats.geojson`, with coordinates labelled "approximate" until verified | P0 |
| F2 | **Colour-coded status** per ghat: 🔴 At risk / 🟠 Watch / 🟢 Within limits / 🟣 **Data needed: test before 20 Oct**. The data-needed marker is **violet with a pulsing dashed ring**, so it reads as "urgent action: collect data" and never as neutral, grey or safe. A legend is always visible. Colours are also shown as text labels, so they are accessible without colour | P0 |
| F3 | **Popup** on marker click: ghat name, water body, status, a one-line reason in plain words, the latest Durga DO/BOD/pH against the limit, and a "View details" button | P0 |
| F4 | **Sidebar**: (a) ranked list of ghats with status chips (click → fly to the marker and open details); (b) a detail view with all **13 parameters** in a year × festival × phase table, filterable by year and festival | P0 |
| F5 | **Cell semantics**: value red when it breaches the limit; "BDL" shown as "BDL (below detection)"; `not sampled` / `*` / `**` shown as a violet-hatched "Not tested", the same urgency colour as the data-needed status; parameters with no Class B limit shown as values only, marked "no CPCB bathing limit" | P0 |
| F6 | **Source traceability**: every value links to `resources/<year report>.pdf#page=N`, with the official MPPCB URL as fallback | P0 |
| F7 | **CPCB report**: an assessment for pH, DO and BOD against Class B, per ghat and across all ghats (breach counts, worst reading, recovery after a week) | P0 |
| F8 | **Export to CSV** button in the sidebar: exports the currently filtered readings, or the full ranked summary, with source pages included | P0 |
| F9 | **Bilingual brief** (EN/HI toggle): top-risk ghats with reason and recommended action, data gaps, limitations, sources. Buttons: **Copy for WhatsApp** and **Print / Save as PDF** (one A4 page) | P0 |
| F10 | **Upload a new MPPCB report (PDF) in the web interface and parse it automatically.** The officer clicks **Upload report** and drops in the PDF. The browser does the rest, with no server and no Python:<br>1. Extract text with positions (pdf.js).<br>2. Parse every Pre/During/After table. This is a JS port of the provided `tools/parse_visarjan.py` logic.<br>3. Detect the year and festival. The user confirms the year.<br>4. Map parameter names to the 13 standard names.<br>5. Match site names to the 7 ghats using the known aliases.<br>6. Show a **review screen**: rows parsed per ghat, values flagged BDL or not sampled, and **unmatched site names**. For each unmatched name the user picks a ghat or "not Bhopal". Nothing is guessed silently.<br>7. On **Confirm**, the data is merged, re-scored, and the map, sidebar and brief are redrawn.<br>The parsed data and the PDF itself are kept in IndexedDB, so the `#page=N` source links work for the uploaded report too. A **Reset to bundled data** button undoes the upload | P0 |
| F11 | **CSV upload** (same schema as the Bhopal CSV), as a fallback if a new report layout defeats the parser. The review and confirm flow is the same as F10 | P0 |
| F11b | **CLI ingest** `python pipeline/ingest.py <report.pdf> <year>` (pdftotext + `tools/parse_visarjan.py`). Used to cross-check the browser parser and as an offline backup | P2 |
| F12 | **Recommended actions** per ghat: low DO → aeration; high BOD or no recovery → extra cleaning and fast removal of idol material; data gap → send a testing team before 20 Oct | P0 |
| F13 | **"What this data does not tell you"** panel, always reachable (see §7) | P0 |
| F14 | Countdown header: "Durga Visarjan 20 Oct 2026: N days" | P1 |
| F15 | Optional Claude polish of the English/Hindi brief at build time (`ANTHROPIC_API_KEY` env var). The output is rejected if it contains any number not found in the data | P2 |
| F16 | Parsing scanned (image-only) PDFs with OCR | Out of scope; the CSV fallback covers it |

## 5. Risk and status rules (CPCB Class B: organised outdoor bathing)
**Class choice:** devotees enter the water at ghats, so bathing contact applies. This reason is documented in `docs/methodology.md`.

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

**Status:**
- 🔴 **At risk** if the score is 1.6 or more (points per tested reading).
- 🟣 **Data needed** (violet, pulsing; the action is "send a testing team before 20 Oct") if the ghat is not red *and* has no tested DO/BOD for the most recent Durga. Missing recent data never shows as amber or green.
- Otherwise 🟠 **Watch** if any DO, BOD or pH reading in the last 2 years breaks the limit, else 🟢 **Within limits**.

**Data-gap flag:** a violet 🟣 "data needed" badge, shown separately even on red or amber ghats. Example: Bairagarh is red from history, but its Durga 2025 data is missing.

All thresholds and weights live in one `config` object, so they are visible and easy to change.

**Handling rules:**
- BDL / ND = very low but present. For BOD and the metals, treat it as compliant. If BDL ever shows up for DO, show it as "BDL" and flag it for review, because very low DO would be a breach, not a pass.
- `not sampled`, `*`, `**`, blank = missing.
- Metals, COD, solids, turbidity and conductivity are shown but **never scored**. Conductivity can be compared to the Class E cap of 2250 for context.

## 6. Data
- **Input:** `bhopal_ghats_2023_2025.csv` (schema in DATA_DICTIONARY.md) and `cpcb_water_quality_criteria.csv`.
- **Locations:** `ghats.geojson` with the 7 ghats. Properties: `site` (exact standard name), `water_body`, `coord_status` (`approximate` / `verified`), `note`. Non-tech teammates verify each point and log how they did it.
- **Upload: PDF (primary).** The browser parser outputs rows in the Bhopal CSV schema, adding `source_file` and `parsed_in_browser=yes`.
  - Site aliases come from every `site_as_printed` value already in the CSV, for example the 5 printed variants of Rani Kamlapati. They are stored in `site/js/aliases.js`.
  - The parameter map comes from DATA_DICTIONARY.md, for example `D.Oxygen` → `Dissolved oxygen`.
- **Upload: CSV (fallback).** Same columns as the Bhopal CSV. Required: `year`, `festival`, `site`, `phase`, `parameter`, `value`, `flag`, `source_page`.
- Both paths go through the same validation and review screen. Unknown sites or parameters are listed for the user to resolve. Duplicate year+festival rows prompt "replace existing?".
- **Sanity check** shown in the README and tested: the data reproduces **42/116 DO < 5** and **100/112 BOD > 3**.

## 7. Honesty / limitations (shown in the UI and the brief)
- No coliform data was tested, although it is a Class B criterion.
- Only 4 metals were tested, and there are no Class B limits for metals.
- The reports print no units. Units are assumed.
- Bairagarh and Malikhedi have **no Durga 2025** data. Suspended solids is missing for Durga 2023 and 2025.
- "Rani Kamlapati ghat / Kamla Park kund" may be two places: Ganesh tables say Kamla Park kund, Durga tables say Lower Lake ghat. The UI shows a ⚠ badge.
- The new BMC ghats have no history. Ranking reflects past readings, not a prediction.
- No health effects are claimed. The tool reports readings against limits only.
- Map locations are approximate unless marked verified.

## 8. UX flow (one screen)
```
┌ Header: Visarjan Ghat Watch · Durga Visarjan 20 Oct 2026 – 9 days · [Upload report] [Brief] ┐
│ Sidebar (left, 380px)            │  MapLibre map                                         │
│  Filters: Year ▾ Festival ▾      │   ● coloured markers + legend                         │
│  Ranked list (status chips)      │   popup: name, status, reason, DO/BOD/pH vs limit     │
│  → Detail: 13-param table        │                                                       │
│    [Export CSV]  [CPCB report]   │                                                       │
│  "What the data doesn't tell"    │                                                       │
└──────────────────────────────────┴───────────────────────────────────────────────────────┘
```
The brief opens as a modal with an EN/HI toggle, Copy and Print. The print stylesheet renders a one-page A4 brief.

**Upload report** opens a 3-step modal:
1. **Drop PDF or CSV.**
2. **Review.** A progress bar runs while pages are parsed. The screen then shows a summary table (ghat × festival × rows found), BDL and not-sampled counts, and dropdowns for any unmatched site names.
3. **Confirm.** The map animates to the new statuses, and a toast reports "2026 Durga added: 2 ghats changed status".

## 9. Success metrics
- **Demo:** the officer goes from opening the tool to a forwarded Hindi brief in under 2 minutes.
- 100% of displayed numbers carry a source page. 5 random spot checks match the PDF.
- 0 missing cells are rendered as numbers or as green.
- A fresh clone runs in 5 steps or fewer, offline except for map tiles.

## 10. Tech
- **Static site:** HTML + vanilla JS + MapLibre GL JS (CDN, with a local copy as fallback).
  - Basemap: the free OpenFreeMap style (no API key), with an OSM raster fallback.
  - If tiles fail, the sidebar, report and brief still work.
- **Scoring in JS** (`site/js/scoring.js`) so that uploads re-score in the browser. It is a single source of truth.
- **In-browser PDF parsing:** `pdf.js` (pdfjs-dist), with a vendored copy in `site/vendor/` so it works offline.
  - `site/js/pdfparse.js` groups text items into lines by their y position (each page is one `source_page`).
  - It finds the header row containing Pre/During/After, records the x position of each column, and assigns each value token to the nearest column. This is the same approach as `parse_visarjan.py`, which uses character columns; pdf.js gives real x coordinates, which is more robust.
  - The site name is the nearest preceding non-heading line or `Location-` line. The festival comes from "Ganesh/Durga idol/visarjan" headings.
  - pdf.js does the heavy PDF work in its own worker. Table parsing itself is light (a 118-page report takes about a second).
  - Uploaded PDFs and rows are stored in IndexedDB.
- **Bundled data:** shipped as `site/data/bundled.js` (`window.BUNDLED = {...}`), generated by `pipeline/build_data.py` from the CSVs, so the page opens from `file://`.
- **Python** is used only for the bundle build, the optional CLI ingest cross-check (needs `pdftotext`, which this machine has at `/mingw64/bin`) and the optional Claude polish.
- Note: opening `index.html` straight from `file://` may block the pdf.js worker in Chrome. The README run step therefore uses `python -m http.server` (one command). The bundled view still works from `file://`.
- **Tests:**
  - `node --test site/js/scoring.test.js` checks the sanity figures, BDL and missing handling, and that the ranking is deterministic.
  - `node --test site/js/` also runs the PDF parser against all 3 reports, and `node tests/e2e.js` drives the upload flow in Chrome.
- MIT LICENSE. No secrets in the code. The `.env` file is gitignored.

## 11. Milestones
1. The scored ranking is correct (tests pass).
2. Map + markers + popups + legend.
3. Sidebar with detail table, source links and CSV export.
4. CPCB report + bilingual brief + print/copy.
5. In-browser PDF upload → parse → review → re-score → redraw. The CSV fallback goes through the same flow.
6. README and recording.

