# Cierre de la primera versión de portfolio

Este registro distingue correcciones locales de operaciones pendientes. No equivale a una auditoría de seguridad completa ni acredita un despliegue.

| Área | Estado |
|---|---|
| H01–H05, H07 | Corregidos en código; despliegue pendiente |
| H06 | Propuesta final preparada: 752 registros, 377 cambios de color, 306 declaraciones reproducidas; materiales ambiguos y pendientes quedan UNKNOWN. Ocho pruebas del procedimiento de aplicación y validación offline de 4.662 estados. Falta aprobación y aplicación real con respaldo; ver H06-PROPUESTA-CONSERVADORA-FINAL.md |
| H13 | Validación estricta de tipos, tamaños, email y motivo; rechazo de inyección en cabeceras; escape de HTML. 28 pruebas web pasan, sin correo real |
| H14 | Corregido: sin credenciales devuelve 503; fallos/rechazos devuelven error; éxito solo tras aceptación del proveedor. Timeout, sin logs del mensaje y formulario conserva texto ante error. Pruebas de proveedores simulados; falta comprobar configuración real sin enviar sin autorización |
| H08 | Implementado: límite real de bytes/tiempo y cuota atómica compartida de 10 intentos/hora y 50/día; 429 al agotarse y 503 si el control falla. 43 pruebas web pasan. Pendiente configurar el almacén compartido en el hosting y verificarlo; no se enviaron correos |
| H09 | Pendiente: comprobar dependencias actuales |
| H10 | Corregido: peticiones a tiendas con timeout de 20 s, CLI con máximo de 12 min y argumentos validados, exclusión por workspace y concurrency en Actions. Cero productos recuperados falla sin renovar lastScrapedAt. 373 pruebas API y build correctos. Puede haber escrituras parciales al interrumpir; un lock tras caída requiere inspección manual. No es un bloqueo distribuido para CLIs en hosts independientes |
| H11 | Corregido como archivo de consultas parciales: aviso de precios/stock cambiantes y ausencia de garantía de revisión semanal completa; fechas de corridas por marca, sin fecha inventada. Advierte si hay más productos informados que cargados (mínimo H15). Pruebas de fecha ausente/inválida y selección limitada |
| H12 | Corregido: UNKNOWN funciona en la API; consultas inválidas se rechazan. El helper web aplica marca, fibra exterior, semáforo, categoría y búsqueda antes del límite, tanto con Prisma como con HTTP. Pruebas de ambas fuentes y controlador |
| H21 | Corregido: tarjetas con quiebre de palabras y distribución adaptable; paneles limitados a 100dvh con scroll interno. Verificado con fixtures largos a 320/375/390 px y 667×300: sin scroll horizontal, cierre en y=33 y ambos paneles dentro del viewport. Tipos correctos; teclado virtual físico no probado |
| H22 | Corregido: diálogo nativo con título asociado, fondo inerte, foco inicial en cierre, ciclo Tab/Shift+Tab, Escape y restauración al disparador. Filtros con aria-pressed y acciones de quitar con nombre. Verificado en ambos modales con navegador y fixtures, incluido 390×844; tipos correctos. Evidencia local: previews/H22-modal-mobile.png |
| Publicación | Pendiente: respaldo, autorización de datos, despliegue y recorrido final |

## Preparación de contacto para Vercel y Hostinger

El usuario confirmó web en Vercel y correo de Hostinger. Se mantiene SMTP como
proveedor configurable mediante variables protegidas. No se copiaron contraseñas
al repositorio ni se envió ningún correo de prueba real.

La cuota puede usar el PostgreSQL existente sin añadir un servicio: se preparó
`api/prisma/operations/contact-quota.sql` y su modelo Prisma, sin ejecutar DDL.
La operación es aditiva, independiente del historial de migraciones ausente y
requiere respaldo, revisión de la tabla inexistente y autorización antes de aplicar.
La reserva usa dos contadores atómicos por hora/día; no guarda datos del mensaje
ni direcciones personales. Sin tabla o ante fallo, se bloquea el envío con 503.
Los contadores vencidos pueden limpiarse en mantenimiento; crecen a lo sumo dos
filas por intervalo y no se eliminó información durante esta preparación.
Las 48 pruebas web pasan con Prisma y proveedores simulados.

Los textos públicos de fuente y las simulaciones no autorizan automáticamente ninguna escritura en producción. Los casos sin evidencia suficiente pueden conservar UNKNOWN o excluirse con una decisión explícita de alcance.
