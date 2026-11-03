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
