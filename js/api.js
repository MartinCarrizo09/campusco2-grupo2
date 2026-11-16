// Cliente de la API central de CampusCO₂.
// GET: consultas HTTP reales a /api/v1 (catálogos JSON publicados junto al módulo, versión simulada de la API central).
// POST: el sitio es estático, así que un adaptador valida el cuerpo y devuelve la respuesta 201 con el formato de la API.
import { setEmissionFactor } from './data.js';
import { readApiLog, readOutbox, writeApiLog, writeOutbox } from './store.js';

const ORIGIN = typeof location !== 'undefined' ? location.href : 'http://localhost/';
export const API_BASE = new URL('api/v1/', ORIGIN).href;
export const API_LABEL = '/api/v1';
const TIMEOUT_MS = 8000;
const CACHE_MS = 24 * 60 * 60 * 1000;
export const FACTOR_ID = 'fe-energia-ar-2026';

export const ENDPOINTS = Object.freeze([
  { id: 'universidades', method: 'GET', path: '/universidades', purpose: 'Universidades del inventario' },
  { id: 'edificios', method: 'GET', path: '/edificios', purpose: 'Edificios por universidad' },
  { id: 'periodos', method: 'GET', path: '/periodos', purpose: 'Períodos anuales' },
  { id: 'dimensiones', method: 'GET', path: '/dimensiones', purpose: 'Dimensiones y alcance de cada una' },
  { id: 'unidades', method: 'GET', path: '/unidades', purpose: 'Unidades y conversiones (PCI del gas)' },
  { id: 'fuentes', method: 'GET', path: '/fuentes', purpose: 'Fuentes de datos' },
  { id: 'factores-emision', method: 'GET', path: '/factores-emision', purpose: 'Factores de emisión vigentes' },
  { id: 'datos-actividad', method: 'POST', path: '/datos-actividad', purpose: 'Recibe el consumo relevado por ficha' },
  { id: 'resultados-emisiones', method: 'POST', path: '/resultados-emisiones', purpose: 'Recibe las emisiones calculadas' },
]);

const defaultFetch = (...args) => globalThis.fetch(...args);

/** GET a un recurso de la API. Devuelve { status, ok, ms, data } sin lanzar excepciones. */
export async function getResource(id, fetchImpl = defaultFetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetchImpl(`${API_BASE}${id}.json`, { signal: controller.signal, headers: { Accept: 'application/json' } });
    const body = res.ok ? await res.json() : null;
    return { status: res.status, ok: res.ok && Array.isArray(body?.datos), ms: Date.now() - started, data: body?.datos ?? [] };
  } catch (err) {
    return { status: 0, ok: false, ms: Date.now() - started, data: [], error: err?.name === 'AbortError' ? 'Sin respuesta' : 'Error de red' };
  } finally {
    clearTimeout(timer);
  }
}

/** Consulta todos los endpoints GET y guarda el resultado 24 h (no repetir tráfico sin necesidad). */
export async function checkApi({ force = false, fetchImpl = defaultFetch } = {}) {
  const cached = readApiLog();
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return { ...cached, cached: true };
  const gets = ENDPOINTS.filter((e) => e.method === 'GET');
  const results = await Promise.all(gets.map(async (e) => {
    const r = await getResource(e.id, fetchImpl);
    const first = r.data[0];
    return { ...e, status: r.status, ok: r.ok, ms: r.ms, count: r.data.length, sample: first ? (first.nombre ?? first.descripcion ?? first.id) : (r.error ?? '') };
  }));
  const factor = await loadFactor(fetchImpl);
  const entry = { at: Date.now(), results, factor };
  writeApiLog(entry);
  return { ...entry, cached: false };
}

/** Trae el factor de emisión vigente desde la API y lo aplica al cálculo. */
export async function loadFactor(fetchImpl = defaultFetch) {
  const r = await getResource('factores-emision', fetchImpl);
  const f = r.data.find((x) => x.id === FACTOR_ID);
  if (!f || !Number.isFinite(f.valor) || f.valor <= 0) return null;
  const factor = { id: f.id, value: f.valor, unit: f.unidad.replace('kgCO2e', 'kg CO₂e'), display: f.equivalente, source: `API central · ${f.id}` };
  setEmissionFactor(factor);
  return factor;
}

const REQUIRED = Object.freeze({
  'datos-actividad': ['fichaId', 'universidadId', 'edificio', 'sector', 'periodoId', 'dimensionId', 'cantidad', 'unidad', 'energiaKWh'],
  'resultados-emisiones': ['fichaId', 'datoActividadId', 'factorId', 'kgCO2e'],
});

/** Adaptador de POST: valida el cuerpo y responde como la API central (201 o 422). */
export function simulatePost(resource, body, seq) {
  const missing = (REQUIRED[resource] ?? []).filter((k) => body[k] === undefined || body[k] === null || body[k] === '');
  const invalid = ['cantidad', 'energiaKWh', 'kgCO2e'].filter((k) => k in body && !(Number.isFinite(body[k]) && body[k] >= 0));
  if (missing.length || invalid.length) {
    return { status: 422, ok: false, body: { error: 'Datos inválidos', faltan: missing, invalidos: invalid } };
  }
  const prefix = resource === 'datos-actividad' ? 'act' : 'res';
  return { status: 201, ok: true, body: { id: `${prefix}-${String(seq).padStart(4, '0')}`, recibido: new Date().toISOString(), recurso: resource } };
}

/** Envía cada ficha (dato de actividad + resultado) a la API central. */
export function sendRecords(aggregateResult, factor) {
  const log = readOutbox();
  let seq = log.length + 1;
  const sent = [];
  for (const { record, result } of aggregateResult.results) {
    const activity = {
      fichaId: record.id, universidadId: 'utn-frc', edificio: record.building, sector: record.sector,
      periodoId: String(record.year), dimensionId: 'combustibles', cantidad: Number(result.m3.toFixed(3)), unidad: 'm3',
      energiaKWh: Number(result.gasKWh.toFixed(3)), superficieM2: result.area, escenario: 'hipotético',
    };
    const a = simulatePost('datos-actividad', activity, seq++);
    sent.push({ at: Date.now(), ficha: `${record.building} · ${record.sector}`, resource: 'datos-actividad', status: a.status, id: a.body.id ?? '—' });
    if (!a.ok) continue;
    const res = { fichaId: record.id, datoActividadId: a.body.id, factorId: factor.id ?? FACTOR_ID, kgCO2e: Number(result.kgCO2e.toFixed(3)) };
    const b = simulatePost('resultados-emisiones', res, seq++);
    sent.push({ at: Date.now(), ficha: `${record.building} · ${record.sector}`, resource: 'resultados-emisiones', status: b.status, id: b.body.id ?? '—' });
  }
  const next = [...log, ...sent].slice(-60);
  writeOutbox(next);
  return sent;
}

/** Archivo de intercambio con el mismo contrato (para descargar los datos enviados). */
export function exchangePayload(records, aggregateResult, factor) {
  return {
    schema: 'campusco2.combustibles.v1',
    api: API_LABEL,
    generatedAt: new Date().toISOString(),
    group: 'Green Software 4K4 2026 · Grupo 2',
    universidadId: 'utn-frc',
    dimensionId: 'combustibles',
    scope: 'Alcance 1 (combustión de gas natural en calefacción)',
    period: 'anual',
    factor,
    totals: { m3: aggregateResult.m3, gasKWh: aggregateResult.gasKWh, kgCO2e: aggregateResult.kgCO2e },
    records: aggregateResult.results.map(({ record, result }) => ({
      ...record,
      scenarioType: 'hipotético',
      result: { area: result.area, degreeHours: result.degreeHours, usefulKWh: result.usefulKWh, gasKWh: result.gasKWh, m3: result.m3, kgCO2e: result.kgCO2e },
    })),
    count: records.length,
  };
}
