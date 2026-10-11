// Small SVG charts. Colours come from CSS variables, so they restyle with the theme.
// Breaches use a different marker shape as well as colour; missing values are drawn as gaps marked "not tested".
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (v) => (Math.round(v * 100) / 100).toString();

  function niceRange(values, limit) {
    const xs = values.filter((v) => v !== null && v !== undefined);
    if (limit) xs.push(...(limit.type === "range" ? [limit.min, limit.max] : [limit.value]));
    let lo = Math.min(0, ...xs), hi = Math.max(...xs, 1);
    if (limit && limit.type === "range") lo = Math.min(...xs) - 0.5; // pH: zero is not a meaningful baseline
    const pad = (hi - lo) * 0.08;
    return [lo < 0 && !(limit && limit.type === "range") ? 0 : lo, hi + pad];
  }
  function ticks(lo, hi, n = 4) {
    const step = Math.pow(10, Math.floor(Math.log10((hi - lo) / n)));
    const s = [1, 2, 2.5, 5, 10].map((m) => m * step).find((m) => (hi - lo) / m <= n) || step * 10;
    const out = [];
    for (let v = Math.ceil(lo / s) * s; v <= hi + 1e-9; v += s) out.push(+v.toFixed(6));
    return out;
  }
  const marker = (x, y, state, title) => {
    const t = `<title>${esc(title)}</title>`;
    if (state === "breach") return `<path class="mk-breach" d="M${x} ${y - 6} L${x + 6} ${y} L${x} ${y + 6} L${x - 6} ${y} Z">${t}</path>`;
    if (state === "bdl") return `<circle class="mk-bdl" cx="${x}" cy="${y}" r="4.5">${t}</circle>`;
    return `<circle class="mk-ok" cx="${x}" cy="${y}" r="4.5">${t}</circle>`;
  };
  const limitLabel = (l, text) => (l.type === "range" ? `${text} ${l.min}–${l.max}` : `${text} ${l.type === "min" ? "≥" : "≤"} ${l.value}`);

  // points: [{group, sub, value, state, title}] in time order; groups are seasons, subs are phases.
  function trend({ points, limit, unit, labels, height = 190 }) {
    const W = 560, H = height, m = { l: 40, r: 12, t: 14, b: 42 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const vals = points.map((p) => (p.state === "bdl" ? 0 : p.value));
    const [lo, hi] = niceRange(vals, limit);
    const x = (i) => m.l + (points.length === 1 ? iw / 2 : (i * iw) / (points.length - 1));
    const y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(labels.aria)}">`;
    for (const tv of ticks(lo, hi)) s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(tv)}" y2="${y(tv)}"/><text class="tick" x="${m.l - 6}" y="${y(tv) + 4}" text-anchor="end">${fmt(tv)}</text>`;
    if (limit) {
      if (limit.type === "range") s += `<rect class="limit-band" x="${m.l}" width="${iw}" y="${y(limit.max)}" height="${y(limit.min) - y(limit.max)}"/>`;
      const lv = limit.type === "range" ? [limit.min, limit.max] : [limit.value];
      for (const v of lv) s += `<line class="limit" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`;
      s += `<text class="limit-text" x="${W - m.r}" y="${y(lv[lv.length - 1]) - 5}" text-anchor="end">${esc(limitLabel(limit, labels.limit))}${unit ? " " + esc(unit) : ""}</text>`;
    }
    // Line segments only between consecutive tested points; a missing value breaks the line.
    let path = "", pen = false;
    points.forEach((p, i) => {
      if (p.state === "missing") { pen = false; return; }
      const v = p.state === "bdl" ? 0 : p.value;
      path += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; pen = true;
    });
    s += `<path class="line" d="${path}"/>`;
    points.forEach((p, i) => {
      if (p.state === "missing") s += `<g class="mk-missing"><title>${esc(p.title)}</title><line x1="${x(i) - 4}" x2="${x(i) + 4}" y1="${m.t + ih - 4}" y2="${m.t + ih + 4}"/><line x1="${x(i) + 4}" x2="${x(i) - 4}" y1="${m.t + ih - 4}" y2="${m.t + ih + 4}"/></g>`;
      else s += marker(x(i), y(p.state === "bdl" ? 0 : p.value), p.state, p.title);
    });
    // Season labels under each group of phases.
    const groups = [];
    points.forEach((p, i) => { const g = groups[groups.length - 1]; if (g && g.k === p.group) g.end = i; else groups.push({ k: p.group, start: i, end: i }); });
    for (const g of groups) {
      s += `<text class="tick" x="${(x(g.start) + x(g.end)) / 2}" y="${H - 22}" text-anchor="middle">${esc(g.k)}</text>`;
      if (g.start !== groups[0].start) s += `<line class="sep" x1="${x(g.start) - (x(1) - x(0)) / 2}" x2="${x(g.start) - (x(1) - x(0)) / 2}" y1="${m.t}" y2="${m.t + ih}"/>`;
    }
    s += `<text class="tick sub" x="${m.l}" y="${H - 6}">${esc(labels.phases)}</text></svg>`;
    return s;
  }

  // rows: [{label, values: {pre, during, after} each {value, state, title}}]; one dot per phase, shapes differ.
  function compare({ rows, limit, unit, labels }) {
    const rowH = 34, W = 860, m = { l: 150, r: 130, t: 26, b: 30 };
    const H = m.t + m.b + rows.length * rowH, iw = W - m.l - m.r;
    const all = rows.flatMap((r) => Object.values(r.values).map((v) => (v && v.state === "bdl" ? 0 : v && v.value)));
    const [lo, hi] = niceRange(all, limit);
    const x = (v) => m.l + ((v - lo) / (hi - lo)) * iw;
    const SHAPE = {
      pre: (cx, cy, c, t) => `<circle class="${c} ph-pre" cx="${cx}" cy="${cy}" r="5"><title>${esc(t)}</title></circle>`,
      during: (cx, cy, c, t) => `<rect class="${c} ph-during" x="${cx - 5}" y="${cy - 5}" width="10" height="10" rx="1.5"><title>${esc(t)}</title></rect>`,
      after: (cx, cy, c, t) => `<path class="${c} ph-after" d="M${cx} ${cy - 6} L${cx + 6} ${cy + 5} L${cx - 6} ${cy + 5} Z"><title>${esc(t)}</title></path>`,
    };
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart chart-compare" role="img" aria-label="${esc(labels.aria)}">`;
    for (const tv of ticks(lo, hi, 5)) s += `<line class="grid" x1="${x(tv)}" x2="${x(tv)}" y1="${m.t - 6}" y2="${H - m.b}"/><text class="tick" x="${x(tv)}" y="${H - m.b + 16}" text-anchor="middle">${fmt(tv)}</text>`;
    if (limit) {
      if (limit.type === "range") s += `<rect class="limit-band" y="${m.t - 6}" height="${H - m.b - m.t + 6}" x="${x(limit.min)}" width="${x(limit.max) - x(limit.min)}"/>`;
      for (const v of limit.type === "range" ? [limit.min, limit.max] : [limit.value]) s += `<line class="limit" x1="${x(v)}" x2="${x(v)}" y1="${m.t - 6}" y2="${H - m.b}"/>`;
      s += `<text class="limit-text" x="${x(limit.type === "range" ? limit.max : limit.value)}" y="${m.t - 10}" text-anchor="middle">${esc(limitLabel(limit, labels.limit))}</text>`;
    }
    rows.forEach((r, i) => {
      const cy = m.t + i * rowH + rowH / 2;
      s += `<text class="row-label" x="${m.l - 10}" y="${cy + 4}" text-anchor="end">${esc(r.label)}</text>`;
      const tested = Object.entries(r.values).filter(([, v]) => v && v.state !== "missing");
      if (tested.length > 1) {
        const xs = tested.map(([, v]) => x(v.state === "bdl" ? 0 : v.value));
        s += `<line class="range" x1="${Math.min(...xs)}" x2="${Math.max(...xs)}" y1="${cy}" y2="${cy}"/>`;
      }
      for (const [ph, v] of Object.entries(r.values)) {
        if (!v || v.state === "missing") continue;
        s += SHAPE[ph](x(v.state === "bdl" ? 0 : v.value), cy, v.state === "breach" ? "dot-breach" : "dot-ok", v.title);
      }
      const miss = Object.entries(r.values).filter(([, v]) => !v || v.state === "missing").length;
      if (miss) s += `<text class="miss-text" x="${W - m.r + 6}" y="${cy + 4}">${esc(miss === 3 ? labels.notTested : `${miss}× ${labels.notTested}`)}</text>`;
    });
    s += `<text class="tick sub" x="${m.l}" y="${H - 4}">${esc(unit || "")}</text></svg>`;
    const legend = `<div class="chart-legend">${["pre", "during", "after"].map((ph) =>
      `<span><svg width="14" height="14" viewBox="-7 -7 14 14">${SHAPE[ph](0, 0, "dot-ok", "")}</svg> ${esc(labels[ph])}</span>`).join("")}
      <span><svg width="14" height="14" viewBox="-7 -7 14 14">${SHAPE.during(0, 0, "dot-breach", "")}</svg> ${esc(labels.breach)}</span></div>`;
    return legend + s;
  }

  window.Charts = { trend, compare };
})();
