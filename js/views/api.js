// Vista API (componente 5): consultas a la API central y envío de fichas.
import { API_BASE, API_LABEL, ENDPOINTS } from '../api.js';
import { getEmissionFactor } from '../data.js';
import { esc, fmt } from '../utils.js';

const tag = (status) => `<span class="tag ${status >= 200 && status < 300 ? 'ok' : 'warn'}">${status || 'sin respuesta'}</span>`;

export function renderApi(log, outbox) {
  const f = getEmissionFactor();
  const okCount = log ? log.results.filter((r) => r.ok).length : 0;
  const gets = ENDPOINTS.filter((e) => e.method === 'GET');
  const contract = ENDPOINTS.map((e) => `<tr><td><span class="tag ${e.method === 'GET' ? 'ok' : ''}">${e.method}</span></td><td><code>${esc(API_LABEL + e.path)}</code></td><td>${esc(e.purpose)}</td></tr>`).join('');
  const rows = log ? log.results.map((r) => `<tr>
      <td><code>GET ${esc(API_LABEL + r.path)}</code></td><td class="num">${tag(r.status)}</td><td class="num">${fmt(r.ms, 0)} ms</td>
      <td class="num">${fmt(r.count, 0)}</td><td>${esc(r.sample)}</td></tr>`).join('') : '';
  const sent = (outbox ?? []).slice(-12).reverse().map((s) => `<tr>
      <td>${esc(new Date(s.at).toLocaleString('es-AR'))}</td><td>${esc(s.ficha)}</td><td><code>POST ${esc(API_LABEL)}/${esc(s.resource)}</code></td>
      <td class="num">${tag(s.status)}</td><td><code>${esc(s.id)}</code></td></tr>`).join('');
  return `
  <header class="page-head"><div><p class="eyebrow">Componente 5 · Integración con la API central</p><h1>API central de CampusCO₂</h1>
    <p class="lede">El módulo no guarda catálogos propios: le pide a la API central los edificios, los períodos, las unidades y el factor de emisión, y le envía el consumo relevado y las emisiones calculadas de cada ficha.</p></div>
    <div class="head-actions"><button class="button" type="button" data-api-check>Consultar endpoints</button><button class="button ghost" type="button" data-api-send>Enviar fichas a la API</button></div></header>
  <div class="grid-2">
    <section class="panel"><h2>Estado de la conexión</h2>
      ${log ? `<dl class="kv">
        <div><dt>Base</dt><dd><code>${esc(API_BASE)}</code></dd></div>
        <div><dt>Última consulta</dt><dd>${esc(new Date(log.at).toLocaleString('es-AR'))}${log.cached ? ' <small>(guardada, válida 24 h)</small>' : ''}</dd></div>
        <div><dt>Endpoints GET</dt><dd>${tag(okCount === gets.length ? 200 : 0)} ${okCount} de ${gets.length} respondieron</dd></div>
        <div><dt>Factor recibido</dt><dd><strong>${esc(f.display)}</strong> = ${fmt(f.value, 3)} ${esc(f.unit)}<br><small>${esc(f.source)} · se usa en todos los cálculos</small></dd></div>
      </dl>` : '<p class="muted">Consultando la API…</p>'}
    </section>
    <section class="panel"><h2>Contrato</h2><div class="table-wrap"><table>
      <thead><tr><th>Método</th><th>Ruta</th><th>Uso</th></tr></thead><tbody>${contract}</tbody></table></div>
      <p class="note">La API se publica junto al módulo en versión simulada, con las mismas rutas y respuestas JSON. Para conectar el servicio definitivo alcanza con cambiar la URL base en <code>js/api.js</code>.</p></section>
  </div>
  <section class="panel"><h2>Respuestas de los endpoints</h2>
    ${log ? `<div class="table-wrap"><table><thead><tr><th>Endpoint</th><th class="num">HTTP</th><th class="num">Tiempo</th><th class="num">Registros</th><th>Primer registro</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted">Sin consultas todavía.</p>'}
  </section>
  <section class="panel"><h2>Envíos a la API</h2>
    ${sent ? `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Ficha</th><th>Endpoint</th><th class="num">HTTP</th><th>ID asignado</th></tr></thead><tbody>${sent}</tbody></table></div>`
      : '<p class="muted">Todavía no se enviaron fichas. El botón «Enviar fichas a la API» manda, por cada ficha, el dato de actividad y su resultado.</p>'}
    <p class="note">Como el sitio se publica como archivos estáticos, los POST los resuelve un adaptador en el navegador: valida cada cuerpo y responde 201 con el identificador asignado, o 422 si faltan datos, igual que la API central.</p>
  </section>`;
}
