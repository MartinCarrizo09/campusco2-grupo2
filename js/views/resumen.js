// Vista Resumen: indicadores y gráficos (visualización del componente 7).
import { aggregate, reductionPlan } from '../calc.js';
import { CLIMATE_LABELS, EMISSION_FACTOR, MONTHS, SENSITIVITY, TREE_T_CO2_YEAR } from '../data.js';
import { SERIES, compareBars, dataTable, legend, lineChart, shareBars, stackedBars } from '../charts.js';
import { esc, fmt } from '../utils.js';

export function colorFor(records, id) {
  const i = records.findIndex((r) => r.id === id);
  return SERIES[i % SERIES.length];
}

function filtersBar(years, f) {
  const opt = (v, label, cur) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${esc(label)}</option>`;
  return `<form class="filters" data-filters aria-label="Filtros del resumen">
    <label>Año<select name="year">${years.map((y) => opt(y, y, f.year)).join('')}</select></label>
    <label>Clima de referencia<select name="climate">${Object.entries(CLIMATE_LABELS).map(([k, l]) => opt(k, l, f.climate)).join('')}</select></label>
    <label>Pérdidas y rendimiento<select name="sens">${Object.entries(SENSITIVITY).map(([k, s]) => opt(k, `${s.label} · ${fmt(s.lossCoef, 1)} W/(m²·K) · ${s.efficiency} %`, f.sens)).join('')}</select></label>
  </form>`;
}

export function renderResumen(all, f) {
  const years = [...new Set(all.map((r) => r.year))].sort();
  const year = years.includes(Number(f.year)) ? Number(f.year) : years.at(-1);
  const records = all.filter((r) => r.year === year);
  if (records.length === 0) {
    return `<header class="page-head"><h1>Resumen</h1></header><div class="empty"><p>No hay fichas cargadas.</p><a class="button" href="#carga">Cargar una ficha</a></div>`;
  }
  const s = SENSITIVITY[f.sens] ?? SENSITIVITY.base;
  const overrides = { climate: f.climate, lossCoef: s.lossCoef, efficiency: s.efficiency };
  const agg = aggregate(records, overrides);
  const keys = records.map((r) => ({ key: r.id, label: r.building, color: colorFor(all, r.id) }));

  const monthly = stackedBars({
    title: 'Emisiones por mes y sector',
    unit: 'kg CO₂e', keys,
    groups: agg.byMonth.map((m) => ({
      label: MONTHS[m.month - 1],
      parts: m.parts.map((p) => ({ key: p.id, value: p.kgCO2e, tip: `${MONTHS[m.month - 1]} · ${records.find((r) => r.id === p.id).building}: ${fmt(p.kgCO2e, 0)} kg CO₂e` })),
    })),
  });

  const share = shareBars({
    title: 'Distribución de emisiones por sector', unit: 't CO₂e',
    items: agg.results.map(({ record, result }) => ({
      label: `${record.building} · ${record.sector}`, value: result.tCO2e, color: colorFor(all, record.id),
      tip: `${record.building}: ${fmt(result.area, 0)} m², ${fmt(result.m3, 0)} m³, ${fmt(result.tCO2e, 2)} t CO₂e`,
    })),
  });

  const sensItems = Object.values(SENSITIVITY).map((x) => {
    const a = aggregate(records, { climate: f.climate, lossCoef: x.lossCoef, efficiency: x.efficiency });
    return { label: x.label, sub: `${fmt(x.lossCoef, 1)} W · ${x.efficiency} %`, value: a.tCO2e, color: 'var(--series-1)', emphasis: x === s, tip: `Escenario ${x.label.toLowerCase()}: ${fmt(a.m3, 0)} m³ · ${fmt(a.tCO2e, 2)} t CO₂e` };
  });
  const climItems = ['warm', 'mean', 'cold'].map((c) => {
    const a = aggregate(records, { climate: c, lossCoef: s.lossCoef, efficiency: s.efficiency });
    const label = { warm: 'Templado', mean: 'Típico', cold: 'Frío' }[c];
    return { label, sub: 'invierno', value: a.tCO2e, color: 'var(--series-2)', emphasis: c === f.climate, tip: `${CLIMATE_LABELS[c]}: ${fmt(a.m3, 0)} m³ · ${fmt(a.tCO2e, 2)} t CO₂e` };
  });
  const scenarioChart = compareBars({ width: 1040, title: 'Comparación de escenarios', unit: 't CO₂e', digits: 2, items: [...sensItems, ...climItems] });

  const alt = compareBars({
    title: 'Gas natural frente a bomba de calor', unit: 't CO₂e', digits: 2,
    items: [
      { label: 'Gas natural', sub: `η ${s.efficiency} %`, value: agg.tCO2e, color: 'var(--series-2)', tip: `Caldera a gas: ${fmt(agg.gasKWh, 0)} kWh → ${fmt(agg.tCO2e, 2)} t CO₂e` },
      { label: 'Bomba de calor', sub: 'COP 3', value: agg.heatPumpKg / 1000, color: 'var(--series-3)', tip: `Bomba de calor: ${fmt(agg.heatPumpKg / EMISSION_FACTOR.value, 0)} kWh eléctricos → ${fmt(agg.heatPumpKg / 1000, 2)} t CO₂e` },
    ],
  });

  const plan = reductionPlan(records);
  const trajectory = lineChart({
    title: 'Trayectoria del plan de reducción 2026–2030', unit: 't CO₂e', digits: 2,
    points: plan.map((p) => ({ label: String(p.year), value: p.tCO2e, tip: `${p.year} · ${p.label}: ${fmt(p.tCO2e, 2)} t CO₂e` })),
  });
  const reduction = 1 - plan.at(-1).kgCO2e / plan[0].kgCO2e;

  return `
  <header class="page-head">
    <div><p class="eyebrow">Combustibles y energía térmica · Alcance 1 · Período anual ${year}</p>
    <h1>Huella de la calefacción a gas</h1>
    <p class="lede">Tres sectores de Ciudad Universitaria modelados como <strong>escenarios hipotéticos</strong>: no existen registros públicos de consumo de gas por edificio, así que el volumen se estima con superficie, calendario y clima.</p></div>
    <div class="head-actions"><a class="button" href="#carga">Nueva ficha</a><button class="button ghost" type="button" data-export="csv">Exportar CSV</button></div>
  </header>
  ${filtersBar(years, { ...f, year })}
  <section class="kpis" aria-label="Indicadores principales">
    <article class="kpi hero"><span>Emisiones del período</span><strong>${fmt(agg.tCO2e, 2)}<small> t CO₂e</small></strong><p>${fmt(agg.kgCO2e, 0)} kg · factor ${EMISSION_FACTOR.display}</p></article>
    <article class="kpi"><span>Gas natural estimado</span><strong>${fmt(agg.m3, 0)}<small> m³</small></strong><p>${fmt(agg.gasKWh, 0)} kWh de combustible</p></article>
    <article class="kpi"><span>Intensidad por superficie</span><strong>${fmt(agg.intensityKgM2, 2)}<small> kg CO₂e/m²</small></strong><p>${fmt(agg.area, 0)} m² calefaccionados</p></article>
    <article class="kpi"><span>Compensación equivalente</span><strong>${fmt(agg.trees, 1)}<small> árboles</small></strong><p>adultos, a ${fmt(TREE_T_CO2_YEAR, 2)} t CO₂/año cada uno</p></article>
  </section>
  <div class="grid-2">
    <section class="panel chart"><header><h2>Evolución mensual</h2><p>kg CO₂e por mes de calefacción, apilado por sector</p></header>${monthly}${legend(keys)}
      ${dataTable(['Mes', ...records.map((r) => r.building), 'Total kg CO₂e'], agg.byMonth.map((m) => [MONTHS[m.month - 1], ...records.map((r) => fmt(m.parts.find((p) => p.id === r.id)?.kgCO2e ?? 0, 0)), fmt(m.kgCO2e, 0)]))}</section>
    <section class="panel chart"><header><h2>Distribución por sector</h2><p>Participación de cada ficha en el total del año</p></header>${share}
      ${dataTable(['Sector', 'm²', 'm³', 't CO₂e'], agg.results.map(({ record, result }) => [`${record.building} · ${record.sector}`, fmt(result.area, 0), fmt(result.m3, 0), fmt(result.tCO2e, 2)]))}</section>
    <section class="panel chart wide"><header><h2>Comparación de escenarios</h2><p>Azul: pérdidas y rendimiento (bajo, base, alto). Naranja: clima del SMN (invierno templado, típico y frío). La barra resaltada es la selección actual.</p></header>${scenarioChart}
      ${dataTable(['Escenario', 'Detalle', 't CO₂e'], [...sensItems, ...climItems].map((i) => [i.label, i.sub, fmt(i.value, 2)]))}</section>
    <section class="panel chart"><header><h2>Alternativa de mitigación</h2><p>Mismo calor útil entregado con caldera a gas o con bomba de calor eléctrica</p></header>${alt}
      <p class="note">Emisiones evitadas: <strong>${fmt((agg.kgCO2e - agg.heatPumpKg) / 1000, 2)} t CO₂e por año</strong> (${fmt((1 - agg.heatPumpKg / agg.kgCO2e) * 100, 0)} %).</p></section>
    <section class="panel chart"><header><h2>Trayectoria 2026–2030</h2><p>Plan de reducción hipotético sobre la línea base</p></header>${trajectory}
      <p class="note">Reducción acumulada al 2030: <strong>${fmt(reduction * 100, 0)} %</strong>.</p>
      ${dataTable(['Año', 'Medida', 't CO₂e'], plan.map((p) => [p.year, p.label, fmt(p.tCO2e, 2)]))}</section>
  </div>`;
}
