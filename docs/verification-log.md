# Verification log

## Automated
- `node --test site/js/`: the browser PDF parser re-reads all three MPPCB reports and matches **1,524 / 1,524** rows of the organisers' checked CSV (2023: 525, 2024: 546, 2025: 453) on value, flag and page. The scoring tests reproduce the 42/116 DO and 100/112 BOD figures.
- `node tests/e2e.js`: in Chrome, uploads the 2025 PDF into a 2023–24 view, then confirms the review screen, the merge (1,524 readings), that the data is kept after reload, the source links to the stored PDF, the EN/HI brief, and that a bad CSV is rejected.

## Manual spot checks against the PDFs
Team: open the value in the tool, click it, and confirm the PDF page shows the same number.

| # | Ghat | Season / phase | Parameter | Tool value | PDF page | Matches? | Checked by |
|---|---|---|---|---|---|---|---|
| 1 | Bairagarh (Sant Hirdaram) kund | Ganesh 2025 / during | Dissolved oxygen | 0 | 28 | | |
| 2 | Khatlapura ghat | Ganesh 2023 / after | pH | 8.08 | 26 | | |
| 3 | Rani Kamlapati ghat | Durga 2025 / pre | Dissolved oxygen | 2.5 | 64 | | |
| 4 | Hathaikheda dam | Durga 2024 / pre | pH | 9.2 | 23 | | |
| 5 | Bairagarh (Sant Hirdaram) kund | Ganesh 2024 / after | BOD | 14 | 69 | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |

## Ghat locations
All 7 points in `data/ghats.geojson` are **approximate** (`coord_status: approximate`). To verify one, check it on OpenStreetMap, set `coord_status` to `verified`, note the source here, and run `python pipeline/build_data.py`.

| Ghat | Checked how | By |
|---|---|---|
| | | |
