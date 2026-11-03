# H06 — Aplicación autorizada y verificada

El 3 de noviembre de 2026, el usuario aprobó expresamente aplicar con respaldo
la propuesta de 752 registros y crear la tabla de cuota del contacto.

## Reparación del catálogo

- Plan aprobado: `5271e51a45fa22521d30c9b692086a3ab6fd68fe0bcb17c601566ee03941d949`.
- Entradas, base y versiones del analizador/adaptadores comprobadas antes de escribir.
- Respaldo previo de Brand/Product/ProductFiber guardado bajo bloqueo de escritura,
  con hash SHA-256. Tamaño: 9.413.901 bytes. Es un respaldo de datos de aplicación,
  no un dump de roles, esquema u otras tablas del proveedor.
- Escrituras agrupadas dentro de una transacción serializable, con verificación
  del número de filas y validación posterior antes de confirmar.
- **752 productos actualizados; 4.662 productos validados.**
- Verificación independiente posterior mediante transacción de solo lectura:
  nombres, precios, stock, estados activos, campos de marca y demás campos ajenos
  a composición/descrición/fecha técnica de actualización conservan sus valores.
- Resultado: **1.223 verdes, 806 amarillos, 622 rojos y 2.011 sin clasificar**.
  Cero totales inválidos. Los casos pendientes conservan UNKNOWN; no se afirma
  haber resuelto todos sus formatos ni identificado los materiales ambiguos.

Las actualizaciones de `updatedAt` y los identificadores de fibras reemplazadas
son consecuencias técnicas de la reparación; no se modificó `lastSeenAt` ni la
fecha de scraping de las marcas.

Se agregaron controles de aplicación por lotes a las pruebas: nueve casos del
procedimiento pasan y el build de API es correcto. El cambio a lotes conserva los
valores del plan aprobado y evita cientos de viajes individuales al servidor.

## Evidencia local protegida

En `docs/audit/previews/H06-cierre-portfolio/backup-aplicacion/`, ignorado por Git:

- `application-data-before.json` y `BACKUP-SHA256.txt`.
- `RECEIPT.json`: confirmación de la transacción aplicada.
- `POST-VERIFY.json`: comprobación independiente de los 4.662 registros.
- `CONTACT-QUOTA-RECEIPT.json` y `QUOTA-VERIFY.json`: provisión y prueba de cuota.

El recibo y el respaldo no se incluyeron en commits ni se enviaron a terceros.
La propuesta anterior se mantiene como evidencia histórica; no debe reaplicarse:
sus huellas ya no coinciden con las filas reparadas.

## Pendiente para la web publicada

La aplicación de datos no despliega los commits. Falta publicar el código corregido
en Vercel y en el scraper, configurar SMTP y verificar el recorrido sobre el
despliegue. No se hizo push ni se envió correo real en esta operación.
