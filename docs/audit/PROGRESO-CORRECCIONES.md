# Correcciones de la auditoría

Los reportes originales conservan la evidencia anterior a las correcciones. Este archivo registra el alcance de cada cambio; corregido en código no significa desplegado ni reprocesado en la base.

## H01 — Scraping fuera de la API pública

- Eliminado el controlador HTTP de scraping.
- Separado el arranque del CLI del módulo HTTP; iniciar la API ya no registra marcas ni carga el pipeline de escritura.
- Conservados los comandos de scraping y el workflow, usando un contexto exclusivo para el CLI.
- Verificación: solicitudes HTTP a ambas rutas anteriores devuelven 404, las rutas de lectura siguen disponibles, el arranque público no hace upserts y el contexto CLI se inicializa con persistencia simulada.
- Pendiente operativo: desplegar la nueva versión. No se ejecutó scraping ni se escribieron datos reales durante esta corrección.
