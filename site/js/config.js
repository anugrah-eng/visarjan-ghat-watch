// All limits, weights and colours in one place, so anyone can see and change them.
window.CONFIG = {
  visarjanDate: "2026-10-20",
  festivalAhead: "Durga",

  // CPCB Class B: outdoor bathing (organised). Devotees enter the water at ghats.
  limits: {
    "Dissolved oxygen": { type: "min", value: 5, unit: "mg/l" },
    "BOD": { type: "max", value: 3, unit: "mg/l" },
    "pH": { type: "range", min: 6.5, max: 8.5, unit: "" },
  },

  // Points per sampled reading.
  points: {
    doBelow5: 2, doBelow4: 1, doZero: 3,
    bodAbove3: 1, bodAbove6: 1,
    phOutOfRange: 1,
    noRecovery: 1,
  },
  // A reading a week after immersion that is worse than before by at least this much = no recovery.
  recoveryMargin: { "Dissolved oxygen": 0.5, "BOD": 0.5 },

  festivalWeight: { Durga: 1.5, Ganesh: 1.0 },
  // Weight by age relative to the latest year in the data: latest, one year older, older.
  recencyWeight: [1.0, 0.8, 0.6],

  // Score bands. Score = weighted points per sampled DO/BOD/pH reading.
  bands: { red: 1.6, amber: 0.0001 },

  status: {
    red:    { label: "At risk",        label_hi: "जोखिम में",         color: "#d03b3b" },
    amber:  { label: "Watch",          label_hi: "निगरानी रखें",     color: "#e8900c", ink: "#1c1c1a" },
    green:  { label: "Within limits",  label_hi: "सीमा के भीतर",     color: "#009a8a" },
    violet: { label: "Data needed: test before 20 Oct", label_hi: "डेटा चाहिए: 20 अक्टूबर से पहले जाँच करें", color: "#7c3aed" },
  },

  // Words that identify each ghat in a site name printed in a new report.
  siteKeywords: {
    "Bairagarh (Sant Hirdaram) kund": ["hirdaram", "bairagarh"],
    "Khatlapura ghat": ["khatlapura"],
    "Prempura ghat": ["prempura"],
    "Rani Kamlapati ghat / Kamla Park kund": ["kamlapati", "kamla park"],
    "Hathaikheda dam / kund": ["hathaikheda", "hathai kheda"],
    "Malikhedi kund": ["malikhedi", "mali khedi"],
    "Shahpura lake ghat": ["shahpura"],
  },
  // Standard parameter names, keyed by the printed name with everything but letters removed.
  paramKeys: {
    ph: "pH", totalsolids: "Total solids", dissolvedsolids: "Dissolved solids",
    suspendedsolids: "Suspended solids", doxygen: "Dissolved oxygen", dissolvedoxygen: "Dissolved oxygen",
    do: "Dissolved oxygen", bod: "BOD", cod: "COD", turbidity: "Turbidity", conductivity: "Conductivity",
    chromium: "Chromium", lead: "Lead", zinc: "Zinc", copper: "Copper",
  },
  units: {
    "pH": "", "Dissolved oxygen": "mg/l", "BOD": "mg/l", "COD": "mg/l", "Total solids": "mg/l",
    "Dissolved solids": "mg/l", "Suspended solids": "mg/l", "Turbidity": "NTU", "Conductivity": "µS/cm",
    "Chromium": "mg/l", "Lead": "mg/l", "Zinc": "mg/l", "Copper": "mg/l",
  },
  parameterOrder: ["Dissolved oxygen", "BOD", "pH", "COD", "Total solids", "Dissolved solids",
    "Suspended solids", "Turbidity", "Conductivity", "Chromium", "Lead", "Zinc", "Copper"],
  paramHindi: {
    "Dissolved oxygen": "घुलित ऑक्सीजन", "BOD": "बीओडी", "pH": "पीएच",
  },
};
