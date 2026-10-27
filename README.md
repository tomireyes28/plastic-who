# Plastic Who? (Trama)

Aplicación *mobile-first* para explorar y filtrar el catálogo de marcas de ropa argentinas según la composición real de sus telas (fibras naturales, semisintéticas y sintéticas).

## Estructura del Proyecto

```text
plastic-who/
├── api/                  # Backend en NestJS + Prisma ORM + Supabase (PostgreSQL)
├── web/                  # Frontend Web (PWA) en Next.js + React + TypeScript
├── mobile/               # Futuro cliente Mobile (React Native / Kotlin)
├── shared/               # Tipos e interfaces TypeScript compartidos
└── prototipo-claude.html # Maqueta inicial de referencia
```

## Requisitos Previos

- **Node.js** >= 20.x
- **npm** >= 10.x
- Base de datos PostgreSQL (ej. **Supabase**) para el backend (`api/.env`)
