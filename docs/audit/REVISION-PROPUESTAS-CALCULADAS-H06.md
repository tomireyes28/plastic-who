# H06 — Contraste de las 464 propuestas calculadas

Actualización del 3 de noviembre de 2026. **No se consultó ni modificó la base. Ninguna fila está aprobada para aplicar.** Se consultaron únicamente las fichas públicas de los productos, guardando nuevas capturas locales: 441 respuestas HTTP 200 y 23 HTTP 404.

Se empezó por 43 prioridades —23 pérdidas de clasificación y 20 totales inválidos, sin superposición— y se extendió el contraste a las 464. La revisión detallada de los prioritarios se complementó con comprobaciones acotadas de identidad, campos del producto, partes y cantidades para el resto. Los casos no concluyentes quedan identificados; no se consideran correctos solo por responder HTTP 200 o sumar 100%.

## Los 23 que pasaron a sin clasificar

**22 recuperan color con las reglas actuales.** El problema comprobado es la concatenación de `description` y `brief_description` de POW: el resumen abreviado viene truncado o con materiales pegados a cuidados/colores, mientras que el campo principal conserva la declaración completa. La vista previa analiza el campo principal por separado y conserva ambos como evidencia.

- Polera America I y Cardigan Ginna también recuperan la continuación de su composición: 80/20 y 90/10, respectivamente, sin inflar los porcentajes antiguos.
- **Layer Not Sutton I sigue UNKNOWN:** la descripción principal contiene dos composiciones incompatibles. No alcanza con quitar el resumen para elegir una de ellas.
- **Sweater Dakota Winter es una excepción condicionada:** la fuente declara 100% microfibra; el diccionario actual lo traduce a poliéster/rojo. Se verificó la declaración, no la equivalencia de material. Entre los 22 hay 21 resoluciones sin esta salvedad y una simulación condicionada por el alias.

La selección de campos está resuelta en el escenario local; su integración y pruebas en el adaptador productivo siguen pendientes. Esta revisión no modificó el parser ni los adaptadores.

## Los 20 totales inválidos

| Resultado | Casos | Conclusión |
|---|---:|---|
| Se separan exterior, forro o partes secundarias y queda una propuesta clasificable | 9 | La suma de partes independientes no era una mezcla única del 200%. |
| Cantidades inválidas confirmadas en la fuente recuperada | 5 | Conservar UNKNOWN; no normalizar 101%/110% ni inventar el porcentaje correcto. |
| Varias telas o subdivisiones sin proporción agregada inequívoca | 5 | Conservar UNKNOWN; falta resolver alcance/representación. |
| Musculosa Ribbed Finni, HTTP 404 | 1 | El histórico suma 101%, pero no se confirma una declaración actual desde una respuesta de error. |

Ejemplos comprobados: Vestido Madeleine Jazmin queda amarillo —seda principal y viso sintético—; Buzo Ying Girls queda rojo, conservando su mezcla 50/50 tanto en principal como en forro; Mini Cala queda rojo con exterior poliéster y forro algodón.

Los cinco excesos confirmados son Remera V Neck Nikki (101%), Vestido Print Celeste Najt (101%), Blazer Corvus (110%), Pantalón Corvus (110%) y Mono Corinne Black (110%). Los cinco casos de alcance son Trench Rufina, Trench Gingham Cattaneo, Capa Black, Vestido Largo Black y Trench Milo. En este último, el forro de mangas y cuerpo no debe sumarse como si ambos fuesen porcentajes de un mismo conjunto.

Encaje y relleno conservan su declaración en el texto y se mantienen separados del principal conforme a las reglas vigentes; esta revisión no redefine esa política.

## Resultado del conjunto de 464

Se sustentan **162 propuestas de cálculo/tratamiento**:

- **152 clasificables** con el diccionario y las reglas actuales: 91 composiciones completas, 22 recuperadas al separar descripción/resumen y 39 declaraciones de confección en algodón.
- **10 que deben permanecer UNKNOWN**: cinco excesos de la fuente, una contradicción y cuatro descripciones sin porcentajes.

Las 39 fichas adicionales de Funky Monkeys declaran confección 100% en jersey/frisa de algodón en el cuerpo de la ficha. Se revisaron sus 17 variantes de frase y se conserva el texto literal. La normalización local `RAYÓN VISCOSA → viscosa` une dos alias que el diccionario ya considera equivalentes, sin sumar dos fibras ni modificar porcentajes. Estas selecciones locales aún requieren integración en el flujo productivo.

**Siguen pendientes 303 casos de este lote: 302 no concluyentes más el mapeo de microfibra.** Este último se superpone con los 162 tratamientos sustentados como simulación; no se suman 162 + 303 como grupos disjuntos.

| Cola de revisión adicional | Casos |
|---|---:|
| Formatos, alias o cantidades parciales | 154 |
| Materiales o alcance del catálogo por revisar | 90 |
| Redacción ambigua «lino / algodón» | 28 |
| Varias partes o representación agregada | 7 |
| Captura HTTP 404 | 23 |
| Mapeo de microfibra | 1 |

Estas etiquetas ordenan el trabajo; no certifican la composición ni autorizan exclusiones automáticas del catálogo. Las 154 de esta tabla son una cola distinta de las 154 fichas sin descripción revisadas anteriormente. UNKNOWN por formato no equivale a ausencia de información de la marca.

## Nueva vista previa acumulada

- **4.662 productos** en el escenario.
- **613 diferencias de análisis**, frente a 677 en el escenario anterior.
- **302 cambios de color** frente a la captura original de la base, frente a 318 anteriormente.
- **339 productos con declaración clasificable incorporada**: 187 previos + 152 de este lote. Persisten las salvedades de 32 bambú y 1 microfibra; no se consideran todos aprobados.
- **Cero excesos propuestos** de cantidades por exterior/forro y cero cambios de estado activo.

| Color | Propuesta acumulada |
|---|---:|
| Verde | 1.289 |
| Amarillo | 813 |
| Rojo | 626 |
| Sin clasificar | 1.934 |

Las **180 alertas anteriores** de los 367 casos históricos siguen como cola independiente. No se deben confundir con las **303 pendientes** de este contraste de las 464 propuestas.

## Validación y siguiente paso

Se comprobaron identidades de las 441 respuestas 200 y huellas de los 464 HTML guardados. En VTEX se extrajo el estado JSON del producto coincidente con el slug, sin ejecutar scripts ni usar recomendaciones. La nueva vista cambia 136 estados de análisis respecto del escenario anterior; las 4.198 filas ajenas al lote quedan exactamente iguales. Se preservaron estados previos, huellas de origen, fechas esperadas y estados activos.

Para avanzar corresponde integrar la selección de campos y las normalizaciones sustentadas con pruebas de regresión; revisar la cola de formatos/materiales/alcance; acordar los mapeos de bambú y microfibra; y regenerar una propuesta definitiva reproducible antes de preparar la aplicación con respaldo y control de versiones. H06 continúa abierto y la base no fue reparada en este paso.

Artefacto vigente: `docs/audit/previews/H06-2026-11-03-calculadas-prioridad/preview.json`. El mismo directorio conserva `REVISION-CALCULADAS-464.md` con el registro de las 464, `batch-review.json` con antes/después, `inspected-sources.json` con campos de producto y `PENDIENTES-CALCULADAS.json` con la cola restante y su evidencia.
