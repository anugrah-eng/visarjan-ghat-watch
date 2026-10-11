# Visarjan Ghat Watch

Track: 2 Visarjan Ghat Watch
Team: [TEAM NAME] · [member 1], [member 2], [member 3], [member 4], [member 5]

## The user
The Bhopal Municipal Corporation officer who plans Durga visarjan at the ghats, using it in the days before 20 October 2026 to decide where to send aeration, cleaning and water-testing teams.

## What it does
It turns three years of MPPCB immersion water tests (1,524 readings, 7 Bhopal ghats, 2023–25) into a colour-coded map and a ranked list of ghats. Each rank comes with a plain-words reason and a recommended action. Every number is checked against CPCB bathing limits and links to the exact page of the MPPCB report it came from. Missing tests show as violet "Not tested / data needed", never as clean. The officer gets a one-page brief in English and Hindi to copy into WhatsApp or print. Next year, BMC uploads the new MPPCB report PDF in the browser and the map updates, with no developer needed.

![screenshot](docs/screenshot.png)

## Demo
[Link to the 2-minute recording]

## How to run it (4 steps)
1. Install Python 3 (any recent version). Nothing else is needed to *use* the tool.
2. `git clone <this repo>` and `cd visarjan-ghat-watch`
3. `python -m http.server 8765`
4. Open http://localhost:8765/site/ in Chrome or Edge.

Opening `site/index.html` directly by double-click also works for the map, list, report and brief. **Uploading a PDF needs step 3**, because browsers block the PDF reader on `file://`.

To rehearse the yearly update, open http://localhost:8765/site/?until=2024, which hides 2025. Click **Upload report** and drop `resources/Ganesh_and_Durga_visarjan_report-2025.pdf`.

**For developers:** `npm install` then `npm test` (parser and scoring tests) and `npm run e2e` (browser test, with the server from step 3 running). After editing `data/*.csv` or `data/ghats.geojson`, run `python pipeline/build_data.py`.

## What's in the screen
- **Map (MapLibre):** 7 ghats. Red **!** = at risk, amber **▲** = watch, teal **✓** = within limits, violet **?** pulsing = data needed (test before 20 Oct). A violet dashed ring on any marker means the most recent Durga was not tested.
- **Popup:** status, reason, latest Durga DO/BOD/pH against the limits, action, and a link to all 13 parameters.
- **Sidebar:** ranked list; ghat detail with all 13 parameters by year, festival and phase (filterable); every value links to its PDF page; **Export CSV** (this ghat, the ranking, all readings, or the CPCB report).
- **CPCB report:** pH, DO and BOD breaches against Class B, overall and per ghat, including "not tested" counts.
- **Officer brief:** EN / हिंदी / both; **Copy for WhatsApp**; **Print / Save as PDF**.
- **Upload report:** drop an MPPCB PDF (or a CSV). The browser reads every table, matches the 7 ghats and shows a review screen: what was found, what is missing, and any unrecognised Bhopal site names for you to map or skip. Then you confirm. The upload is stored in this browser; "reset to bundled data" undoes it.
- **What this data does not tell you:** always visible in the sidebar.

## How the ranking works
CPCB Class B (outdoor bathing) limits: DO ≥ 5 mg/l, BOD ≤ 3 mg/l, pH 6.5–8.5. Points for each breach, more for severe ones (DO below 4, DO at 0, BOD above 6), plus a point when water was worse a week after immersion than before. Durga and recent years weigh more. The total is divided by the number of readings actually tested, so missing data never makes a ghat look cleaner. Full rules: [docs/methodology.md](docs/methodology.md). Product spec: [docs/PRD.md](docs/PRD.md).

**Check:** the tool reproduces the problem statement's figures exactly: 42 of 116 DO readings below 5, and 100 of 112 BOD readings above 3.

## What works
- Ranking, reasons, actions and statuses for all 7 ghats, with every number linked to the MPPCB report page.
- In-browser PDF parsing of MPPCB reports. On the 2023, 2024 and 2025 reports it reproduces all 1,524 checked rows (tested in `site/js/pdfparse.test.js`).
- CSV upload with validation (bad rows are listed and rejected; nothing changes).
- Bilingual brief, copy and print; CSV exports with source pages and limits.
- Works offline apart from the basemap tiles. If tiles fail, a notice appears and everything else still works.

## What doesn't (yet), and what the data can't tell you
- **Ghat locations are approximate.** They need checking on the ground or on OSM ([docs/verification-log.md](docs/verification-log.md)).
- **No coliform data** in the reports, though Class B sets a coliform limit. Only 4 metals were tested, and CPCB sets no bathing limit for metals.
- The reports print **no units**; standard units are assumed.
- **Bairagarh and Malikhedi have no Durga 2025 table**, so they're flagged "test before 20 Oct".
- "Rani Kamlapati ghat / Kamla Park kund" may be **two different places** (Ganesh tables say Kamla Park kund, Durga tables say Lower Lake ghat). The tool flags this rather than resolving it.
- The ranking reflects **past readings, not a forecast**, and the new BMC ghats have no history. **No health effects are claimed.**
- Scanned (image-only) PDFs can't be parsed; use CSV upload for those. A report with a very different table layout may need parser changes. The review screen will show that nothing matched rather than guess.
- The Hindi text was written by the team and should be read by a native-speaking officer before official use.
- Not built: the optional Claude polishing of the brief (the template brief is used) and the Python command-line ingest (the browser parser replaced it).

## Data used
All from the organisers' data pack (https://github.com/Laaaaksh/bhopal-impact-lab-2026, `tracks/02-visarjan-ghat-watch`):
- `data/bhopal_ghats_2023_2025.csv`: MPPCB immersion readings, 7 Bhopal ghats.
- `data/cpcb_water_quality_criteria.csv`: CPCB water-quality criteria (https://cpcb.gov.in/water-quality-criteria/).
- `resources/`: the original MPPCB reports, so source links open offline:
  - 2025: https://www.mppcb.mp.gov.in/proc/mon/Ganesh_and_Durga_visarjan_report-2025.pdf
  - 2024: https://www.mppcb.mp.gov.in/proc/mon/Ganesh_and_Durga_visarjan_report-2024.pdf
  - 2023: https://www.mppcb.mp.gov.in/proc/mon/Idol_immer._Report_23_CPCB.pdf

Extra data added by the team:
- `data/ghats.geojson`: approximate ghat coordinates placed by the team (to be verified).
- Basemap: © OpenStreetMap contributors, via OpenFreeMap (https://openfreemap.org); fallback tiles from tile.openstreetmap.org.

Libraries (vendored in `site/vendor/`): MapLibre GL JS (BSD-3-Clause) and pdf.js (Apache-2.0).

## Licence
MIT. See [LICENSE](LICENSE). No API keys or secrets are used.
