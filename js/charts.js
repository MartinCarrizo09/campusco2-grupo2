// Gráficos SVG livianos (sin librerías). Cada marca lleva data-tip para el tooltip
// y cada gráfico se acompaña de una tabla equivalente (accesibilidad).
import { esc, fmt } from './utils.js';

export const SERIES = Object.freeze(['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)']);

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function yGrid(max, x0, x1, yOf, unit, digits = 0) {
  return [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = max * t;
    const y = yOf(v);
    return `<line class="grid" x1="${x0}" x2="${x1}" y1="${y}" y2="${y}"/><text class="tick" x="${x0 - 8}" y="${y + 4}" text-anchor="end">${fmt(v, digits)}</text>`;
  }).join('') + `<text class="tick unit" x="${x0 - 8}" y="14" text-anchor="end">${esc(unit)}</text>`;
}

/** Barras verticales apiladas. groups: [{label, parts:[{key, value, tip}]}], keys: [{key,label,color}] */
export function stackedBars({ groups, keys, unit, digits = 0, title }) {
  const W = 560, H = 260, L = 56, R = 12, T = 30, B = 34;
  const totals = groups.map((g) => g.parts.reduce((a, p) => a + p.value, 0));
  const max = niceMax(Math.max(...totals, 0));
  const band = (W - L - R) / Math.max(groups.length, 1);
  const bw = Math.min(46, band * 0.56);
  const yOf = (v) => T + (H - T - B) * (1 - v / max);
  const bars = groups.map((g, i) => {
    const x = L + band * i + (band - bw) / 2;
    let acc = 0;
    const segs = g.parts.map((p, j) => {
      const y1 = yOf(acc + p.value), y0 = yOf(acc);
      acc += p.value;
      const h = Math.max(0, y0 - y1 - (j < g.parts.length - 1 ? 2 : 0));
      const top = j === g.parts.length - 1;
      const color = keys.find((k) => k.key === p.key)?.color ?? SERIES[0];
      return `<rect class="mark" x="${x}" y="${y1}" width="${bw}" height="${h}" rx="${top ? 4 : 0}" fill="${color}" data-tip="${esc(p.tip)}"/>`;
    }).join('');
    return `${segs}<text class="tick" x="${x + bw / 2}" y="${H - B + 18}" text-anchor="middle">${esc(g.label)}</text>
      <text class="value" x="${x + bw / 2}" y="${yOf(totals[i]) - 6}" text-anchor="middle">${fmt(totals[i], digits)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${yGrid(max, L, W - R, yOf, unit, digits)}<line class="axis" x1="${L}" x2="${W - R}" y1="${yOf(0)}" y2="${yOf(0)}"/>${bars}</svg>`;
}

/** Barras horizontales con porcentaje del total. items: [{label, value, color, tip}] */
export function shareBars({ items, unit, digits = 2, title }) {
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  const max = Math.max(...items.map((i) => i.value), 0) || 1;
  return `<div class="share" role="img" aria-label="${esc(title)}">${items.map((i) => `
    <div class="share-row" data-tip="${esc(i.tip)}">
      <div class="share-head"><span><i class="swatch" style="background:${i.color}"></i>${esc(i.label)}</span><strong>${fmt(i.value, digits)} <small>${esc(unit)}</small> · ${fmt((i.value / total) * 100, 0)} %</strong></div>
      <div class="share-track"><div class="share-fill" style="width:${(i.value / max) * 100}%;background:${i.color}"></div></div>
    </div>`).join('')}</div>`;
}

/** Barras verticales simples para comparar escenarios. items: [{label, sub, value, color, tip, emphasis}] */
export function compareBars({ items, unit, digits = 0, title, width = 560 }) {
  const W = width, H = 240, L = 56, R = 12, T = 30, B = 44;
  const max = niceMax(Math.max(...items.map((i) => i.value), 0));
  const band = (W - L - R) / Math.max(items.length, 1);
  const bw = Math.min(52, band * 0.5);
  const yOf = (v) => T + (H - T - B) * (1 - v / max);
  const bars = items.map((it, i) => {
    const x = L + band * i + (band - bw) / 2;
    const y = yOf(it.value);
    return `<rect class="mark${it.emphasis ? ' emphasis' : ''}" x="${x}" y="${y}" width="${bw}" height="${Math.max(0, yOf(0) - y)}" rx="4" fill="${it.color}" data-tip="${esc(it.tip)}"/>
      <text class="value" x="${x + bw / 2}" y="${y - 6}" text-anchor="middle">${fmt(it.value, digits)}</text>
      <text class="tick" x="${x + bw / 2}" y="${H - B + 17}" text-anchor="middle">${esc(it.label)}</text>
      <text class="tick muted" x="${x + bw / 2}" y="${H - B + 31}" text-anchor="middle">${esc(it.sub ?? '')}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${yGrid(max, L, W - R, yOf, unit, digits)}<line class="axis" x1="${L}" x2="${W - R}" y1="${yOf(0)}" y2="${yOf(0)}"/>${bars}</svg>`;
}

/** Línea con marcadores (una serie). points: [{label, value, tip}] */
export function lineChart({ points, unit, digits = 2, title, color = 'var(--series-1)' }) {
  const W = 560, H = 250, L = 56, R = 24, T = 30, B = 34;
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const step = (W - L - R) / Math.max(points.length - 1, 1);
  const yOf = (v) => T + (H - T - B) * (1 - v / max);
  const xy = points.map((p, i) => [L + step * i, yOf(p.value)]);
  const path = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const area = `${path} L${xy.at(-1)[0]},${yOf(0)} L${xy[0][0]},${yOf(0)} Z`;
  const marks = points.map((p, i) => `
    <circle class="hit" cx="${xy[i][0]}" cy="${xy[i][1]}" r="16" data-tip="${esc(p.tip)}"/>
    <circle class="dot" cx="${xy[i][0]}" cy="${xy[i][1]}" r="5" fill="${color}"/>
    <text class="value" x="${xy[i][0]}" y="${xy[i][1] - 12}" text-anchor="middle">${fmt(p.value, digits)}</text>
    <text class="tick" x="${xy[i][0]}" y="${H - B + 18}" text-anchor="middle">${esc(p.label)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${yGrid(max, L, W - R, yOf, unit, digits === 0 ? 0 : 1)}
    <path class="area" d="${area}" fill="${color}"/><path class="line" d="${path}" stroke="${color}"/>${marks}</svg>`;
}

export function legend(keys) {
  return `<ul class="legend">${keys.map((k) => `<li><i class="swatch" style="background:${k.color}"></i>${esc(k.label)}</li>`).join('')}</ul>`;
}

export function dataTable(headers, rows) {
  return `<details class="table-view"><summary>Ver como tabla</summary><div class="table-wrap"><table>
    <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div></details>`;
}

/** Tooltip único para cualquier elemento con data-tip. */
export function installTooltip(root = document) {
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.setAttribute('role', 'status');
  tip.hidden = true;
  document.body.append(tip);
  const show = (el, x, y) => {
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const { width, height } = tip.getBoundingClientRect();
    tip.style.left = `${Math.min(window.innerWidth - width - 8, Math.max(8, x + 14))}px`;
    tip.style.top = `${Math.max(8, y - height - 12)}px`;
  };
  root.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (el) show(el, e.clientX, e.clientY); else tip.hidden = true;
  });
  root.addEventListener('pointerleave', () => { tip.hidden = true; }, true);
  root.addEventListener('focusin', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (el) { const r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.top); }
  });
  root.addEventListener('focusout', () => { tip.hidden = true; });
}
