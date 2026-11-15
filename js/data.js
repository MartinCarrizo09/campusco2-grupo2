// Datos de referencia del módulo CampusCO₂ · Combustibles y energía térmica.
// Todos los valores numéricos citan su origen en SOURCES.

export const SOURCES = Object.freeze({
  smn: {
    id: 'smn',
    label: 'SMN · Estadísticas climatológicas normales 1991–2020, Córdoba Observatorio (p. 296)',
    url: 'https://repositorio.smn.gob.ar/bitstream/handle/20.500.12160/2506/estad%C3%ADsticas_climatol%C3%B3gicas_normales_1991-2020.pdf',
  },
  factor: {
    id: 'factor',
    label: 'Factor energético de Argentina actualizado a 2026: 0,350 t CO₂e/MWh (material de clase Green Software 2026)',
    url: '',
  },
  ben: {
    id: 'ben',
    label: 'Secretaría de Energía · Documento metodológico del Balance Energético Nacional (PCI del gas natural 8.300 kcal/m³)',
    url: 'https://www.energia.gob.ar/contenidos/archivos/Reorganizacion/informacion_del_mercado/publicaciones/energia_en_gral/balances_2016/documento-metodologico-balance-energetico-nacional-final-2015.pdf',
  },
  boletin: {
    id: 'boletin',
    label: 'UTN FRC · Boletín 103 (07/02/2012): calefacción central en el 2.º piso del Edificio Central y ampliación de 540 m² en el 2.º piso de Maders',
    url: 'https://www.frc.utn.edu.ar/prensa/pub/boletin/103-boletinWeb.html',
  },
  ipcc: {
    id: 'ipcc',
    label: 'IPCC 2006 · Directrices, vol. 2, cap. 2, combustión estacionaria (56.100 kg CO₂/TJ de gas natural)',
    url: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf',
  },
  api: {
    id: 'api',
    label: 'Carbon Aware WebAPI (Green Software Foundation), instancia compartida del curso',
    url: 'https://carbon-aware-api.azurewebsites.net/swagger/index.html',
  },
});

export const MONTHS = Object.freeze(['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']);
export const MONTH_NAMES = Object.freeze(['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']);

// Temperatura media mensual (°C), Córdoba Observatorio, normales 1991–2020.
// mean = promedio; cold = mínimo valor promedio (invierno más frío del período);
// warm = máximo valor promedio (invierno más templado del período).
export const CLIMATE = Object.freeze({
  mean: Object.freeze([24.7, 23.2, 21.8, 18.4, 14.7, 11.6, 10.8, 13.5, 16.2, 19.4, 22.1, 24.2]),
  cold: Object.freeze([22.6, 20.7, 19.3, 16.2, 11.6, 9.3, 8.5, 9.4, 14.1, 17.2, 19.2, 22.2]),
  warm: Object.freeze([26.7, 25.8, 23.8, 21.7, 16.9, 13.5, 14.1, 16.1, 19.2, 22.0, 23.9, 27.1]),
});

export const CLIMATE_LABELS = Object.freeze({
  mean: 'Año típico (promedio 1991–2020)',
  cold: 'Invierno frío (mínimos del período)',
  warm: 'Invierno templado (máximos del período)',
});

// 8.300 kcal/m³ × 4,1868 kJ/kcal ÷ 3.600 kJ/kWh
export const PCI_GAS_KWH_M3 = (8300 * 4.1868) / 3600;

// Factor energético adoptado para todas las emisiones del módulo.
export const EMISSION_FACTOR = Object.freeze({
  value: 0.35, // kg CO₂e por kWh (= 0,350 t CO₂e/MWh)
  unit: 'kg CO₂e/kWh',
  display: '0,350 t CO₂e/MWh',
  validFrom: 2025,
  validTo: 2026,
  source: SOURCES.factor.label,
});

// Control de orden de magnitud (no se usa en los totales).
export const IPCC_GAS_KG_PER_KWH = (56100 * 3.6) / 1e6; // 56.100 kg CO₂/TJ → kg CO₂/kWh

// Árbol adulto: 0,34 t CO₂ por año (material de clase).
export const TREE_T_CO2_YEAR = 0.34;

export const DEFAULTS = Object.freeze({
  months: Object.freeze([5, 6, 7, 8, 9]),
  hoursPerDay: 10,
  daysPerWeek: 5,
  balanceTemp: 18,
  lossCoef: 2.0,
  efficiency: 85,
  pci: PCI_GAS_KWH_M3,
  heatPumpCop: 3,
  climate: 'mean',
});

export const SENSITIVITY = Object.freeze({
  low: Object.freeze({ label: 'Bajo', lossCoef: 1.5, efficiency: 90 }),
  base: Object.freeze({ label: 'Base', lossCoef: 2.0, efficiency: 85 }),
  high: Object.freeze({ label: 'Alto', lossCoef: 2.5, efficiency: 80 }),
});

// Fichas iniciales: TODAS son escenarios hipotéticos (no hay mediciones disponibles).
export const SEED_RECORDS = Object.freeze([
  Object.freeze({
    id: 'maders-2p-2026',
    site: 'Ciudad Universitaria',
    building: 'Edificio Maders',
    sector: 'Segundo piso (ampliación)',
    year: 2026,
    areaOrigin: 'publicada',
    rooms: Object.freeze([]),
    area: 540,
    months: DEFAULTS.months,
    hoursPerDay: 10,
    daysPerWeek: 5,
    balanceTemp: 18,
    lossCoef: 2.0,
    efficiency: 85,
    pci: PCI_GAS_KWH_M3,
    climate: 'mean',
    heatPumpCop: 3,
    source: SOURCES.boletin.label,
    notes: 'Superficie construida publicada. Se supone que toda la ampliación se calefacciona con una caldera a gas natural.',
  }),
  Object.freeze({
    id: 'central-2p-2026',
    site: 'Ciudad Universitaria',
    building: 'Edificio Central',
    sector: 'Segundo piso',
    year: 2026,
    areaOrigin: 'hipotetica',
    rooms: Object.freeze([]),
    area: 800,
    months: DEFAULTS.months,
    hoursPerDay: 10,
    daysPerWeek: 5,
    balanceTemp: 18,
    lossCoef: 2.0,
    efficiency: 85,
    pci: PCI_GAS_KWH_M3,
    climate: 'mean',
    heatPumpCop: 3,
    source: SOURCES.boletin.label,
    notes: 'La calefacción central del piso está documentada en 2012; la superficie de 800 m² es una hipótesis del grupo.',
  }),
  Object.freeze({
    id: 'labsis-2026',
    site: 'Ciudad Universitaria',
    building: 'Laboratorio de Sistemas (LabSis)',
    sector: 'Seis salas de práctica',
    year: 2026,
    areaOrigin: 'ambientes',
    rooms: Object.freeze([1, 2, 3, 4, 5, 6].map((n) => Object.freeze({ name: `Sala ${n}`, length: 8.5, width: 6 }))),
    area: 306,
    months: DEFAULTS.months,
    hoursPerDay: 10,
    daysPerWeek: 5,
    balanceTemp: 18,
    lossCoef: 2.0,
    efficiency: 85,
    pci: PCI_GAS_KWH_M3,
    climate: 'mean',
    heatPumpCop: 3,
    source: 'Escenario hipotético armado por el grupo: seis salas tipo de 8,5 × 6 m.',
    notes: 'Medidas tipo supuestas para mostrar la carga por ambientes; no provienen de un plano.',
  }),
]);

export const AREA_ORIGINS = Object.freeze({
  publicada: 'Superficie publicada (supuesta calefaccionada)',
  hipotetica: 'Superficie hipotética del grupo',
  ambientes: 'Suma de ambientes (largo × ancho)',
});
