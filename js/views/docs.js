// Vista Documentación (componentes 2 y 8): modelo de datos, arquitectura, supuestos y uso de IA.
import { EMISSION_FACTOR } from '../data.js';

const ENTITIES = [
  ['SEDE', 40, 30, ['id', 'nombre']],
  ['EDIFICIO', 40, 170, ['id', 'sede_id', 'nombre']],
  ['FICHA', 290, 110, ['id', 'edificio_id', 'periodo_id', 'sector', 'origen_superficie', 'superficie_m2', 'meses, h/día, días', 'T balance, L, η, PCI, COP', 'clima, fuente, notas']],
  ['AMBIENTE', 40, 320, ['id', 'ficha_id', 'largo_m', 'ancho_m']],
  ['PERIODO', 290, 20, ['id', 'año']],
  ['FACTOR', 560, 20, ['id', 'valor', 'unidad', 'fuente', 'vigencia']],
  ['RESULTADO', 560, 200, ['id', 'ficha_id', 'factor_id', 'grados_hora', 'kWh útil / gas', 'm3, kg CO2e']],
  ['RESULTADO_MES', 560, 380, ['resultado_id', 'mes', 'días, horas', 'T ext, K·h', 'm3, kg CO2e']],
];

function erDiagram() {
  const box = ([name, x, y, attrs]) => {
    const h = 32 + attrs.length * 17;
    return `<g><rect x="${x}" y="${y}" width="190" height="${h}" rx="6" class="er-box"/><rect x="${x}" y="${y}" width="190" height="24" rx="6" class="er-head"/>
      <text x="${x + 10}" y="${y + 16}" class="er-title">${name}</text>
      ${attrs.map((a, i) => `<text x="${x + 10}" y="${y + 41 + i * 17}" class="er-attr">${a}</text>`).join('')}</g>`;
  };
  const line = (x1, y1, x2, y2, label) => `<path d="M${x1},${y1} L${x2},${y2}" class="er-line"/><text x="${(x1 + x2) / 2 + 6}" y="${(y1 + y2) / 2 + (Math.abs(y2 - y1) < 30 ? -7 : 4)}" class="er-label">${label}</text>`;
  return `<svg viewBox="0 0 780 510" role="img" aria-label="Diagrama entidad-relación del módulo">
    ${line(135, 96, 135, 170, '1 : N')}${line(230, 200, 290, 200, '1 : N')}${line(385, 86, 385, 110, '1 : N')}
    ${line(290, 260, 230, 340, '1 : N')}${line(480, 240, 560, 250, '1 : 1')}${line(655, 137, 655, 200, '1 : N')}${line(655, 334, 655, 380, '1 : N')}
    ${ENTITIES.map(box).join('')}</svg>`;
}

export function renderDocs() {
  return `
  <header class="page-head"><div><p class="eyebrow">Componentes 2 y 8 · Modelo de datos y documentación</p><h1>Documentación técnica</h1>
    <p class="lede">Cómo está armado el módulo, qué guarda cada entidad y qué supuestos sostienen los números.</p></div></header>
  <section class="panel"><h2>Diagrama entidad-relación</h2><div class="er">${erDiagram()}</div>
    <p class="note">En el navegador, una ficha guarda su sede, edificio, año y ambientes dentro del mismo objeto; el resultado se recalcula siempre desde las entradas y conserva el factor aplicado. El archivo de intercambio JSON expone estas entidades con sus identificadores.</p></section>
  <section class="panel"><h2>Diccionario de datos</h2><div class="table-wrap"><table>
    <thead><tr><th>Entidad</th><th>Atributo</th><th>Tipo</th><th>Regla</th></tr></thead><tbody>
    <tr><td rowspan="2">Sede / Edificio</td><td>nombre</td><td>texto ≤ 80</td><td>Obligatorio</td></tr>
    <tr><td>sede_id</td><td>referencia</td><td>Cada edificio pertenece a una sede</td></tr>
    <tr><td>Período</td><td>año</td><td>entero</td><td>2020–2035; periodicidad anual</td></tr>
    <tr><td rowspan="9">Ficha</td><td>sector</td><td>texto ≤ 80</td><td>Único por edificio y año</td></tr>
    <tr><td>origen_superficie</td><td>enumerado</td><td>publicada · hipotética · suma de ambientes</td></tr>
    <tr><td>superficie_m2</td><td>decimal</td><td>1–100.000; si hay ambientes, es su suma</td></tr>
    <tr><td>meses</td><td>lista de enteros</td><td>1–12, al menos uno</td></tr>
    <tr><td>horas_dia · dias_semana</td><td>decimal · entero</td><td>1–24 · 5, 6 o 7</td></tr>
    <tr><td>t_balance</td><td>decimal °C</td><td>10–24</td></tr>
    <tr><td>perdidas_L · rendimiento · PCI</td><td>decimal</td><td>0,2–10 W/(m²·K) · 40–110 % · 8–12 kWh/m³</td></tr>
    <tr><td>cop_bomba · clima</td><td>decimal · enumerado</td><td>1,5–6 · típico, frío o templado</td></tr>
    <tr><td>fuente · notas</td><td>texto</td><td>≤ 300 · ≤ 600 caracteres</td></tr>
    <tr><td>Ambiente</td><td>largo_m · ancho_m</td><td>decimal</td><td>0,5–200 m por lado</td></tr>
    <tr><td>Factor</td><td>valor · unidad</td><td>decimal · texto</td><td>${EMISSION_FACTOR.value} ${EMISSION_FACTOR.unit}</td></tr>
    <tr><td>Resultado</td><td>grados_hora · kWh · m³ · kg CO₂e</td><td>decimal</td><td>Calculado, no editable</td></tr>
    <tr><td>Resultado mensual</td><td>mes · días · horas · T ext · K·h</td><td>decimal</td><td>Uno por mes de la temporada</td></tr>
    </tbody></table></div></section>
  <div class="grid-2">
    <section class="panel"><h2>Arquitectura</h2><div class="arch">
      <span>Vistas HTML + CSS</span><b>↓</b><span>app.js · navegación y eventos</span><b>↓</b>
      <span>calc.js · validation.js<br><small>funciones puras, con pruebas</small></span><b>↓</b>
      <span>store.js · localStorage<br><small>repositorio de fichas</small></span><b>↔</b><span>api.js · API compartida<br><small>consulta bajo demanda, caché 24 h</small></span></div>
      <p class="note">HTML, CSS y JavaScript sin frameworks ni dependencias. Sin fuentes tipográficas remotas ni imágenes: los gráficos son SVG generados en el navegador. La página completa pesa menos de 100 kB.</p></section>
    <section class="panel"><h2>Supuestos del escenario</h2><ul class="bullets">
      <li>No hay registros públicos de consumo de gas por edificio: todas las fichas son escenarios hipotéticos.</li>
      <li>Las superficies se suponen calefaccionadas en su totalidad.</li>
      <li>Calefacción de mayo a septiembre, 10 h por día hábil, sin descontar feriados.</li>
      <li>Balance a 18 °C y pérdidas globales de 2,0 W/(m²·K) por m² de piso.</li>
      <li>Caldera a gas natural con rendimiento del 85 % sobre PCI.</li>
      <li>Factor energético constante de ${EMISSION_FACTOR.display} para todo el período.</li>
    </ul></section>
    <section class="panel"><h2>Uso de IA y validación</h2><ul class="bullets">
      <li>Usamos IA para revisar la estructura del código, proponer validaciones y redactar textos de ayuda.</li>
      <li>Los cálculos se validan con pruebas automáticas (<code>node --test</code>) que comparan contra cuentas hechas a mano.</li>
      <li>Revisamos cada número del informe con la tabla mensual de la vista Cálculo.</li>
      <li>La IA no aportó datos: superficies, clima, PCI y factor salen de las fuentes citadas.</li>
    </ul></section>
    <section class="panel"><h2>Los ocho componentes del módulo</h2><ol class="bullets">
      <li><a href="#medicion">Modelo de medición</a></li><li><a href="#documentacion">Modelo de datos</a></li>
      <li><a href="#relevamiento">Relevamiento</a></li><li><a href="#carga">Módulo de carga</a></li>
      <li><a href="#api">Integración con la API</a></li><li><a href="#calculo">Módulo de cálculo</a></li>
      <li><a href="#resumen">Visualización</a></li><li><a href="#documentacion">Documentación</a></li></ol></section>
  </div>`;
}
