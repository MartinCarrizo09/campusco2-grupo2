// Vista Cálculo: trazabilidad completa de una ficha (componente 6).
import { calculate, scenarios } from '../calc.js';
import { AREA_ORIGINS, CLIMATE_LABELS, EMISSION_FACTOR, IPCC_GAS_KG_PER_KWH, MONTH_NAMES, TREE_T_CO2_YEAR } from '../data.js';
import { esc, fmt } from '../utils.js';

export function renderCalculo(all, id) {
  const rec = all.find((r) => r.id === id) ?? all[0];
  if (!rec) return '<header class="page-head"><h1>Cálculo</h1></header><div class="empty"><p>No hay fichas para calcular.</p></div>';
  const res = calculate(rec);
  const sc = scenarios(rec);
  const tabs = all.map((r) => `<a href="#calculo/${encodeURIComponent(r.id)}"${r.id === rec.id ? ' aria-current="page"' : ''}>${esc(r.building)} · ${r.year}</a>`).join('');
  const rows = res.monthly.map((m) => `<tr><td>${MONTH_NAMES[m.month - 1]}</td><td class="num">${m.days}</td><td class="num">${fmt(m.hours, 0)}</td><td class="num">${fmt(m.outdoor, 1)}</td><td class="num">${fmt(m.deltaT, 1)}</td><td class="num">${fmt(m.degreeHours, 0)}</td><td class="num">${fmt(m.usefulKWh, 1)}</td><td class="num">${fmt(m.m3, 1)}</td><td class="num">${fmt(m.kgCO2e, 1)}</td></tr>`).join('');
  const july = res.monthly.find((m) => m.month === 7) ?? res.monthly[0];
  return `
  <header class="page-head"><div><p class="eyebrow">Componente 6 · Módulo de cálculo</p><h1>${esc(rec.building)}</h1>
    <p class="lede">${esc(rec.sector)} · ${esc(rec.site)} · ${rec.year} · <span class="tag">Escenario hipotético</span></p></div>
    <div class="head-actions"><a class="button ghost" href="#carga/${encodeURIComponent(rec.id)}">Editar ficha</a></div></header>
  <nav class="tabs" aria-label="Fichas">${tabs}</nav>
  <div class="grid-2">
    <section class="panel"><h2>Entradas</h2><dl class="kv">
      <div><dt>Superficie</dt><dd>${fmt(res.area, 1)} m² <small>${esc(AREA_ORIGINS[rec.areaOrigin])}</small></dd></div>
      ${rec.areaOrigin === 'ambientes' ? `<div><dt>Ambientes</dt><dd>${rec.rooms.map((r) => `${esc(r.name)}: ${fmt(r.length, 1)} × ${fmt(r.width, 1)} = ${fmt(r.length * r.width, 1)} m²`).join('<br>')}</dd></div>` : ''}
      <div><dt>Temporada</dt><dd>${rec.months.map((m) => MONTH_NAMES[m - 1]).join(', ')} · ${fmt(rec.hoursPerDay, 0)} h/día · ${{ 5: 'lunes a viernes', 6: 'lunes a sábado', 7: 'todos los días' }[rec.daysPerWeek]}</dd></div>
      <div><dt>Clima</dt><dd>${esc(CLIMATE_LABELS[rec.climate])}</dd></div>
      <div><dt>Temperatura de balance</dt><dd>${fmt(rec.balanceTemp, 1)} °C</dd></div>
      <div><dt>Pérdidas globales</dt><dd>${fmt(rec.lossCoef, 2)} W/(m²·K)</dd></div>
      <div><dt>Rendimiento</dt><dd>${fmt(rec.efficiency, 0)} %</dd></div>
      <div><dt>PCI</dt><dd>${fmt(rec.pci, 4)} kWh/m³</dd></div>
      <div><dt>Factor de emisión</dt><dd>${EMISSION_FACTOR.display} = ${fmt(EMISSION_FACTOR.value, 3)} ${EMISSION_FACTOR.unit}</dd></div>
      <div><dt>Respaldo</dt><dd>${esc(rec.source) || '—'}${rec.notes ? `<br><small>${esc(rec.notes)}</small>` : ''}</dd></div>
    </dl></section>
    <section class="panel"><h2>Secuencia de cálculo</h2><ol class="formula">
      <li><b>Grados-hora</b><span>Σ horas del mes × máx(0; ${fmt(rec.balanceTemp, 1)} − T exterior)</span><em>${fmt(res.degreeHours, 0)} K·h</em></li>
      <li><b>Calor útil</b><span>${fmt(res.area, 1)} m² × ${fmt(rec.lossCoef, 2)} W/(m²·K) × ${fmt(res.degreeHours, 0)} K·h ÷ 1.000</span><em>${fmt(res.usefulKWh, 2)} kWh</em></li>
      <li><b>Energía del gas</b><span>${fmt(res.usefulKWh, 2)} kWh ÷ ${fmt(rec.efficiency / 100, 2)}</span><em>${fmt(res.gasKWh, 2)} kWh</em></li>
      <li><b>Volumen</b><span>${fmt(res.gasKWh, 2)} kWh ÷ ${fmt(rec.pci, 4)} kWh/m³</span><em>${fmt(res.m3, 2)} m³</em></li>
      <li class="total"><b>Emisiones</b><span>${fmt(res.gasKWh, 2)} kWh × ${fmt(EMISSION_FACTOR.value, 3)} kg CO₂e/kWh</span><em>${fmt(res.kgCO2e, 1)} kg = ${fmt(res.tCO2e, 3)} t CO₂e</em></li>
    </ol>
    <p class="note">Control manual con ${MONTH_NAMES[july.month - 1].toLowerCase()}: ${july.days} días × ${fmt(rec.hoursPerDay, 0)} h = ${fmt(july.hours, 0)} h; ${fmt(rec.balanceTemp, 1)} − ${fmt(july.outdoor, 1)} = ${fmt(july.deltaT, 1)} °C; ${fmt(july.hours, 0)} × ${fmt(july.deltaT, 1)} = ${fmt(july.degreeHours, 0)} K·h.</p></section>
  </div>
  <section class="panel"><h2>Desglose mensual</h2><div class="table-wrap"><table>
    <thead><tr><th>Mes</th><th class="num">Días</th><th class="num">Horas</th><th class="num">T ext °C</th><th class="num">ΔT °C</th><th class="num">K·h</th><th class="num">Calor útil kWh</th><th class="num">Gas m³</th><th class="num">kg CO₂e</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><th>Total</th><td class="num">${res.days}</td><td class="num">${fmt(res.hours, 0)}</td><td></td><td></td><td class="num">${fmt(res.degreeHours, 0)}</td><td class="num">${fmt(res.usefulKWh, 1)}</td><td class="num">${fmt(res.m3, 1)}</td><td class="num">${fmt(res.kgCO2e, 1)}</td></tr></tfoot>
  </table></div></section>
  <div class="grid-2">
    <section class="panel"><h2>Sensibilidad</h2><div class="table-wrap"><table>
      <thead><tr><th>Escenario</th><th class="num">W/(m²·K)</th><th class="num">η</th><th class="num">m³</th><th class="num">kg CO₂e</th></tr></thead>
      <tbody>${sc.byParams.map((s) => `<tr><td>${s.label}</td><td class="num">${fmt(s.lossCoef, 1)}</td><td class="num">${s.efficiency} %</td><td class="num">${fmt(s.m3, 0)}</td><td class="num">${fmt(s.kgCO2e, 0)}</td></tr>`).join('')}
      ${sc.byClimate.map((s) => `<tr><td>${esc(CLIMATE_LABELS[s.key])}</td><td class="num" colspan="2">${fmt(s.degreeHours, 0)} K·h</td><td class="num">${fmt(s.m3, 0)}</td><td class="num">${fmt(s.kgCO2e, 0)}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="panel"><h2>Indicadores de la ficha</h2><dl class="kv">
      <div><dt>Intensidad</dt><dd>${fmt(res.intensityKgM2, 2)} kg CO₂e/m²</dd></div>
      <div><dt>Compensación</dt><dd>${fmt(res.trees, 1)} árboles adultos (${fmt(TREE_T_CO2_YEAR, 2)} t CO₂/año c/u)</dd></div>
      <div><dt>Con bomba de calor</dt><dd>${fmt(res.heatPump.kWh, 0)} kWh eléctricos (COP ${fmt(res.heatPump.cop, 1)}) → ${fmt(res.heatPump.kgCO2e, 0)} kg CO₂e</dd></div>
      <div><dt>Emisiones evitables</dt><dd>${fmt(res.heatPump.avoidedKg, 0)} kg CO₂e por año</dd></div>
      <div><dt>Control de combustión</dt><dd>${fmt(res.ipccControlKg, 0)} kg CO₂ con el factor de combustión del gas (${fmt(IPCC_GAS_KG_PER_KWH, 3)} kg/kWh). El factor energético adoptado da un resultado ${fmt((res.kgCO2e / res.ipccControlKg - 1) * 100, 0)} % más alto: es la cota conservadora.</dd></div>
    </dl></section>
  </div>`;
}
