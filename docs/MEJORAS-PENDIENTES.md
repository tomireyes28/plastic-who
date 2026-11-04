# Mejoras posteriores a la primera versión de portfolio

La versión inicial se cerró el 3 de noviembre de 2026 tras comprobar despliegue,
catálogo reparado y recepción del contacto. Esta lista conserva el trabajo de
evolución y mantenimiento que se decidió posponer; ver la
[verificación de publicación](audit/PUBLICACION-2026-11-03.md).

Esta lista separa evolución del producto de las comprobaciones de publicación.
Para cerrar la versión inicial, el commit publicado debe pasar CI, la web debe
mostrar el catálogo corregido y el contacto debe funcionar honestamente con la
configuración del hosting. Crear una casilla en Hostinger no configura por sí
solo las variables SMTP de Vercel.

Las correcciones ya realizadas y la reparación aplicada están documentadas en
`docs/audit/CIERRE-PORTFOLIO.md` y `docs/audit/H06-APLICACION-2026-11-03.md`.

| Prioridad posterior | Trabajo | Criterio de terminación | Hallazgos |
|---|---|---|---|
| Alta: mantenimiento | Actualizar las cadenas con alertas residuales y evaluar migraciones mayores de Next/Prisma/Jest | Revisar cada advisory vigente, comprobar compatibilidad, builds y regresiones; mantener documentado cualquier riesgo residual | H09 |
| Alta: datos | Mejorar los formatos pendientes sin inventar composiciones | Casos representativos nuevos con fuente y pruebas; los ambiguos siguen UNKNOWN. Identificar por separado ausencia, parcialidad, contradicción y formato no soportado | H04/H06 |
| Alta: operación | Rotar el universo de productos y administrar obsolescencia | Medir cobertura por marca y fecha por producto; distinguir fallos, prendas desaparecidas y consultas parciales sin prometer revisión completa inexistente | H10/H11 |
| Media: rendimiento | Paginación y filtros del lado del servidor | Acceso a todos los resultados, conteos coherentes y menor carga inicial; medir en móvil antes/después. Hoy se advierte el recorte de productos cargados | H15 |
| Media: arquitectura | Consumir contratos compartidos y reducir duplicación de adaptadores | API/web usan contratos consistentes; extracción HTML reutilizable con límites de producto y regresiones. Prisma ya se separó del formateador cliente | H18/H19 |
| Media: trazabilidad | Completar estrategia de migraciones, versiones de análisis y recuperación | Establecer baseline sin reset de producción, guardar procedencia/versiones y ensayar restauraciones en un entorno separado | H16 |
| Media: calidad de catálogo | Normalizar entidades HTML, nombres y categorías | Nombres legibles, categorías canónicas y búsqueda consistente, conservando el dato original. Definir una taxonomía si se desea limitar el archivo a prendas | H20 |
| Media: navegación | Filtros compartibles por URL, reinicio claro e historial | Recargar/compartir conserva la selección; cambiar de modo no deja filtros ocultos engañosos | H25 |
| Media: pruebas y accesibilidad | Ampliar recorridos y dispositivos comprobados | Pruebas de navegador automatizadas, lector de pantalla, teclado virtual real y teléfonos; ampliar casos según fallos encontrados, sin perseguir cobertura vacía | H17/H22 |
| Baja: infraestructura | Endurecimiento adicional de Actions y observabilidad | Fijar acciones por SHA, revisar permisos, métricas y alertas de scraping. La interpolación de inputs, concurrency y límites básicos ya están corregidos | H23 |
| Baja: presentación | SEO, imagen social, manifest e instalación opcional | Recursos sociales reales y enlaces correctos; decidir si vale implementar offline antes de prometerlo. Añadir capturas y explicación de decisiones al portfolio | H26/H27 |

Las prioridades anteriores no convierten una falla nueva en opcional: si un
pendiente pasa a romper un flujo principal o abre una superficie alcanzable,
se reclasifica como corrección antes de publicarlo.
