# Ghat images

Images of the 7 Bhopal ghats, used for the hover cards on the home-page map. They come from the MPPCB visarjan reports (2023, 2024, 2025). `bhopal-impact-lab-2026/tools/extract_ghat_images.py` extracted them, and they were copied here unchanged.

| Path | What it holds |
|---|---|
| `photos/` | Report photos whose GPS-camera stamp places them at one of the 7 ghats. Only one exists: Bairagarh, 2023 report, page 11 |
| `source_tables/<slug>/<year>-<festival>_p<page>.png` | Each ghat's water-test table, cropped from the report page at 200 dpi. 40 images |
| `ghat_images.json`, `ghat_images.csv` | Which image belongs to which ghat, with report, page, GPS and date |

`python pipeline/build_data.py` reads `ghat_images.json` and writes `site/data/ghat-images.js`. That file gives one card image per ghat: the photo if there is one, otherwise the newest source table.

The reports hold 292 images, but only one can be placed at one of the 7 ghats. The rest are posters, letters, news cuttings and photos from other districts. To use a field photo instead, add it to `photos/`, add it to that ghat's `photos` list in `ghat_images.json`, and rerun the build.
