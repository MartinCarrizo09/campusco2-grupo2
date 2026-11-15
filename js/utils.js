// Formato, escape de texto, CSV y descargas.

const nf = (digits) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const cache = new Map();

export function fmt(value, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  if (!cache.has(digits)) cache.set(digits, nf(digits));
  return cache.get(digits).format(value);
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Celda CSV segura: comillas escapadas y neutralización de fórmulas (= + - @). */
export function csvCell(value) {
  let s = String(value ?? '');
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows) {
  return `﻿${rows.map((r) => r.map(csvCell).join(';')).join('\r\n')}`;
}

export function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(String(v).replace(',', '.')));
