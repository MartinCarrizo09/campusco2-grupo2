// Cálculo puro (sin DOM ni almacenamiento): grados-hora → calor útil → energía de gas → m³ → kg CO₂e.
import { CLIMATE, EMISSION_FACTOR, IPCC_GAS_KG_PER_KWH, SENSITIVITY, TREE_T_CO2_YEAR } from './data.js';

const WEEKDAY_SETS = Object.freeze({ 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] });

/** Días de uso de un mes (lunes a viernes, lunes a sábado o todos), sin descontar feriados. */
export function usageDays(year, month, daysPerWeek = 5) {
  const allowed = WEEKDAY_SETS[daysPerWeek];
  if (!allowed) throw new Error('Días por semana: 5, 6 o 7.');
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let count = 0;
  for (let d = 1; d <= last; d += 1) {
    if (allowed.includes(new Date(Date.UTC(year, month - 1, d)).getUTCDay())) count += 1;
  }
  return count;
}

export function roomsArea(rooms) {
  return rooms.reduce((sum, r) => sum + r.length * r.width, 0);
}

export function effectiveArea(record) {
  return record.areaOrigin === 'ambientes' && record.rooms.length > 0 ? roomsArea(record.rooms) : record.area;
}

/** Desglose mensual y totales de una ficha. Devuelve un objeto nuevo; no modifica la ficha. */
export function calculate(record, overrides = {}) {
  const r = { ...record, ...overrides };
  const area = effectiveArea(r);
  const temps = CLIMATE[r.climate] ?? CLIMATE.mean;
  const eta = r.efficiency / 100;
  const factor = EMISSION_FACTOR.value;

  const monthly = [...r.months].sort((a, b) => a - b).map((month) => {
    const days = usageDays(r.year, month, r.daysPerWeek);
    const hours = days * r.hoursPerDay;
    const outdoor = temps[month - 1];
    const deltaT = Math.max(0, r.balanceTemp - outdoor);
    const degreeHours = hours * deltaT;
    const usefulKWh = (area * r.lossCoef * degreeHours) / 1000;
    const gasKWh = usefulKWh / eta;
    return Object.freeze({
      month, days, hours, outdoor, deltaT, degreeHours, usefulKWh, gasKWh,
      m3: gasKWh / r.pci,
      kgCO2e: gasKWh * factor,
    });
  });

  const sum = (key) => monthly.reduce((acc, m) => acc + m[key], 0);
  const usefulKWh = sum('usefulKWh');
  const gasKWh = sum('gasKWh');
  const kgCO2e = gasKWh * factor;
  const heatPumpKWh = usefulKWh / r.heatPumpCop;
  const heatPumpKg = heatPumpKWh * factor;

  return Object.freeze({
    area,
    monthly: Object.freeze(monthly),
    days: sum('days'),
    hours: sum('hours'),
    degreeHours: sum('degreeHours'),
    usefulKWh,
    gasKWh,
    m3: gasKWh / r.pci,
    kgCO2e,
    tCO2e: kgCO2e / 1000,
    intensityKgM2: area > 0 ? kgCO2e / area : 0,
    trees: kgCO2e / 1000 / TREE_T_CO2_YEAR,
    factor: EMISSION_FACTOR,
    heatPump: Object.freeze({ cop: r.heatPumpCop, kWh: heatPumpKWh, kgCO2e: heatPumpKg, avoidedKg: kgCO2e - heatPumpKg }),
    ipccControlKg: gasKWh * IPCC_GAS_KG_PER_KWH,
  });
}

/** Escenarios de sensibilidad (pérdidas/rendimiento) y de clima para una ficha. */
export function scenarios(record) {
  const byParams = Object.entries(SENSITIVITY).map(([key, s]) => {
    const res = calculate(record, { lossCoef: s.lossCoef, efficiency: s.efficiency });
    return Object.freeze({ key, label: s.label, lossCoef: s.lossCoef, efficiency: s.efficiency, m3: res.m3, kgCO2e: res.kgCO2e });
  });
  const byClimate = ['warm', 'mean', 'cold'].map((climate) => {
    const res = calculate(record, { climate });
    return Object.freeze({ key: climate, m3: res.m3, kgCO2e: res.kgCO2e, degreeHours: res.degreeHours });
  });
  return Object.freeze({ byParams: Object.freeze(byParams), byClimate: Object.freeze(byClimate) });
}

/** Totales de un conjunto de fichas, con desglose por mes y por ficha. */
export function aggregate(records, overrides = {}) {
  const results = records.map((rec) => Object.freeze({ record: rec, result: calculate(rec, overrides) }));
  const byMonth = new Map();
  for (const { record, result } of results) {
    for (const m of result.monthly) {
      const prev = byMonth.get(m.month) ?? { month: m.month, kgCO2e: 0, m3: 0, parts: [] };
      byMonth.set(m.month, { ...prev, kgCO2e: prev.kgCO2e + m.kgCO2e, m3: prev.m3 + m.m3, parts: [...prev.parts, { id: record.id, kgCO2e: m.kgCO2e }] });
    }
  }
  const total = (key) => results.reduce((acc, x) => acc + x.result[key], 0);
  const area = total('area');
  const kgCO2e = total('kgCO2e');
  return Object.freeze({
    results: Object.freeze(results),
    byMonth: Object.freeze([...byMonth.values()].sort((a, b) => a.month - b.month)),
    area,
    m3: total('m3'),
    gasKWh: total('gasKWh'),
    usefulKWh: total('usefulKWh'),
    kgCO2e,
    tCO2e: kgCO2e / 1000,
    heatPumpKg: results.reduce((acc, x) => acc + x.result.heatPump.kgCO2e, 0),
    intensityKgM2: area > 0 ? kgCO2e / area : 0,
    trees: kgCO2e / 1000 / TREE_T_CO2_YEAR,
  });
}

/**
 * Trayectoria 2026–2030 de un plan de reducción hipotético:
 * 2027 gestión de horarios y termostato; 2028–2030 reemplazo progresivo por bomba de calor.
 */
export function reductionPlan(records) {
  const sorted = [...records].sort((a, b) => calculate(b).kgCO2e - calculate(a).kgCO2e);
  const managed = { hoursPerDay: 9, balanceTemp: 17 };
  const steps = [
    { year: 2026, label: 'Línea base', converted: 0, managed: false },
    { year: 2027, label: 'Horario 9 h y termostato a 17 °C', converted: 0, managed: true },
    { year: 2028, label: `Bomba de calor en ${sorted[0]?.building ?? '—'}`, converted: 1, managed: true },
    { year: 2029, label: `Bomba de calor en ${sorted[1]?.building ?? '—'}`, converted: 2, managed: true },
    { year: 2030, label: `Bomba de calor en ${sorted.slice(2).map((r) => r.building).join(', ') || '—'}`, converted: sorted.length, managed: true },
  ];
  return Object.freeze(steps.map((step) => {
    const kg = sorted.reduce((acc, rec, i) => {
      const res = calculate(rec, step.managed ? managed : {});
      return acc + (i < step.converted ? res.heatPump.kgCO2e : res.kgCO2e);
    }, 0);
    return Object.freeze({ ...step, kgCO2e: kg, tCO2e: kg / 1000 });
  }));
}
