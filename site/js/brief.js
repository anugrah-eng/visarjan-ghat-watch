// Bilingual officer brief, filled from the computed ranking. Plain text so it can go straight into WhatsApp.
window.Brief = (function () {
  const S = () => window.Scoring;

  function daysLeft(cfg) {
    const ms = new Date(cfg.visarjanDate + "T00:00:00") - new Date(new Date().toDateString());
    return Math.max(0, Math.round(ms / 86400000));
  }

  // The two most serious short reasons (oxygen first, then BOD) for one ghat.
  const why = (g, k) => g.reasons.filter((r) => r[k]).slice(0, 2).map((r) => r[k]).join(" ");
  const tidy = (lines) => lines.filter((l, i, a) => l !== null && !(l === "" && a[i - 1] === "")).join("\n");

  function build(state, lang) {
    const cfg = window.CONFIG, { results, rep, readings, nameHi } = state;
    const ghats = results.ghats, top = ghats.slice(0, 3), rest = ghats.slice(3);
    const years = [...new Set(readings.map((r) => r.year))].sort();
    const span = `${years[0]}–${years[years.length - 1]}`;
    const d = daysLeft(cfg);
    const gaps = ghats.filter((g) => g.gaps.length);
    const DO = rep["Dissolved oxygen"], BOD = rep.BOD;

    if (lang === "hi") {
      const st = (g) => cfg.status[g.status].label_hi.split(":")[0];
      return tidy([
        `*विसर्जन घाट वॉच – भोपाल*`,
        `दुर्गा विसर्जन 20 अक्टूबर 2026 (${d} दिन शेष)`,
        `MPPCB जाँच ${span}, CPCB स्नान-जल सीमा से तुलना (ऑक्सीजन 5 mg/l या अधिक, बीओडी 3 या कम, पीएच 6.5–8.5)।`,
        ``, `*प्राथमिकता वाले घाट*`,
        ...top.flatMap((g, i) => [
          `${i + 1}. ${nameHi(g.site)} – ${st(g)}`,
          `   ${why(g, "shi")}`,
          `   कार्रवाई: ${g.actions.map((a) => a.shi).join("; ") || "नियमित निगरानी"}`,
        ]),
        rest.length ? `अन्य: ${rest.map((g) => `${nameHi(g.site)} (${st(g)})`).join(", ")}` : null,
        ``, `*डेटा नहीं – 20 अक्टूबर से पहले जाँच करें*`,
        ...(gaps.length ? gaps.map((g) => `• ${nameHi(g.site)}: ${g.gaps.map((x) => `${S().FEST_HI[x.festival]} ${x.year}`).join(", ")} में जाँच नहीं हुई। इसे साफ़ पानी न मानें।`) : ["• कोई नहीं"]),
        ``, `सभी घाट: ऑक्सीजन ${DO.sampled} में से ${DO.breaches} जाँचों में 5 से कम; बीओडी ${BOD.sampled} में से ${BOD.breaches} में 3 से अधिक।`,
        `सीमाएँ: कोलीफॉर्म की जाँच नहीं; केवल 4 धातुएँ; रिपोर्ट में इकाइयाँ नहीं छपीं। यह पिछले आँकड़े हैं, भविष्यवाणी नहीं; स्वास्थ्य प्रभाव का कोई दावा नहीं।`,
      ]);
    }

    const st = (g) => cfg.status[g.status].label.split(":")[0].toUpperCase();
    return tidy([
      `*VISARJAN GHAT WATCH – BHOPAL*`,
      `Durga Visarjan 20 Oct 2026 (${d} days away)`,
      `MPPCB tests ${span} vs CPCB bathing limits (oxygen 5 mg/l or more, BOD 3 or less, pH 6.5–8.5).`,
      ``, `*PRIORITY GHATS*`,
      ...top.flatMap((g, i) => [
        `${i + 1}. ${g.site} – ${st(g)}`,
        `   ${why(g, "sen")}`,
        `   Action: ${g.actions.map((a) => a.sen).join("; ") || "routine monitoring"}`,
      ]),
      rest.length ? `Others: ${rest.map((g) => `${g.site.split(" (")[0].split(" /")[0]} (${cfg.status[g.status].label.split(":")[0]})`).join(", ")}` : null,
      ``, `*NO DATA – TEST BEFORE 20 OCT*`,
      ...(gaps.length ? gaps.map((g) => `• ${g.site}: not tested at ${g.gaps.map((x) => `${x.festival} ${x.year}`).join(", ")}. Missing, not clean.`) : ["• None"]),
      ``, `All ghats: oxygen below 5 in ${DO.breaches} of ${DO.sampled} tests; BOD above 3 in ${BOD.breaches} of ${BOD.sampled}.`,
      `Limits: no coliform tests; only 4 metals; reports print no units. Past readings, not a forecast; no health claims.`,
    ]);
  }

  return { build, daysLeft };
})();
