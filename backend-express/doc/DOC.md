# Express Primeros Pasos — Manual Completo del Backend Bookteka

> **Stack:** Node.js + TypeScript + Express v5 + Prisma + PostgreSQL + Cloudflare R2 + Better-Auth  
> **Patrón:** MVC con capa de servicios y repositorios  
> **Autor:** Bookteka Team

---

## ÍNDICE

1. [Introducción y Stack Tecnológico](#1-introducción-y-stack-tecnológico)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Prerequisitos](#3-prerequisitos)
4. [Paso 1 — package.json](#4-paso-1-packagejson)
5. [Paso 2 — tsconfig.json](#5-paso-2-tsconfigjson)
6. [Paso 3 — Variables de Entorno (.env)](#6-paso-3-variables-de-entorno-env)
7. [Paso 4 — Configuración del Proyecto](#7-paso-4-configuración-del-proyecto)
   - 7.1 [env.ts — Validación de entorno](#71-envts--validación-de-entorno)
   - 7.2 [db.ts — Pool de PostgreSQL nativo](#72-dbts--pool-de-postgresql-nativo)
   - 7.3 [prisma.ts — Cliente Prisma singleton](#73-prismats--cliente-prisma-singleton)
8. [Paso 5 — Modelo de Datos (Prisma Schema)](#8-paso-5-modelo-de-datos-prisma-schema)
9. [Paso 6 — Tipos del Sistema (Types)](#9-paso-6-tipos-del-sistema-types)
10. [Paso 7 — DTOs (Data Transfer Objects)](#10-paso-7-dtos-data-transfer-objects)
11. [Paso 8 — Helpers y Utilidades](#11-paso-8-helpers-y-utilidades)
    - 11.1 [errors.ts — Error personalizado](#111-errorsts--error-personalizado)
    - 11.2 [format.ts — Normalización de archivos](#112-formatts--normalización-de-archivos)
    - 11.3 [time.ts — Formateo de fechas](#113-timets--formateo-de-fechas)
12. [Paso 9 — Librerías y Servicios Externos](#12-paso-9-librerías-y-servicios-externos)
    - 12.1 [auth.ts — Better-Auth](#121-authts--better-auth)
    - 12.2 [email.ts — Resend](#122-emailts--resend)
    - 12.3 [r2.ts — Cloudflare R2 (S3-Compatible)](#123-r2ts--cloudflare-r2-s3-compatible)
13. [Paso 10 — Capa de Repositorios](#13-paso-10-capa-de-repositorios)
    - 13.1 [book.repository.ts](#131-bookrepositoryts)
    - 13.2 [bookmark.repository.ts](#132-bookmarkrepositoryts)
    - 13.3 [streak.repository.ts](#133-streakrepositoryts)
14. [Paso 11 — Capa de Servicios](#14-paso-11-capa-de-servicios)
    - 11.1 [book.service.ts](#141-bookservicets)
    - 11.2 [bookmark.service.ts](#142-bookmarkservicets)
    - 11.3 [streak.service.ts](#143-streakservicets)
15. [Paso 12 — Capa de Controladores](#15-paso-12-capa-de-controladores)
    - 12.1 [book.controller.ts](#151-bookcontrollerts)
    - 12.2 [bookmark.controller.ts](#152-bookmarkcontrollerts)
    - 12.3 [streak.controller.ts](#153-streakcontrollerts)
16. [Paso 13 — Rutas](#16-paso-13-rutas)
17. [Paso 14 — Servidor (server.ts)](#17-paso-14-servidor-serverts)
18. [Paso 15 — Pruebas con Jest](#18-paso-15-pruebas-con-jest)
19. [Paso 16 — Docker y Despliegue](#19-paso-16-docker-y-despliegue)
20. [Resumen de Endpoints](#20-resumen-de-endpoints)
21. [Referencia Rápida de Comandos](#21-referencia-rápida-de-comandos)

---

## 1. Introducción y Stack Tecnológico

Este backend es el motor de **Bookteka**, una aplicación de lectura de libros digitales. Está construido con una arquitectura **MVC (Model-View-Controller)** con capas adicionales de **servicios** y **repositorios** para mantener una separación de responsabilidades clara.

```
src/
├── config/           # Configuraciones: env, db, prisma
├── controllers/      # Controladores (capa HTTP)
├── dto/              # Data Transfer Objects
├── helper/           # Utilidades
├── lib/              # Servicios externos: auth, email, r2
├── repositories/     # Acceso a datos
├── routes/           # Definición de rutas Express
├── services/         # Lógica de negocio
├── types/            # Tipos TypeScript
├── __tests__/        # Tests
└── server.ts         # Punto de entrada
```

**Stack tecnológico:**

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Node.js | 20+ | Runtime |
| Express | ^5.2.1 | Framework HTTP |
| TypeScript | ^5.9.3 | Tipado estático |
| Prisma | ^6.19.2 | ORM para PostgreSQL |
| PostgreSQL | 15+ | Base de datos relacional |
| Cloudflare R2 | — | Storage de archivos (S3-compatible) |
| Better-Auth | ^1.5.0 | Autenticación completa |
| Resend | ^6.9.4 | Envío de emails |
| Multer | ^2.1.0 | Upload de archivos |
| Jest | ^30.3.0 | Testing |
| Supertest | ^7.2.2 | Testing HTTP |

**Principios aplicados:**
- Separación de responsabilidades (Controller → Service → Repository)
- Repositorios con interfaces (contratos)
- DTOs para Tipado de entrada/salida
- Autenticación delegada a Better-Auth
- Storage externo (R2) para archivos PDF
- Auditoría de eliminaciones

---

## 2. Estructura del Proyecto

```bash
backend/
├── .env                    # Variables de entorno (NO se commitea)
├── .env.example            # Plantilla de variables de entorno
├── .gitignore
├── package.json            # Dependencias y scripts
├── tsconfig.json           # Configuración de TypeScript
├── jest.config.ts          # Configuración de Jest
├── Dockerfile              # Build multi-stage para producción
├── docker-entrypoint.sh    # Script de entrada del contenedor
├── pnpm-lock.yaml          # Lockfile de pnpm
│
├── prisma/
│   └── schema.prisma       # Schema de la base de datos
│
├── better-auth_migrations/ # Migraciones de Better-Auth
│
├── mock/
│   └── book.pdf            # PDF de prueba para uploads
│
├── http/                   # Endpoints organizados (REST Client)
│   ├── books.http
│   ├── bookmarks.http
│   ├── streaks.http
│   └── auth-debug.http
│
├── api.http                # Índice de endpoints
│
└── src/
    ├── server.ts            # Punto de entrada de la app
    │
    ├── config/
    │   ├── env.ts           # Variables de entorno validadas
    │   ├── db.ts            # Pool de PostgreSQL nativo (para Better-Auth)
    │   └── prisma.ts        # Cliente Prisma singleton
    │
    ├── lib/
    │   ├── auth.ts          # Configuración de Better-Auth
    │   ├── email.ts         # Servicio de emails (Resend)
    │   └── r2.ts            # Cliente S3 para Cloudflare R2
    │
    ├── helper/
    │   ├── errors.ts        # Clase AppError personalizada
    │   ├── format.ts        # Normalización de nombres de archivo
    │   └── time.ts          # Formateo de fechas
    │
    ├── types/
    │   ├── book.d.ts        # Tipos de Book, UserBook, Bookmark
    │   ├── bookmark.d.ts    # Tipos de bookmark
    │   ├── streak.d.ts      # Tipos de racha de lectura
    │   └── audit.d.ts       # Tipos de auditoría
    │
    ├── dto/
    │   ├── book/
    │   │   ├── params.ts    # Parámetros de ruta (id, etc.)
    │   │   ├── request.ts   # Body de requests (upload)
    │   │   └── response.ts  # Estructuras de respuesta
    │   └── bookmark/
    │       ├── params.ts
    │       ├── request.ts
    │       └── response.ts
    │
    ├── repositories/
    │   ├── book.repository.ts
    │   ├── bookmark.repository.ts
    │   └── streak.repository.ts
    │
    ├── services/
    │   ├── book.service.ts
    │   ├── bookmark.service.ts
    │   └── streak.service.ts
    │
    ├── controllers/
    │   ├── book.controller.ts
    │   ├── bookmark.controller.ts
    │   └── streak.controller.ts
    │
    ├── routes/
    │   ├── book.routes.ts
    │   ├── bookmark.routes.ts
    │   └── streak.routes.ts
    │
    └── __tests__/
        ├── example.test.ts
        ├── book.test.ts
        ├── bookmark.test.ts
        └── streak.test.ts
```

---

## 3. Prerequisitos

Antes de empezar necesitás tener instalado:

- **Node.js** v20+ (recomendado v22+)
- **pnpm** v10+ (el proyecto usa pnpm como package manager)
- **Docker** y **Docker Compose** (para PostgreSQL en desarrollo)
- **TypeScript** (se instala como devDependency)

---

## 4. Paso 1 — package.json

```json
{
  "name": "backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "prisma generate && tsc && tsc-alias",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "test": "NODE_OPTIONS=--experimental-vm-modules jest",
    "test:watch": "NODE_OPTIONS=--experimental-vm-modules jest --watch"
  },
  "packageManager": "pnpm@10.15.0",
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1000.0",
    "@aws-sdk/s3-request-presigner": "^3.1000.0",
    "@prisma/client": "^6.19.2",
    "better-auth": "1.5.0",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "multer": "^2.1.0",
    "pg": "^8.18.0",
    "resend": "^6.9.4"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/multer": "^2.0.0",
    "@types/node": "^25.9.1",
    "@types/pg": "^8.16.0",
    "@jest/globals": "^30.3.0",
    "@types/jest": "^30.0.0",
    "@types/supertest": "^7.2.0",
    "jest": "^30.3.0",
    "supertest": "^7.2.2",
    "ts-jest": "^29.4.9",
    "prisma": "^6.19.2",
    "tsc-alias": "^1.8.16",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3"
  }
}
```

**¿Qué significa cada script?**

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `tsx watch src/server.ts` | Inicia el servidor en modo desarrollo con recarga automática |
| `build` | `prisma generate && tsc && tsc-alias` | Genera Prisma client, compila TS y resuelve alias `@/` |
| `start` | `node dist/server.js` | Inicia el servidor desde el build de producción |
| `test` | `jest` | Ejecuta tests con soporte ESM |
| `test:watch` | `jest --watch` | Tests en modo watch |

**¿Por qué estas dependencias?**

- **express** — Framework HTTP (v5 con soporte nativo de async/await en errores)
- **cors** — Middleware para Cross-Origin Resource Sharing
- **multer** — Middleware para manejo de multipart/form-data (uploads de PDFs)
- **@aws-sdk/client-s3** — Cliente S3 oficial de AWS para interactuar con Cloudflare R2
- **@aws-sdk/s3-request-presigner** — Generar URLs firmadas para descargas seguras
- **better-auth** — Autenticación completa con email+password, verificación, reset
- **pg** — Driver nativo de PostgreSQL (Better-Auth lo necesita para el pool)
- **resend** — Servicio de envío de emails transaccionales
- **dotenv** — Cargar variables de entorno desde `.env`
- **tsx** — Ejecutar TypeScript directamente sin compilar (para desarrollo)
- **tsc-alias** — Resolver el alias `@/` en el build compilado

**Instalación:**

```bash
pnpm install
```

---

## 5. Paso 2 — tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ESNext"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["jest", "node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**¿Qué hace cada opción?**

| Opción | Valor | Explicación |
|--------|-------|-------------|
| `target` | `ESNext` | Compila a la versión más reciente de ECMAScript |
| `module` | `NodeNext` | Usa el sistema de módulos nativo de Node.js (ESM con `.js` en imports) |
| `moduleResolution` | `NodeNext` | Resolución de módulos acorde a `NodeNext` |
| `strict` | `true` | Máxima estrictitud (strictNullChecks, noImplicitAny, etc.) |
| `baseUrl` | `"."` | Base para resolver paths relativos |
| `paths` | `@/* → src/*` | Alias para imports: `import { x } from "@/config/env"` |
| `esModuleInterop` | `true` | Compatibilidad con módulos CommonJS |
| `sourceMap` | `true` | Genera source maps para debugging |

**⚠️ Importante con ESM:** Cuando usás `"type": "module"` en package.json, TODOS los imports locales deben terminar en `.js` aunque el archivo fuente sea `.ts`:

```typescript
// ✅ Correcto
import { env } from "@/config/env.js";
import { BookService } from "@/services/book.service.js";

// ❌ Incorrecto (TypeScript no va a encontrar el módulo)
import { env } from "@/config/env";
import { BookService } from "@/services/book.service";
```

---

## 6. Paso 3 — Variables de Entorno (.env)

Creá el archivo `.env` en la raíz de `backend/`:

```env
PORT=3000
DATABASE_URL=postgres://usuario:password@localhost:5432/bookteka_db?schema=public
FRONTEND_URL=http://localhost:5173
BETTER_AUTH_SECRET=WsEGMicmTmVF0Tln8NEkfwZkrEmIePQB
BETTER_AUTH_URL=http://localhost:3000

R2_ACCESS_KEY_ID=tu-access-key
R2_SECRET_ACCESS_KEY=tu-secret-key
R2_ENDPOINT=https://tu-endpoint.r2.cloudflarestorage.com
R2_PUBLIC_DOMAIN=https://tu-public-domain.r2.dev
R2_BUCKET=tu-bucket-name

RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Cada variable explicada:**

| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| `PORT` | Sí | Puerto del servidor Express (default 3000) |
| `DATABASE_URL` | Sí | Connection string de PostgreSQL |
| `FRONTEND_URL` | Sí | URL del frontend (para CORS) |
| `BETTER_AUTH_SECRET` | Sí | Secreto para firmar tokens de Better-Auth |
| `BETTER_AUTH_URL` | Sí | URL base del backend (para callbacks de auth) |
| `R2_ACCESS_KEY_ID` | Sí | Access Key de Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | Sí | Secret Key de Cloudflare R2 |
| `R2_ENDPOINT` | Sí | Endpoint S3 de Cloudflare R2 |
| `R2_PUBLIC_DOMAIN` | Sí | Dominio público para acceder a archivos |
| `R2_BUCKET` | Sí | Nombre del bucket en R2 |
| `RESEND_API_KEY` | Sí | API Key de Resend para envío de emails |
| `RESEND_FROM_EMAIL` | Sí | Email remitente para los correos |

**⚠️ IMPORTANTE:** El `.env` NUNCA se commitea al repositorio. Está en `.gitignore`. Usá `.env.example` como plantilla.

---

## 7. Paso 4 — Configuración del Proyecto

### 7.1 `env.ts` — Validación de Entorno

```typescript
import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  FRONTEND_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  R2_ACCESS_KEY: string;
  R2_SECRET_KEY: string;
  R2_S3_API: string;
  R2_BUCKET: string;
  R2_PUBLIC_DOMAIN: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
}

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`env not found: ${key}`);
  }
  return value;
}

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  DATABASE_URL: getEnvVar("DATABASE_URL"),
  FRONTEND_URL: getEnvVar("FRONTEND_URL"),
  BETTER_AUTH_SECRET: getEnvVar("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: getEnvVar("BETTER_AUTH_URL"),
  R2_ACCESS_KEY: getEnvVar("R2_ACCESS_KEY_ID"),
  R2_SECRET_KEY: getEnvVar("R2_SECRET_ACCESS_KEY"),
  R2_S3_API: getEnvVar("R2_ENDPOINT"),
  R2_BUCKET: getEnvVar("R2_BUCKET"),
  R2_PUBLIC_DOMAIN: getEnvVar("R2_PUBLIC_DOMAIN"),
  RESEND_API_KEY: getEnvVar("RESEND_API_KEY"),
  RESEND_FROM_EMAIL: getEnvVar("RESEND_FROM_EMAIL"),
};
```

**¿Qué hace?**

1. **`dotenv.config()`** — Carga las variables del archivo `.env` en `process.env`
2. **`getEnvVar(key)`** — Helper que obtiene una variable y lanza error si falta (fail-fast)
3. **Exporta `env`** — Objeto tipado con todas las variables de entorno accesibles desde cualquier parte del código

**Diferencia con Zod:** A diferencia del manual de Fastify que usa Zod para validar, acá se usa un enfoque más simple con `getEnvVar`. Cada variable que es obligatoria se valida manualmente. Para proyectos más grandes, Zod sería recomendable.

---

### 7.2 `db.ts` — Pool de PostgreSQL Nativo

```typescript
import pkg from "pg";
import { env } from "./env.js";

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
```

**¿Qué hace?**

Crea un **Pool de conexiones PostgreSQL** usando el driver `pg`. Este pool se usa exclusivamente para **Better-Auth**, que necesita acceso directo a PostgreSQL (no a través de Prisma).

- **Pool** mantiene un conjunto de conexiones reutilizables (más eficiente que crear una conexión por request)
- Se conecta usando la misma `DATABASE_URL` que Prisma

---

### 7.3 `prisma.ts` — Cliente Prisma Singleton

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const dbPrisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = dbPrisma;
```

**¿Qué hace?**

1. **Singleton pattern** — En desarrollo, `tsx watch` reinicia el servidor y crearía múltiples instancias de Prisma. Al guardarla en `global`, nos aseguramos de reutilizar la misma instancia.
2. **`dbPrisma`** — Es el cliente Prisma que se usa en toda la aplicación (repositories).
3. En producción, esto no es necesario porque no hay hot-reload.

**¿Por qué no se llama `prisma`?** Porque Better-Auth también exporta un `prisma` y podrían haber conflictos de nombres. Se usa `dbPrisma` para diferenciar.

---

## 8. Paso 5 — Modelo de Datos (Prisma Schema)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model book {
  id        String   @id @default(uuid())
  title     String
  author    String?
  fileUrl   String
  fileKey   String
  fileHash  String   @unique
  size      Int?
  createdAt DateTime @default(now())
  userBooks user_book[]

  @@index([fileHash])
}

model user_book {
  id                 String    @id @default(uuid())
  userId             String
  bookId             String
  currentPage        Int       @default(0)
  scrollPosition     Int       @default(0)
  readingTimeSeconds Int       @default(0)
  lastReadAt         DateTime?
  createdAt          DateTime  @default(now())

  book      book       @relation(fields: [bookId], references: [id], onDelete: Cascade)
  bookmarks bookmark[]

  @@index([userId])
  @@index([bookId])
  @@unique([userId, bookId])
}

model bookmark {
  id          String   @id @default(uuid())
  userId      String
  userBookId  String
  name        String?
  pageNumber  Int
  textPreview String?
  createdAt   DateTime @default(now())

  userBook user_book @relation(fields: [userBookId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userBookId])
}

model user_streak {
  id             String    @id @default(uuid())
  userId         String    @unique
  currentStreak  Int       @default(0)
  startDate      DateTime?
  lastActiveDate DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([userId])
}

model audit_log {
  id         String   @id @default(uuid())
  action     String
  entityType String
  entityId   String
  userId     String
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId])
  @@index([createdAt])
}
```

**Diagrama de relaciones:**

```
book ──1:N──> user_book ──1:N──> bookmark
                │
                └── (userId + bookId) único por usuario

user_streak (1:1 con usuario por userId)

audit_log (logs de acciones)
```

**Modelos explicados:**

| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| `book` | `books` | Libro físico (archivo PDF). Se comparte entre usuarios si tienen el mismo hash. |
| `user_book` | `user_books` | Relación usuario-libro con progreso de lectura. `@@unique([userId, bookId])` evita duplicados. |
| `bookmark` | `bookmarks` | Marcadores por página. Pertenece a un `user_book`. |
| `user_streak` | `user_streaks` | Racha de lectura diaria del usuario. `@unique` en userId (1 racha por usuario). |
| `audit_log` | `audit_logs` | Registro de acciones importantes (eliminaciones, etc.) con metadata JSON. |

**Características clave del schema:**

- **UUIDs** como IDs (no autoincrementales) — más seguros y distribuibles
- **Cascade delete** — Si se elimina un `book`, se eliminan sus `user_book`, y si se elimina un `user_book`, se eliminan sus `bookmarks`
- **Índices** en todas las columnas de búsqueda frecuente
- **`@@unique([userId, bookId])`** — Un usuario solo puede tener un `user_book` por libro
- **`fileHash @unique`** — Si dos usuarios suben el mismo PDF, comparten el mismo `book` (se detecta por hash SHA-256)

**Comandos de migración:**

```bash
pnpm prisma:generate    # Genera el cliente Prisma
npx prisma migrate dev  # Crea/ejecuta migraciones
npx prisma studio       # Abre la UI de Prisma Studio
```

---

## 9. Paso 6 — Tipos del Sistema (Types)

Los tipos están en la carpeta `src/types/` y definen las interfaces que se usan en toda la aplicación.

### `book.d.ts` — Tipos de Libros

```typescript
export interface Book {
  id: string;
  title: string;
  author?: string | null;
  fileUrl: string;
  fileKey: string;
  fileHash: string;
  size?: number | null;
  createdAt: Date;
  userBooks?: UserBook[];
}

export interface UserBook {
  id: string;
  userId: string;
  bookId: string;
  currentPage: number;
  scrollPosition: number;
  readingTimeSeconds: number;
  lastReadAt?: Date | null;
  createdAt: Date;
  book?: Book;
  bookmarks?: Bookmark[];
}

export interface Bookmark {
  id: string;
  userId: string;
  userBookId: string;
  name?: string | null;
  pageNumber: number;
  textPreview?: string | null;
  createdAt: Date;
  userBook?: UserBook;
}

export interface UploadBookInput {
  userId: string;
  file: Express.Multer.File;
  body: {
    title?: string;
    author?: string;
    readingTimeSeconds?: string;
    scrollPosition?: string;
  };
}

export interface CreateBookInput {
  title: string;
  author: string;
  fileKey: string;
  fileUrl: string;
  fileHash: string;
  size: number;
}

export interface UpdateBookProgressInput {
  userId: string;
  bookId: string;
  body: {
    readingTimeSeconds?: number;
    scrollPosition?: number;
    lastReadAt?: string;
  };
}

export interface DeleteBookInput {
  userId: string;
  bookId: string;
}

export interface DownloadBookInput {
  userId: string;
  bookId: string;
}

export interface StreamBookInput {
  userId: string;
  bookId: string;
}
```

**¿Por qué tantos tipos de input?** Cada operación (upload, delete, download, stream, update progress) tiene requerimientos distintos. Al tiparlos por separado, TypeScript nos ayuda a no mezclar parámetros.

### `streak.d.ts` — Tipos de Racha

```typescript
export interface StreakData {
  id?: string;
  userId?: string;
  currentStreak: number;
  startDate: string | null;
  lastActiveDate: string | null;
  hasCompletedToday: boolean;
}

export interface UserStreak {
  id: string;
  userId: string;
  currentStreak: number;
  startDate?: Date | null;
  lastActiveDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStreakInput {
  userId: string;
  currentStreak: number;
  startDate: Date | null;
  lastActiveDate: Date | null;
  createdAt: Date;
}

export interface UpdateStreakInput {
  currentStreak?: number;
  startDate?: Date | null;
  lastActiveDate?: Date | null;
  updatedAt?: Date;
}
```

### `audit.d.ts` — Auditoría

```typescript
export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}
```

**Auditoría:** Cada vez que se elimina un libro, se guarda un registro en `audit_log` con metadata sobre qué se eliminó, quién lo hizo, y cuándo.

---

## 10. Paso 7 — DTOs (Data Transfer Objects)

Los DTOs definen la forma exacta de los datos que entran y salen de la API. Están separados en `params` (parámetros de ruta), `request` (body), y `response` (respuesta).

### Book DTOs

**`dto/book/params.ts`** — Parámetros de ruta:

```typescript
export interface DeleteBookParamsDTO {
  id: string;
}

export interface UpdateBookParamsDTO {
  id: string;
}

export interface DownloadBookParamsDTO {
  id: string;
}

export interface StreamBookParamsDTO {
  id: string;
}
```

**`dto/book/request.ts`** — Body de subida:

```typescript
export interface UploadBookRequestDTO {
  title?: string;
  author?: string;
  readingTimeSeconds?: string;
  scrollPosition?: string;
}
```

**`dto/book/response.ts`** — Respuestas:

```typescript
// Lista de libros del usuario
export interface UserBookResponse {
  id: string;
  title: string;
  author: string;
  createdAt: number;        // timestamp (getTime)
  lastReadAt: number;       // timestamp
  readingTimeSeconds: number;
  scrollPosition: number;
  totalPages?: number;
  fileUrl: string;
  fileKey: string;
}

// Respuesta de subida exitosa
export interface UploadBookResponseDTO {
  bookId: string;
  userBookId: string;
}

// Respuesta de eliminación
export interface DeleteBookResponseDTO {
  success: boolean;
  message: string;
  auditId: string;
}
```

### Bookmark DTOs

**`dto/bookmark/params.ts`:**

```typescript
export interface GetBookmarkParams {
  bookId: string;
}

export interface CreateBookmarkParams {
  bookId: string;
}

export interface DeleteBookmarkParams {
  bookId: string;
}
```

**`dto/bookmark/request.ts`:**

```typescript
export interface CreateBookmarkRequestDTO {
  name: string;
  pageNumber: number;
  textPreview?: string;
}
```

---

## 11. Paso 8 — Helpers y Utilidades

### 11.1 `errors.ts` — Error Personalizado

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}
```

**¿Qué hace?**

- Extiende `Error` nativo de JavaScript
- Agrega `code` (código interno: `NOT_FOUND`, `FORBIDDEN`, etc.) y `statusCode` (HTTP status)
- Se usa en services para lanzar errores que los controllers capturan y convierten en respuestas HTTP

**Uso típico:**
```typescript
// En un service:
throw new AppError("NOT_FOUND", 404, "Libro no encontrado para este usuario");

// En el controller:
if (err instanceof AppError) {
  return res.status(err.statusCode).json({ error: err.message });
}
```

### 11.2 `format.ts` — Normalización de Archivos

```typescript
import crypto from "crypto";

export const normalizedFileName = (name: string) => {
  return name
    .replace(/\s+/g, "-")           // Reemplazar espacios por guiones
    .replace(/[^a-zA-Z0-9.\-_]/g, ""); // Eliminar caracteres especiales
};

export const generateFileHash = (file: any) => {
  return crypto.createHash("sha256").update(file.buffer).digest("hex");
};
```

**¿Para qué sirve?**

- **`normalizedFileName`** — Limpia el nombre del archivo subido: espacios → guiones, elimina caractéres especiales. Esto evita problemas con archivos que tienen caractéres raros en el nombre.
- **`generateFileHash`** — Genera un hash SHA-256 del contenido del archivo. Se usa para detectar si ya existe un libro con el mismo contenido (deduplicación).

### 11.3 `time.ts` — Formateo de Fechas

```typescript
export const toDateString = (date: Date | null): string | null => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getUTCDateOnly = (date: Date): string => {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};
```

**¿Para qué sirve?**

- **`toDateString`** — Convierte un Date a formato legible `YYYY-MM-DD`. Se usa para mostrar fechas en las respuestas de streak.
- **`getUTCDateOnly`** — Obtiene la fecha en UTC, ignorando la hora. Es crítico para el sistema de streaks: si un usuario en Argentina (UTC-3) marca un día a las 11 PM, no debe confundirse con el día siguiente en UTC.

---

## 12. Paso 9 — Librerías y Servicios Externos

### 12.1 `auth.ts` — Better-Auth

```typescript
import { betterAuth } from "better-auth";
import { pool } from "@/config/db.js";
import { env } from "@/config/env.js";
import { sendEmail } from "./email.js";

const isProduction = env.BETTER_AUTH_URL.startsWith("https");

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  database: pool,                             // Pool de PostgreSQL nativo
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => { /* envía email */ },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => { /* envía email */ },
  },
  trustedOrigins: [
    env.FRONTEND_URL,
    "http://localhost:5173",
    "https://bookteka.up.railway.app",
  ],
  advanced: {
    useSecureCookies: isProduction,
  },
  cookie: {
    name: "better-auth.session_token",
    secure: isProduction,
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,     // 7 días
    updateAge: 60 * 60 * 24,         // Renueva cada 24h
  },
});
```

**¿Qué configura Better-Auth?**

| Configuración | Descripción |
|---------------|-------------|
| `database: pool` | Usa el pool de PostgreSQL nativo (NO Prisma) |
| `emailAndPassword.enabled` | Habilita login con email y contraseña |
| `sendResetPassword` | Callback para enviar email de reset |
| `emailVerification.sendOnSignUp` | Envía email de verificación al registrarse |
| `autoSignInAfterVerification` | Login automático después de verificar |
| `trustedOrigins` | Orígenes permitidos para CORS de auth |
| `useSecureCookies` | Cookies seguras solo en HTTPS |
| `session.expiresIn` | Duración de la sesión (7 días) |
| `session.updateAge` | Renueva la sesión cada 24h de actividad |

**¿Cómo se integra con Express?**

```typescript
import { toNodeHandler } from "better-auth/node";

// Todas las rutas de auth bajo /api/auth/*
app.all("/api/auth/*splat", toNodeHandler(auth));
```

Better-Auth genera automáticamente todas las rutas de autenticación:
- `POST /api/auth/signup` — Registro
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/session` — Obtener sesión actual
- `POST /api/auth/verify-email` — Verificar email
- `POST /api/auth/forgot-password` — Olvidé contraseña
- `POST /api/auth/reset-password` — Resetear contraseña

Better-Auth además genera sus propias tablas en la base de datos (`user`, `account`, `session`, `verification`) mediante migraciones propias (carpeta `better-auth_migrations/`).

### 12.2 `email.ts` — Resend

```typescript
import { Resend } from "resend";
import { env } from "@/config/env.js";

const resend = new Resend(env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    console.error(`❌ Error sending email to ${to}:`, error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
```

**¿Qué hace?**

- Crea un cliente de **Resend** (servicio de emails transaccionales, alternativa moderna a SendGrid)
- `sendEmail()` envía un email con HTML personalizado
- Se usa desde Better-Auth para los emails de verificación y reset de password
- Si falla, lanza error (pero mejoraría con un sistema de colas para reintentos)

### 12.3 `r2.ts` — Cloudflare R2 (S3-Compatible)

```typescript
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/config/env.js";

const R2_ACCESS_KEY = env.R2_ACCESS_KEY;
const R2_SECRET_KEY = env.R2_SECRET_KEY;
const R2_S3_API = env.R2_S3_API;
const R2_BUCKET = env.R2_BUCKET;

if (!R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_S3_API || !R2_BUCKET) {
  throw new Error("Faltan variables de entorno R2");
}

export const r2 = new S3Client({
  region: "auto",
  endpoint: R2_S3_API,
  credentials: {
    accessKeyId: R2_ACCESS_KEY!,
    secretAccessKey: R2_SECRET_KEY!,
  },
});
```

**¿Qué es Cloudflare R2?**

R2 es el servicio de almacenamiento de objetos de Cloudflare, **compatible con la API S3 de AWS**. Esto significa que podemos usar el SDK de AWS S3 para interactuar con R2.

**¿Por qué R2 y no S3?**

- Sin cargos de salida de datos (egress) — ideal para servir archivos PDF
- Precios más bajos que S3
- Integración con la red global de Cloudflare (CDN incluida)

**Operaciones que se hacen con R2:**

| Operación | SDK | Propósito |
|-----------|-----|-----------|
| `PutObjectCommand` | `@aws-sdk/client-s3` | Subir PDF |
| `GetObjectCommand` | `@aws-sdk/client-s3` | Obtener PDF (stream) |
| `DeleteObjectCommand` | `@aws-sdk/client-s3` | Eliminar PDF |
| `getSignedUrl` | `@aws-sdk/s3-request-presigner` | Generar URL de descarga temporaria |

---

## 13. Paso 10 — Capa de Repositorios

Los repositorios son la **capa de acceso a datos**. Cada repositorio tiene una interfaz (contrato) y una implementación que usa Prisma para interactuar con PostgreSQL.

**Patrón:** Interface → Implementation

### 13.1 `book.repository.ts`

```typescript
import { dbPrisma } from "@/config/prisma.js";
import { CreateBookInput, UpsertUserBookInput } from "@/types/book.js";
import { audit_log, book, user_book } from "@prisma/client";

interface IBookRepository {
  getUserBooks: (userId: string) => Promise<user_book[] | null>;
  findByHash: (fileHash: string) => Promise<book | null>;
  createBook: (data: CreateBookInput) => Promise<book>;
  upsertUserBook: (data: UpsertUserBookInput) => Promise<user_book>;
  findUserBook: (userId: string, bookId: string) => Promise<user_book | null>;
  countOtherUsers: (bookId: string, userId: string) => Promise<number | null>;
  deleteUserBook: (id: string) => Promise<user_book>;
  deleteBook: (id: string) => Promise<book>;
  createAuditLog: (data: any) => Promise<audit_log>;
  updateUserBook: (id: string, data: any) => Promise<user_book>;
}

export class BookRepository implements IBookRepository {
  // Obtener todos los libros de un usuario (con datos del book)
  getUserBooks = (userId: string) => {
    return dbPrisma.user_book.findMany({
      where: { userId },
      orderBy: { lastReadAt: "desc" },
      include: {
        book: {
          select: {
            id: true, title: true, author: true,
            fileUrl: true, fileKey: true, size: true, createdAt: true,
          },
        },
      },
    });
  };

  // Buscar libro por hash SHA-256 (deduplicación)
  findByHash = (fileHash: string) => {
    return dbPrisma.book.findUnique({ where: { fileHash } });
  };

  // Crear un nuevo libro
  createBook = (data: CreateBookInput) => {
    return dbPrisma.book.create({ data });
  };

  // Crear o actualizar relación usuario-libro (upsert)
  // Si el usuario ya tiene ese libro, no hace nada (update: {})
  upsertUserBook = ({ userId, bookId, readingTimeSeconds, scrollPosition }: UpsertUserBookInput) => {
    return dbPrisma.user_book.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: { userId, bookId, readingTimeSeconds, scrollPosition },
      update: {},
    });
  };

  // Buscar relación usuario-libro específica
  findUserBook = (userId: string, bookId: string) => {
    return dbPrisma.user_book.findFirst({
      where: { userId, bookId },
      include: { book: true },
    });
  };

  // Contar cuántos otros usuarios tienen el mismo libro
  countOtherUsers = (bookId: string, userId: string) => {
    return dbPrisma.user_book.count({
      where: { bookId, NOT: { userId } },
    });
  };

  // Eliminar relación usuario-libro
  deleteUserBook = (id: string) => {
    return dbPrisma.user_book.delete({ where: { id } });
  };

  // Eliminar libro (solo si nadie más lo usa)
  deleteBook = (id: string) => {
    return dbPrisma.book.delete({ where: { id } });
  };

  // Registrar acción en auditoría
  createAuditLog = (data: any) => {
    return dbPrisma.audit_log.create({ data });
  };

  // Actualizar progreso de lectura
  updateUserBook = (id: string, data: any) => {
    return dbPrisma.user_book.update({ where: { id }, data });
  };
}
```

**Métodos clave explicados:**

| Método | ¿Qué hace? |
|--------|------------|
| `getUserBooks` | Trae todos los `user_book` del usuario ordenados por última lectura, incluyendo datos del `book` |
| `findByHash` | Busca si ya existe un libro con el mismo hash SHA-256 (evita duplicados en storage) |
| `upsertUserBook` | Crea la relación usuario-libro si no existe, si existe no modifica nada |
| `countOtherUsers` | Cuenta cuántos otros usuarios usan el mismo libro (para saber si podemos eliminar el archivo de R2) |
| `createAuditLog` | Guarda en `audit_log` qué se eliminó, quién, y cuándo |

### 13.2 `bookmark.repository.ts`

```typescript
interface IBookmarkRepository {
  findUserBookAccess: (userId: string, bookId: string) => Promise<user_book | null>;
  getBookmarksByUserBookId: (userBookId: string) => Promise<bookmark[]>;
  createBookmark: (data: CreateBookmarkInput) => Promise<bookmark>;
  findBookmark: (bookmarkId: string, userBookId: string) => Promise<bookmark | null>;
  deleteBookmark: (bookmarkId: string) => Promise<bookmark>;
}
```

**Métodos clave:**

| Método | ¿Qué hace? |
|--------|------------|
| `findUserBookAccess` | Verifica que el usuario tenga acceso al libro (es su `user_book`) |
| `getBookmarksByUserBookId` | Trae todos los bookmarks de un `user_book` ordenados por fecha descendente |
| `findBookmark` | Busca un bookmark verificando que pertenezca al `user_book` específico |
| `deleteBookmark` | Elimina un bookmark por ID |

### 13.3 `streak.repository.ts`

```typescript
interface IStreakRepository {
  findByUserId: (userId: string) => Promise<user_streak | null>;
  createStreak: (data: CreateStreakInput) => Promise<user_streak>;
  updateStreak: (userId: string, data: UpdateStreakInput) => Promise<user_streak>;
  upsertStreak: (args: {
    where: { userId: string };
    update: UpdateStreakInput;
    create: CreateStreakInput;
  }) => Promise<user_streak>;
}
```

**Métodos clave:**

| Método | ¿Qué hace? |
|--------|------------|
| `findByUserId` | Busca la racha por userId (relación 1:1 gracias a `@unique` en el schema) |
| `createStreak` | Crea una nueva racha desde cero |
| `updateStreak` | Actualiza racha existente (currentStreak, fechas) |
| `upsertStreak` | Crea o actualiza en una sola operación (usado por `initializeStreak`) |

---

## 14. Paso 11 — Capa de Servicios

Los servicios contienen la **lógica de negocio**. Son la capa intermedia entre los controladores (HTTP) y los repositorios (datos). Acá se toman las decisiones: validar permisos, calcular streaks, generar URLs firmadas, etc.

### 14.1 `book.service.ts`

```typescript
const bookRepository = new BookRepository();

export class BookService {
  // Obtener libros del usuario (mapea la respuesta)
  static getUserBooks = async (userId: string) => {
    const userBooks = await bookRepository.getUserBooks(userId);
    return userBooks.map((ub) => ({
      id: ub.book.id,
      name: ub.book.title,
      author: ub.book.author || "",
      createdAt: ub.book.createdAt.getTime(),
      lastReadAt: ub.lastReadAt?.getTime() || ub.book.createdAt.getTime(),
      readingTimeSeconds: ub.readingTimeSeconds || 0,
      scrollPosition: ub.scrollPosition || 0,
      currentPage: ub.currentPage || 0,
      fileUrl: ub.book.fileUrl,
      fileKey: ub.book.fileKey,
      isSynced: true,
    }));
  };

  // Subir libro con deduplicación
  static uploadBook = async ({ userId, file, body }: UploadBookInput) => {
    const dto = {
      title: body.title || file.originalname,
      author: body.author || "??",
      readingTimeSeconds: parseInt(body.readingTimeSeconds || "0"),
      scrollPosition: parseInt(body.scrollPosition || "0"),
    };

    const fileHash = generateFileHash(file.buffer);
    let book = await bookRepository.findByHash(fileHash);

    let fileKey: string | null = null;

    if (!book) {
      // Solo subimos a R2 si el libro no existe
      const normalizedName = normalizedFileName(file.originalname);
      fileKey = `books/${userId}/${Date.now()}-${normalizedName}`;

      await r2.send(new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: fileKey,
        Body: file.buffer,
        ContentType: "application/pdf",
      }));

      book = await bookRepository.createBook({
        title: dto.title,
        author: dto.author,
        fileKey,
        fileUrl: `${env.R2_PUBLIC_DOMAIN}/${fileKey}`,
        fileHash,
        size: file.size,
      });
    }

    const userBook = await bookRepository.upsertUserBook({
      userId,
      bookId: book.id,
      readingTimeSeconds: dto.readingTimeSeconds,
      scrollPosition: dto.scrollPosition,
    });

    return { bookId: book.id, userBookId: userBook.id };
  };

  // Eliminar libro con auditoría
  static deleteBook = async ({ userId, bookId }: DeleteBookInput) => {
    const userBook = await bookRepository.findUserBook(userId, bookId);
    if (!userBook) {
      throw new AppError("NOT_FOUND", 404, "Libro no encontrado para este usuario");
    }

    const otherUsers = await bookRepository.countOtherUsers(bookId, userId);

    // Solo eliminar de R2 si nadie más usa el libro
    if (otherUsers === 0) {
      await r2.send(new DeleteObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: userBook.book.fileKey,
      }));
    }

    await bookRepository.createAuditLog({ ... });

    await bookRepository.deleteUserBook(userBook.id);

    if (otherUsers === 0) {
      await bookRepository.deleteBook(bookId);
    }

    return { success: true, message: "Libro eliminado correctamente", auditId: bookId };
  };

  // Descargar libro (genera URL firmada)
  static downloadBookWithUrl = async ({ userId, bookId }: DownloadBookInput) => {
    const userBook = await bookRepository.findUserBook(userId, bookId);
    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No es tu libro");
    }

    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: userBook.book.fileKey,
    });

    // URL firmada válida por 15 minutos
    const url = await getSignedUrl(r2, command, { expiresIn: 60 * 15 });

    return { url };
  };

  // Stream del PDF (proxy para evitar CORS)
  static streamBookPdf = async ({ userId, bookId }: StreamBookInput) => {
    const userBook = await bookRepository.findUserBook(userId, bookId);
    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No es tu libro");
    }

    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: userBook.book.fileKey,
    });

    const pdfData = await r2.send(command);
    if (!pdfData.Body) {
      throw new AppError("INTERNAL_ERROR", 500, "Error al obtener el archivo");
    }

    return {
      body: pdfData.Body as NodeJS.ReadableStream,
      headers: {
        contentType: "application/pdf",
        contentDisposition: `inline; filename="${userBook.book.title}.pdf"`,
        contentLength: pdfData.ContentLength,
      },
    };
  };
}
```

**Flujo de `uploadBook` (el más complejo):**

```
1. Cliente envía PDF + title + author
2. Se genera hash SHA-256 del buffer
3. Se busca si ya existe un book con ese hash
   │
   ├── Sí existe → se reusa el book (no se sube a R2 otra vez)
   │
   └── No existe →
       4. Se normaliza el nombre del archivo
       5. Se sube a R2 con PutObjectCommand
       6. Se crea el book en BD
7. Se crea/actualiza user_book (upsert)
8. Se devuelve { bookId, userBookId }
```

**Flujo de `deleteBook`:**

```
1. Verificar que el usuario tenga el libro
2. Contar otros usuarios que usan el mismo libro
   │
   ├── Si hay otros → solo se elimina user_book (no se toca R2)
   │
   └── Si es el único →
       3. Se elimina archivo de R2
       4. Se elimina book de BD
5. Se guarda auditoría
6. Se elimina user_book
```

### 14.2 `bookmark.service.ts`

```typescript
const bookmarkRepository = new BookmarkRepository();

export class BookmarkService {
  // Obtener bookmarks de un libro (solo si el usuario tiene acceso)
  static getBookmarks = async (userId: string, bookId: string) => {
    const userBook = await bookmarkRepository.findUserBookAccess(userId, bookId);
    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No autorizado o libro no encontrado");
    }
    return bookmarkRepository.getBookmarksByUserBookId(userBook.id);
  };

  // Crear bookmark
  static createBookmark = async (userId: string, bookId: string, data) => {
    const userBook = await bookmarkRepository.findUserBookAccess(userId, bookId);
    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No autorizado o libro no encontrado");
    }
    return bookmarkRepository.createBookmark({ userId, userBookId: userBook.id, ...data });
  };

  // Eliminar bookmark (verificando propiedad)
  static deleteBookmark = async (userId: string, bookId: string, bookmarkId: string) => {
    const userBook = await bookmarkRepository.findUserBookAccess(userId, bookId);
    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No autorizado o libro no encontrado");
    }
    const bookmark = await bookmarkRepository.findBookmark(bookmarkId, userBook.id);
    if (!bookmark) {
      throw new AppError("NOT_FOUND", 404, "Bookmark no encontrado");
    }
    await bookmarkRepository.deleteBookmark(bookmarkId);
    return { success: true };
  };
}
```

**Patrón de seguridad:** Todos los métodos verifican que el usuario tenga acceso al libro ANTES de hacer cualquier operación. Esto se hace buscando el `user_book` que relaciona al usuario con el libro. Si no existe, el usuario no tiene permiso.

### 14.3 `streak.service.ts`

```typescript
const streakRepository = new StreakRepository();

export class StreakService {
  // Obtener racha del usuario (crea una si no existe)
  static getUserStreak = async (userId: string) => {
    let streak = await streakRepository.findByUserId(userId);

    if (!streak) {
      // Crear racha con valores por defecto
      streak = await streakRepository.createStreak({
        userId, currentStreak: 0,
        startDate: null, lastActiveDate: null,
        createdAt: new Date(),
      });
    }

    // Calcular si completó el día de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = streak.lastActiveDate
      ? new Date(streak.lastActiveDate)
      : null;

    let hasCompletedToday = false;
    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0);
      hasCompletedToday = lastActive.getTime() === today.getTime();
    }

    return {
      currentStreak: streak.currentStreak,
      startDate: toDateString(streak.startDate),
      lastActiveDate: toDateString(streak.lastActiveDate),
      hasCompletedToday,
    };
  };

  // Completar el día actual
  static completeDay = async (userId: string, clientDate?: string, clientTimestamp?: string) => {
    let today: Date;
    if (clientDate) {
      today = new Date(clientDate + "T12:00:00.000Z");
    } else {
      today = new Date();
      today.setHours(0, 0, 0, 0);
    }

    let streak = await streakRepository.findByUserId(userId);

    if (!streak) {
      // Crear nueva racha (primer día)
      streak = await streakRepository.createStreak({ ... });
      return { currentStreak: 1, hasCompletedToday: true, isNew: true };
    }

    // Verificar si ya completó hoy
    if (streak.lastActiveDate && esMismoDia(streak.lastActiveDate, today)) {
      return { currentStreak: streak.currentStreak, hasCompletedToday: true, isNew: false };
    }

    // Calcular si es streak continuo o se reinicia
    let newStreak = 1;
    if (streak.lastActiveDate && esDiaAnterior(streak.lastActiveDate, today)) {
      newStreak = streak.currentStreak + 1;  // Streak continuo
    }
    // Si no es día anterior, se reinicia a 1

    streak = await streakRepository.updateStreak(userId, {
      currentStreak: newStreak,
      lastActiveDate: today,
      startDate: newStreak === 1 ? today : streak.startDate,
    });

    return { currentStreak: newStreak, hasCompletedToday: true, isNew: newStreak === 1 };
  };
}
```

**Lógica del streak (racha de lectura):**

```
Estado: currentStreak = 5, lastActiveDate = 2026-06-04

Hoy es 2026-06-05:
  → Es día consecutivo → currentStreak = 6 ✅

Hoy es 2026-06-06 (saltó un día):
  → No es consecutivo → currentStreak = 1 (se reinicia) 🔄

Hoy es 2026-06-04 (ya completó hoy):
  → No cambia nada → currentStreak = 5 (sin cambios)
```

**¿Por qué `clientDate`?** El frontend puede enviar su propia fecha para evitar problemas con zonas horarias. Si un usuario está en UTC-3 y completa el día a las 11 PM, la fecha del servidor en UTC podría ser diferente.

---

## 15. Paso 12 — Capa de Controladores

Los controladores **reciben requests HTTP y devuelven responses**. Su trabajo es:

1. Extraer datos del request (headers, params, body, query)
2. Verificar autenticación (vía Better-Auth)
3. Llamar al service correspondiente
4. Manejar errores y devolver la respuesta HTTP adecuada

### 15.1 `book.controller.ts`

```typescript
import { Request, Response } from "express";
import { auth } from "@/lib/auth.js";
import { BookService } from "@/services/book.service.js";
import { AppError } from "@/helper/errors.js";

// GET /api/books
export const getUserBooks = async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return res.status(401).json({ error: "No autorizado" });

    const books = await BookService.getUserBooks(session.user.id);
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener libros" });
  }
};

// POST /api/books/upload (multipart)
export const uploadBook = async (req: UploadBookRequest, res: Response) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return res.status(401).json({ error: "Unauthorized" });
    if (!req.file) return res.status(400).json({ error: "File not found" });

    const result = await BookService.uploadBook({
      userId: session.user.id,
      file: req.file,
      body: req.body,
    });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno al procesar el libro" });
  }
};

// DELETE /api/books/:id
export const deleteBook = async (req: DeleteBookRequest, res: Response) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return res.status(401).json({ error: "No autorizado" });

    const result = await BookService.deleteBook({
      userId: session.user.id,
      bookId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: "Error interno al eliminar el libro" });
  }
};

// PATCH /api/books/:id/progress
export const updateBookProgress = async (req: UpdateBookRequest, res: Response) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return res.status(401).json({ error: "No autorizado" });

    const result = await BookService.updateBookProgress({
      userId: session.user.id,
      bookId: req.params.id,
      body: req.body,
    });
    return res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: "Error al actualizar el progreso" });
  }
};

// GET /api/books/:id/download
export const downloadBookWithUrl = async (req: DownloadRequest, res: Response) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return res.status(401).json({ error: "No autorizado" });

    const result = await BookService.downloadBookWithUrl({
      userId: session.user.id,
      bookId: req.params.id,
    });
    return res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: "Error interno al descargar el libro" });
  }
};

// GET /api/books/:id/stream (proxy PDF → evita CORS)
export const streamBookPdf = async (req: StreamRequest, res: Response) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return res.status(401).json({ error: "No autorizado" });

    const stream = await BookService.streamBookPdf({
      userId: session.user.id,
      bookId: req.params.id,
    });

    res.setHeader("Content-Type", stream.headers.contentType);
    res.setHeader("Content-Disposition", stream.headers.contentDisposition);
    if (stream.headers.contentLength) {
      res.setHeader("Content-Length", stream.headers.contentLength.toString());
    }

    // Stream directo del PDF desde R2 al cliente
    await streamPipeline(stream.body, res);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: "Error al procesar el PDF" });
  }
};
```

**Patrón común en todos los controladores:**

```typescript
try {
  // 1. Verificar autenticación
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return res.status(401).json({ error: "No autorizado" });

  // 2. Ejecutar lógica de negocio
  const result = await BookService.algo(session.user.id, ...);

  // 3. Devolver respuesta
  res.json(result);
} catch (err) {
  // 4. Manejar errores
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  return res.status(500).json({ error: "Error interno" });
}
```

### 15.2 `bookmark.controller.ts`

```typescript
// GET /api/books/:bookId/bookmarks
export const getBookmarks = async (req, res) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return res.status(401).json({ error: "No autorizado" });

  const bookmarks = await BookmarkService.getBookmarks(
    session.user.id, req.params.bookId
  );
  res.json(bookmarks);
};

// POST /api/books/:bookId/bookmarks
export const createBookmark = async (req, res) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return res.status(401).json({ error: "No autorizado" });

  const { name, pageNumber, textPreview } = req.body;
  if (!name || typeof pageNumber !== "number") {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  const bookmark = await BookmarkService.createBookmark(
    session.user.id, req.params.bookId, { name, pageNumber, textPreview }
  );
  res.status(201).json(bookmark);
};

// DELETE /api/books/:bookId/bookmarks/:bookmarkId
export const deleteBookmark = async (req, res) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return res.status(401).json({ error: "No autorizado" });

  const result = await BookmarkService.deleteBookmark(
    session.user.id, req.params.bookId, req.params.bookmarkId
  );
  res.json(result);
};
```

### 15.3 `streak.controller.ts`

```typescript
// GET /api/streak
export const getUserStreak = async (req, res) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return res.status(401).json({ error: "No autorizado" });

  const result = await StreakService.getUserStreak(session.user.id);
  res.json(result);
};

// POST /api/streak/complete
export const completeDay = async (req, res) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return res.status(401).json({ error: "No autorizado" });

  const { clientTimestamp, clientDate } = req.body;
  const result = await StreakService.completeDay(
    session.user.id, clientDate, clientTimestamp
  );
  res.json(result);
};

// POST /api/streak/initialize
export const initializeStreak = async (req, res) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return res.status(401).json({ error: "No autorizado" });

  const { startDate } = req.body;
  if (!startDate) {
    return res.status(400).json({ error: "Se requiere la fecha de inicio" });
  }

  const result = await StreakService.initializeStreak(session.user.id, startDate);
  res.json(result);
};
```

---

## 16. Paso 13 — Rutas

Las rutas definen **cómo se conectan las URLs con los controladores**. Express usa `Router()` para agrupar rutas relacionadas.

### `book.routes.ts`

```typescript
import multer from "multer";
import { Router } from "express";
import {
  uploadBook, deleteBook, getUserBooks,
  streamBookPdf, updateBookProgress, downloadBookWithUrl
} from "@/controllers/book.controller.js";

export const book: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

book.get("/", getUserBooks);
book.post("/upload", upload.single("pdf"), uploadBook);
book.get("/:id/download", downloadBookWithUrl);
book.get("/:id/stream", streamBookPdf);
book.patch("/:id/progress", updateBookProgress);
book.delete("/:id", deleteBook);
```

**Notas sobre Multer:**

- **`multer.memoryStorage()`** — Guarda el archivo en memoria (buffer) en vez de disco. Esto es importante porque después subimos el buffer a R2.
- **`upload.single("pdf")`** — Espera un campo llamado `"pdf"` en el formulario (NO `"file"` como suele ser común).
- **Límite de 25MB** — Suficiente para la mayoría de los PDFs.

### `bookmark.routes.ts`

```typescript
export const bookmark: Router = Router({ mergeParams: true });

bookmark.get("/:bookId/bookmarks", getBookmarks);
bookmark.post("/:bookId/bookmarks", createBookmark);
bookmark.delete("/:bookId/bookmarks/:bookmarkId", deleteBookmark);
```

**¿Qué hace `mergeParams: true`?**

Sin `mergeParams`, cuando montás un router hijo con `app.use("/api/books", bookmarkRoutes)`, los parámetros del padre (`bookId`) no son accesibles en el router hijo. Con `mergeParams: true`, Express hereda los parámetros de ruta del padre.

Como bookmarks está montado bajo `/api/books`, el `bookId` viene de la URL padre.

### `streak.routes.ts`

```typescript
export const streak: Router = Router();

streak.get("/streak", getUserStreak);
streak.post("/streak/complete", completeDay);
streak.post("/streak/initialize", initializeStreak);
```

### Mapeo de rutas en `server.ts`

```typescript
app.use("/api/books", bookRoutes);      // GET, POST, PATCH, DELETE /api/books/...
app.use("/api/books", bookmarkRoutes);  // GET, POST, DELETE /api/books/:bookId/bookmarks
app.use("/api", streakRoutes);          // GET /api/streak, POST /api/streak/complete
```

**Importante:** Las rutas de bookmarks se montan en `/api/books` (NO en `/api/books/:bookId/bookmarks`). El `bookId` es parte de la ruta definida en el router: `/:bookId/bookmarks`.

---

## 17. Paso 14 — Servidor (server.ts)

```typescript
import "dotenv/config";
import express, { type Express } from "express";
import cors from "cors";
import { env } from "@/config/env.js";
import { auth } from "@/lib/auth.js";
import { toNodeHandler } from "better-auth/node";
import { book as bookRoutes } from "./routes/book.routes.js";
import { streak as streakRoutes } from "./routes/streak.routes.js";
import { bookmark as bookmarkRoutes } from "./routes/bookmark.routes.js";

const app: Express = express();

// ── Middlewares globales ──

// CORS: solo permite el frontend configurado
app.use(cors({
  origin: env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
}));

// Better-Auth: maneja TODO el sistema de autenticación
// Genera rutas como /api/auth/signup, /api/auth/login, etc.
app.all("/api/auth/*splat", toNodeHandler(auth));

// Body parsers con límite de 25MB (para uploads de PDF)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ── Health check ──
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API working correctly",
    timestamp: new Date().toISOString(),
  });
});

// ── Rutas de la aplicación ──
app.use("/api/books", bookRoutes);
app.use("/api/books", bookmarkRoutes);
app.use("/api", streakRoutes);

// ── Inicio del servidor ──
app.listen(env.PORT, () =>
  console.log(`Server initialize in http://localhost:${env.PORT}`),
);

export default app;
```

**Orden de los middlewares (importante):**

```
1. CORS               → Permite requests del frontend
2. Better-Auth        → Maneja autenticación (antes de parsear body)
3. express.json       → Parsea JSON bodies (25MB)
4. express.urlencoded → Parsea form-data (25MB)
5. Health check       → Endpoint público
6. Rutas de negocio   → Books, Bookmarks, Streaks
```

**¿Por qué Better-Auth va antes de los body parsers?** Better-Auth tiene su propio manejo de requests y no necesita los body parsers de Express. Si los pusieramos antes, podrían interferir.

**¿Qué es `*splat`?** Es una sintaxis de Express v5 para capturar **todas** las rutas bajo `/api/auth/`. Es como un comodín que captura `/api/auth/signup`, `/api/auth/login`, `/api/auth/session`, etc.

---

## 18. Paso 15 — Pruebas con Jest

El proyecto usa **Jest** con **ts-jest** para testing, con soporte para ESM (ES Modules).

### Configuración (`jest.config.ts`)

```typescript
const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",

  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
        },
        diagnostics: { ignoreCodes: [151002] },
      },
    ],
  },

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",    // Saca .js de los imports
    "^@/(.*)\\.js$": "<rootDir>/src/$1",
    "^@/(.*)$": "<rootDir>/src/$1",   // Resuelve @/ alias
  },

  testMatch: ["**/__tests__/**/*.test.ts"],
};
```

### Tests existentes

```bash
src/__tests__/
├── example.test.ts       # Test de ejemplo
├── book.test.ts          # Tests de libros
├── bookmark.test.ts      # Tests de bookmarks
└── streak.test.ts        # Tests de streaks
```

**Ejecutar tests:**

```bash
pnpm test                # Una vez
pnpm test:watch          # En modo watch (desarrollo)
```

**Nota sobre ESM:** Jest necesita `NODE_OPTIONS=--experimental-vm-modules` para soportar ESM. El package.json ya lo configura en los scripts.

---

## 19. Paso 16 — Docker y Despliegue

### Dockerfile (multi-stage build)

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# Stage 2: Runtime
FROM node:20-alpine
RUN apk add --no-cache postgresql-client
RUN npm install -g pnpm
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY better-auth_migrations ./better-auth_migrations
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
```

**Multi-stage build:**
- **Stage 1 (builder):** Instala dependencias, genera Prisma client, compila TypeScript
- **Stage 2 (runtime):** Solo copia lo necesario (`dist/`, `node_modules/`, `prisma/`) — imagen más chica y segura

### docker-entrypoint.sh

El entrypoint ejecuta migraciones de Prisma y de Better-Auth antes de iniciar el servidor.

---

## 20. Resumen de Endpoints

### Autenticación (Better-Auth)

| Método | URL | Descripción |
|--------|-----|-------------|
| `POST` | `/api/auth/signup` | Registrarse |
| `POST` | `/api/auth/login` | Iniciar sesión |
| `POST` | `/api/auth/logout` | Cerrar sesión |
| `GET` | `/api/auth/session` | Obtener sesión actual |
| `POST` | `/api/auth/verify-email` | Verificar email |
| `POST` | `/api/auth/forgot-password` | Solicitar reset de contraseña |
| `POST` | `/api/auth/reset-password` | Resetear contraseña |

### Health

| Método | URL | Descripción |
|--------|-----|-------------|
| `GET` | `/api/health` | Health check de la API |

### Books

| Método | URL | Descripción | Autenticación |
|--------|-----|-------------|---------------|
| `GET` | `/api/books` | Listar libros del usuario | ✅ |
| `POST` | `/api/books/upload` | Subir un libro (multipart) | ✅ |
| `GET` | `/api/books/:id/download` | Obtener URL de descarga | ✅ |
| `GET` | `/api/books/:id/stream` | Stream del PDF (proxy) | ✅ |
| `PATCH` | `/api/books/:id/progress` | Actualizar progreso de lectura | ✅ |
| `DELETE` | `/api/books/:id` | Eliminar un libro | ✅ |

### Bookmarks

| Método | URL | Descripción | Autenticación |
|--------|-----|-------------|---------------|
| `GET` | `/api/books/:bookId/bookmarks` | Listar bookmarks de un libro | ✅ |
| `POST` | `/api/books/:bookId/bookmarks` | Crear un bookmark | ✅ |
| `DELETE` | `/api/books/:bookId/bookmarks/:bookmarkId` | Eliminar un bookmark | ✅ |

### Streaks

| Método | URL | Descripción | Autenticación |
|--------|-----|-------------|---------------|
| `GET` | `/api/streak` | Obtener racha del usuario | ✅ |
| `POST` | `/api/streak/complete` | Completar el día actual | ✅ |
| `POST` | `/api/streak/initialize` | Inicializar racha manualmente | ✅ |

### Depuración (solo desarrollo)

| Método | URL | Descripción |
|--------|-----|-------------|
| `POST` | `/api/verify-email-debug` | Verificar email manualmente (debug) |
| `GET` | `/api/user-debug` | Ver estado de un usuario (debug) |

---

## 21. Referencia Rápida de Comandos

```bash
# ── Desarrollo ──
pnpm run dev                       # Iniciar servidor en modo desarrollo (hot-reload)

# ── Base de datos ──
npx prisma generate            # Generar cliente Prisma
npx prisma migrate dev         # Crear y ejecutar migraciones
npx prisma migrate dev --name  # Crear migración con nombre
npx prisma studio              # Abrir Prisma Studio (UI de BD)

# ── Build ──
pnpm build                     # Generar Prisma client + compilar TS

# ── Tests ──
pnpm test                      # Ejecutar tests
pnpm test:watch                # Tests en modo watch

# ── Docker ──
docker build -t bookteka-api . # Build de la imagen
docker run -p 3000:3000 bookteka-api  # Correr el contenedor

# ── Mejores prácticas de desarrollo ──

# 1. Siempre corré las migraciones después de cambiar el schema
npx prisma migrate dev

# 2. Si cambiás el schema, regenerá el cliente
pnpm prisma:generate

# 3. Para testear endpoints, usá los archivos .http
#    (requiere extensión REST Client en VS Code)
#    → http/books.http
#    → http/bookmarks.http
#    → http/streaks.http

# 4. SIEMPRE verificá la sesión del usuario en los controladores
const session = await auth.api.getSession({ headers: req.headers });
if (!session) return res.status(401).json({ error: "No autorizado" });

# 5. Usá AppError en los services para errores controlados
throw new AppError("NOT_FOUND", 404, "Mensaje descriptivo");

# 6. En los controllers, atrapá AppError para status codes específicos
if (err instanceof AppError) {
  return res.status(err.statusCode).json({ error: err.message });
}
```

---
