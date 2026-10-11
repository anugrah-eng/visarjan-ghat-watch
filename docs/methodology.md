# Methodology

## Which CPCB class, and why
We compare readings with **CPCB Class B: outdoor bathing (organised)**. At immersion ghats people stand and bathe in the water, so bathing contact is the right test. Class B sets four limits; three of them were measured:

| Parameter | Class B limit | In the reports? |
|---|---|---|
| Dissolved oxygen (DO) | 5 mg/l or more | Yes |
| BOD (5 days, 20°C) | 3 mg/l or less | Yes |
| pH | 6.5 to 8.5 | Yes |
| Total coliform | 500 MPN/100 ml or less | **No.** Not tested, so we can't say anything about bacteria |

Source: `data/cpcb_water_quality_criteria.csv` (CPCB water-quality criteria, https://cpcb.gov.in/water-quality-criteria/).

COD, solids, turbidity, conductivity and the 4 metals have **no Class B limit**. The tool shows their values with page references but never scores them. Conductivity can be compared with the Class E (irrigation) cap of 2,250 µS/cm for context only.

## How codes are treated
| In the report | Meaning | Treatment |
|---|---|---|
| a number | the reading | compared with the limit |
| `BDL`, `ND` | below detection: very low, but not zero and not missing | counts as within the BOD limit; if it ever appears for DO it is shown, but not scored |
| blank, `_`, `-` | not sampled | **missing**: shown as violet "Not tested", never as clean, never lowers risk |
| `*`, `**` | not sampled at that stage | missing, as above |
| no table at all (e.g. Bairagarh and Malikhedi, Durga 2025) | not tested that season | missing; triggers the "data needed / test before 20 Oct" flag |

## Risk score
For each tested DO, BOD or pH reading:

| Condition | Points |
|---|---|
| DO below 5 | 2 |
| DO below 4 | +1 |
| DO equal to 0 (no oxygen) | +3 |
| BOD above 3 | 1 |
| BOD above 6 (twice the limit) | +1 |
| pH outside 6.5–8.5 | 1 |
| **No recovery**: DO or BOD one week after is worse than before immersion (by 0.5 or more), per festival-year | 1 |

**Weights:**
- Durga readings ×1.5, because the coming event is Durga.
- Recency: latest year ×1.0, one year older ×0.8, older ×0.6. Recency is relative to the newest year in the data, so it adapts when a new report is uploaded.

**Score** = weighted points ÷ weighted number of *tested* readings. Missing readings are left out of both sides, so they can never make a ghat look cleaner.

**Status:**
- **At risk (red, !)**: score of 1.6 or more.
- **Data needed (violet, ?, pulsing)**: not red, and no DO/BOD was tested at the most recent Durga. A red ghat with the same gap shows a pulsing violet ring around its red marker.
- **Watch (amber, ▲)**: any DO, BOD or pH breach in the last two years.
- **Within limits (teal, ✓)**: none of the above.

**Actions:**
- DO breach in the last two years → **aeration**.
- BOD breach in the last two years, or no recovery → **extra cleaning and fast removal of idol material**.
- Any season not tested → **water test before 20 Oct**.

All numbers above live in `site/js/config.js` and can be changed without touching code.

## Check against the problem statement
The scoring code reproduces the organisers' figures exactly: **42 of 116** DO readings below 5 mg/l and **100 of 112** BOD readings above 3 mg/l. This is a test in `site/js/scoring.test.js`.

## Parsing new reports
`site/js/pdfparse.js` is a browser port of the organisers' `tools/parse_visarjan.py`. It uses pdf.js text coordinates instead of pdftotext character columns. On the three published reports it reproduces every one of the 1,524 checked rows (value, flag, phase and page); see `site/js/pdfparse.test.js`. Site names are matched first against every spelling seen in 2023–25, then by keyword (e.g. "khatlapura"). Any other name containing "Bhopal" is shown to the user to map or skip, and is never guessed.
