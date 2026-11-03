# H06 — Vista previa con las tres correcciones integradas

Actualización del 3 de noviembre de 2026. **No se aplicaron cambios en la base. Cero filas aprobadas para aplicar.** Esta revisión sustituye los totales de las vistas previas anteriores, sin borrar su evidencia.

## Resultado principal

La propuesta acumulada conserva **613 diferencias de análisis y 302 cambios de color** respecto de los datos almacenados. No cambia ningún color respecto de la última revisión manual. La mejora es que el código productivo ahora reproduce resultados que antes dependían de selecciones o normalizaciones locales.

| Corrección integrada | Casos contrastados | Clasificables | Permanecen UNKNOWN |
|---|---:|---:|---:|
| Wanama: descripción completa separada del resumen | 23 | 22 | 1 |
| «Rayón viscosa» como una sola fibra | 27 | 24 | 3 |
| «100% en jersey/frisa de algodón» | 39 | 39 | 0 |
| **Total** | **89** | **85** | **4** |

Los cuatro UNKNOWN conservan incertidumbre real: estas correcciones no autorizan elegir entre declaraciones contradictorias ni completar cantidades ausentes. Entre los 22 Wanama continúa la salvedad de Sweater Dakota Winter: la fuente dice microfibra y el diccionario la mapea a poliéster; esa equivalencia sigue pendiente de decisión.

En 65 registros cambia únicamente el texto extraído de composición respecto de la propuesta revisada anterior. Se conserva el texto producido por el flujo actual; no cambian fibras, cantidades, partes ni semáforo. No hay excesos propuestos de cantidades por exterior o forro.

## Qué está automatizado y qué sigue dependiendo de revisión

De las **339 declaraciones clasificables incorporadas en la revisión anterior**, el flujo actual reproduce **193** al procesar las capturas guardadas. Las otras **146** conservan su propuesta manual y su evidencia, pero no se presentan como resultados reproducidos por el código:

| Selección o transcripción todavía necesaria | Casos |
|---|---:|
| Funky Monkeys: otros formatos de declaración de algodón | 86 |
| Reír Enloquecer: selección de declaración en la descripción | 28 |
| One Place World: declaración de bambú recuperada visualmente | 32 |

Los 32 de bambú también tienen pendiente la política de categoría: una etiqueta que dice «bambú» no demuestra el proceso de fabricación. Estas 146 filas son parte de las 339 ya revisadas; no son 146 errores nuevos ni una cola que deba sumarse a todos los demás pendientes.

La reproducción detectó además **9 diferencias de análisis parcial** frente a candidatos pendientes: 4 Reír Enloquecer y 5 Wanama. Todos siguen UNKNOWN tanto antes como ahora. Se guardaron aparte para revisar; no se incorporaron automáticamente sus nuevas extracciones a la propuesta acumulada.

Continúan las dos colas de revisión anteriores:

- **180 alertas históricas de datos/alcance:** 153 prendas con campos vacíos, 1 cuaderno para decidir alcance y 26 casos restantes de cantidades/partes. Incluyen fuentes ya comprobadas cuya salida correcta puede ser UNKNOWN.
- **303 pendientes del lote de propuestas calculadas:** 302 casos no concluyentes más la decisión sobre microfibra. Esta última se superpone con los tratamientos simulados; no son grupos disjuntos respecto de las declaraciones revisadas.

## Cómo se regeneró y verificó

Se compiló la API y se obtuvo una nueva fotografía mediante el CLI de solo lectura. Los **4.662 productos** conservan las mismas huellas de entrada y valores anteriores que la revisión previa; no se detectaron entradas desactualizadas. No se ejecutó scraping con persistencia ni se desplegaron cambios.

El CLI, aplicado únicamente a las descripciones todavía almacenadas, genera **649 diferencias** frente a las 677 de la lectura posterior a H04. Ese resultado no incorpora por sí solo las fuentes recuperadas: en particular, la descripción antigua de Wanama sigue concatenada en la base. Por eso 649 y 613 corresponden a escenarios diferentes y no deben interpretarse como propuestas intercambiables.

Para la propuesta acumulada se ejecutaron los adaptadores y el parser actuales sobre **831 capturas públicas guardadas**, sin nuevas consultas a las tiendas: 806 reproducciones con identidad coincidente, 24 respuestas previamente no disponibles y 1 extracción/identidad pendiente (Camisa Bowling). Para VTEX se usó el estado del producto identificado en el HTML capturado. Esto comprueba el procesamiento de la evidencia guardada, no la disponibilidad actual de las tiendas.

Se verificaron huellas de evidencia y analizador, correspondencia de entradas, conservación del estado anterior, cantidades válidas, igualdad de clasificaciones y ausencia de aprobaciones. El build de API pasó en esta regeneración. No cambió código productivo; las 256 pruebas del backend habían pasado en el último commit de integración y no se volvieron a ejecutar en este paso.

## Artefactos locales

Los archivos con datos por producto permanecen ignorados por Git en `docs/audit/previews/H06-2026-11-03-integradas/`:

- `base/preview.json`: lectura nueva de los datos almacenados.
- `consolidada/preview.json`: propuesta acumulada revalidada, con candidato del texto almacenado y reproducción de fuente por separado.
- `consolidada/REPRODUCIDAS-POR-CODIGO.json`: 193 declaraciones reproducidas.
- `consolidada/SELECCIONES-MANUALES-PENDIENTES.json`: 146 declaraciones que aún requieren selección o transcripción.
- `consolidada/CANDIDATOS-PARA-REVISAR.json`: 9 discrepancias pendientes; todas conservan UNKNOWN.

El generador local `docs/audit/previews/regenerate-h06-integrated.cjs` registra su huella en la propuesta. La versión vigente es `consolidada`; `revisada` fue una salida intermedia de esta comprobación.

## Qué falta para cerrar H06

1. Resolver cómo incorporar de manera reproducible las 146 selecciones/transcripciones y decidir los criterios pendientes de bambú y microfibra.
2. Revisar los 9 candidatos nuevos y cerrar las colas restantes con evidencia o una decisión explícita de conservar UNKNOWN/excluir del alcance. No es necesario inventar una composición para que todos tengan color.
3. Preparar una propuesta aplicable que incluya la descripción sustentada por fuente y retire textos históricos no sustentados, con pruebas del recorrido completo. Esta vista previa todavía no es una migración aprobada.
4. Desplegar el código corregido también en los procesos de scraping; después de revisar y autorizar la propuesta, aplicar con respaldo, comprobación de entradas vigentes y validación posterior. **Este paso no se ejecutó.**
