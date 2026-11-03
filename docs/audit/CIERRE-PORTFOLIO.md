# Cierre de la primera versión de portfolio

Este registro distingue correcciones locales de operaciones pendientes. No equivale a una auditoría de seguridad completa ni acredita un despliegue.

| Área | Estado |
|---|---|
| H01–H05, H07 | Corregidos en código; despliegue pendiente |
| H06 | Criterio conservador de bambú/microfibra aprobado e integrado; propuesta final y aplicación controlada pendientes |
| H13 | Validación estricta de tipos, tamaños, email y motivo; rechazo de inyección en cabeceras; escape de HTML. 28 pruebas web pasan, sin correo real |
| H14 | Corregido: sin credenciales devuelve 503; fallos/rechazos devuelven error; éxito solo tras aceptación del proveedor. Timeout, sin logs del mensaje y formulario conserva texto ante error. Pruebas de proveedores simulados; falta comprobar configuración real sin enviar sin autorización |
| H08 | Implementado: límite real de bytes/tiempo y cuota atómica compartida de 10 intentos/hora y 50/día; 429 al agotarse y 503 si el control falla. 43 pruebas web pasan. Pendiente configurar el almacén compartido en el hosting y verificarlo; no se enviaron correos |
| H09 | Pendiente: comprobar dependencias actuales |
| H10/H11 | Pendiente: límites operativos y frescura |
| H21 | Corregido: tarjetas con quiebre de palabras y distribución adaptable; paneles limitados a 100dvh con scroll interno. Verificado con fixtures largos a 320/375/390 px y 667×300: sin scroll horizontal, cierre en y=33 y ambos paneles dentro del viewport. Tipos correctos; teclado virtual físico no probado |
| H22 | Pendiente: teclado y foco de modales |
| Publicación | Pendiente: respaldo, autorización de datos, despliegue y recorrido final |

Los textos públicos de fuente y las simulaciones no autorizan automáticamente ninguna escritura en producción. Los casos sin evidencia suficiente pueden conservar UNKNOWN o excluirse con una decisión explícita de alcance.
