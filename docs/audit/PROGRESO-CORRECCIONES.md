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
