# Plastic Who? (Trama) 🧶

> **Plataforma de Auditoría Textil y Detección de Fibras Sintéticas en la Moda Argentina.**  
> Transparencia algorítmica para saber de qué está hecha realmente la ropa, más allá del marketing.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Jest](https://img.shields.io/badge/Tested%20with-Jest-C21325?style=flat-square&logo=jest)](https://jestjs.io/)

---

## 📌 El Problema y la Misión

En la industria de la moda actual, el *greenwashing* y el etiquetado ambiguo son habituales: prendas promocionadas como *"Lino"* o *"Soft Touch"* contienen frecuentemente más de un 80% de poliéster o acrílico (plásticos derivados del petróleo que liberan microplásticos en cada lavado).

**Plastic Who?** resuelve esto auditando directamente la etiqueta interna obligatoria de las prendas en las principales tiendas argentinas. A través de scrapers automatizados y un motor de procesamiento de lenguaje natural (NLP/Regex), clasifica objetivamente cada prenda mediante un semáforo textil de pureza material.

Actualmente indexa y audita **más de 4.600 prendas reales** de marcas líderes como Wanama, Paula Cahen D'Anvers, Portsaid, Desiderata, Rapsodia, Kosiuko, Funky Monkeys, India Style, entre otras.

---

## 🏗️ Arquitectura del Sistema

El proyecto está diseñado como un **Monorepo TypeScript** dividido en responsabilidades desacopladas:

```
plastic-who/
├── api/                  # Backend REST & Pipeline de Scraping (NestJS + Prisma + PostgreSQL)
│   ├── src/composition/  # Tokenizer NLP, diccionario canónico y motor de semáforo
│   ├── src/scraper/      # Scrapers modulares desacoplados (POW, VTEX, sitemaps, JSON-LD)
│   └── src/catalog/      # Endpoints REST de marcas, productos y métricas
├── web/                  # Frontend Web / PWA (Next.js 15 App Router + Tailwind CSS)
│   ├── src/app/          # Rutas, metadata SEO, Server Components
│   └── src/components/   # Explorador interactivo, fichas con WeaveBar, modales técnicos
├── shared/               # Tipos, interfaces y enums compartidos entre cliente y servidor
└── scratch/              # Scripts de auditoría y utilidades de base de datos
```

```mermaid
flowchart TD
    A["Tiendas Online (POW, VTEX, TiendaNube)"] -->|"Scrapers desacoplados (Jitter, WAF-safe)"| B["Raw Product Catalog"]
    B --> C["CompositionParserService (NLP / Regex)"]
    C -->|"Diccionario Canónico & Filtro de Secciones"| D["TrafficLightService"]
    D -->|"Normalización estricta (0-100%)"| E[("PostgreSQL / Supabase (Prisma)")]
    E -->|"Server Components / Cache"| F["Next.js 15 Web Client"]
    F -->|"Filtros en memoria (useMemo)"| G["UI Editorial / WeaveBar / PWA"]
```

---

## 🚀 Desafíos Técnicos Destacados

### 1. Motor de Tokenización Textil y Normalización de Datos Sucios
Las fichas técnicas en e-commerce tienen formatos sumamente heterogéneos y con frecuencia errores de carga:
- Variantes ortográficas y modismos (*"algodón pima"*, *"spandex"*, *"viscosa bambú"*, *"polyester reciclado"*).
- Menciones repetidas por partes de confección (ej. `Composición: 100% ALGODÓN - RIBB: 100% ALGODÓN`, donde el ribete del cuello no debe inflar el cálculo al 200%).
- Duplicaciones de bloques en CMS (ej. Portsaid con textos de tela base clonados).
- Forrerías sin dos puntos o con guiones (`FORRO-LINING: 100% poliéster`, `Viso: 100% poliéster`).

El motor implementa:
- **Segmentación por Secciones**: Clasifica el texto en bloques `MAIN` (tela exterior/base), `LINING` (forrería/viso) y `SECONDARY` (ribetes, cuellos, combinaciones, hombreras), priorizando siempre la tela principal y aislando forros sintéticos.
- **Diccionario Canónico**: Normaliza decenas de términos a categorías textiles estándar (*NATURAL*, *SEMISYNTHETIC*, *SYNTHETIC*).
- **Validación de porcentajes:** el parser rechaza cantidades negativas, fuera de rango o sumas superiores a 100% en cada sección; no las convierte proporcionalmente en una composición aparentemente válida. Exterior y forro se evalúan por separado.
- **Composición incompleta:** se conservan las fibras reconocidas, pero el resultado queda `UNKNOWN` si faltan porcentajes, hay componentes sin identificar o una sección declarada no puede interpretarse. Se admite un faltante de hasta 0,1 puntos por redondeo, sin completar ni escalar las cifras. La interfaz lo presenta como «sin clasificar», sin atribuir automáticamente una omisión a la marca.

Estas reglas se aplican a los análisis nuevos. La revisión y reparación de los
registros ya guardados se realiza por separado; modificar el parser no corrige
automáticamente el catálogo histórico.

### 2. Pipeline de Scraping Resiliente a Escala
- **Sitemap Discovery & SSR Extraction**: Descubrimiento de URLs mediante sitemaps XML combinando parsing de JSON-LD Schema.org y desestructuración de payloads hidratados de Next.js (`self.__next_f.push`).
- **Resiliencia ante WAF y Rate-Limits**: Implementación de batching con pausas aleatorias (*jitter delays* de 250–550ms) y reintentos ante códigos HTTP 429/503.
- **Detección Automática de Accesorios**: Filtrado por heurística de keywords para excluir calzado, carteras, cintos y perfumes, concentrando los recursos exclusivamente en prendas textiles.

### 3. Motor de Clasificación Semafórica (Criterio Propio de Composición)
- 🟢 **Verde (Fibra Noble):** exterior con $\ge 95\%$ de fibras naturales y hasta un 5% de otras fibras. Sin forro sintético declarado.
- 🟡 **Amarillo (Mezcla / Celulósica / Forro):** exterior con $70\%$ a menos de $95\%$ natural, o presencia de semisintéticas cuando no alcanza el verde. También un exterior que sería verde pero contiene fibras sintéticas en el forro.
- 🔴 **Rojo (Alto Sintético):** exterior con $< 70\%$ natural y sin semisintéticas detectadas. El forro sintético no mejora un rojo a amarillo.
- ⚠️ **Forrería Sintética:** se informa por separado, sin sumar sus porcentajes al exterior. Cualquier proporción sintética declarada en el forro impide el verde.

Los umbrales son una política del proyecto, no una norma textil ni una certificación
de salud, comodidad o impacto ambiental. El elastano aporta elasticidad, pero sigue
siendo una fibra sintética; la tolerancia del 5% no se limita a él. Referencia:
[Textile Exchange — Other Synthetics](https://textileexchange.org/other-synthetics/).

### 4. Rendimiento y Experiencia de Usuario (Frontend)
- **Next.js 15 con App Router:** Carga inicial ultrarrápida mediante Server Components que consultan directamente la base de datos sin sobrecosto de roundtrips HTTP innecesarios.
- **Explorador Instantáneo con `useMemo`:** Filtros reactivos por marca, material (algodón, lino, viscosa, etc.), categoría y semáforo sobre miles de prendas sin lag perceptible ni consultas lentas a servidor.
- **WeaveBar Component:** Representación gráfica proporcional tipo trama textil para visualizar inmediatamente la distribución de fibras.
- **PWA Ready:** Manifest web y metadatos SEO/OpenGraph completos optimizados para compartir en redes sociales y móviles.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | NestJS 11, TypeScript, RxJS, Node.js |
| **Base de Datos & ORM** | PostgreSQL (Supabase), Prisma ORM 6 |
| **Scraping & Parsing** | Fetch API nativo, Cheerio, Regex Tokens, JSON-LD Schema.org |
| **Testing** | Jest, Ts-Jest (100% pasando) |
| **Arquitectura** | Monorepo npm workspaces |

---

## 💻 Instalación y Ejecución Local

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone https://github.com/tomireyes28/plastic-who.git
cd plastic-who
npm install
```

### 2. Variables de entorno
Crear un archivo `.env` en `api/` y un `.env.local` en `web/` tomando como referencia los ejemplos:
```bash
# api/.env
PORT=3001
DATABASE_URL="postgresql://usuario:password@host:5432/postgres"
DIRECT_URL="postgresql://usuario:password@host:5432/postgres"

# web/.env.local
DATABASE_URL="postgresql://usuario:password@host:5432/postgres"
DIRECT_URL="postgresql://usuario:password@host:5432/postgres"
```

### 3. Generar cliente de Prisma
```bash
npm run db:generate
```

### 4. Iniciar entornos de desarrollo
```bash
# Iniciar Frontend (Next.js en http://localhost:3000)
npm run dev:web

# Iniciar Backend API (NestJS en http://localhost:3001)
npm run dev:api
```

### 5. Ejecutar Pruebas Automatizadas
```bash
npm run test:api
```

### 6. Ejecutar Scraping de Marcas (Opcional)

El scraping se ejecuta exclusivamente por CLI o por el workflow de GitHub Actions.
La API HTTP solo expone consultas de catálogo y salud: no ofrece rutas para
iniciar scraping ni registra marcas al arrancar. Para actualizar el catálogo,
ejecutá estos comandos desde un entorno con las credenciales de base configuradas.

```bash
npm run build:api      # Compilar el CLI antes de ejecutarlo
npm run scrape:paula    # Paula Cahen D'Anvers
npm run scrape:wanama   # Wanama
npm run scrape:rapsodia # Rapsodia
npm run scrape:kosiuko  # Kosiuko
npm run scrape:all      # Todas las marcas
```

### 7. Vista previa del reprocesamiento de composición (H06)

Desde la raíz, con `api/.env` configurado, se puede comparar el catálogo guardado
con el parser corregido sin modificar productos ni registrar marcas:

```bash
npm run build:api
node api/dist/catalog/preview-composition.cli.js --output docs/audit/previews/mi-revision
```

El directorio de salida debe ser nuevo. Se generan `RESUMEN.md` y `preview.json`
con las diferencias, valores anteriores, propuesta, descripción de entrada y
huellas de versión/datos. La consulta usa una transacción PostgreSQL `READ ONLY`.
Este comando no tiene opción `--apply`. Los resultados quedan fuera de Git.

Los textos que coinciden con firmas de inferencias antiguas o no tienen descripción
original se separan como `REVIEW_SOURCE`; no se validan automáticamente. H06 sigue
pendiente de aplicar hasta revisar la propuesta, respaldar la base y comprobar que
los registros y el analizador no hayan cambiado. La vista previa no es un respaldo
completo ni altera precios, stock, estado activo o fechas de scraping.

---

## 🧪 Cobertura de Tests

El proyecto cuenta con suites de tests automatizados con Jest que verifican:
- Parseo de fichas técnicas reales y normalización de sinónimos.
- Tolerancia a sintaxis de forrerías y ribetes de cuello.
- Invariante de porcentajes $\le 100\%$ ante duplicaciones de CMS.
- Filtrado de accesorios en scrapers.
- Reglas de semáforo textil e integridad de base de datos.

---

## 📄 Licencia

Este proyecto fue desarrollado con fines educativos, de auditoría de consumo consciente y demostración de ingeniería de software.
