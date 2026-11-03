# H06 — Propuesta conservadora para cerrar la reparación histórica

**Solo vista previa. No se aplicaron escrituras ni se aprobó ninguna fila.**

La nueva lectura PostgreSQL fue de solo lectura. Conserva los mismos 4.662
productos y huellas de entrada de las revisiones anteriores. Se reprodujeron
807 capturas con identidad coincidente y se validaron las 32 imágenes de etiquetas
contra sus huellas guardadas. No se volvieron a consultar las tiendas.

## Qué se propone

| Resultado | Cantidad |
|---|---:|
| Registros con algún cambio propuesto | 752 |
| Diferencias de análisis | 683 |
| Descripciones sustituidas por el texto recuperado o una entrada vacía sustentada | 442 |
| Cambios de color respecto de la base | 377 |
| Totales inválidos actuales / propuestos | 20 / 0 |
| Filas aprobadas para aplicar | 0 |

Los tres tipos de cambio se superponen: no deben sumarse. Solo una descripción
no vacía se vacía sin una extracción de producto disponible; los otros cambios
conservan texto recuperado de fuentes con identidad comprobada o normalizan
entradas ausentes. El respaldo de aplicación conservará los valores anteriores.

De las 339 declaraciones clasificables de la revisión inicial, **306** se
reproducen en el código: 217 verdes, 75 amarillas y 14 rojas. Las **32 etiquetas
de bambú** y **1 declaración de microfibra** pasan a UNKNOWN según el criterio
aprobado por el usuario: una denominación ambigua no identifica el proceso/material.
La transcripción de etiqueta se conserva como evidencia visual, no como una fibra
natural inventada ni una lectura automática de imagen.

Se propone conservar sin clasificar las **180 alertas históricas**, los **302
casos calculados todavía no concluyentes** y los **10 tratamientos de evidencia
insuficiente comprobada**. La decisión permite publicar un archivo limitado y
honesto; no significa que se haya resuelto la extracción de todos esos formatos.
La microfibra deja de contarse como un pendiente adicional de los 303 anteriores.

El conjunto quedaría en 1.223 verdes, 806 amarillos, 622 rojos y 2.011 sin clasificar.
La diferencia con las 613 propuestas anteriores responde a las nuevas integraciones,
al criterio de materiales ambiguos y a publicar UNKNOWN en los pendientes, además
de incluir explícitamente cambios de descripción. Son escenarios distintos.

## Artefactos y reproducción

Los archivos por producto siguen fuera de Git:

- `docs/audit/previews/H06-cierre-portfolio/base/preview.json`: nueva lectura directa.
- `docs/audit/previews/H06-cierre-portfolio/final/preview.json`: propuesta vigente.
- Las salidas `revisada` son intermedias; no deben usarse para aplicar.

`api/scripts/build-reviewed-preview.cjs` reproduce las capturas guardadas sin red,
comprueba identidad, hashes de HTML/imágenes, correspondencia de snapshots,
versiones del analizador y cantidades. Rechaza entradas cambiadas y directorios
existentes. Sus argumentos son la nueva fotografía, revisión anterior, fotografía
histórica vinculada, dos carpetas de evidencia y un directorio de salida nuevo.

## Aplicación preparada, todavía no ejecutada

`api/scripts/apply-reviewed-preview.cjs` es un comando separado que **sí escribe**;
el CLI de vista previa original continúa sin opción de aplicación.
Solo debe ejecutarse después de que el usuario apruebe el hash íntegro del plan.
Exige base y versiones correctas, comprueba todas las entradas bajo bloqueo de
escritura de las tablas afectadas, guarda primero un respaldo de datos de la
aplicación y actualiza únicamente composición, fibras y descripción sustentada.
No cambia precios, stock, nombres, alcance activo ni fechas de scraping.

Dentro de una transacción comprueba cantidades, agregados, forro, color y estado
persistido; un fallo propaga el error para revertir la transacción. Un error al
guardar el respaldo impide la primera escritura. El respaldo cubre Brand/Product/
ProductFiber, no sustituye un backup completo del proveedor ni incluye su esquema,
roles o tablas ajenas. Puede haber una transacción confirmada sin recibo si falla
el disco al guardar ese recibo: se debe inspeccionar la base antes de reintentar.

Se verificaron las barreras con ocho pruebas de Prisma/respaldo simulados y se
validaron sin conexión los 4.662 estados del plan. La aplicación real, el bloqueo
en PostgreSQL real y una restauración de backup todavía no se ejecutaron.

Antes de aplicar: pausar corridas automáticas, disponer de backup del proveedor,
revisar el plan y su hash, aprobar el alcance y definir la recuperación. Después:
verificar lectura pública y desplegar también el scraper corregido para que no
reintroduzca inferencias históricas.
