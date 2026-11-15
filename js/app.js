// Composición de la aplicación: navegación por hash, eventos y exportaciones.
import { aggregate, calculate } from './calc.js';
import { checkApi, exchangePayload } from './api.js';
import { installTooltip } from './charts.js';
import { MONTH_NAMES } from './data.js';
import { createRepository, newId, readApiLog } from './store.js';
import { download, fmt, toCsv } from './utils.js';
import { validateRecord } from './validation.js';
import { renderApi } from './views/api.js';
import { renderCalculo } from './views/calculo.js';
import { renderDocs } from './views/docs.js';
import { blankRecord, previewHtml, readSheet, renderCarga, renderFichas, roomRow } from './views/fichas.js';
import { renderMedicion, renderRelevamiento } from './views/metodo.js';
import { renderResumen } from './views/resumen.js';

const repo = createRepository();
const main = document.getElementById('contenido');
const toast = document.getElementById('toast');
let filters = { year: '', climate: 'mean', sens: 'base' };

const TITLES = { resumen: 'Resumen', fichas: 'Fichas', carga: 'Carga', calculo: 'Cálculo', medicion: 'Medición', relevamiento: 'Relevamiento', api: 'API', documentacion: 'Documentación' };

function say(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(say.t);
  say.t = setTimeout(() => { toast.hidden = true; }, 3500);
}

function route() {
  const [view = 'resumen', param = ''] = location.hash.slice(1).split('/');
  return { view: TITLES[view] ? view : 'resumen', param: decodeURIComponent(param) };
}

function render() {
  const { view, param } = route();
  const all = repo.findAll();
  document.querySelectorAll('[data-nav] a').forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === `#${view}`));
  document.title = `${TITLES[view]} · CampusCO₂ Grupo 2`;
  const views = {
    resumen: () => renderResumen(all, filters),
    fichas: () => renderFichas(all),
    carga: () => {
      const existing = param ? all.find((r) => r.id === param) : null;
      return renderCarga(existing ?? blankRecord(), Boolean(existing));
    },
    calculo: () => renderCalculo(all, param),
    medicion: renderMedicion,
    relevamiento: renderRelevamiento,
    api: () => renderApi(readApiLog()),
    documentacion: renderDocs,
  };
  main.innerHTML = views[view]();
  if (view === 'carga') bindSheet(param && all.find((r) => r.id === param));
  if (view === 'api' && !readApiLog()) runApiCheck(false);
  main.focus({ preventScroll: true });
  if (repo.warning) say(repo.warning);
}

async function runApiCheck(force) {
  const btn = main.querySelector('[data-api-check]');
  if (btn) { btn.disabled = true; btn.textContent = 'Consultando…'; }
  try {
    await checkApi({ force });
  } catch {
    say('No se pudo completar la consulta a la API.');
  }
  if (route().view === 'api') render();
}

function exportCsv() {
  const all = repo.findAll();
  const head = ['Sede', 'Edificio', 'Sector', 'Año', 'Tipo de dato', 'Origen superficie', 'Superficie m²', 'Meses', 'Horas/día', 'Días/semana', 'Clima', 'T balance °C', 'Pérdidas W/m²K', 'Rendimiento %', 'PCI kWh/m³', 'Grados-hora', 'Calor útil kWh', 'Energía gas kWh', 'Gas m³', 'Factor kg CO2e/kWh', 'Emisiones kg CO2e', 'Emisiones t CO2e', 'Fuente', 'Observaciones'];
  const rows = all.map((r) => {
    const x = calculate(r);
    return [r.site, r.building, r.sector, r.year, 'Escenario hipotético', r.areaOrigin, x.area, r.months.map((m) => MONTH_NAMES[m - 1]).join(' '), r.hoursPerDay, r.daysPerWeek, r.climate, r.balanceTemp, r.lossCoef, r.efficiency, r.pci, x.degreeHours, x.usefulKWh.toFixed(2), x.gasKWh.toFixed(2), x.m3.toFixed(2), x.factor.value, x.kgCO2e.toFixed(2), x.tCO2e.toFixed(4), r.source, r.notes];
  });
  download('campusco2-grupo2-fichas.csv', toCsv([head, ...rows]), 'text/csv;charset=utf-8');
  say(`CSV exportado con ${rows.length} fichas.`);
}

function exportJson() {
  const all = repo.findAll();
  download('campusco2-grupo2-intercambio.json', JSON.stringify(exchangePayload(all, aggregate(all)), null, 2), 'application/json');
  say('Archivo de intercambio JSON exportado.');
}

function showErrors(form, errors) {
  form.querySelectorAll('[data-error]').forEach((el) => {
    const msg = errors[el.dataset.error] ?? '';
    el.textContent = msg;
    const input = form.querySelector(`[name="${el.dataset.error}"]`);
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  });
}

function bindSheet(existing) {
  const form = main.querySelector('[data-sheet]');
  const base = existing ?? blankRecord();
  let touched = false;
  const refresh = () => {
    const rec = readSheet(form, base);
    const v = validateRecord(rec, repo.findAll());
    if (touched) showErrors(form, v.errors);
    form.querySelectorAll('[data-room]').forEach((row) => {
      const l = Number(row.querySelector('[name=roomLength]').value.replace(',', '.'));
      const w = Number(row.querySelector('[name=roomWidth]').value.replace(',', '.'));
      row.querySelector('[data-room-area]').textContent = l > 0 && w > 0 ? `${fmt(l * w, 2)} m²` : '';
    });
    form.querySelector('[data-rooms-total]').textContent = fmt(rec.areaOrigin === 'ambientes' ? rec.area : 0, 2);
    form.querySelector('[data-preview]').innerHTML = previewHtml(rec, v);
    return { rec, v };
  };
  form.addEventListener('input', () => { touched = true; refresh(); });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'areaOrigin') {
      const rooms = e.target.value === 'ambientes';
      form.querySelector('[data-area-direct]').hidden = rooms;
      form.querySelector('[data-area-rooms]').hidden = !rooms;
    }
    refresh();
  });
  form.addEventListener('click', (e) => {
    if (e.target.matches('[data-room-add]')) form.querySelector('[data-rooms]').insertAdjacentHTML('beforeend', roomRow());
    if (e.target.matches('[data-room-remove]')) e.target.closest('[data-room]').remove();
    if (e.target.matches('[data-room-add],[data-room-remove]')) refresh();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    touched = true;
    const { rec, v } = refresh();
    if (!v.ok) {
      showErrors(form, v.errors);
      form.querySelector('[aria-invalid="true"]')?.focus();
      say('Revisá los campos marcados.');
      return;
    }
    const saved = { ...rec, id: rec.id || newId(rec.building, rec.sector, rec.year) };
    try {
      repo.save(saved);
    } catch {
      say('No se pudo guardar: el almacenamiento del navegador no está disponible.');
      return;
    }
    say('Ficha guardada.');
    location.hash = `#calculo/${encodeURIComponent(saved.id)}`;
  });
  refresh();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.matches('[data-export="csv"]')) exportCsv();
  if (t.matches('[data-export="json"]')) exportJson();
  if (t.matches('[data-api-check]')) runApiCheck(true);
  if (t.matches('[data-delete]')) {
    const box = main.querySelector('[data-confirm]');
    const rec = repo.findById(t.dataset.delete);
    box.querySelector('[data-confirm-name]').textContent = `${rec.building} · ${rec.sector} (${rec.year})`;
    box.dataset.id = rec.id;
    box.hidden = false;
    box.querySelector('[data-confirm-cancel]').focus();
  }
  if (t.matches('[data-confirm-cancel]')) main.querySelector('[data-confirm]').hidden = true;
  if (t.matches('[data-confirm-ok]')) {
    const box = main.querySelector('[data-confirm]');
    try { repo.remove(box.dataset.id); say('Ficha eliminada.'); } catch { say('No se pudo eliminar la ficha.'); }
    render();
  }
  if (t.matches('[data-reset]')) {
    try { repo.reset(); say('Se restablecieron los tres escenarios iniciales.'); } catch { say('No se pudo restablecer.'); }
    render();
  }
});

document.addEventListener('change', (e) => {
  const form = e.target.closest('[data-filters]');
  if (!form) return;
  filters = { ...filters, [e.target.name]: e.target.value };
  render();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { const box = main.querySelector('[data-confirm]'); if (box && !box.hidden) box.hidden = true; }
});

window.addEventListener('hashchange', render);
installTooltip(main);
render();
