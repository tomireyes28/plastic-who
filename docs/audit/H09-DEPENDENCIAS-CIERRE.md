# H09 — Dependencias y alcance de alertas al cierre local

Consulta renovada del 3 de noviembre de 2026 mediante npm audit. Se actualizaron
paquetes compatibles y Next a 15.5.29; Multer quedó fijado mediante override a
la rama corregida 2.5.0. No se forzaron migraciones mayores de Next, Prisma o Jest.
El árbol instalado pasa `npm ls postcss multer` sin dependencias inválidas.

| Consulta | Antes | Después |
|---|---:|---:|
| Entradas de paquetes afectadas, todas las dependencias | 30 | 28 |
| Altas, todas las dependencias | 6 | 4 |
| Críticas | 0 | 0 |
| Entradas afectadas sin dependencias de desarrollo | 7 | 5 |

Esto cuenta paquetes afectados y cadenas transitivas, no vías de explotación
independientes. **Las alertas no quedaron en cero.** Los JSON completos de npm
están ignorados en `docs/audit/previews/npm-audit-final-*.json`.

Se retiró la alerta de Multer referida al manejo de cargas y filtros asíncronos
([advisory](https://github.com/advisories/GHSA-q7qp-rjg7-q26m)). El proyecto no ofrece
un endpoint de carga de archivos, pero se actualizó igualmente la dependencia.

## Riesgo residual registrado

- **PostCSS 8.4.31 dentro de Next 15:** conserva avisos de lectura de source maps y
  salida CSS. Los flujos revisados compilan CSS del repositorio; el contacto no
  admite hojas de estilo ni archivos. No se identificó un camino público que
  entregue CSS arbitrario a ese procesador. No significa que el paquete esté
  corregido. Referencia del aviso de source maps:
  [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp).
- **deepmerge-ts / @prisma/config / Prisma:** la alerta afecta grafos recursivos
  al combinar objetos. La configuración del CLI procede del repositorio; los
  endpoints no aceptan configuración Prisma u objetos arbitrarios para combinar.
  Se conserva como deuda de actualización de herramientas, no como una garantía
  de que no pueda aparecer otro camino. Referencia:
  [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).
- **Jest/Nest CLI/glob/minimatch/deepmerge y cadenas de desarrollo:** procesan
  pruebas, configuración y archivos de trabajo. La CI nueva no usa credenciales
  de producción. Su actualización mayor y nuevas comprobaciones quedan pendientes.

La corrección mínima de H09 consiste en actualizar lo compatible y documentar
qué código puede alcanzar cada alerta. Si se agrega carga/procesamiento de CSS,
configuración arbitraria o nuevas superficies públicas, debe revisarse de nuevo
antes de habilitarlas. No se considera una certificación de seguridad completa.
