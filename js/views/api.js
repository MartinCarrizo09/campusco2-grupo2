// Vista API (componente 5): consulta real a la API compartida y decisión sobre el factor.
import { API_BASE, ENDPOINTS } from '../api.js';
import { EMISSION_FACTOR, SOURCES } from '../data.js';
import { esc, fmt } from '../utils.js';

export function renderApi(log) {
  const rows = log ? log.results.map((r) => `<tr>
      <td><code>${esc(r.method)} ${esc(r.path.split('?')[0])}</code><br><small>${esc(r.purpose)}</small></td>
      <td class="num"><span class="tag ${r.ok ? 'ok' : 'warn'}">${r.status || 'sin respuesta'}</span></td>
      <td class="num">${fmt(r.ms, 0)} ms</td>
      <td><code class="body">${esc(r.body)}</code></td></tr>`).join('') : '';
  const when = log ? new Date(log.at).toLocaleString('es-AR') : '';
  return `
  <header class="page-head"><div><p class="eyebrow">Componente 5 · Integración con la API central</p><h1>Consulta a la API compartida</h1>
    <p class="lede">El módulo no tiene API propia: consulta la instancia compartida de la Carbon Aware WebAPI y, según lo que responde, decide qué factor aplicar.</p></div>
    <div class="head-actions"><button class="button" type="button" data-api-check>Consultar ahora</button></div></header>
  <div class="grid-2">
    <section class="panel"><h2>Estado</h2>
      ${log ? `<dl class="kv">
        <div><dt>Última consulta</dt><dd>${esc(when)}${log.cached ? ' <small>(resultado guardado, válido 24 h)</small>' : ''}</dd></div>
        <div><dt>Servicio</dt><dd><span class="tag ${log.decision.service === 'en línea' ? 'ok' : 'warn'}">${esc(log.decision.service)}</span></dd></div>
        <div><dt>Datos de emisiones</dt><dd><span class="tag ${log.decision.data === 'con datos' ? 'ok' : 'warn'}">${esc(log.decision.data)}</span></dd></div>
        <div><dt>Decisión</dt><dd>${esc(log.decision.summary)}</dd></div>
        <div><dt>Factor aplicado</dt><dd><strong>${EMISSION_FACTOR.display}</strong> (${fmt(EMISSION_FACTOR.value, 3)} ${EMISSION_FACTOR.unit})</dd></div>
      </dl>` : '<p class="muted" data-api-status>Consultando la API…</p>'}
    </section>
    <section class="panel"><h2>Qué ofrece la API</h2><ul class="bullets">
      <li>Base: <code>${esc(API_BASE)}</code> · <a href="${esc(SOURCES.api.url)}" target="_blank" rel="noopener">documentación Swagger ↗</a></li>
      <li>Ocho operaciones, todas sobre <b>intensidad de carbono de la red eléctrica</b> por región de Azure y horario (g CO₂e/kWh).</li>
      <li>No incluye regiones de Argentina ni factores de combustión de gas natural.</li>
      <li>No tiene operaciones para recibir datos: los relevamientos y cálculos se entregan con el archivo de intercambio JSON (botón en Fichas).</li>
      <li>Para no repetir tráfico, el resultado de cada consulta se guarda 24 h en el navegador.</li>
    </ul></section>
  </div>
  <section class="panel"><h2>Respuestas de los endpoints</h2>
    ${log ? `<div class="table-wrap"><table><thead><tr><th>Endpoint</th><th class="num">HTTP</th><th class="num">Tiempo</th><th>Respuesta</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : `<ul class="bullets">${ENDPOINTS.map((e) => `<li><code>${esc(e.method)} ${esc(e.path.split('?')[0])}</code> · ${esc(e.purpose)}</li>`).join('')}</ul>`}
  </section>`;
}
