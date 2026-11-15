// Vistas Fichas (registros) y Carga (formulario con validación y vista previa).
import { calculate, roomsArea } from '../calc.js';
import { AREA_ORIGINS, CLIMATE_LABELS, DEFAULTS, MONTH_NAMES } from '../data.js';
import { esc, fmt, num } from '../utils.js';
import { colorFor } from './resumen.js';

export function renderFichas(all) {
  const rows = all.map((r) => {
    const res = calculate(r);
    return `<tr>
      <td><i class="swatch" style="background:${colorFor(all, r.id)}"></i><strong>${esc(r.building)}</strong><br><small>${esc(r.sector)} · ${esc(r.site)}</small></td>
      <td class="num" data-label="Año">${r.year}</td>
      <td data-label="Tipo de dato"><span class="tag">Hipotético</span><br><small>${esc(AREA_ORIGINS[r.areaOrigin])}</small></td>
      <td class="num" data-label="Superficie">${fmt(res.area, 0)} m²</td>
      <td class="num" data-label="Gas">${fmt(res.m3, 0)} m³</td>
      <td class="num" data-label="Emisiones">${fmt(res.tCO2e, 2)} t CO₂e</td>
      <td class="actions"><a href="#calculo/${encodeURIComponent(r.id)}">Ver cálculo</a><a href="#carga/${encodeURIComponent(r.id)}">Editar</a><button type="button" class="link danger" data-delete="${esc(r.id)}">Eliminar</button></td>
    </tr>`;
  }).join('');
  return `
  <header class="page-head"><div><p class="eyebrow">Componente 4 · Módulo de carga</p><h1>Fichas de calefacción</h1>
    <p class="lede">Cada ficha es un sector de un edificio en un año. Se guardan en este navegador; se pueden exportar en CSV o en el formato de intercambio JSON.</p></div>
    <div class="head-actions"><a class="button" href="#carga">Nueva ficha</a><button class="button ghost" type="button" data-export="csv">Exportar CSV</button><button class="button ghost" type="button" data-export="json">Exportar JSON</button></div></header>
  ${all.length === 0 ? '<div class="empty"><p>No hay fichas. Cargá una o restablecé los escenarios iniciales.</p></div>' : `
  <div class="panel table-wrap"><table class="records">
    <thead><tr><th>Sector</th><th class="num">Año</th><th>Tipo de dato</th><th class="num">Superficie</th><th class="num">Gas</th><th class="num">Emisiones</th><th><span class="sr-only">Acciones</span></th></tr></thead>
    <tbody>${rows}</tbody></table></div>`}
  <div class="confirm" data-confirm hidden><p>¿Eliminar la ficha <strong data-confirm-name></strong>? Esta acción no se puede deshacer.</p><div><button type="button" class="button ghost" data-confirm-cancel>Cancelar</button><button type="button" class="button danger" data-confirm-ok>Eliminar</button></div></div>
  <p class="reset-row"><button type="button" class="link" data-reset>Restablecer los tres escenarios iniciales</button></p>`;
}

const field = (name, label, value, attrs = '', hint = '') => `
  <label class="field" data-field="${name}"><span>${label}</span><input name="${name}" value="${esc(value)}" ${attrs}>${hint ? `<small>${hint}</small>` : ''}<em class="error" data-error="${name}"></em></label>`;

const dec = (v) => (typeof v === 'number' && Number.isFinite(v) ? String(v).replace('.', ',') : v ?? '');

function roomRow(room = { name: '', length: '', width: '' }) {
  return `<div class="room" data-room>
    <label class="room-name"><span>Ambiente</span><input name="roomName" value="${esc(room.name)}" placeholder="Aula 1"></label>
    <label class="room-len"><span>Largo (m)</span><input name="roomLength" inputmode="decimal" value="${esc(dec(room.length))}" placeholder="8,5"></label>
    <span class="room-x" aria-hidden="true">×</span>
    <label class="room-wid"><span>Ancho (m)</span><input name="roomWidth" inputmode="decimal" value="${esc(dec(room.width))}" placeholder="6"></label>
    <output class="room-area" data-room-area></output>
    <button type="button" class="link danger room-rm" data-room-remove>Quitar</button></div>`;
}

export function blankRecord() {
  return {
    id: '', site: 'UTN FRC', building: '', sector: '', year: 2026, areaOrigin: 'hipotetica', rooms: [], area: '',
    months: [...DEFAULTS.months], hoursPerDay: DEFAULTS.hoursPerDay, daysPerWeek: DEFAULTS.daysPerWeek, balanceTemp: DEFAULTS.balanceTemp,
    lossCoef: DEFAULTS.lossCoef, efficiency: DEFAULTS.efficiency, pci: Number(DEFAULTS.pci.toFixed(4)), climate: DEFAULTS.climate,
    heatPumpCop: DEFAULTS.heatPumpCop, source: '', notes: '',
  };
}

export function renderCarga(record, isEdit) {
  const r = record;
  const months = MONTH_NAMES.map((m, i) => `<label class="chip"><input type="checkbox" name="months" value="${i + 1}"${r.months.includes(i + 1) ? ' checked' : ''}><span>${m.slice(0, 3)}</span></label>`).join('');
  const select = (name, options, cur) => `<select name="${name}">${Object.entries(options).map(([k, l]) => `<option value="${k}"${String(k) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  return `
  <header class="page-head"><div><p class="eyebrow">Componente 4 · Módulo de carga</p><h1>${isEdit ? 'Editar ficha' : 'Nueva ficha'}</h1>
    <p class="lede">Los datos se validan al escribir y el resultado se recalcula en vivo. Las fichas quedan marcadas como escenario hipotético.</p></div></header>
  <form class="sheet" data-sheet novalidate>
    <input type="hidden" name="id" value="${esc(r.id)}">
    <fieldset class="panel"><legend>1 · Identificación</legend><div class="fields">
      ${field('site', 'Sede', r.site, 'required maxlength="80"')}
      ${field('building', 'Edificio', r.building, 'required maxlength="80" placeholder="Edificio Maders"')}
      ${field('sector', 'Sector', r.sector, 'required maxlength="80" placeholder="Segundo piso"')}
      ${field('year', 'Año', r.year, 'required inputmode="numeric"', 'Período anual')}
    </div></fieldset>
    <fieldset class="panel"><legend>2 · Superficie calefaccionada</legend>
      <label class="field"><span>Origen del dato</span>${select('areaOrigin', AREA_ORIGINS, r.areaOrigin)}<em class="error" data-error="areaOrigin"></em></label>
      <div data-area-direct ${r.areaOrigin === 'ambientes' ? 'hidden' : ''}>${field('area', 'Superficie (m²)', r.area, 'inputmode="decimal"', 'Área de piso de los ambientes calefaccionados')}</div>
      <div data-area-rooms ${r.areaOrigin === 'ambientes' ? '' : 'hidden'}>
        <div class="rooms" data-rooms>${(r.rooms.length ? r.rooms : [undefined]).map(roomRow).join('')}</div>
        <div class="rooms-foot"><button type="button" class="button ghost small" data-room-add>Agregar ambiente</button><span>Total: <strong data-rooms-total>${fmt(roomsArea(r.rooms), 2)}</strong> m²</span></div>
        <em class="error" data-error="rooms"></em>
      </div>
    </fieldset>
    <fieldset class="panel"><legend>3 · Temporada de uso</legend>
      <div class="chips" role="group" aria-label="Meses de calefacción">${months}</div><em class="error" data-error="months"></em>
      <div class="fields">
        ${field('hoursPerDay', 'Horas por día', r.hoursPerDay, 'inputmode="decimal"')}
        <label class="field"><span>Días por semana</span>${select('daysPerWeek', { 5: 'Lunes a viernes', 6: 'Lunes a sábado', 7: 'Todos los días' }, r.daysPerWeek)}</label>
        <label class="field"><span>Clima de referencia (SMN)</span>${select('climate', CLIMATE_LABELS, r.climate)}</label>
      </div>
    </fieldset>
    <fieldset class="panel"><legend>4 · Parámetros térmicos</legend><div class="fields">
      ${field('balanceTemp', 'Temperatura de balance (°C)', r.balanceTemp, 'inputmode="decimal"', 'Debajo de este valor se enciende la calefacción')}
      ${field('lossCoef', 'Pérdidas globales W/(m²·K)', r.lossCoef, 'inputmode="decimal"', 'Envolvente y ventilación por m² de piso')}
      ${field('efficiency', 'Rendimiento de la caldera (%)', r.efficiency, 'inputmode="decimal"')}
      ${field('pci', 'PCI del gas (kWh/m³)', r.pci, 'inputmode="decimal"', '8.300 kcal/m³')}
      ${field('heatPumpCop', 'COP de bomba de calor (alternativa)', r.heatPumpCop, 'inputmode="decimal"')}
    </div></fieldset>
    <fieldset class="panel"><legend>5 · Respaldo</legend><div class="fields one">
      ${field('source', 'Fuente o criterio del escenario', r.source, 'maxlength="300"')}
      <label class="field"><span>Observaciones</span><textarea name="notes" maxlength="600" rows="3">${esc(r.notes)}</textarea><em class="error" data-error="notes"></em></label>
    </div></fieldset>
    <aside class="panel preview" data-preview aria-live="polite"></aside>
    <div class="sheet-actions"><a class="button ghost" href="#fichas">Cancelar</a><button class="button" type="submit">${isEdit ? 'Guardar cambios' : 'Guardar ficha'}</button></div>
  </form>`;
}

export function readSheet(form, base) {
  const fd = new FormData(form);
  const rooms = [...form.querySelectorAll('[data-room]')].map((row) => ({
    name: row.querySelector('[name=roomName]').value.trim() || 'Ambiente',
    length: num(row.querySelector('[name=roomLength]').value),
    width: num(row.querySelector('[name=roomWidth]').value),
  })).filter((x) => !(Number.isNaN(x.length) && Number.isNaN(x.width)));
  const areaOrigin = fd.get('areaOrigin');
  return {
    ...base,
    id: fd.get('id') || base.id,
    site: String(fd.get('site') ?? '').trim(),
    building: String(fd.get('building') ?? '').trim(),
    sector: String(fd.get('sector') ?? '').trim(),
    year: num(fd.get('year')),
    areaOrigin,
    rooms: areaOrigin === 'ambientes' ? rooms : [],
    area: areaOrigin === 'ambientes' ? roomsArea(rooms) : num(fd.get('area')),
    months: fd.getAll('months').map(Number),
    hoursPerDay: num(fd.get('hoursPerDay')),
    daysPerWeek: Number(fd.get('daysPerWeek')),
    climate: fd.get('climate'),
    balanceTemp: num(fd.get('balanceTemp')),
    lossCoef: num(fd.get('lossCoef')),
    efficiency: num(fd.get('efficiency')),
    pci: num(fd.get('pci')),
    heatPumpCop: num(fd.get('heatPumpCop')),
    source: String(fd.get('source') ?? '').trim(),
    notes: String(fd.get('notes') ?? ''),
  };
}

export function previewHtml(rec, validation) {
  if (!validation.ok) return `<h2>Vista previa</h2><p class="muted">Completá los campos marcados para ver el resultado.</p>`;
  const res = calculate(rec);
  return `<h2>Vista previa</h2><dl class="steps">
    <div><dt>Superficie</dt><dd>${fmt(res.area, 1)} m²</dd></div>
    <div><dt>Grados-hora</dt><dd>${fmt(res.degreeHours, 0)} K·h</dd></div>
    <div><dt>Calor útil</dt><dd>${fmt(res.usefulKWh, 1)} kWh</dd></div>
    <div><dt>Energía del gas</dt><dd>${fmt(res.gasKWh, 1)} kWh</dd></div>
    <div><dt>Gas natural</dt><dd>${fmt(res.m3, 1)} m³</dd></div>
    <div class="total"><dt>Emisiones</dt><dd>${fmt(res.kgCO2e, 1)} kg CO₂e</dd></div></dl>`;
}

export { roomRow };
