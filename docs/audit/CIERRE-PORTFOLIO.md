# Cierre de la primera versión de portfolio

Este registro distingue correcciones locales de operaciones pendientes. No equivale a una auditoría de seguridad completa ni acredita un despliegue.

| Área | Estado |
|---|---|
| H01–H05, H07 | Código subido a main; web desplegada y verificada en Vercel. Actions ejecutará el scraper corregido en las próximas corridas; no se lanzó scraping real como prueba |
| H06 | Aplicado con aprobación expresa y respaldo el 03/11/2026: 752 productos reparados, 4.662 validados, cero totales inválidos. Verificación independiente confirma precios/stock/nombres/estados sin cambios. Materiales ambiguos y pendientes permanecen UNKNOWN. Catálogo público verificado; ver H06-APLICACION-2026-11-03.md y PUBLICACION-2026-11-03.md |
| H13 | Validación estricta de tipos, tamaños, email y motivo; rechazo de inyección en cabeceras; escape de HTML. Pruebas unitarias de contenido y comprobación posterior del contacto desplegado |
| H14 | Corregido: 503 sin credenciales, error ante fallos/rechazos, éxito solo tras aceptación. Configuración SMTP real comprobada con una prueba expresamente autorizada: HTTP 200 y recepción confirmada por el usuario |
| H08 | Implementado: límite de bytes/tiempo y cuota atómica de 10 intentos/hora y 50/día; 429 al agotarse y 503 si falla. ContactQuota con RLS; función real comprobada en transacción revertida. Producción admitió la prueba SMTP autorizada y el usuario confirmó recepción |
| H16 | Operación aditiva ContactQuota aplicada con aprobación del usuario, respaldo verificado, RLS habilitado, sin permisos de PUBLIC y acceso del propietario servidor. Sin reset ni cambios destructivos del esquema existente |
| H09 | Consulta renovada, Next 15.5.29 y Multer 2.5.0. Alertas bajan de 30 a 28 entradas (altas 6→4); persisten PostCSS/Prisma y herramientas con alcance documentado en H09-DEPENDENCIAS-CIERRE.md. No se declara auditoría limpia ni migración mayor completada |
| H10 | Corregido: peticiones a tiendas con timeout de 20 s, CLI con máximo de 12 min y argumentos validados, exclusión por workspace y concurrency en Actions. Cero productos recuperados falla sin renovar lastScrapedAt. 373 pruebas API y build correctos. Puede haber escrituras parciales al interrumpir; un lock tras caída requiere inspección manual. No es un bloqueo distribuido para CLIs en hosts independientes |
| H11 | Corregido como archivo de consultas parciales: aviso de precios/stock cambiantes y ausencia de garantía de revisión semanal completa; fechas de corridas por marca, sin fecha inventada. Advierte si hay más productos informados que cargados (mínimo H15). Pruebas de fecha ausente/inválida y selección limitada |
| H12 | Corregido: UNKNOWN funciona en la API; consultas inválidas se rechazan. El helper web aplica marca, fibra exterior, semáforo, categoría y búsqueda antes del límite, tanto con Prisma como con HTTP. Pruebas de ambas fuentes y controlador |
| H19 | Corregido: formato de precios movido a un módulo puro; GarmentCard ya no importa el helper que instancia Prisma. Chequeo de tipos y build final verifican la frontera |
| H20 | Alcance mínimo explícito: archivo de productos de tiendas, incluidos accesorios; categorías de la fuente, sin prometer una taxonomía universal ni exclusión de todo artículo no indumentario. Normalización exhaustiva de nombres/categorías queda como mejora |
| H24 | Corregido: ordena por el precio efectivo mostrado, mantiene ausentes al final y devuelve empate para dos ausentes. No muestra importes negativos/NaN; pruebas con promociones y ambas direcciones |
| H26/H27 | README alineado con extracción de fichas, política propia y archivo parcial. Retiradas promesas de inspección física, certificación, shared totalmente integrado y PWA/offline completos; presentación avanzada puede esperar |
| H17 | Workflow de calidad ejecutado correctamente en GitHub tras el push autorizado: instalación limpia, builds, regresiones API/web y prueba HTTP del build con fixtures, sin scraping real |
| H21 | Corregido: tarjetas con quiebre de palabras y distribución adaptable; paneles limitados a 100dvh con scroll interno. Verificado con fixtures largos a 320/375/390 px y 667×300: sin scroll horizontal, cierre en y=33 y ambos paneles dentro del viewport. Tipos correctos; teclado virtual físico no probado |
| H22 | Corregido: diálogo nativo con título asociado, fondo inerte, foco inicial en cierre, ciclo Tab/Shift+Tab, Escape y restauración al disparador. Filtros con aria-pressed y acciones de quitar con nombre. Verificado en ambos modales con navegador y fixtures, incluido 390×844; tipos correctos. Evidencia local: previews/H22-modal-mobile.png |
| Publicación | Primera versión de portfolio cerrada dentro del alcance declarado: push/CI/despliegue correctos, 4.662 productos reparados publicados y contacto con recepción confirmada. Mejoras y riesgos residuales documentados aparte |

## Preparación de contacto para Vercel y Hostinger

El usuario confirmó web en Vercel y correo de Hostinger. Se mantiene SMTP como
proveedor configurable mediante variables protegidas. No se copiaron contraseñas
al repositorio ni se envió ningún correo de prueba real.

La cuota usa el PostgreSQL existente sin añadir un servicio. La operación aditiva
`api/prisma/operations/contact-quota.sql` se aplicó después de la aprobación
expresa y la verificación del respaldo. La tabla quedó vacía, con RLS habilitado,
sin políticas públicas ni permisos de PUBLIC; el propietario servidor puede usarla.
El script de provisión rechaza una tabla existente para evitar una reaplicación.
La reserva usa dos contadores atómicos por hora/día; no guarda datos del mensaje
ni direcciones personales. Sin tabla o ante fallo, se bloquea el envío con 503.
Los contadores vencidos pueden limpiarse en mantenimiento. La prueba de la función
real reservó diez envíos y limitó el undécimo dentro de una transacción revertida:
no quedó ningún contador ni se envió correo. No se modificaron otras tablas en
la provisión de cuota.

Para Hostinger Email, la referencia oficial indica `smtp.hostinger.com`, SSL y
puerto 465: [configuración oficial](https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/).
Confirmar en el panel qué servicio de correo usa la cuenta (puede variar según
el plan) y copiar sus valores en las variables protegidas de Vercel, sin enviarlos
por chat. La clave no se guarda en Git. El usuario usa Brave; la herramienta
detectó su ventana pero detuvo el control porque no pudo verificar la URL activa
con suficiente confianza. No se intentó eludir ese control. La configuración y
publicación desde Brave requieren intervención manual o un acceso autorizado
por una integración disponible; no hay CLI de Vercel vinculada al proyecto.

## Verificación local anterior a la aplicación

- 383 pruebas del backend y 52 de web aprobadas: 435 en total.
- Builds de API y web correctos. Portada y contacto figuran dinámicos.
- Prueba HTTP del build aprobada: renovación entre solicitudes, fallo honesto,
  vacío, recuperación y demo explícita; exclusivamente fuentes locales simuladas.
- Los 4.662 estados de la propuesta final validan cantidades, agregados, forro
  y coherencia de clasificación sin abrir un cliente de base de datos.
- Trabajo versionado en commits separados por hallazgo. En esa etapa todavía no
  se habían aplicado los datos ni la cuota. Su aplicación posterior está registrada
  arriba y en H06-APLICACION-2026-11-03.md. Después se autorizó y completó el
  push/despliegue; la prueba autorizada de contacto respondió 503 sin enviar correo.

La web y el catálogo están publicados y verificados; CI pasó en GitHub. El bloqueo
SMTP inicial se resolvió configurando las variables y volviendo a desplegar:
HTTP 200 por SMTP y correo recibido, confirmado expresamente por el usuario.
La autorización de aplicación, el respaldo y la cuota también se completaron.
La versión inicial puede presentarse dentro del alcance documentado. Las alertas
residuales de dependencias y mejoras posteriores no se consideran resueltas;
se mantienen en la lista separada para mantenimiento y evolución.

Los textos públicos de fuente y las simulaciones no autorizan automáticamente ninguna escritura en producción. Los casos sin evidencia suficiente pueden conservar UNKNOWN o excluirse con una decisión explícita de alcance.
