# H06 — Resumen final de la vista previa

> Actualización posterior: el contraste de las 464 propuestas calculadas está documentado en `docs/audit/REVISION-PROPUESTAS-CALCULADAS-H06.md`. Ese reporte y el escenario `H06-2026-11-03-calculadas-prioridad` reemplazan las cifras de propuesta de este resumen, que conserva la situación previa a ese contraste.

Estado al 3 de noviembre de 2026: **revisión consolidada; reparación de la base pendiente**. Ningún cambio aplicado, ningún producto aprobado para aplicar y ningún despliegue realizado durante estas revisiones.

La propuesta usa una captura de 4.662 productos y evidencia pública guardada del mismo día. No representa una lectura nueva del estado actual de la base. Los artefactos detallados están en `docs/audit/previews/`, ignorados por Git; conservan datos anteriores, fuentes, fechas y huellas.

## 1. Qué está comprobado

Dentro de los 367 casos marcados para revisar fuente, se incorporó evidencia para **187 productos**:

| Declaración comprobada | Productos | Resultado simulado |
|---|---:|---|
| 100% algodón | 145 | Verde |
| 100% viscosa | 10 | Amarillo |
| 96% bambú y 4% elastano, transcrito de una imagen enlazada por cada ficha | 32 | Verde con el diccionario actual; categoría del bambú pendiente de confirmar |

Las 187 fichas conservan los colores y porcentajes que tenían en la captura de la base, evitando que la propuesta conservadora les retire la clasificación. Se propone sustituir el texto de composición por evidencia con procedencia y, donde se preparó el reemplazo, la descripción con agregados históricos por el texto auténtico capturado. No se considera auténtica una frase generada por el scraper solo porque coincida con la declaración recuperada.

Desglose por revisión: Vestido Batik (1), otras fichas de Funky Monkeys (126), Reír Enloquecer (28) y One Place World (32). La identidad de Camisa Bowling quedó confirmada mediante H1 y título del HTML; su nombre vacío en la extracción anterior no correspondía a otra prenda.

**Comprobar la declaración de bambú no comprueba su proceso de obtención ni su categoría de fibra.** Los 32 verdes son una simulación de la política vigente, no una aprobación de esa categoría. Esta salvedad se superpone con los 187; no son 32 productos adicionales.

También se comprobó que **153 prendas** tienen vacíos los campos de descripción/composición examinados: 152 de Markova y Enagua Chander V. Se verificaron paneles de producto y datos estructurados; no se recuperaron cantidades nuevas. Mantenerlas sin clasificar es un resultado válido, no un fallo que obligue a inventar datos. Ya estaban sin clasificar y no necesitan cambios de análisis por esta revisión.

## 2. Qué sigue pendiente

Las **180 alertas de datos/alcance** del archivo acumulado se interpretan así; no son 180 fichas sin leer:

| Grupo | Productos | Tratamiento pendiente |
|---|---:|---|
| Prendas con campos vacíos, ya revisadas | 153 | Conservar UNKNOWN; documentar falta de cantidades en la captura. Nueva evidencia puede incorporarse después, sin bloquear el cierre por no conocer todas las composiciones. |
| Cuaderno de Rapsodia, categoría estructurada Papelería | 1 | Decidir su inclusión en un catálogo de prendas y el filtro correspondiente. No se eliminó ni desactivó. |
| One Place World | 14 | Tres combos declaran 96/4 pero falta resolver el alcance por componente; otros once no aportan un reparto utilizable en las imágenes revisadas. Mantener sin clasificar mientras corresponda. |
| Reír Enloquecer | 11 | Cuatro declaran 100% algodón principal con forro desconocido; seis no declaran porcentajes; Vestido Duncan Picnic devolvió 404 en la captura. |
| Campera Rompevientos Leopard, Funky Monkeys | 1 | Menciona forro de algodón sin porcentajes, sin composición cuantificada del exterior. No confirma el histórico 100% poliéster exterior / 100% algodón forro. |

En las cuatro prendas de Reír con forro se conserva el exterior conocido, pero el color queda UNKNOWN. No se asigna amarillo sin demostrar un sintético ni verde sin resolver la evidencia incompleta. En Remera Caroline Dots, «microtul» no confirma el 100% poliéster histórico.

Los tres combos de bambú y las cuatro declaraciones de exterior de Reír aportan evidencia parcial adicional, pero no están contados entre las 187 propuestas incorporadas como clasificables.

## 3. Qué significan las 677 diferencias

La vista previa acumulada propone **677 diferencias en campos de análisis** frente a la captura de la base: **318 cambian color** y **359 cambian otros campos sin cambiar color**, incluido el texto de composición.

| Origen de las diferencias | Productos | Nivel de revisión |
|---|---:|---|
| Los 187 con declaración recuperada | 187 | Evidencia de fuente documentada; persiste la salvedad de categoría en 32 casos de bambú. |
| Casos de fuente/alcance pendientes que sí cambian análisis | 26 | Los 14 de One Place World, 11 de Reír y la campera Funky Monkeys. |
| Otras propuestas calculadas desde descripciones almacenadas | 464 | No están automáticamente aprobadas por no tener alerta de fuente. Falta revisar su antes/después y separar correcciones sustentadas de formatos ambiguos. |

Las 153 prendas vacías y el cuaderno no agregan diferencias de análisis. El total 677 incluye modificaciones de texto: recuperar colores no implica que desaparezcan todas las diferencias con el histórico.

La captura inicial tenía **20 registros con totales inválidos**; la propuesta acumulada tiene **cero**. Eso comprueba un límite numérico, no la corrección semántica de todas las propuestas. Entre las 464 hay que revisar expresamente los 23 casos documentados tras H04 que pasaron a UNKNOWN al conservar declaraciones adicionales truncadas o contradictorias.

| Color | Captura de la base | Simulado acumulado |
|---|---:|---:|
| Verde | 1.357 | 1.237 |
| Amarillo | 877 | 787 |
| Rojo | 703 | 618 |
| Sin clasificar | 1.725 | 2.020 |
| Total | 4.662 | 4.662 |

## 4. Qué falta para cerrar H06

1. **Cerrar la lista de decisiones y propuestas.** Revisar las 464 propuestas calculadas, incluidos los 23 casos de incertidumbre y los 20 totales inválidos. Resolver el criterio del bambú genérico y el alcance de combos/cuaderno; aceptar UNKNOWN donde no haya evidencia suficiente. No es necesario conocer todas las composiciones para cerrar una reparación correcta.
2. **Convertir las revisiones locales en una propuesta reproducible y mantenible.** Los escenarios usan selecciones manuales de texto y transcripciones que el CLI de producción no incorpora todavía. Definir cómo conservar procedencia y evidencia, cómo manejar fuentes modificadas y cómo evitar que el próximo scraping pierda estas resoluciones o vuelva a introducir datos inferidos. Las correcciones H02/H04/H05 deben estar también en los procesos desplegados.
3. **Completar la limpieza del texto visible.** Retirar porcentajes no sustentados de composición y descripciones, preservando el antes. La propuesta de Vestido Duncan Picnic aún no sustituye su descripción histórica porque la captura devolvió 404; no debe aplicarse como si esa limpieza estuviera resuelta. No atribuir falta de declaración a una falla de captura.
4. **Preparar la aplicación controlada, sin ejecutarla aún.** El CLI existente es de solo lectura y no tiene `--apply`. Falta implementar y probar la aplicación de una lista explícita, con respaldo completo y restaurable, validación de versiones/fechas/huellas, rechazo de registros modificados y actualización atómica del análisis y las fibras de cada producto. Los JSON de revisión no son un respaldo completo ni una migración ejecutable.
5. **Regenerar y revisar la propuesta definitiva.** Leer nuevamente la base en solo lectura cuando el código y las decisiones estén cerrados. Comprobar que la propuesta es reproducible, que no hay cambios ajenos a la lista acordada y revisar el resultado concreto con el usuario antes de aplicar.
6. **Aplicar y verificar únicamente cuando se autorice esa etapa.** Comprobar cantidades, colores, texto visible, alertas de forro y comportamiento después de un nuevo scraping. Registrar qué se aplicó y verificar que una segunda ejecución no introduzca cambios imprevistos.

**H06 sigue abierto:** la investigación y la vista previa avanzaron, pero la base histórica todavía no está reparada. El cierre requiere una reparación aplicada y verificada, con decisiones de incertidumbre explícitas; no requiere fabricar información ausente.

## 5. Evidencia y comprobaciones de esta consolidación

- Escenario vigente: `docs/audit/previews/H06-2026-11-03-sin-descripcion-154/preview.json`.
- Revisiones por lote: `H06-2026-11-03-33-declaraciones`, `H06-2026-11-03-funky-monkeys`, `H06-2026-11-03-reir-enloquecer` y `H06-2026-11-03-sin-descripcion-154`, bajo el mismo directorio de previews.
- Los 14 casos de One Place World están documentados en `H06-2026-11-03-33-declaraciones/PENDIENTES-OPW.md`.
- Los 23 casos adicionales de incertidumbre están en `H06-2026-11-03-post-H04/ADDITIONAL-UNCERTAINTY.json`.
- Se verificó la huella del escenario acumulado, las sumas 187 + 180 = 367 y 187 + 26 + 464 = 677, los colores y la ausencia de excesos por exterior/forro.
- Esta consolidación no ejecutó pruebas de aplicación, nuevas consultas a la base ni escrituras. Las validaciones locales de cada lote preservaron estados anteriores y huellas; no equivalen a una verificación posterior a una reparación real.
