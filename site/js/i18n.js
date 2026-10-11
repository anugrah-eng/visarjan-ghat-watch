// Every piece of text the user sees: ghat names, alert text, actions and UI labels, in English and Hindi.
// Hindi was written by the team; have a native-speaking officer review it before official use.
(function (root) {
  const GHATS = {
    "Bairagarh (Sant Hirdaram) kund": { en: "Bairagarh (Sant Hirdaram) kund", hi: "बैरागढ़ (संत हिरदाराम) कुंड", short: { en: "Bairagarh", hi: "बैरागढ़" } },
    "Khatlapura ghat": { en: "Khatlapura ghat", hi: "खटलापुरा घाट", short: { en: "Khatlapura", hi: "खटलापुरा" } },
    "Prempura ghat": { en: "Prempura ghat", hi: "प्रेमपुरा घाट", short: { en: "Prempura", hi: "प्रेमपुरा" } },
    "Rani Kamlapati ghat / Kamla Park kund": { en: "Rani Kamlapati ghat / Kamla Park kund", hi: "रानी कमलापति घाट / कमला पार्क कुंड", short: { en: "Rani Kamlapati", hi: "रानी कमलापति" } },
    "Hathaikheda dam / kund": { en: "Hathaikheda dam / kund", hi: "हथाईखेड़ा डैम / कुंड", short: { en: "Hathaikheda", hi: "हथाईखेड़ा" } },
    "Malikhedi kund": { en: "Malikhedi kund", hi: "मालीखेड़ी कुंड", short: { en: "Malikhedi", hi: "मालीखेड़ी" } },
    "Shahpura lake ghat": { en: "Shahpura lake ghat", hi: "शाहपुरा झील घाट", short: { en: "Shahpura", hi: "शाहपुरा" } },
  };
  const WATER = {
    "Upper Lake": { en: "Upper Lake (Bhojtal)", hi: "बड़ा तालाब (भोजताल)" },
    "Lower Lake": { en: "Lower Lake", hi: "छोटा तालाब" },
    "Hathaikheda dam": { en: "Hathaikheda dam", hi: "हथाईखेड़ा डैम" },
    "Kund": { en: "Kund", hi: "कुंड" },
    "Shahpura Lake": { en: "Shahpura Lake", hi: "शाहपुरा झील" },
  };
  // Key places drawn as HTML labels on the map (the browser shapes Devanagari correctly; MapLibre's glyphs do not).
  const PLACES = [
    { id: "bhopal", en: "Bhopal", hi: "भोपाल", lngLat: [77.412, 23.259], size: "lg" },
    { id: "upper", en: "Upper Lake", hi: "बड़ा तालाब", lngLat: [77.355, 23.245], size: "md" },
    { id: "lower", en: "Lower Lake", hi: "छोटा तालाब", lngLat: [77.402, 23.252], size: "sm" },
  ];

  const PARAMS = {
    "Dissolved oxygen": { en: "Dissolved oxygen", hi: "घुलित ऑक्सीजन", abbr: { en: "DO", hi: "ऑक्सीजन" } },
    "BOD": { en: "BOD", hi: "बीओडी", abbr: { en: "BOD", hi: "बीओडी" } },
    "pH": { en: "pH", hi: "पीएच", abbr: { en: "pH", hi: "पीएच" } },
    "COD": { en: "COD", hi: "सीओडी" }, "Total solids": { en: "Total solids", hi: "कुल ठोस" },
    "Dissolved solids": { en: "Dissolved solids", hi: "घुलित ठोस" }, "Suspended solids": { en: "Suspended solids", hi: "निलंबित ठोस" },
    "Turbidity": { en: "Turbidity", hi: "गंदलापन" }, "Conductivity": { en: "Conductivity", hi: "चालकता" },
    "Chromium": { en: "Chromium", hi: "क्रोमियम" }, "Lead": { en: "Lead", hi: "सीसा" }, "Zinc": { en: "Zinc", hi: "जस्ता" }, "Copper": { en: "Copper", hi: "तांबा" },
    "Faecal coliform": { en: "Faecal coliform", hi: "मल कोलीफॉर्म" },
  };

  const LEVELS = {
    critical: { en: "Critical", hi: "गंभीर" },
    warning: { en: "Warning", hi: "चेतावनी" },
    advisory: { en: "Advisory", hi: "सलाह" },
    normal: { en: "Meets bathing limits", hi: "स्नान सीमा के भीतर" },
    nodata: { en: "No test data", hi: "जाँच का डेटा नहीं" },
  };

  const ACTIONS = {
    noBathing: { en: "Advise against bathing and immersion at this ghat", hi: "इस घाट पर स्नान और विसर्जन न करने की सलाह दें" },
    notify: { en: "Notify BMC and MPPCB today", hi: "आज ही नगर निगम और प्रदूषण नियंत्रण बोर्ड को सूचित करें" },
    aerate: { en: "Arrange aeration at the ghat", hi: "घाट पर वातन (एरेशन) की व्यवस्था करें" },
    clean: { en: "Extra cleaning and fast removal of idol material", hi: "अतिरिक्त सफाई और मूर्ति सामग्री को तुरंत हटाना" },
    resample48: { en: "Resample within 48 hours", hi: "48 घंटे में दोबारा नमूना लें" },
    resampleBefore: { en: "Resample before 20 Oct", hi: "20 अक्टूबर से पहले दोबारा नमूना लें" },
    notice: { en: "Put up an advisory notice for devotees", hi: "श्रद्धालुओं के लिए सलाह सूचना लगाएँ" },
    monitor: { en: "Continue routine monitoring", hi: "नियमित निगरानी जारी रखें" },
    testNow: { en: "Send a testing team before 20 Oct: the latest test is too old to rely on", hi: "20 अक्टूबर से पहले जाँच दल भेजें: अंतिम जाँच पुरानी है" },
    testMissing: { en: "Send a testing team: oxygen, BOD or pH was not tested", hi: "जाँच दल भेजें: ऑक्सीजन, बीओडी या पीएच की जाँच नहीं हुई" },
  };

  const UI = {
    appName: { en: "Visarjan Ghat Watch", hi: "विसर्जन घाट वॉच" },
    tagline: { en: "Bhopal immersion ghats, checked against CPCB bathing-water limits", hi: "भोपाल के विसर्जन घाट, CPCB स्नान-जल सीमा से तुलना" },
    countdown: { en: "Durga Visarjan 20 Oct 2026: {n} days left", hi: "दुर्गा विसर्जन 20 अक्टूबर 2026: {n} दिन शेष" },
    navOverview: { en: "Overview", hi: "सारांश" }, navGhat: { en: "Ghat detail", hi: "घाट विवरण" },
    navCompare: { en: "Compare ghats", hi: "घाटों की तुलना" }, navAlerts: { en: "Alerts", hi: "अलर्ट" },
    navReport: { en: "CPCB report", hi: "CPCB रिपोर्ट" }, navAbout: { en: "About the data", hi: "डेटा के बारे में" },
    upload: { en: "Upload report", hi: "रिपोर्ट अपलोड करें" }, brief: { en: "Officer brief", hi: "अधिकारी हेतु सार" },
    bhopal: { en: "Bhopal", hi: "भोपाल" }, statewide: { en: "Statewide", hi: "पूरा प्रदेश" },
    statewideSoon: { en: "Statewide coverage of about 100 MP immersion sites is planned for v2.", hi: "प्रदेश के लगभग 100 विसर्जन स्थलों का कवरेज संस्करण 2 में आएगा।" },
    satellite: { en: "Satellite", hi: "उपग्रह" }, streets: { en: "Streets", hi: "सड़कें" },
    themeLight: { en: "Light", hi: "हल्का" }, themeDark: { en: "Dark", hi: "गहरा" },
    sites: { en: "Ghats", hi: "घाट" }, waterBody: { en: "Water body", hi: "जल स्रोत" },
    status: { en: "Alert", hi: "अलर्ट" }, lastTested: { en: "Last tested", hi: "अंतिम जाँच" },
    approx: { en: "approx.", hi: "लगभग" }, outdated: { en: "Data outdated", hi: "डेटा पुराना" },
    outdatedLong: { en: "Latest test is {d} days old (limit {w} days). Showing the last result; do not treat it as current.", hi: "अंतिम जाँच {d} दिन पुरानी है (सीमा {w} दिन)। पिछला परिणाम दिखाया गया है; इसे वर्तमान न मानें।" },
    lastResult: { en: "Last result", hi: "पिछला परिणाम" },
    recentAlerts: { en: "Alerts and actions", hi: "अलर्ट और कार्रवाई" },
    statusCounts: { en: "Ghats by alert level", hi: "अलर्ट स्तर के अनुसार घाट" },
    triggered: { en: "What triggered it", hi: "किस कारण" },
    actions: { en: "Recommended actions", hi: "अनुशंसित कार्रवाई" },
    noTriggers: { en: "No reading broke a CPCB bathing limit in this season.", hi: "इस मौसम में कोई माप CPCB स्नान सीमा से बाहर नहीं था।" },
    missingParams: { en: "Not tested: {p}", hi: "जाँच नहीं हुई: {p}" },
    viewGhat: { en: "Open ghat detail", hi: "घाट विवरण खोलें" },
    allGhats: { en: "All ghats", hi: "सभी घाट" },
    latest: { en: "Latest values", hi: "नवीनतम माप" },
    trend: { en: "Trend across seasons", hi: "मौसमों के अनुसार रुझान" },
    limit: { en: "CPCB limit", hi: "CPCB सीमा" }, noLimit: { en: "no bathing limit", hi: "स्नान सीमा तय नहीं" },
    notTested: { en: "Not tested", hi: "जाँच नहीं" }, bdl: { en: "BDL (below detection)", hi: "पहचान सीमा से कम" },
    tableView: { en: "Show as table", hi: "तालिका के रूप में देखें" }, chartView: { en: "Show as chart", hi: "चार्ट के रूप में देखें" },
    compareTitle: { en: "Compare all ghats for one parameter", hi: "एक मापदंड पर सभी घाटों की तुलना" },
    parameter: { en: "Parameter", hi: "मापदंड" }, season: { en: "Season", hi: "मौसम" },
    before: { en: "Before", hi: "पहले" }, during: { en: "During", hi: "दौरान" }, after: { en: "1 week after", hi: "1 सप्ताह बाद" },
    source: { en: "Source: MPPCB immersion reports {span}. Click a value to open the report page.", hi: "स्रोत: MPPCB विसर्जन रिपोर्ट {span}। रिपोर्ट का पृष्ठ खोलने के लिए माप पर क्लिक करें।" },
    freshness: { en: "Newest data: {season} (tested about {date}).", hi: "नवीनतम डेटा: {season} (जाँच लगभग {date})।" },
    exportCsv: { en: "Export CSV", hi: "CSV डाउनलोड करें" },
    openDashboard: { en: "Open the dashboard", hi: "डैशबोर्ड खोलें" },
    limitsTitle: { en: "What this data does not tell you", hi: "यह डेटा क्या नहीं बताता" },
    teamRule: { en: "team-defined tier", hi: "टीम द्वारा तय स्तर" },
    over: { en: "{v} vs limit {l}", hi: "{v}, सीमा {l}" },
  };

  const FEST = { Ganesh: { en: "Ganesh", hi: "गणेश" }, Durga: { en: "Durga", hi: "दुर्गा" } };

  let lang = "en";
  try { lang = localStorage.getItem("vgw-lang") || "en"; } catch (e) {}

  const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`));
  const pick = (o) => (o ? o[lang] || o.en : "");
  const I18N = {
    get lang() { return lang; },
    set(l) { lang = l; try { localStorage.setItem("vgw-lang", l); } catch (e) {} document.documentElement.lang = l; },
    t: (key, vars) => fill(pick(UI[key]) || key, vars),
    ghat: (site, short) => (GHATS[site] ? (short ? pick(GHATS[site].short) : pick(GHATS[site])) : site),
    ghatIn: (site, l) => (GHATS[site] ? GHATS[site][l] : site),
    water: (w) => (WATER[w] ? pick(WATER[w]) : w),
    param: (p, short) => (PARAMS[p] ? (short && PARAMS[p].abbr ? pick(PARAMS[p].abbr) : pick(PARAMS[p])) : p),
    level: (l) => pick(LEVELS[l]),
    action: (k, l) => (ACTIONS[k] ? ACTIONS[k][l || lang] : k),
    fest: (f) => pick(FEST[f]) || f,
    phase: (p) => pick(UI[p === "pre" ? "before" : p]),
    GHATS, PLACES, ACTIONS, LEVELS,
  };
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  if (typeof module !== "undefined" && module.exports) module.exports = I18N;
  root.I18N = I18N;
})(typeof window !== "undefined" ? window : globalThis);
