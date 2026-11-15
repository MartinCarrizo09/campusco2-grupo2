// Validación pura de una ficha. Devuelve { ok, errors: { campo: mensaje } }.
import { roomsArea } from './calc.js';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const inRange = (v, min, max) => isNum(v) && v >= min && v <= max;
const text = (v) => typeof v === 'string' && v.trim().length > 0;

export const LIMITS = Object.freeze({
  year: [2020, 2035],
  area: [1, 100000],
  hoursPerDay: [1, 24],
  balanceTemp: [10, 24],
  lossCoef: [0.2, 10],
  efficiency: [40, 110],
  pci: [8, 12],
  heatPumpCop: [1.5, 6],
  roomSide: [0.5, 200],
  notes: 600,
});

export function validateRecord(rec, existing = []) {
  const errors = {};
  if (!text(rec.site)) errors.site = 'Indicá la sede.';
  if (!text(rec.building)) errors.building = 'Indicá el edificio.';
  if (!text(rec.sector)) errors.sector = 'Indicá el sector.';
  if (!Number.isInteger(rec.year) || !inRange(rec.year, ...LIMITS.year)) errors.year = `Año entero entre ${LIMITS.year[0]} y ${LIMITS.year[1]}.`;

  if (!['publicada', 'hipotetica', 'ambientes'].includes(rec.areaOrigin)) errors.areaOrigin = 'Elegí el origen de la superficie.';
  if (rec.areaOrigin === 'ambientes') {
    if (!Array.isArray(rec.rooms) || rec.rooms.length === 0) errors.rooms = 'Agregá al menos un ambiente.';
    else if (rec.rooms.some((r) => !inRange(r.length, ...LIMITS.roomSide) || !inRange(r.width, ...LIMITS.roomSide))) errors.rooms = 'Cada lado debe medir entre 0,5 y 200 m.';
    else if (!inRange(roomsArea(rec.rooms), ...LIMITS.area)) errors.rooms = 'La suma de ambientes está fuera de rango.';
  } else if (!inRange(rec.area, ...LIMITS.area)) errors.area = 'Superficie entre 1 y 100.000 m².';

  if (!Array.isArray(rec.months) || rec.months.length === 0) errors.months = 'Elegí al menos un mes de calefacción.';
  else if (rec.months.some((m) => !Number.isInteger(m) || m < 1 || m > 12)) errors.months = 'Mes inválido.';
  if (![5, 6, 7].includes(rec.daysPerWeek)) errors.daysPerWeek = 'Días por semana: 5, 6 o 7.';
  if (!inRange(rec.hoursPerDay, ...LIMITS.hoursPerDay)) errors.hoursPerDay = 'Horas por día entre 1 y 24.';
  if (!inRange(rec.balanceTemp, ...LIMITS.balanceTemp)) errors.balanceTemp = 'Temperatura de balance entre 10 y 24 °C.';
  if (!inRange(rec.lossCoef, ...LIMITS.lossCoef)) errors.lossCoef = 'Coeficiente de pérdidas entre 0,2 y 10 W/(m²·K).';
  if (!inRange(rec.efficiency, ...LIMITS.efficiency)) errors.efficiency = 'Rendimiento entre 40 % y 110 % (calderas de condensación sobre PCI).';
  if (!inRange(rec.pci, ...LIMITS.pci)) errors.pci = 'PCI entre 8 y 12 kWh/m³.';
  if (!inRange(rec.heatPumpCop, ...LIMITS.heatPumpCop)) errors.heatPumpCop = 'COP entre 1,5 y 6.';
  if (!['mean', 'cold', 'warm'].includes(rec.climate)) errors.climate = 'Elegí el clima de referencia.';
  if (typeof rec.notes === 'string' && rec.notes.length > LIMITS.notes) errors.notes = `Máximo ${LIMITS.notes} caracteres.`;

  const key = (r) => `${r.building.trim().toLowerCase()}|${r.sector.trim().toLowerCase()}|${r.year}`;
  if (!errors.building && !errors.sector && !errors.year && existing.some((r) => r.id !== rec.id && key(r) === key(rec))) {
    errors.sector = 'Ya existe una ficha para ese edificio, sector y año. Editala en lugar de duplicarla.';
  }
  return Object.freeze({ ok: Object.keys(errors).length === 0, errors: Object.freeze(errors) });
}
