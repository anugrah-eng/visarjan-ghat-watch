// Scores each ghat against CPCB Class B limits. Every point links back to the reading it came from.
// Pure functions: used by the page and by the Node tests.
(function (root) {
  const PHASE = { pre: "before immersion", during: "during immersion", after: "one week after" };
  const PHASE_HI = { pre: "विसर्जन से पहले", during: "विसर्जन के दौरान", after: "विसर्जन के एक सप्ताह बाद" };
  const FEST_HI = { Durga: "दुर्गा", Ganesh: "गणेश" };

  const isBDL = (r) => r.value === null && (r.flag === "BDL" || r.flag === "ND");
  const isMissing = (r) => r.value === null && !isBDL(r);
  const fmt = (v) => (Math.round(v * 100) / 100).toString();
  const when = (r) => `${r.festival} ${r.year}, ${PHASE[r.phase]}`;
  const whenHi = (r) => `${FEST_HI[r.festival] || r.festival} ${r.year}, ${PHASE_HI[r.phase]}`;

  // true = breach, false = within limit, null = cannot say (missing, no limit, or BDL for DO).
  function breach(r, cfg) {
    const lim = cfg.limits[r.parameter];
    if (!lim || isMissing(r)) return null;
    if (isBDL(r)) return lim.type === "max" ? false : null;
    if (lim.type === "min") return r.value < lim.value;
    if (lim.type === "max") return r.value > lim.value;
    return r.value < lim.min || r.value > lim.max;
  }

  function readingPoints(r, cfg) {
    const p = cfg.points, out = [];
    if (r.value === null) return out;
    if (r.parameter === "Dissolved oxygen") {
      if (r.value < 5) out.push([p.doBelow5, "DO below 5"]);
      if (r.value < 4) out.push([p.doBelow4, "DO below 4"]);
      if (r.value === 0) out.push([p.doZero, "DO is 0 (no oxygen)"]);
    } else if (r.parameter === "BOD") {
      if (r.value > 3) out.push([p.bodAbove3, "BOD above 3"]);
      if (r.value > 6) out.push([p.bodAbove6, "BOD above 6"]);
    } else if (r.parameter === "pH") {
      if (r.value < 6.5 || r.value > 8.5) out.push([p.phOutOfRange, "pH outside 6.5-8.5"]);
    }
    return out;
  }

  function weightOf(r, cfg, maxYear) {
    const age = Math.min(Math.max(maxYear - Number(r.year), 0), cfg.recencyWeight.length - 1);
    return (cfg.festivalWeight[r.festival] || 1) * cfg.recencyWeight[age];
  }

  function seasons(readings) {
    const s = new Map();
    for (const r of readings) s.set(`${r.year}|${r.festival}`, { year: Number(r.year), festival: r.festival });
    return [...s.values()].sort((a, b) => a.year - b.year || a.festival.localeCompare(b.festival));
  }

  function scoreGhat(site, all, cfg, ctx) {
    const rows = all.filter((r) => r.site === site);
    const scored = rows.filter((r) => cfg.limits[r.parameter]);
    const sampled = scored.filter((r) => !isMissing(r));
    const evidence = [];
    let pts = 0, wsum = 0;

    for (const r of sampled) {
      const w = weightOf(r, cfg, ctx.maxYear);
      wsum += w;
      for (const [p, why] of readingPoints(r, cfg)) {
        pts += p * w;
        evidence.push({ id: r.id, points: +(p * w).toFixed(2), why });
      }
    }

    // No recovery: one week after is worse than before, per festival-year.
    const noRecovery = [];
    for (const s of seasons(rows)) {
      for (const param of ["Dissolved oxygen", "BOD"]) {
        const get = (ph) => rows.find((r) => r.year == s.year && r.festival === s.festival &&
          r.parameter === param && r.phase === ph && r.value !== null);
        const pre = get("pre"), after = get("after");
        if (!pre || !after) continue;
        const m = cfg.recoveryMargin[param];
        const worse = param === "BOD" ? after.value - pre.value >= m : pre.value - after.value >= m;
        if (worse) {
          const w = weightOf(after, cfg, ctx.maxYear);
          pts += cfg.points.noRecovery * w;
          evidence.push({ id: after.id, ref: pre.id, points: +(cfg.points.noRecovery * w).toFixed(2),
            why: `${param} worse one week after than before` });
          noRecovery.push({ season: s, param, pre, after });
        }
      }
    }

    // Data gaps: seasons in the data where this ghat has no sampled DO or BOD.
    const gaps = [];
    for (const s of ctx.seasons) {
      const has = rows.some((r) => r.year == s.year && r.festival === s.festival &&
        (r.parameter === "Dissolved oxygen" || r.parameter === "BOD") && !isMissing(r));
      if (!has) gaps.push(s);
    }
    const latestGap = gaps.some((g) => g.year === ctx.latestAhead && g.festival === cfg.festivalAhead);

    const score = wsum ? pts / wsum : 0;
    const recent = sampled.filter((r) => Number(r.year) >= ctx.maxYear - 1);
    const recentBreach = recent.some((r) => breach(r, cfg) === true);
    let status;
    if (score >= cfg.bands.red) status = "red";
    else if (latestGap || !sampled.length) status = "violet";
    else if (recentBreach) status = "amber";
    else status = "green";

    const byParam = (p) => sampled.filter((r) => r.parameter === p);
    const doR = byParam("Dissolved oxygen"), bodR = byParam("BOD"), phR = byParam("pH");
    const doLow = doR.filter((r) => breach(r, cfg) === true);
    const doZero = doR.filter((r) => r.value === 0);
    const bodHigh = bodR.filter((r) => breach(r, cfg) === true);
    const phOut = phR.filter((r) => breach(r, cfg) === true);
    const newest = (a) => [...a].sort((x, y) => y.year - x.year || (x.festival === "Durga" ? -1 : 1))[0];
    const minBy = (a) => a.reduce((m, r) => (r.value < m.value ? r : m), a[0]);
    const maxBy = (a) => a.reduce((m, r) => (r.value > m.value ? r : m), a[0]);

    // Plain-words reasons, most serious first, each pointing at its readings.
    const reasons = [];
    if (doZero.length) {
      const r = newest(doZero);
      reasons.push({ ids: doZero.map((x) => x.id),
        sen: `Oxygen at 0 mg/l (no oxygen) ${doZero.length} times, latest ${r.festival} ${r.year}.`,
        shi: `ऑक्सीजन ${doZero.length} बार 0 mg/l (बिल्कुल नहीं), अंतिम बार ${FEST_HI[r.festival]} ${r.year}।`,
        en: `Dissolved oxygen was 0 mg/l (no oxygen) in ${doZero.length} reading${doZero.length > 1 ? "s" : ""}, most recently ${when(r)}. Fish cannot live at 0; the bathing standard asks for 5 or more.`,
        hi: `घुलित ऑक्सीजन ${doZero.length} बार 0 mg/l (बिल्कुल ऑक्सीजन नहीं) मिली, सबसे हाल में ${whenHi(r)}। 0 पर मछलियाँ जीवित नहीं रह सकतीं; स्नान मानक कम से कम 5 है।` });
    } else if (doLow.length) {
      const r = minBy(doLow);
      reasons.push({ ids: doLow.map((x) => x.id),
        sen: `Oxygen below 5 mg/l in ${doLow.length} of ${doR.length} tests; lowest ${fmt(r.value)} (${r.festival} ${r.year}).`,
        shi: `ऑक्सीजन ${doR.length} में से ${doLow.length} जाँचों में 5 mg/l से कम; सबसे कम ${fmt(r.value)} (${FEST_HI[r.festival]} ${r.year})।`,
        en: `Dissolved oxygen below 5 mg/l in ${doLow.length} of ${doR.length} readings; lowest ${fmt(r.value)} (${when(r)}).`,
        hi: `घुलित ऑक्सीजन ${doR.length} में से ${doLow.length} बार 5 mg/l से कम; सबसे कम ${fmt(r.value)} (${whenHi(r)})।` });
    }
    if (bodHigh.length) {
      const r = maxBy(bodHigh);
      reasons.push({ ids: bodHigh.map((x) => x.id),
        sen: `BOD above 3 in ${bodHigh.length} of ${bodR.length} tests (highest ${fmt(r.value)}).`,
        shi: `बीओडी ${bodR.length} में से ${bodHigh.length} जाँचों में 3 से अधिक (सबसे अधिक ${fmt(r.value)})।`,
        en: `BOD above the bathing limit of 3 mg/l in ${bodHigh.length} of ${bodR.length} readings; highest ${fmt(r.value)} (${when(r)}).`,
        hi: `बीओडी ${bodR.length} में से ${bodHigh.length} बार स्नान सीमा 3 mg/l से अधिक; सबसे अधिक ${fmt(r.value)} (${whenHi(r)})।` });
    }
    if (noRecovery.length) {
      const n = new Set(noRecovery.map((x) => `${x.season.year}|${x.season.festival}`)).size;
      reasons.push({ ids: noRecovery.flatMap((x) => [x.pre.id, x.after.id]),
        en: `Water was worse one week after immersion than before in ${n} of ${seasons(rows).length} festivals tested.`,
        hi: `${seasons(rows).length} में से ${n} त्योहारों में पानी विसर्जन के एक सप्ताह बाद पहले से खराब था।` });
    }
    if (phOut.length) {
      const r = phOut[0];
      reasons.push({ ids: phOut.map((x) => x.id),
        en: `pH outside 6.5-8.5 in ${phOut.length} of ${phR.length} readings (e.g. ${fmt(r.value)}, ${when(r)}).`,
        hi: `पीएच ${phR.length} में से ${phOut.length} बार 6.5-8.5 से बाहर (जैसे ${fmt(r.value)}, ${whenHi(r)})।` });
    }
    for (const g of gaps) {
      reasons.push({ ids: [], gap: true,
        en: `Not tested at ${g.festival} ${g.year}: no oxygen or BOD readings. Missing, not clean.`,
        hi: `${FEST_HI[g.festival] || g.festival} ${g.year} में जाँच नहीं हुई: ऑक्सीजन या बीओडी का कोई आँकड़ा नहीं। यह डेटा की कमी है, साफ़ पानी का संकेत नहीं।` });
    }

    const actions = [];
    if (recent.some((r) => r.parameter === "Dissolved oxygen" && breach(r, cfg) === true))
      actions.push({ key: "aeration", en: "Send aeration", hi: "वातन (एरेशन) की व्यवस्था करें", sen: "aeration", shi: "एरेशन" });
    if (recent.some((r) => r.parameter === "BOD" && breach(r, cfg) === true) || noRecovery.length)
      actions.push({ key: "cleaning", en: "Extra cleaning and fast removal of idol material", hi: "अतिरिक्त सफाई और मूर्ति सामग्री को तुरंत हटाना", sen: "extra cleaning, quick idol removal", shi: "अतिरिक्त सफाई, मूर्ति सामग्री तुरंत हटाएँ" });
    if (latestGap || gaps.length)
      actions.push({ key: "testing", en: `Send a testing team before 20 Oct`, hi: "20 अक्टूबर से पहले जाँच दल भेजें", sen: "water test before 20 Oct", shi: "20 अक्टूबर से पहले पानी की जाँच" });

    return {
      site, score: +score.toFixed(3), status, latestGap, gaps, reasons, actions, evidence, noRecovery,
      counts: { readings: rows.length, scored: scored.length, sampled: sampled.length,
        missing: rows.filter(isMissing).length, bdl: rows.filter(isBDL).length },
      worst: { do: doR.length ? minBy(doR) : null, bod: bodR.length ? maxBy(bodR) : null },
    };
  }

  function prepare(readings) {
    return readings.map((r, i) => ({ ...r, id: i, year: Number(r.year),
      value: r.value === "" || r.value === undefined ? null : r.value === null ? null : Number(r.value) }));
  }

  function scoreAll(readings, sites, cfg) {
    const maxYear = Math.max(...readings.map((r) => Number(r.year)));
    const ahead = readings.filter((r) => r.festival === cfg.festivalAhead).map((r) => Number(r.year));
    const ctx = { maxYear, latestAhead: ahead.length ? Math.max(...ahead) : maxYear, seasons: seasons(readings) };
    const res = sites.map((s) => scoreGhat(s, readings, cfg, ctx));
    const order = { red: 0, violet: 1, amber: 2, green: 3 };
    res.sort((a, b) => b.score - a.score || order[a.status] - order[b.status] || a.site.localeCompare(b.site));
    res.forEach((g, i) => (g.rank = i + 1));
    return { ghats: res, ctx };
  }

  // CPCB Class B report: per parameter, how many sampled readings breach.
  function cpcbReport(readings, cfg, site) {
    const rows = readings.filter((r) => !site || r.site === site);
    // Expected = every season x 3 phases x ghats, so a table missing from a report counts as not tested.
    const nSites = site ? 1 : new Set(readings.map((r) => r.site)).size;
    const expected = seasons(readings).length * 3 * nSites;
    const out = {};
    for (const p of Object.keys(cfg.limits)) {
      const pr = rows.filter((r) => r.parameter === p);
      const sampled = pr.filter((r) => !isMissing(r));
      const br = sampled.filter((r) => breach(r, cfg) === true);
      out[p] = { total: pr.length, sampled: sampled.length, missing: Math.max(expected, pr.length) - sampled.length,
        breaches: br.length, breachIds: br.map((r) => r.id) };
    }
    return out;
  }

  const api = { isBDL, isMissing, breach, readingPoints, scoreAll, cpcbReport, prepare, seasons,
    PHASE, PHASE_HI, FEST_HI, fmt, when, whenHi };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.Scoring = api;
})(typeof window !== "undefined" ? window : globalThis);
