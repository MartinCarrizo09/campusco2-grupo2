// Vistas Medición (componente 1) y Relevamiento (componente 3).
import { CLIMATE, getEmissionFactor, MONTHS, PCI_GAS_KWH_M3, SOURCES } from '../data.js';
import { esc, fmt } from '../utils.js';

const link = (s) => (s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>` : esc(s.label));

export function renderMedicion() {
  const climateRows = [4, 5, 6, 7, 8, 9, 10].map((m) => `<tr><td>${MONTHS[m - 1]}</td><td class="num">${fmt(CLIMATE.warm[m - 1], 1)}</td><td class="num">${fmt(CLIMATE.mean[m - 1], 1)}</td><td class="num">${fmt(CLIMATE.cold[m - 1], 1)}</td></tr>`).join('');
  return `
  <header class="page-head"><div><p class="eyebrow">Componente 1 · Modelo de medición</p><h1>Qué medimos y cómo</h1>
    <p class="lede">La dimensión cubre la combustión de gas natural para calefacción en edificios bajo control de la facultad. Son emisiones directas: <strong>alcance 1</strong>.</p></div></header>
  <div class="grid-2">
    <section class="panel"><h2>Definición</h2><dl class="kv">
      <div><dt>Qué se mide</dt><dd>Gas natural quemado en calefacción y sus emisiones de CO₂e.</dd></div>
      <div><dt>Dato de actividad</dt><dd>Volumen de gas (m³) y su energía (kWh sobre PCI).</dd></div>
      <div><dt>Unidad de registro</dt><dd>Sector de un edificio en un año (ficha).</dd></div>
      <div><dt>Periodicidad</dt><dd>Anual. Se calcula mes a mes y se suma la temporada.</dd></div>
      <div><dt>Alcance</dt><dd>Alcance 1: combustión en equipos propios.</dd></div>
      <div><dt>Resultado</dt><dd>kg y t CO₂e por ficha, por mes, por edificio y total.</dd></div>
      <div><dt>Fuera del módulo</dt><dd>Cocina, agua caliente sanitaria, GLP y gasoil de generadores, electricidad comprada (alcance 2) y transporte.</dd></div>
    </dl></section>
    <section class="panel"><h2>Variables y unidades</h2><div class="table-wrap"><table>
      <thead><tr><th>Variable</th><th>Unidad</th><th>Valor base</th></tr></thead><tbody>
      <tr><td>Superficie calefaccionada A</td><td>m²</td><td>por ficha</td></tr>
      <tr><td>Meses de calefacción</td><td>mes</td><td>mayo a septiembre</td></tr>
      <tr><td>Horas de uso</td><td>h/día</td><td>10, lunes a viernes</td></tr>
      <tr><td>Temperatura de balance</td><td>°C</td><td>18</td></tr>
      <tr><td>Temperatura exterior media</td><td>°C</td><td>SMN 1991–2020</td></tr>
      <tr><td>Pérdidas globales L</td><td>W/(m²·K)</td><td>2,0</td></tr>
      <tr><td>Rendimiento de caldera η</td><td>%</td><td>85</td></tr>
      <tr><td>Poder calorífico inferior</td><td>kWh/m³</td><td>${fmt(PCI_GAS_KWH_M3, 4)}</td></tr>
      <tr><td>Factor de emisión</td><td>kg CO₂e/kWh</td><td>${fmt(getEmissionFactor().value, 3)}</td></tr>
      </tbody></table></div></section>
  </div>
  <section class="panel"><h2>Método de grados-hora</h2>
    <ol class="formula">
      <li><b>Horas de uso</b><span>días hábiles del mes × horas por día</span><em>h</em></li>
      <li><b>Grados-hora</b><span>horas × máx(0; T balance − T exterior media)</span><em>K·h</em></li>
      <li><b>Calor útil</b><span>A × L × grados-hora ÷ 1.000</span><em>kWh</em></li>
      <li><b>Energía del gas</b><span>calor útil ÷ η</span><em>kWh</em></li>
      <li><b>Volumen</b><span>energía del gas ÷ PCI</span><em>m³</em></li>
      <li class="total"><b>Emisiones</b><span>energía del gas × ${fmt(getEmissionFactor().value, 3)} kg CO₂e/kWh</span><em>kg CO₂e</em></li>
    </ol>
    <p class="note">El factor ${getEmissionFactor().display} es el factor energético de Argentina para 2025–2026. Lo aplicamos a la energía final que consume la calefacción para expresar todas las dimensiones del campus en la misma base. El factor específico de combustión del gas (IPCC 2006) da 0,202 kg CO₂/kWh; frente a él, nuestro resultado es una cota superior conservadora.</p>
  </section>
  <div class="grid-2">
    <section class="panel"><h2>Clima de referencia</h2><p class="muted">Temperatura media mensual, Córdoba Observatorio (°C).</p><div class="table-wrap"><table>
      <thead><tr><th>Mes</th><th class="num">Invierno templado</th><th class="num">Año típico</th><th class="num">Invierno frío</th></tr></thead><tbody>${climateRows}</tbody></table></div>
      <p class="note">Abril y octubre superan los 18 °C de balance en el año típico: no suman grados-hora.</p></section>
    <section class="panel"><h2>Fuentes</h2><ul class="sources">${Object.values(SOURCES).map((s) => `<li>${link(s)}</li>`).join('')}</ul></section>
  </div>`;
}

export function renderRelevamiento() {
  return `
  <header class="page-head"><div><p class="eyebrow">Componente 3 · Relevamiento</p><h1>Qué datos hacen falta y qué encontramos</h1>
    <p class="lede">Buscamos registros de consumo de gas por edificio y no encontramos fuentes publicadas. Por eso el módulo trabaja con <strong>escenarios hipotéticos</strong> construidos con datos que sí son verificables: superficies publicadas, clima del SMN y parámetros técnicos de referencia.</p></div></header>
  <section class="panel"><h2>Matriz de relevamiento</h2><div class="table-wrap"><table class="matrix">
    <thead><tr><th>Dato que necesita el sistema</th><th>Dónde está en la facultad</th><th>Quién lo proporciona</th><th>Resultado de la búsqueda</th><th>Cómo lo resolvimos</th></tr></thead><tbody>
    <tr><td>Consumo de gas (m³) por período</td><td>Facturas de la distribuidora y medidores</td><td>Administración · Mantenimiento</td><td><span class="tag warn">Sin fuente publicada</span></td><td>Se estima con el método de grados-hora.</td></tr>
    <tr><td>Equipos de calefacción y combustible</td><td>Inventario de instalaciones</td><td>Mantenimiento · Infraestructura</td><td><span class="tag warn">Parcial</span> Calefacción central en el 2.º piso del Edificio Central (2012)</td><td>Se supone caldera a gas con rendimiento del 85 %.</td></tr>
    <tr><td>Superficie calefaccionada por sector</td><td>Planos de obra</td><td>Planeamiento · Infraestructura</td><td><span class="tag ok">Parcial</span> Ampliación de 540 m² en Maders (2012)</td><td>Maders: 540 m². Central: 800 m² hipotéticos. LabSis: 6 salas tipo.</td></tr>
    <tr><td>Horario de uso de los sectores</td><td>Calendario académico y de bedelía</td><td>Bedelía · Secretaría Académica</td><td><span class="tag warn">Sin dato por sector</span></td><td>10 h por día hábil, mayo a septiembre.</td></tr>
    <tr><td>Clima exterior</td><td>Servicio Meteorológico Nacional</td><td>SMN</td><td><span class="tag ok">Disponible</span> Normales 1991–2020</td><td>Promedio, mínimos y máximos mensuales.</td></tr>
    <tr><td>Poder calorífico del gas</td><td>Balance Energético Nacional</td><td>Secretaría de Energía</td><td><span class="tag ok">Disponible</span> 8.300 kcal/m³</td><td>${fmt(PCI_GAS_KWH_M3, 4)} kWh/m³.</td></tr>
    <tr><td>Factor de emisión</td><td>API central · GET /factores-emision</td><td>Asignatura Green Software</td><td><span class="tag ok">Disponible</span> 0,350 t CO₂e/MWh</td><td>Factor energético de Argentina 2026.</td></tr>
    </tbody></table></div></section>
  <div class="grid-2">
    <section class="panel"><h2>Calidad y limitaciones</h2><ul class="bullets">
      <li><b>Exactitud:</b> el resultado es una estimación de ingeniería; sin facturas no se puede contrastar con un consumo medido.</li>
      <li><b>Completitud:</b> se modelan tres sectores; no representan el total de la facultad.</li>
      <li><b>Consistencia:</b> todas las fichas usan el mismo método, clima y factor, así que son comparables entre sí.</li>
      <li><b>Trazabilidad:</b> cada ficha guarda sus entradas, su fuente y el factor aplicado; el cálculo se puede rehacer a mano.</li>
      <li><b>Incertidumbre:</b> el rango de escenarios (pérdidas, rendimiento y clima) muestra cuánto puede variar el resultado.</li>
    </ul></section>
    <section class="panel"><h2>Cómo reemplazar un escenario por un dato real</h2><ol class="bullets">
      <li>Pedir a Administración las facturas de gas del año y separar los medidores por edificio.</li>
      <li>Confirmar con Mantenimiento qué sectores calefacciona cada equipo y su rendimiento.</li>
      <li>Medir o tomar de planos el área de cada ambiente y cargarla como «suma de ambientes».</li>
      <li>Comparar el volumen facturado con el estimado y ajustar el coeficiente de pérdidas.</li>
    </ol></section>
  </div>`;
}
