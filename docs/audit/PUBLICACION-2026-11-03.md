# Publicación y comprobación de la primera versión

## Publicado y verificado

El usuario autorizó el push de los commits. Se publicó `main` hasta
`b9f18dfebe9db5bfe6bef59d1dc3f88f8d493b7c`, incluyendo las correcciones y la
[lista de mejoras posteriores](../MEJORAS-PENDIENTES.md).

- [GitHub Actions](https://github.com/tomireyes28/plastic-who/actions/runs/41703899887):
  todas las etapas correctas, incluida instalación limpia, cliente Prisma, builds,
  pruebas API/web y comprobación HTTP con fixtures.
- Vercel informó éxito para ese commit.
- URL pública declarada por el repositorio: **https://plastic-who.vercel.app/**.
- Respuesta HTTP 200 con el aviso nuevo de archivo parcial.
- Payload de producción comprobado: **4.662 productos**, con **1.223 verdes,
  806 amarillos, 622 rojos y 2.011 sin clasificar**. Coincide con la reparación
  aplicada en la base; no es una página antigua con el catálogo congelado.

La comprobación pública no requirió acceder al navegador ni a secretos del hosting.
El resultado detallado local está en `docs/audit/previews/PUBLICACION-VERIFICADA.json`.

## Bloqueo de contacto encontrado y resuelto

El usuario autorizó una única prueba de contacto sin datos personales. El endpoint
de producción respondió **503**, con el mensaje de contacto no disponible.
En la versión desplegada esa salida corresponde a que no se cumple la
configuración completa de Resend ni de SMTP. La reserva de cuota no fue rechazada.
**No se envió correo** y no se repitió automáticamente la prueba.

Crear una casilla en Hostinger no define por sí solo las variables que necesita
la función de Vercel. Falta completar, en Production, `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASS` y `CONTACT_EMAIL`, usando los datos de conexión de la
casilla existente. No publicar estos valores en Git ni compartir la contraseña
en el chat. Después hace falta un nuevo despliegue para tomar las variables.
Referencias: [variables de Vercel](https://vercel.com/docs/environment-variables)
y [datos de conexión de Hostinger Email](https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/).

El usuario completó la configuración y volvió a desplegar. Vercel confirmó
éxito para el despliegue `3v1EhMMT9aP9W37pqb2UeELaCxv5` del commit `b9348b4`.
La única prueba de envío autorizada devolvió **HTTP 200, success=true,
provider=smtp**, y el usuario confirmó que el correo llegó a su casilla.
No se enviaron pruebas adicionales después de esa aceptación.

La evidencia local está en `docs/audit/previews/CONTACT-POST-SMTP-RESULT.json`.
Las credenciales se ingresaron en el hosting; no se copiaron al repositorio.
El dominio personalizado mostrado en la captura no pudo comprobarse mediante
las herramientas de lectura disponibles; el enlace comprobado es
`https://plastic-who.vercel.app/`. Eso no demuestra una falla del dominio.

**La primera versión de portfolio queda cerrada dentro del alcance declarado:**
catálogo corregido publicado, checks correctos, interfaz comprobada y contacto
con recepción confirmada. La lista de mejoras posteriores permanece separada;
no se afirma que estén resueltas las alertas residuales o toda la deuda técnica.
