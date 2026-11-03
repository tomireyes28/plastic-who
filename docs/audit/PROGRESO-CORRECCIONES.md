# Correcciones de la auditoría

Los reportes originales conservan la evidencia anterior a las correcciones. Este archivo registra el alcance de cada cambio; corregido en código no significa desplegado ni reprocesado en la base.

## H01 — Scraping fuera de la API pública

- Eliminado el controlador HTTP de scraping.
- Separado el arranque del CLI del módulo HTTP; iniciar la API ya no registra marcas ni carga el pipeline de escritura.
- Conservados los comandos de scraping y el workflow, usando un contexto exclusivo para el CLI.
- Verificación: solicitudes HTTP a ambas rutas anteriores devuelven 404, las rutas de lectura siguen disponibles, el arranque público no hace upserts y el contexto CLI se inicializa con persistencia simulada.
- Pendiente operativo: desplegar la nueva versión. No se ejecutó scraping ni se escribieron datos reales durante esta corrección.

## H02 — Composición basada en la fuente

- Eliminadas las composiciones generadas por nombres, colecciones o tipos de tejido en One Place World, Reír Enloquecer y Funky Monkeys.
- One Place World ahora conserva la descripción del producto o, como alternativa, su metadata de descripción.
- Pruebas con HTML simulado verifican ausencia de porcentajes inventados y conservación de mezclas explícitas en las tres marcas.
- Pendiente: los registros históricos no cambian con este commit; su revisión/reprocesamiento corresponde a H06. La pérdida de secciones del parser se aborda separadamente en H04.

## H03 — Sinónimos específicos antes de palabras genéricas

- «Viscosa de bambú» se reconoce como viscosa semisintética, sin que «bambú» capture primero el texto.
- Los alias se evalúan por longitud y con límites de palabra; se normalizan tildes, mayúsculas y espacios.
- Pruebas de diccionario y de análisis completo cubren ambos órdenes de porcentaje/nombre y otros alias existentes.
- No se redefine aquí la política sobre una declaración que diga solamente «bambú». El histórico sigue pendiente de H06.

## H05 — Política de semáforo y forro

- Decisión del usuario: un exterior que sería verde baja a amarillo si declara fibras sintéticas en el forro. Los rojos no suben a amarillo por tener forro.
- Se mantiene el mínimo de 95% natural del exterior y una tolerancia de hasta 5% de otras fibras, sin una excepción exclusiva para elastano. Se adoptó esta recomendación para expresar un criterio de composición y no una supuesta certificación ambiental.
- Servicio, pruebas, README, guía, modal y etiqueta amarilla incluyen el criterio de forro; los porcentajes del forro no se suman al exterior.
- Pruebas cubren distintos sintéticos, forros naturales/semisintéticos, porcentajes cero, el límite 95/5, rojos y exterior ausente.
- Pendiente: desplegar y reprocesar el histórico en H06. La extracción incompleta y la advertencia cuando falta el exterior corresponden a H04.

## H04 — Extracción, validación e incertidumbre

- Separadas la extracción de líneas técnicas, la segmentación por partes y la asociación de cada porcentaje con su fibra. Los formatos «50% algodón» y «poliéster 50%» pueden coexistir sin reutilizar un porcentaje.
- Conservadas las continuaciones de composición y las secciones de viso/forro/lining en varias líneas, incluido HTML con entidades comunes. Se ignoran scripts, estilos y se detiene la lectura ante cuidados/medidas y otras secciones ajenas.
- Cuellos, ribetes, encajes y otras partes secundarias ya no reemplazan un exterior ausente. Una etiqueta «Composición» dentro del forro no cambia su función.
- Declaraciones parciales o con componentes no identificados quedan sin clasificar; las cantidades negativas, fuera de rango o contradictorias no se normalizan para otorgar un color. Se preservan las fibras parciales válidas y el texto de origen. Se admite un faltante de 0,1 puntos por redondeo, sin inflarlo a 100.
- Los bloques idénticos repetidos por el CMS no se suman dos veces; composiciones completas distintas para una misma sección quedan sin clasificar. Los alias bilingües de la misma fibra no duplican cantidades.
- La advertencia de forro sintético se conserva aunque no haya un exterior clasificable. El redondeo de categorías no introduce un total de 100,1% a partir de fibras válidas.
- El pipeline no cuenta como clasificadas las declaraciones parciales. En la interfaz se usa «sin clasificar» y no se dibuja una barra proporcional completa para ellas.
- Verificación: 118 pruebas aprobadas (51 nuevas), incluida integración del pipeline con Prisma simulado; compilación del backend y tipos de la web correctos. También se inspeccionó localmente el comportamiento sobre el texto `rawComposition` de un build anterior, sin consultar ni escribir en la base; los casos ambiguos o no soportados pueden pasar a UNKNOWN intencionalmente.
- Pendiente: despliegue y revisión/reprocesamiento de datos históricos en H06. Este commit no escribe en Supabase ni promete interpretar todos los formatos posibles.

### H04 — Regresiones detectadas al revisar H06

- Corregida la asociación de porcentajes en mezclas bilingües: los alias equivalentes se agrupan antes de asignar cantidades, tanto en el exterior como en el forro.
- Las declaraciones repetidas después de prosa comercial se extraen sin arrastrar esa prosa y se deduplican. Una descripción intermedia no oculta un forro posterior; cuidados y medidas siguen delimitando la lectura.
- Agregadas 20 pruebas con tres descripciones reales guardadas y variantes de formatos, límites y contradicciones. Las declaraciones parciales, excesivas o contradictorias siguen sin clasificar.
- Verificación: 153 pruebas del backend aprobadas; build de API correcto. No se consultó ni modificó la base para esta corrección.
- La vista previa anterior de H06 queda desactualizada respecto del parser. Se debe verificar la fuente y generar otra propuesta antes de considerar su aplicación.

## H06 — Vista previa lista; aplicación pendiente de revisión

- Agregado un CLI exclusivo de solo lectura, sin importar el módulo de scraping ni ejecutar registros de marcas. PostgreSQL bloquea escrituras dentro de la transacción de lectura.
- La comparación usa la descripción completa guardada, no solo el segmento `rawComposition` que pudo quedar truncado. Conserva antes/después, entrada, fecha esperada y huellas de analizador, destino y datos.
- Los textos con posibles inferencias históricas de One Place World, Reír Enloquecer o Funky Monkeys y los casos sin descripción original requieren revisión de la fuente. La propuesta los deja sin clasificar; no los convierte en declaraciones verificadas.
- Se generan un resumen y un JSON detallado en un directorio nuevo ignorado por Git. No existe `--apply` y no se sobrescriben revisiones anteriores.
- La primera lectura del 3 de noviembre encontró 4.662 productos, 813 cambios propuestos, 367 casos para revisar fuente y 20 totales inválidos actuales, frente a cero en la propuesta. Es una fotografía, no un cambio aplicado.
- Consolidación posterior a H04 y revisión de fuentes: 187 productos con declaración incorporada (145 algodón, 10 viscosa y 32 bambú con categoría pendiente), 153 prendas comprobadas con campos vacíos, 1 cuaderno para revisar alcance y 26 casos de cantidades/alcance aún pendientes. El escenario acumulado conserva 180 alertas de datos/alcance; eso incluye casos ya revisados que deben permanecer UNKNOWN.
- La última vista previa tiene 677 diferencias de análisis: 187 con evidencia recuperada, 26 de fuente/alcance pendientes y 464 propuestas calculadas que aún requieren revisión. Cambian de color 318 productos; no hay excesos propuestos de cantidades por exterior/forro. Cero filas aprobadas para aplicar.
- Resumen consolidado y criterios de cierre en `docs/audit/RESUMEN-FINAL-VISTA-PREVIA-H06.md`. Las selecciones/transcripciones locales todavía deben integrarse a una propuesta reproducible; el CLI continúa siendo exclusivamente de lectura. La limpieza de texto no sustentado y la aplicación con respaldo/validación siguen pendientes.
- Contraste posterior de las 464 propuestas calculadas: nuevas capturas públicas (441 HTTP 200, 23 HTTP 404), revisión prioritaria de 23 pérdidas de color y 20 totales inválidos. Se sustentan 162 tratamientos, con 152 propuestas clasificables adicionales; 303 casos requieren revisión/decisión, incluyendo el mapeo condicionado de microfibra que se superpone con los tratamientos simulados. Los 22 colores recuperados al separar descripción y brief incluyen esa salvedad; Layer Not Sutton I conserva una contradicción real.
- Escenario vigente tras ese contraste: 613 diferencias de análisis y 302 cambios de color; 339 productos con declaración clasificable incorporada (incluidas las salvedades de bambú/microfibra), cero excesos propuestos y cero aprobaciones para aplicar. Las 180 alertas de los casos históricos son una cola independiente. Detalle y próximos pasos en `docs/audit/REVISION-PROPUESTAS-CALCULADAS-H06.md`; no se cambió código productivo ni se consultó/escribió la base en esta revisión.
- Pendiente: revisar la vista previa con el usuario y definir la aplicación con respaldo y comprobación de datos vigentes. No se ha corregido todavía la base real.

### Integración H06 — Descripción principal de Wanama separada del resumen

- El adaptador usa `description` cuando contiene texto y recurre a `brief_description` únicamente si falta la principal o está vacía/en blanco. Los dos campos dejan de concatenarse, incluso si la principal es parcial o no contiene porcentajes.
- El panel independiente de composición se conserva con la descripción seleccionada; una contradicción real entre esas fuentes no se descarta. Se preservan saltos de línea y texto original de la principal.
- Agregadas 34 pruebas: 23 extractos técnicos de las fichas comprobadas, alternativas de descripción vacía, declaraciones incompletas, forro, panel independiente y paso por el pipeline con Prisma simulado. Layer Not Sutton I sigue UNKNOWN con evidencia parcial; el mapeo de microfibra continúa pendiente y no se fija como expectativa de categoría en estas pruebas.
- Verificación: primero se reprodujo la regresión (29 fallos de las 34 pruebas nuevas); con la corrección pasan las 187 pruebas del backend y el build de API. No se consultaron tiendas ni la base, ni se ejecutó persistencia real.
- Pendiente operativo: desplegar el adaptador corregido antes de reparar el histórico. Los datos almacenados y las vistas previas anteriores no se reescriben con este commit. Continúan pendientes las otras selecciones/normalizaciones de H06 y la aplicación controlada.

### Integración H06 — Alias compuesto «rayón viscosa»

- Agregados `rayón viscosa` y `rayon viscosa` como alias de viscosa semisintética. El tokenizador existente evalúa las expresiones largas primero y ahora asigna cada porcentaje a la expresión completa, conservando el texto de origen.
- No se fusionan declaraciones con porcentajes independientes de rayón y viscosa. Las cantidades parciales, excesivas, materiales adicionales no cuantificados y otros formatos ambiguos mantienen la incertidumbre; el forro se analiza separado del exterior.
- Agregadas 24 pruebas con las formas de catálogo 80/20, 96/4, 65/35, mezclas decimales y variantes de orden, tildes, espacios, entidades HTML y saltos de línea. Antes del cambio se reprodujeron 10 fallos en las primeras 19 pruebas.
- Verificación: 211 pruebas del backend aprobadas y build de API correcto. Comprobación adicional sobre 27 textos de fuente guardados: 24 reproducen los análisis completos revisados y 3 permanecen UNKNOWN por otros problemas. No se consultaron tiendas ni la base, ni se ejecutó persistencia real.
- La normalización manual de este alias ya está integrada en código. Falta desplegarla y regenerar la propuesta definitiva con las huellas actualizadas antes de aplicar H06; los escenarios anteriores y el histórico de la base permanecen sin reescribir.

## H07 — Catálogo dinámico, sin fallback implícito

- La portada ahora se renderiza por solicitud. No congela consultas Prisma en el build; la siguiente carga o recarga vuelve a leer la fuente.
- Eliminado el reemplazo automático por productos y marcas de ejemplo ante errores o respuestas vacías. Demo es un modo explícito (`CATALOG_MODE=demo`) con aviso visible.
- La caída de la fuente produce un error genérico y una acción de reintento mediante nueva navegación. Los detalles privados del proveedor no se incluyen en el error público. Una fuente vacía tiene una pantalla propia.
- Agregada la alternativa de servidor `CATALOG_API_URL` cuando no se usa `DATABASE_URL`, manteniendo compatibilidad con la URL anterior, y timeout de 10 segundos para la lectura HTTP.
- Verificación: 13 pruebas web; build y chequeo de tipos correctos. La prueba de producción usa exclusivamente fixtures locales y comprueba cambios sin recompilar, cabecera no-store, error 500, vacío, recuperación y demo explícita. En navegador se verificaron el mensaje de error y la recuperación al pulsar «Volver a intentar».
- El build marca `/` como dinámica y no contiene una portada prerenderizada. No se ejecutaron escrituras en Supabase ni se desplegó la web o el worker remoto.
- Pendiente operativo: desplegar la versión corregida. H06 continúa pendiente de revisión/aplicación; los procesos de scraping remotos deberán usar también el código corregido antes de reparar el histórico para no volver a generar inferencias antiguas.
