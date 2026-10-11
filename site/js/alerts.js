// Rules-based alert engine. For each ghat it looks at the latest tested season and returns
// an alert level, what triggered it (by how much, with the report page), when it was recorded,
// whether the data is outdated, and recommended actions in English and Hindi.
// Pure functions: used by the page and by the Node tests.
(function (root) {
  const RANK = { normal: 0, advisory: 1, warning: 2, critical: 3 };
  const DAY = 86400000;

  const isTested = (r) => r.value !== null && r.value !== undefined && r.value !== "";
  const isBDL = (r) => !isTested(r) && (r.flag === "BDL" || r.flag === "ND");

  // Approximate sampling date: the reports print none, so use the festival's immersion day.
  function sampleDate(r, acfg) {
    const y = Number(r.year), known = acfg.festivalDates[y] && acfg.festivalDates[y][r.festival];
    const base = new Date((known || `${y}-${acfg.fallbackDates[r.festival] || "10-01"}`) + "T00:00:00Z");
    return new Date(base.getTime() + (acfg.phaseOffsetDays[r.phase] || 0) * DAY);
  }

  function breaks(rule, v) {
    if (rule.op === "<") return v < rule.value;
    if (rule.op === ">") return v > rule.value;
    if (rule.op === "outside") return v < rule.min || v > rule.max;
    return false;
  }
  const limitText = (rule) => (rule.op === "outside" ? `${rule.min}–${rule.max}` : `${rule.op === "<" ? "≥" : "≤"} ${rule.value}`);
  function excess(rule, v) {
    if (rule.op === "<") return +(rule.value - v).toFixed(2);
    if (rule.op === ">") return +(v - rule.value).toFixed(2);
    return +(v < rule.min ? rule.min - v : v - rule.max).toFixed(2);
  }

  // The worst rule a reading breaks, or null.
  function worstRule(r, acfg) {
    const rules = acfg.rules[r.parameter];
    if (!rules || !isTested(r)) return null;
    let worst = null;
    for (const rule of rules) if (breaks(rule, Number(r.value)) && (!worst || RANK[rule.level] > RANK[worst.level])) worst = rule;
    return worst;
  }

  function actionsFor(level, stale, missing) {
    const keys = {
      critical: ["noBathing", "notify", "aerate", "clean", "resample48"],
      warning: ["noBathing", "aerate", "clean", "resampleBefore"],
      advisory: ["notice", "clean", "resampleBefore"],
      normal: ["monitor"],
      nodata: [],
    }[level].slice();
    if (missing.length) keys.unshift("testMissing");
    if (stale) keys.unshift("testNow");
    return [...new Set(keys)];
  }

  // readings: all readings for one ghat. now: Date. Returns the alert for that ghat.
  function evaluate(site, readings, cfg, now) {
    const acfg = cfg.alerts, rows = readings.filter((r) => r.site === site);
    // Latest season that has at least one tested alert parameter.
    const seasons = new Map();
    for (const r of rows) {
      if (!acfg.rules[r.parameter] || !(isTested(r) || isBDL(r))) continue;
      const key = `${r.year}|${r.festival}`, d = sampleDate(r, acfg);
      const s = seasons.get(key) || { year: Number(r.year), festival: r.festival, date: d, rows: [] };
      if (d > s.date) s.date = d;
      seasons.set(key, s);
    }
    const latest = [...seasons.values()].sort((a, b) => b.date - a.date)[0];
    if (!latest) {
      return { site, level: "nodata", stale: true, ageDays: null, recordedAt: null, season: null,
        triggers: [], missing: acfg.required.slice(), actions: actionsFor("nodata", true, acfg.required).map(toAction) };
    }
    const sRows = rows.filter((r) => Number(r.year) === latest.year && r.festival === latest.festival);
    const triggers = [];
    for (const r of sRows) {
      const rule = worstRule(r, acfg);
      if (rule) triggers.push({ parameter: r.parameter, phase: r.phase, value: Number(r.value), level: rule.level,
        limit: limitText(rule), excess: excess(rule, Number(r.value)), source: rule.source,
        page: r.source_page, file: r.source_file, id: r.id });
    }
    triggers.sort((a, b) => RANK[b.level] - RANK[a.level] || b.excess - a.excess);
    const missing = acfg.required.filter((p) => !sRows.some((r) => r.parameter === p && (isTested(r) || isBDL(r))));
    const level = triggers.length ? triggers[0].level : "normal";
    const ageDays = Math.floor((now - latest.date) / DAY);
    const stale = ageDays > acfg.staleDays;
    return { site, level, stale, ageDays, recordedAt: latest.date.toISOString().slice(0, 10), approxDate: true,
      season: { year: latest.year, festival: latest.festival }, triggers, missing,
      actions: actionsFor(level, stale, missing).map(toAction) };
  }
  const toAction = (key) => ({ key });

  function evaluateAll(readings, sites, cfg, now) {
    const res = sites.map((s) => evaluate(s, readings, cfg, now));
    const order = { critical: 0, warning: 1, advisory: 2, nodata: 3, normal: 4 };
    return res.sort((a, b) => order[a.level] - order[b.level] ||
      (b.triggers[0] ? b.triggers[0].excess : 0) - (a.triggers[0] ? a.triggers[0].excess : 0) || a.site.localeCompare(b.site));
  }

  const api = { evaluate, evaluateAll, sampleDate, worstRule, RANK };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.Alerts = api;
})(typeof window !== "undefined" ? window : globalThis);
