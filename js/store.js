// Repositorio de fichas sobre localStorage (findAll, findById, save, remove, reset).
import { SEED_RECORDS } from './data.js';

const KEY = 'campusco2.g2.fichas.v2';
const API_LOG_KEY = 'campusco2.g2.api.v2';
const OUTBOX_KEY = 'campusco2.g2.envios.v1';

function safeStorage() {
  try {
    const s = globalThis.localStorage;
    const probe = '__campusco2__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function createRepository(storage = safeStorage()) {
  let memory = structuredClone(SEED_RECORDS);
  let warning = storage ? '' : 'El navegador no permite guardar datos: los cambios se pierden al recargar.';

  if (storage) {
    try {
      const raw = storage.getItem(KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('formato');
        memory = parsed;
      }
    } catch {
      warning = 'Los datos guardados estaban dañados; se cargaron las fichas iniciales.';
      memory = structuredClone(SEED_RECORDS);
    }
  }

  const persist = (next) => {
    if (storage) storage.setItem(KEY, JSON.stringify(next));
    memory = next;
  };

  return Object.freeze({
    get warning() { return warning; },
    findAll: () => structuredClone(memory),
    findById: (id) => structuredClone(memory.find((r) => r.id === id) ?? null),
    save(record) {
      const exists = memory.some((r) => r.id === record.id);
      const next = exists ? memory.map((r) => (r.id === record.id ? record : r)) : [...memory, record];
      persist(next);
      return structuredClone(record);
    },
    remove(id) { persist(memory.filter((r) => r.id !== id)); },
    reset() { persist(structuredClone(SEED_RECORDS)); },
  });
}

export function readApiLog(storage = safeStorage()) {
  try {
    const raw = storage?.getItem(API_LOG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeApiLog(entry, storage = safeStorage()) {
  try { storage?.setItem(API_LOG_KEY, JSON.stringify(entry)); } catch { /* registro opcional */ }
}

export function readOutbox(storage = safeStorage()) {
  try {
    const raw = storage?.getItem(OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeOutbox(list, storage = safeStorage()) {
  try { storage?.setItem(OUTBOX_KEY, JSON.stringify(list)); } catch { /* bandeja opcional */ }
}

export function newId(building, sector, year) {
  const slug = `${building}-${sector}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `${slug}-${year}-${Date.now().toString(36)}`;
}
