# CampusCO₂ · Combustibles y energía térmica

Módulo frontend para estimar la huella de carbono de la calefacción a gas natural en la UTN Facultad Regional Córdoba.
Green Software · Ingeniería en Sistemas de Información · Curso 4K4 · 2026 · Grupo 2.

**Sitio:** https://martincarrizo09.github.io/campusco2-grupo2/

## Qué hace

| Componente | Dónde está |
|---|---|
| 1. Modelo de medición | Vista **Medición**: alcance 1, periodicidad anual, variables, unidades y método de grados-hora |
| 2. Modelo de datos | Vista **Documentación**: diagrama entidad-relación y diccionario de datos |
| 3. Relevamiento | Vista **Relevamiento**: matriz de datos, fuentes, responsables, calidad y limitaciones |
| 4. Módulo de carga | Vistas **Fichas** y **Carga**: alta, edición, eliminación, validaciones, carga por ambientes |
| 5. Integración con la API | Vista **API**: GET a la API central `/api/v1` (catálogos y factor de emisión) y envío de fichas por POST |
| 6. Módulo de cálculo | Vista **Cálculo**: secuencia paso a paso, desglose mensual, sensibilidad y trazabilidad |
| 7. Visualización | Vista **Resumen**: indicadores, evolución mensual, distribución, escenarios, mitigación y trayectoria 2026–2030 |
| 8. Documentación | Vista **Documentación**, este README y `docs/` |

## Método

```
grados-hora   = Σ horas del mes × máx(0; 18 °C − T exterior media SMN)
calor útil    = superficie × 2,0 W/(m²·K) × grados-hora ÷ 1.000      [kWh]
energía gas   = calor útil ÷ 0,85                                     [kWh]
volumen       = energía gas ÷ 9,6529 kWh/m³                           [m³]
emisiones     = energía gas × 0,350 kg CO₂e/kWh                       [kg CO₂e]
```

No hay registros públicos de consumo de gas por edificio, así que las tres fichas iniciales son **escenarios hipotéticos**
(Edificio Maders 540 m², Edificio Central 800 m², LabSis 6 salas de 8,5 × 6 m). Resultado base: **2.045 m³ de gas y 6,91 t CO₂e por año**.

## Ejecutar

Es un sitio estático: HTML, CSS y JavaScript sin dependencias.

```bash
python -m http.server 8000      # y abrir http://localhost:8000
node --test tests/domain.test.js # 18 pruebas del dominio
```

Los módulos ES no cargan con `file://`; hace falta un servidor local o GitHub Pages.

## Estructura

```
index.html            vista única con navegación por hash
css/styles.css        estilos (sin fuentes remotas)
js/data.js            clima SMN, PCI, factor, fichas iniciales y fuentes
js/calc.js            cálculo puro: grados-hora, kWh, m³, kg CO₂e, escenarios, plan 2026–2030
js/validation.js      reglas de validación de una ficha
js/store.js           repositorio sobre localStorage
js/api.js             cliente de la API central (GET reales, POST con adaptador) y archivo de intercambio JSON
api/v1/*.json         API central en versión simulada: universidades, edificios, períodos, dimensiones, unidades, fuentes, factores
js/charts.js          gráficos SVG con tooltip y tabla equivalente
js/views/             una función de render por vista
tests/                pruebas con node:test
docs/capturas/        capturas de escritorio y móvil
```

## Fuentes

- SMN, Estadísticas climatológicas normales 1991–2020, Córdoba Observatorio (p. 296).
- Secretaría de Energía, Balance Energético Nacional: PCI del gas natural 8.300 kcal/m³.
- Factor energético de Argentina actualizado a 2026: 0,350 t CO₂e/MWh.
- UTN FRC, Boletín 103 (07/02/2012).
- IPCC 2006, vol. 2, cap. 2 (control: 56.100 kg CO₂/TJ).
