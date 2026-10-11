// Map styles: satellite (default) or streets, always with 3D terrain from "raster-dem-source".
// Terrain, sources and label language are re-applied after every style load, so a style swap never loses them.
(function () {
  const TERRAIN = { source: "raster-dem-source", exaggeration: 0.5 };
  const DEM = {
    type: "raster-dem", encoding: "terrarium", tileSize: 256, maxzoom: 14,
    tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
    attribution: '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank">Terrain: Mapzen, AWS Terrain Tiles (SRTM, GMTED2010, ETOPO1)</a>',
  };
  const ENV = window.ENV || {};

  function satelliteSource() {
    // Optional sharper imagery: set MAPTILER_KEY in .env and run pipeline/build_data.py (writes site/data/env.js).
    if (ENV.MAPTILER_KEY) return {
      type: "raster", tileSize: 512, maxzoom: 20,
      tiles: [`https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${encodeURIComponent(ENV.MAPTILER_KEY)}`],
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
    };
    return {
      type: "raster", tileSize: 256, maxzoom: 15,
      tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg"],
      attribution: '<a href="https://s2maps.eu" target="_blank">Sentinel-2 cloudless 2023</a> by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2023), CC BY-NC-SA 4.0',
    };
  }

  function satelliteStyle() {
    return {
      version: 8,
      sources: { satellite: satelliteSource(), "raster-dem-source": DEM },
      layers: [{ id: "satellite", type: "raster", source: "satellite", paint: { "raster-saturation": -0.15 } }],
      terrain: TERRAIN,
    };
  }
  const STREETS = { light: "https://tiles.openfreemap.org/styles/positron", dark: "https://tiles.openfreemap.org/styles/dark" };

  // MapLibre's glyph renderer does not shape Devanagari (conjuncts and matras break; see tests/devanagari.html),
  // so Hindi names for ghats and key places are HTML labels. Basemap labels use this expression.
  // Set HINDI_GLYPHS = true once MapLibre supports complex text shaping.
  const HINDI_GLYPHS = false;
  const LABEL_EXPR = {
    hi: ["coalesce", ["get", "name:hi"], ["get", "name:en"], ["get", "name"]],
    en: ["coalesce", ["get", "name:en"], ["get", "name"]],
  };

  function create(container, opts = {}) {
    const state = { base: opts.base || "satellite", lang: opts.lang || "en", theme: opts.theme || "light" };
    const map = new maplibregl.Map({
      container, style: state.base === "satellite" ? satelliteStyle() : STREETS[state.theme],
      center: opts.center || [77.40, 23.255], zoom: opts.zoom || 11, pitch: opts.pitch ?? 45, maxPitch: 70,
      attributionControl: { compact: window.innerWidth < 900 }, interactive: opts.interactive !== false,
    });
    const ensure = () => {
      if (!map.getSource("raster-dem-source")) map.addSource("raster-dem-source", DEM);
      map.setTerrain(TERRAIN);
      applyLang();
    };
    function applyLang() {
      const expr = state.lang === "hi" && HINDI_GLYPHS ? LABEL_EXPR.hi : LABEL_EXPR.en;
      for (const l of map.getStyle().layers || []) {
        if (l.type !== "symbol" || !l.layout || !l.layout["text-field"]) continue;
        map.setLayoutProperty(l.id, "text-field", expr);
        // Halo so labels stay legible over imagery and both themes.
        map.setPaintProperty(l.id, "text-halo-width", 1.4);
      }
    }
    map.on("style.load", ensure);
    return {
      map,
      get base() { return state.base; },
      setBase(base) { state.base = base; map.setStyle(base === "satellite" ? satelliteStyle() : STREETS[state.theme]); },
      setTheme(theme) { state.theme = theme; if (state.base === "streets") map.setStyle(STREETS[theme]); },
      setLang(lang) { state.lang = lang; if (map.isStyleLoaded()) applyLang(); },
      TERRAIN,
    };
  }

  window.Basemap = { create, TERRAIN, satelliteStyle };
})();
