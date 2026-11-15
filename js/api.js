// Cliente de la API compartida (Carbon Aware WebAPI). Consulta bajo demanda y guarda el resultado
// 24 h para no repetir llamadas (criterio Green Software: no consumir red sin necesidad).
import { EMISSION_FACTOR } from './data.js';
import { readApiLog, writeApiLog } from './store.js';

export const API_BASE = 'https://carbon-aware-api.azurewebsites.net';
const TIMEOUT_MS = 10000;
const CACHE_MS = 24 * 60 * 60 * 1000;

export const ENDPOINTS = Object.freeze([
  { id: 'health', method: 'GET', path: '/health', purpose: 'Estado del servicio' },
  { id: 'locations', method: 'GET', path: '/locations', purpose: 'Regiones con datos de intensidad' },
  { id: 'bylocation', method: 'GET', path: '/emissions/bylocation?location=eastus', purpose: 'Intensidad de carbono de la red (g CO₂e/kWh)' },
  { id: 'average', method: 'GET', path: '/emissions/average-carbon-intensity?location=eastus&startTime=2026-07-01T00:00:00Z&endTime=2026-07-02T00:00:00Z', purpose: 'Intensidad promedio en un período' },
]);

async function probe(endpoint, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = performance.now();
  try {
    const res = await fetchImpl(API_BASE + endpoint.path, { signal: controller.signal, headers: { Accept: 'application/json, text/plain' } });
    const body = (await res.text()).slice(0, 240);
    return { ...endpoint, status: res.status, ok: res.ok, ms: Math.round(performance.now() - started), body };
  } catch (err) {
    const reason = err?.name === 'AbortError' ? `Sin respuesta en ${TIMEOUT_MS / 1000} s` : 'Error de red o bloqueo del navegador';
    return { ...endpoint, status: 0, ok: false, ms: Math.round(performance.now() - started), body: reason };
  } finally {
    clearTimeout(timer);
  }
}

/** Interpreta las respuestas y decide qué factor usa el módulo. */
export function decide(results) {
  const health = results.find((r) => r.id === 'health');
  const dataOk = results.filter((r) => r.id !== 'health' && r.ok);
  const service = health?.ok ? 'en línea' : 'sin respuesta';
  const data = dataOk.length > 0 ? 'con datos' : 'sin datos';
  return Object.freeze({
    service,
    data,
    factorSource: 'local',
    summary: dataOk.length > 0
      ? 'La API devolvió intensidades, pero solo para regiones de Azure (no incluye Argentina) y de electricidad. El módulo mantiene el factor energético de Argentina.'
      : 'La API no entrega datos de emisiones (los endpoints de datos responden con error). El módulo usa el factor energético de Argentina.',
    factor: EMISSION_FACTOR,
  });
}

export async function checkApi({ force = false, fetchImpl = globalThis.fetch.bind(globalThis) } = {}) {
  const cached = readApiLog();
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return { ...cached, cached: true };
  const results = await Promise.all(ENDPOINTS.map((e) => probe(e, fetchImpl)));
  const entry = { at: Date.now(), results, decision: decide(results) };
  writeApiLog(entry);
  return { ...entry, cached: false };
}

/** Paquete de intercambio que se enviaría a una API central con endpoint de carga. */
export function exchangePayload(records, aggregateResult) {
  return {
    schema: 'campusco2.combustibles.v1',
    generatedAt: new Date().toISOString(),
    group: 'Green Software 4K4 2026 · Grupo 2',
    dimension: 'Combustibles y energía térmica',
    scope: 'Alcance 1 (combustión de gas natural en calefacción)',
    period: 'anual',
    factor: EMISSION_FACTOR,
    totals: { m3: aggregateResult.m3, gasKWh: aggregateResult.gasKWh, kgCO2e: aggregateResult.kgCO2e },
    records: aggregateResult.results.map(({ record, result }) => ({
      ...record,
      scenarioType: 'hipotético',
      result: { area: result.area, degreeHours: result.degreeHours, usefulKWh: result.usefulKWh, gasKWh: result.gasKWh, m3: result.m3, kgCO2e: result.kgCO2e },
    })),
    count: records.length,
  };
}
