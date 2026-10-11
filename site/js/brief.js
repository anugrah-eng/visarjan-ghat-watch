// Bilingual officer brief, built from the alert engine and the ranking. Plain text so it can go straight into WhatsApp.
window.Brief = (function () {
  function daysLeft(cfg) {
    const ms = new Date(cfg.visarjanDate + "T00:00:00") - new Date(new Date().toDateString());
    return Math.max(0, Math.round(ms / 86400000));
  }
  const tidy = (lines) => lines.filter((l, i, a) => l !== null && !(l === "" && a[i - 1] === "")).join("\n");
  const fmt = (v) => (Math.round(v * 100) / 100).toString();

  function build(state, lang) {
    const cfg = window.CONFIG, T = window.I18N, { alerts, results, rep, readings } = state;
    const L = (o) => o[lang];
    const name = (site) => T.ghatIn(site, lang);
    const years = [...new Set(readings.map((r) => r.year))].sort();
    const span = `${years[0]}–${years[years.length - 1]}`;
    const d = daysLeft(cfg);
    const top = alerts.filter((a) => a.level !== "normal").slice(0, 3);
    const rest = alerts.filter((a) => !top.includes(a));
    const stale = alerts.filter((a) => a.stale).length;
    const gaps = results.ghats.filter((g) => g.gaps.length);
    const DO = rep["Dissolved oxygen"], BOD = rep.BOD;
    const LV = (l) => L(T.LEVELS[l]);
    const FEST = { Durga: { en: "Durga", hi: "दुर्गा" }, Ganesh: { en: "Ganesh", hi: "गणेश" } };
    const PH = { pre: { en: "before immersion", hi: "विसर्जन से पहले" }, during: { en: "during immersion", hi: "विसर्जन के दौरान" }, after: { en: "a week after", hi: "एक सप्ताह बाद" } };
    const PARAM = { "Dissolved oxygen": { en: "Oxygen", hi: "ऑक्सीजन" }, BOD: { en: "BOD", hi: "बीओडी" }, pH: { en: "pH", hi: "पीएच" } };
    const lim = (p) => { const l = cfg.limits[p]; return l.type === "min" ? `≥ ${l.value}` : l.type === "max" ? `≤ ${l.value}` : `${l.min}–${l.max}`; };
    const season = (a) => (a.season ? `${L(FEST[a.season.festival])} ${a.season.year}` : "–");
    const trig = (t) => `${L(PARAM[t.parameter])} ${fmt(t.value)}${cfg.units[t.parameter] ? " " + cfg.units[t.parameter] : ""} ${L(PH[t.phase])} (${lang === "hi" ? "सीमा" : "limit"} ${lim(t.parameter)})`;

    const H = lang === "hi" ? {
      title: "*विसर्जन घाट वॉच – भोपाल*", when: `दुर्गा विसर्जन 20 अक्टूबर 2026 (${d} दिन शेष)`,
      basis: `MPPCB जाँच ${span}, CPCB स्नान-जल सीमा (श्रेणी B) से तुलना।`, prio: "*प्राथमिकता वाले घाट*",
      last: "अंतिम जाँच", old: "डेटा पुराना", act: "कार्रवाई", others: "अन्य",
      stale: `*${stale} घाटों की अंतिम जाँच ${cfg.alerts.staleDays} दिन से पुरानी – 20 अक्टूबर से पहले दोबारा जाँच करें*`,
      gap: (g) => `• ${name(g.site)}: ${g.gaps.map((x) => `${L(FEST[x.festival])} ${x.year}`).join(", ")} में जाँच नहीं हुई। इसे साफ़ पानी न मानें।`,
      all: `सभी घाट (${span}): ऑक्सीजन ${DO.sampled} में से ${DO.breaches} जाँचों में 5 से कम; बीओडी ${BOD.sampled} में से ${BOD.breaches} में 3 से अधिक।`,
      limits: "सीमाएँ: कोलीफॉर्म की जाँच नहीं; केवल 4 धातुएँ; रिपोर्ट में इकाइयाँ और तारीखें नहीं छपीं। यह पिछले आँकड़े हैं, भविष्यवाणी नहीं; स्वास्थ्य प्रभाव का कोई दावा नहीं।",
    } : {
      title: "*VISARJAN GHAT WATCH – BHOPAL*", when: `Durga Visarjan 20 Oct 2026 (${d} days away)`,
      basis: `MPPCB tests ${span} vs CPCB bathing-water limits (Class B).`, prio: "*PRIORITY GHATS*",
      last: "last tested", old: "data outdated", act: "Action", others: "Others",
      stale: `*${stale} ghats last tested more than ${cfg.alerts.staleDays} days ago – test again before 20 Oct*`,
      gap: (g) => `• ${name(g.site)}: not tested at ${g.gaps.map((x) => `${x.festival} ${x.year}`).join(", ")}. Missing, not clean.`,
      all: `All ghats (${span}): oxygen below 5 in ${DO.breaches} of ${DO.sampled} tests; BOD above 3 in ${BOD.breaches} of ${BOD.sampled}.`,
      limits: "Limits: no coliform tests; only 4 metals; reports print no units or dates. Past readings, not a forecast; no health claims.",
    };

    return tidy([
      H.title, H.when, H.basis, "", H.prio,
      ...top.flatMap((a, i) => [
        `${i + 1}. ${name(a.site)} – ${LV(a.level).toUpperCase()} (${H.last} ${season(a)}${a.stale ? ", " + H.old : ""})`,
        a.triggers.length ? `   ${a.triggers.slice(0, 2).map(trig).join("; ")}` : null,
        `   ${H.act}: ${a.actions.filter((x) => x.key !== "testNow").slice(0, 3).map((x) => T.action(x.key, lang)).join("; ")}`,
      ]),
      rest.length ? `${H.others}: ${rest.map((a) => `${name(a.site)} (${LV(a.level)})`).join(", ")}` : null,
      "", stale ? H.stale : null, ...gaps.map(H.gap),
      "", H.all, H.limits,
    ]);
  }

  return { build, daysLeft };
})();
