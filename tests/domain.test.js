import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, calculate, reductionPlan, roomsArea, scenarios, usageDays } from '../js/calc.js';
import { EMISSION_FACTOR, PCI_GAS_KWH_M3, SEED_RECORDS } from '../js/data.js';
import { validateRecord } from '../js/validation.js';
import { createRepository } from '../js/store.js';
import { checkApi, exchangePayload, loadFactor, sendRecords, simulatePost } from '../js/api.js';
import { readFileSync } from 'node:fs';
import { getEmissionFactor, setEmissionFactor } from '../js/data.js';
import { csvCell } from '../js/utils.js';

const maders = SEED_RECORDS.find((r) => r.id === 'maders-2p-2026');
const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('cuenta días hábiles de 2026 (lunes a viernes, sin feriados)', () => {
  assert.deepEqual([5, 6, 7, 8, 9].map((m) => usageDays(2026, m, 5)), [21, 22, 23, 21, 22]);
  assert.equal(usageDays(2026, 7, 7), 31);
  assert.throws(() => usageDays(2026, 7, 4));
});

test('reproduce a mano el caso Maders', () => {
  const r = calculate(maders);
  // Julio: 23 días × 10 h = 230 h; 18 − 10,8 = 7,2 °C → 1.656 K·h
  const july = r.monthly.find((m) => m.month === 7);
  assert.equal(july.hours, 230);
  close(july.degreeHours, 1656, 1e-9);
  close(r.degreeHours, 5098, 1e-9);
  close(r.usefulKWh, 540 * 2 * 5098 / 1000, 1e-9); // 5.505,84 kWh
  close(r.gasKWh, 5505.84 / 0.85, 1e-6);
  close(r.m3, 5505.84 / 0.85 / PCI_GAS_KWH_M3, 1e-6);
  close(r.kgCO2e, (5505.84 / 0.85) * 0.35, 1e-6); // ≈ 2.267,1 kg
  close(r.tCO2e, r.kgCO2e / 1000);
  close(PCI_GAS_KWH_M3, 9.6529, 1e-4);
});

test('el factor adoptado es 0,350 t CO₂e/MWh', () => {
  assert.equal(EMISSION_FACTOR.value, 0.35);
});

test('suma ambientes para LabSis (6 × 8,5 × 6 = 306 m²)', () => {
  const lab = SEED_RECORDS.find((r) => r.id === 'labsis-2026');
  close(roomsArea(lab.rooms), 306);
  assert.equal(calculate(lab).area, 306);
});

test('meses sobre la temperatura de balance no suman grados-hora', () => {
  const r = calculate({ ...maders, months: [1, 10, 12] });
  assert.equal(r.degreeHours, 0);
  assert.equal(r.kgCO2e, 0);
});

test('escenarios ordenados: bajo < base < alto y templado < típico < frío', () => {
  const s = scenarios(maders);
  assert.ok(s.byParams[0].kgCO2e < s.byParams[1].kgCO2e && s.byParams[1].kgCO2e < s.byParams[2].kgCO2e);
  assert.ok(s.byClimate[0].kgCO2e < s.byClimate[1].kgCO2e && s.byClimate[1].kgCO2e < s.byClimate[2].kgCO2e);
});

test('agrega fichas y el desglose mensual coincide con el total', () => {
  const agg = aggregate(SEED_RECORDS);
  const byMonth = agg.byMonth.reduce((a, m) => a + m.kgCO2e, 0);
  close(byMonth, agg.kgCO2e, 1e-6);
  close(agg.area, 540 + 800 + 306);
});

test('bomba de calor COP 3 emite un tercio del calor útil × factor', () => {
  const r = calculate(maders);
  close(r.heatPump.kgCO2e, (5505.84 / 3) * 0.35, 1e-6);
  assert.ok(r.heatPump.avoidedKg > 0);
});

test('el plan de reducción baja cada año', () => {
  const plan = reductionPlan(SEED_RECORDS);
  assert.equal(plan.length, 5);
  for (let i = 1; i < plan.length; i += 1) assert.ok(plan[i].kgCO2e < plan[i - 1].kgCO2e);
});

test('el cálculo no modifica la ficha original', () => {
  const copy = structuredClone(maders);
  calculate(maders, { lossCoef: 9 });
  assert.deepEqual(structuredClone(maders), copy);
});

test('valida entradas inválidas', () => {
  const bad = { ...maders, id: 'x', building: '', area: -5, months: [], hoursPerDay: 30, efficiency: 0, year: 2026.5, notes: 'a'.repeat(700) };
  const v = validateRecord(bad, []);
  assert.equal(v.ok, false);
  for (const k of ['building', 'area', 'months', 'hoursPerDay', 'efficiency', 'year', 'notes']) assert.ok(v.errors[k], k);
  assert.equal(validateRecord(maders, []).ok, true);
});

test('rechaza fichas duplicadas de edificio, sector y año', () => {
  const v = validateRecord({ ...maders, id: 'otra' }, [maders]);
  assert.ok(v.errors.sector);
});

test('repositorio: guardar, editar, eliminar y restablecer', () => {
  const mem = new Map();
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const repo = createRepository(storage);
  assert.equal(repo.findAll().length, 3);
  repo.save({ ...maders, id: 'nueva', sector: 'Planta baja' });
  assert.equal(createRepository(storage).findAll().length, 4);
  repo.save({ ...maders, id: 'nueva', sector: 'Primer piso' });
  assert.equal(repo.findById('nueva').sector, 'Primer piso');
  repo.remove('nueva');
  assert.equal(repo.findAll().length, 3);
  mem.set('campusco2.g2.fichas.v2', '{roto');
  const recovered = createRepository(storage);
  assert.equal(recovered.findAll().length, 3);
  assert.match(recovered.warning, /dañados/);
});

// fetch de prueba que sirve los JSON reales de api/v1
const apiFetch = async (url) => {
  const file = new URL(url).pathname.split('/').pop();
  try {
    const body = readFileSync(new URL(`../api/v1/${file}`, import.meta.url), 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(body) };
  } catch {
    return { ok: false, status: 404, json: async () => ({}) };
  }
};

test('API central: los 7 endpoints GET responden con datos', async () => {
  const res = await checkApi({ force: true, fetchImpl: apiFetch });
  assert.equal(res.results.length, 7);
  assert.ok(res.results.every((r) => r.ok && r.status === 200 && r.count > 0));
  assert.equal(res.factor.value, 0.35);
});

test('API central: el factor que devuelve la API es el que usa el cálculo', async () => {
  const f = await loadFactor(apiFetch);
  assert.equal(f.id, 'fe-energia-ar-2026');
  assert.equal(getEmissionFactor().value, 0.35);
  assert.match(getEmissionFactor().source, /API central/);
  setEmissionFactor({ value: 0.5 });
  close(calculate(maders).kgCO2e, (5505.84 / 0.85) * 0.5, 1e-6);
  setEmissionFactor({ value: 0.35 });
});

test('API central: el envío devuelve 201 por dato de actividad y por resultado', () => {
  const sent = sendRecords(aggregate(SEED_RECORDS), getEmissionFactor());
  assert.equal(sent.length, 6);
  assert.ok(sent.every((s) => s.status === 201 && /^(act|res)-\d{4}$/.test(s.id)));
  const bad = simulatePost('datos-actividad', { fichaId: 'x', cantidad: -1 }, 1);
  assert.equal(bad.status, 422);
  assert.ok(bad.body.faltan.includes('edificio'));
  assert.ok(bad.body.invalidos.includes('cantidad'));
});

test('archivo de intercambio incluye totales, factor y fichas', () => {
  const p = exchangePayload(SEED_RECORDS, aggregate(SEED_RECORDS), getEmissionFactor());
  assert.equal(p.records.length, 3);
  assert.equal(p.factor.value, 0.35);
  assert.ok(p.totals.kgCO2e > 0);
});

test('CSV neutraliza fórmulas y escapa separadores', () => {
  assert.equal(csvCell('=SUMA(A1)'), "'=SUMA(A1)");
  assert.equal(csvCell('a;b'), '"a;b"');
  assert.equal(csvCell(-5), '-5');
});
