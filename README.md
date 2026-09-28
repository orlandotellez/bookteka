# Bookteka

![TypeScript](https://img.shields.io/badge/typescript-%233178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/node.js-%23339933.svg?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![React](https://img.shields.io/badge/react-%2320232A.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Tauri](https://img.shields.io/badge/tauri-%23000000.svg?style=for-the-badge&logo=tauri&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Astro](https://img.shields.io/badge/astro-%23000000.svg?style=for-the-badge&logo=astro&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/prisma-%232D3748.svg?style=for-the-badge&logo=prisma&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%232496ED.svg?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

**Bookteka** es una plataforma para gestionar y leer libros digitales con seguimiento de progreso de lectura, rachas diarias, marcadores y resaltados. Disponible como app de escritorio (Tauri), app Android (Tauri WebView) y web.

> La documentación viva del proyecto vive en [`specs/`](#especificaciones): descripción, arquitectura por módulo, contrato de API, inventario de deuda técnica (`specs/tasks/`) y el documento para el cliente. Este README es la puerta de entrada.

## Estructura del Proyecto

```
bookteka-repo/
├── backend-express/    # API REST (Express + TypeScript + Prisma + JWT) — fuente de verdad
├── frontend/           # App de escritorio + Android (Tauri 2 + React + Vite) + web
├── landing-page/       # Página de marketing (Astro)
├── alternative/        # Exploraciones fuera del camino feliz (backend-rust/ experimental)
├── docker-compose.yml  # Orquestación completa del stack
├── .github/workflows/  # CI (tests, lint, build en cada push/PR)
├── specs/              # Documentación y deuda técnica del proyecto
└── .env.example        # Variables de entorno globales
```

| Proyecto | Tecnología | Propósito |
|----------|------------|-----------|
| `backend-express/` | Node.js + Express + TypeScript | API REST principal |
| `frontend/` | React 19 + Vite + Tauri 2 | App de escritorio (Windows/Linux/macOS), Android y web |
| `landing-page/` | Astro + TypeScript | Página de marketing estática |
| `alternative/backend-rust/` | Rust | Exploración de un backend alternativo. **No es parte del camino feliz** |

> **Nota:** la app móvil Android se genera desde el mismo `frontend/` mediante Tauri (`src-tauri/gen/android`). No hay un proyecto Expo/React Native separado.

---

## Requisitos Previos

- **Node.js** (v20 o superior)
- **pnpm** (gestor de paquetes)
  ```bash
  npm install -g pnpm
  ```
- **Docker** y **Docker Compose** (para el stack completo)
- **Rust** (solo para `alternative/backend-rust/` o el build de Tauri)

---

## Inicio Rápido (Docker — stack completo)

```bash
# 1. Clonar
git clone https://github.com/orlandotellez/bookteka.git
cd BOOKTEKA-REPO

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales (JWT_SECRET, JWT_REFRESH_SECRET, R2_*, RESEND_*)

# 3. Levantar PostgreSQL + Backend + Frontend
docker compose up --build
```

Esto levanta:

- **PostgreSQL 16** en `localhost:5433`
- **Backend Express** en `localhost:3001` (el entrypoint corre `prisma migrate deploy` antes de arrancar)
- **Frontend Web** en `localhost:8081`

> El frontend en Docker se sirve con Nginx, que proxya `/api/` al backend. El build inyecta `VITE_API_URL=/api/v1`, por lo que las peticiones del navegador llegan al backend con el prefijo correcto.

---

## Instalación Manual (por proyecto)

### Backend Express

```bash
cd backend-express
cp .env.example .env     # Configurar variables (JWT ≥ 32 caracteres, R2, Resend)
pnpm install
pnpm prisma:generate     # Generar cliente Prisma
pnpm dev                 # Iniciar en modo desarrollo (puerto 3000)
```

### Frontend (escritorio + Android + web)

```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev                 # Iniciar Vite en modo desarrollo (puerto 1420)

# App de escritorio (Tauri)
pnpm tauri dev

# Build Android
pnpm tauri android dev      # o: pnpm tauri android build
```

> En desarrollo, Vite proxya `/api` al backend (`BACKEND_HOST`). En Android, `apiEnv.ts` usa `VITE_BACKEND_HOST` + `/api/v1` directamente contra el backend en tu red local.

### Landing Page

```bash
cd landing-page
pnpm install
pnpm dev                 # Iniciar en modo desarrollo (puerto 4321)
```

---

## Configuración del Entorno

### Variables globales (raíz, para Docker)

```env
# Backend
DATABASE_URL=postgres://bookteka:bookteka123@localhost:5433/bookteka_db?schema=public
PORT=3000
FRONTEND_URL=http://localhost:8081
# TRUST_BACKEND_ORIGINS=true   # solo detrás de un proxy de confianza (lo inyecta docker-compose)

# JWT (access + refresh, mínimo 32 caracteres cada uno)
JWT_SECRET=replace-with-at-least-32-random-characters
JWT_REFRESH_SECRET=replace-with-a-different-at-least-32-random-characters

# Cloudflare R2 (almacenamiento de PDFs)
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=...
R2_PUBLIC_DOMAIN=...
R2_BUCKET=...

# Resend (envío del código de verificación)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### Backend Express (`backend-express/.env`)

```env
PORT=3000
DATABASE_URL=postgres://bookteka:bookteka123@localhost:5433/bookteka_db?schema=public
FRONTEND_URL=http://localhost:1420

JWT_SECRET=replace-with-at-least-32-random-characters
JWT_REFRESH_SECRET=replace-with-a-different-at-least-32-random-characters

R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=...
R2_PUBLIC_DOMAIN=...
R2_BUCKET=...

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
```

> `env.ts` **falla al arrancar** si falta cualquier variable obligatoria, y exige secretos JWT de 32+ caracteres. No hay valores por defecto para los secretos.

### Frontend (`frontend/.env`)

```env
# Prefijo de la API. Todas las rutas del backend viven bajo /api/v1.
VITE_API_URL=/api/v1

# Host del backend al que Vite proxya /api en desarrollo. VA SOLO EL HOST,
# sin ruta: apiEnv.ts y vite.config.ts añaden el prefijo solos.
BACKEND_HOST=http://localhost:3000

# Host LAN del backend para Android (la WebView no usa el proxy de Vite).
# También sin ruta: se le concatena /api/v1 automáticamente.
VITE_BACKEND_HOST=http://192.168.0.10:3000
```

> ⚠️ **Importante:** los hosts (`BACKEND_HOST`, `VITE_BACKEND_HOST`) no deben incluir `/api/v1`. Si los incluyes, se duplicará el prefijo (`/api/v1/api/...`).

---

## Scripts Disponibles

### Backend Express (`backend-express/`)

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Iniciar servidor en modo desarrollo (tsx watch) |
| `pnpm build` | `prisma generate` + `tsc` + `tsc-alias` |
| `pnpm start` | Iniciar servidor en producción |
| `pnpm prisma:generate` | Generar el cliente Prisma |
| `pnpm test` | Ejecutar tests (Jest + Supertest) — no requieren `.env` |
| `pnpm test:watch` | Tests en modo watch |
| `pnpm seed` | Crear usuario demo + sesión activa (`src/scripts/seed.ts`) |
| `NODE_OPTIONS=--experimental-vm-modules pnpm exec jest --coverage` | Medir cobertura |

### Frontend (`frontend/`)

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor de desarrollo de Vite (puerto 1420) |
| `pnpm build` | Compilar TypeScript + Vite build |
| `pnpm preview` | Vista previa de producción |
| `pnpm lint` | ESLint (flat config) |
| `pnpm tauri dev` | App de escritorio en desarrollo |
| `pnpm tauri build` | Build de la app de escritorio |
| `pnpm tauri android dev` / `build` | App Android en desarrollo / release |
| `pnpm exec vitest run` | Ejecutar tests unitarios (Vitest) |

### Landing Page (`landing-page/`)

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Iniciar servidor de desarrollo |
| `pnpm build` | Construir para producción |
| `pnpm preview` | Vista previa de producción |

---

## Integración Continua

`.github/workflows/ci.yml` corre en cada push y pull request con tres jobs:

| Job | Qué valida |
|---|---|
| `backend` | install frozen → `prisma generate` → `prisma validate` → `migrate deploy` contra `postgres:16` (detecta drift) → `pnpm test` → `pnpm build` |
| `frontend` | install frozen → `pnpm lint` → `vitest run` → `pnpm build` (el build corre `tsc`, así que el typecheck es obligatorio) |
| `landing-page` | install frozen → `pnpm build` |

Los tests del backend son **herméticos**: `jest.config.ts` inyecta las variables de entorno desde `src/tests/setup.ts`, así que el job de CI no necesita `.env` ni secretos (los JWT de test son valores explícitos y distintos de los de producción).

---

## API Endpoints

> Todas las rutas están montadas bajo **`/api/v1`**. Ejemplo: `GET /api/v1/books`. El contrato detallado por endpoint (request, response, errores) está en `specs/modules/api/`.

### Autenticación (JWT propio)

Access token de **15 min** + refresh de **7 días** con **rotación de un solo uso** (cada refresh invalida el anterior). Contraseñas con **bcrypt**. Los tokens viajan por cookies `httpOnly` (navegador), `Authorization: Bearer`, `x-session-token` o `x-refresh-token` (Tauri). El código de verificación de correo se envía por Resend; si el envío falla, se loguea y el registro continúa.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Registrar usuario (emite tokens + envía código de verificación) |
| `POST` | `/api/v1/auth/login` | Iniciar sesión |
| `POST` | `/api/v1/auth/refresh` | Renovar tokens (rota el refresh token) |
| `POST` | `/api/v1/auth/logout` | Cerrar sesión y revocar refresh token |
| `GET` | `/api/v1/auth/get-session` | Obtener sesión actual |
| `POST` | `/api/v1/auth/verify-email` | Verificar correo con el código recibido |
| `POST` | `/api/v1/auth/resend-verification` | Reenviar código de verificación |

### Libros (`/api/v1/books`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/books` | Obtener libros del usuario (con progreso) |
| `POST` | `/api/v1/books/upload` | Subir libro PDF (multipart, máx. 25 MB, dedup por hash SHA-256) |
| `GET` | `/api/v1/books/:id/download` | Descargar libro (URL firmada de R2, 15 min) |
| `GET` | `/api/v1/books/:id/stream` | Stream del PDF |
| `PATCH` | `/api/v1/books/:id/progress` | Actualizar progreso de lectura (solo avanza, nunca retrocede) |
| `DELETE` | `/api/v1/books/:id` | Eliminar libro (con auditoría; R2 solo si nadie más lo usa) |

### Marcadores (`/api/v1/books/:bookId/bookmarks`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/books/:bookId/bookmarks` | Obtener marcadores de un libro |
| `POST` | `/api/v1/books/:bookId/bookmarks` | Crear marcador |
| `PATCH` | `/api/v1/books/:bookId/bookmarks/:bookmarkId` | Actualizar nombre y preview (sin tocar página ni usuario) |
| `DELETE` | `/api/v1/books/:bookId/bookmarks/:bookmarkId` | Eliminar marcador |

### Rachas de Lectura (`/api/v1/streak`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/streak` | Obtener racha del usuario |
| `POST` | `/api/v1/streak/initialize` | Inicializar racha desde una fecha |
| `POST` | `/api/v1/streak/complete` | Marcar día completado (usa la fecha del cliente) |

### Health Check

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/health` | Estado de la API (DB + R2, timeout de 2s por dependencia) |

> Ejemplos listos para probar en `backend-express/http/` (`books.http`, `bookmarks.http`, `streaks.http`) y el contrato completo en `specs/modules/api/`.

---

## Arquitectura del Backend

`backend-express/src/` usa **módulos verticales** con capas internas. Cada feature (`auth`, `books`, `bookmarks`, `streak`) es autocontenida:

```
src/
├── config/            # Transversal: env, prisma, logger, error-handler, cors, origins, rate-limit
├── core/              # Compartido: errors/AppError, http/validate, storage/s3.client, upload
├── http/              # Composición de rutas + health check
├── modules/
│   └── <feature>/
│       ├── application/      # service + common/ (utils de la feature)
│       ├── domain/           # entities, types, interfaz del repositorio
│       ├── infrastructure/   # <feature>.prisma.repository.ts
│       ├── presentation/     # controller, dto (Zod), routes
│       └── _tests_/          # application/ (service) y presentation/ (HTTP)
├── scripts/           # seed.ts
├── tests/             # fakes.ts (repositorios fake) y setup.ts (env de test)
└── types/             # express.d.ts
```

La dirección de dependencia es única: `presentation → application → domain`, y `infrastructure` implementa los contratos que `application` declara. Los services nunca escriben en la base de datos: toda query pasa por el repositorio, incluso las transacciones (patrón `<repo>.transaction`). El detalle está en `specs/modules/backend/02-architecture.md`.

---

## Tecnologías Utilizadas

### Backend Express
- **Express** v5 — Framework HTTP
- **TypeScript** (strict, ESM) — Tipado estático
- **Prisma** v6 — ORM para PostgreSQL
- **Zod** v4 — Validación de esquemas en la frontera (`presentation/*.dto.ts`)
- **jsonwebtoken + bcrypt** — Autenticación JWT con rotación de refresh tokens
- **Cloudflare R2** — Almacenamiento de PDFs (S3-compatible)
- **Resend** — Envío del código de verificación de email
- **Pino + pino-http** — Logging estructurado (secretos redactados)
- **Helmet** — Seguridad HTTP
- **express-rate-limit** — Rate limiting (4 tiers)
- **Multer** — Upload de archivos (25 MB)
- **Jest** + **Supertest** — 150 tests en 12 suites

### Frontend
- **React** v19 — Biblioteca de UI
- **Vite** v7 — Build tool
- **Tauri** v2 — Shell de escritorio y Android
- **TypeScript** v5 — Tipado estático
- **React Router** v7 — Enrutamiento
- **Zustand** v5 — Estado global
- **React Hook Form** + **Zod** — Formularios
- **PDF.js** v5 — Extracción de texto de PDFs (`lib/pdf.ts`, worker resuelto por el bundler)
- **IndexedDB (idb)** — Almacenamiento offline / modo local
- **fetch + crossFetch** — Cliente HTTP (`api/client.ts`; el bridge de Tauri para desktop/Android)
- **Lucide React** — Iconos
- **Sonner** — Notificaciones toast
- **Vitest** + **Testing Library** — 78 tests en 10 archivos
- **ESLint** (flat config) — Linting

### Landing Page
- **Astro** v5 — Framework SSG
- **TypeScript** — Tipado estático
- **Prettier** — Formateo de código

---

## Rutas de la Aplicación

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/auth/login` | Público | Inicio de sesión |
| `/auth/register` | Público | Registro de usuario |
| `/` | Protegido | Biblioteca (búsqueda, filtros, vista estante/grilla/lista) |
| `/profile` | Protegido | Perfil, estadísticas, racha y configuración |

El **lector** no es una ruta: se muestra en lugar del contenido cuando `currentView === "reader"` en el store.

### Landing Page
- `/` — Página principal de marketing

---

## Despliegue

### Docker (producción)

El `docker-compose.yml` incluye el stack completo:

```bash
cp .env.example .env
# Configurar las variables según el entorno
docker compose up -d --build
```

### Frontend — standalone

```bash
cd frontend
docker build -t bookteka-web .     # inyecta VITE_API_URL=/api/v1
docker run -p 8080:8080 bookteka-web
```

La imagen sirve `dist/` con Nginx y proxya `/api/` al backend.

### Backend Express — standalone

```bash
cd backend-express
docker build -t bookteka-api .
docker run -p 3000:3000 bookteka-api
```

> En producción, el backend espera a PostgreSQL, corre `prisma migrate deploy` y arranca (`docker-entrypoint.sh`). Railway despliega con `RAILPACK` (`railway.toml`).

### Landing Page

Sitio estático, desplegable en cualquier hosting:

```bash
cd landing-page
pnpm build
# Subir contenido de dist/
```

---

## Especificaciones

La carpeta `specs/` es la **fuente de documentación** del proyecto, reconstruida desde el código real:

```
specs/
├── descripcion-proyecto.md      # Qué es el producto y qué queda fuera de alcance
├── documentacion-cliente.md     # Documento de negocio (12 secciones, lenguaje simple)
├── global-instruction.md        # Reglas para generar/modificar código en el repo
├── docs/                        # Ejecución local, buenas prácticas, RNF, glosario, decisiones (ADR)
├── modules/                     # backend/, db/, frontend/, api/ — por módulo
└── tasks/                       # Deuda técnica con archivo de origen y severidad 🔴🟠🟡
```

- Cada endpoint, tabla, pantalla y variable de entorno documentado cita su archivo real.
- `specs/tasks/` es el **único rastreador de trabajo**: el progreso se registra tikeando checkboxes en el propio archivo.
- Las decisiones arquitectónicas están en `specs/docs/07-decisiones.md`, con la evidencia que las forzó.

---

## Tests

### Backend Express — 150 tests / 12 suites

```bash
cd backend-express
pnpm test            # Ejecutar tests (Jest + Supertest) — no requiere .env
pnpm test:watch      # Modo watch
NODE_OPTIONS=--experimental-vm-modules pnpm exec jest --coverage   # 87% statements
```

Cobertura medida (2026-09-28): **87.22% statements / 78.85% branches / 70.14% functions / 87.51% lines**.

### Frontend — 78 tests / 10 archivos

```bash
cd frontend
pnpm exec vitest run    # Ejecutar tests unitarios
```

---

## Solución de Problemas

### Error de dependencias
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### El servidor no inicia
```bash
# Verificar qué proceso usa el puerto
lsof -i :3000    # Backend
lsof -i :1420    # Frontend (Vite)
lsof -i :4321    # Landing Page
```

### `Missing environment variable: X` al arrancar el backend
`env.ts` valida al arrancar y no arranca con variables faltantes. Revisa que `backend-express/.env` tenga todas las variables del `.env.example` y que `JWT_SECRET`/`JWT_REFRESH_SECRET` tengan 32+ caracteres. Los tests no tienen este problema: `src/tests/setup.ts` los inyecta.

### Errores 404 tipo `/api/v1/api/...` o `/api/auth/...`
El prefijo de la API es **`/api/v1`**. Verifica que:
1. `frontend/.env` tenga `VITE_API_URL=/api/v1`.
2. `BACKEND_HOST` y `VITE_BACKEND_HOST` **no** incluyan `/api/v1` (van solo el host y puerto).
3. Si cambiaste `.env`, reinicia el dev server (`pnpm dev`) — las variables se cargan al arrancar.

### Error de TypeScript
```bash
cd frontend
pnpm build    # Regenerar tipos
```

### Error de Prisma
```bash
cd backend-express
pnpm prisma:generate
npx prisma migrate dev
```

### Docker
```bash
# Reconstruir desde cero
docker compose down -v
docker compose build --no-cache
docker compose up
```

---

## Contribuir

1. **Fork** el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Realiza tus cambios y haz commit (`git commit -m 'feat: añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un **Pull Request**

### Convenciones

- **Conventional Commits** (`feat`, `fix`, `refactor`, `chore`, `doc`, scope opcional: `feat(backend): ...`)
- **ESLint** en frontend (`pnpm lint` debe pasar)
- **Prettier** para formato en landing-page
- TypeScript strict mode habilitado
- Los tests pasan antes de mergear: la CI los ejecuta en cada PR
- Si el cambio toca un contrato (endpoint, tabla, pantalla), actualiza el spec correspondiente y tikea la tarea en `specs/tasks/`

---

## Licencia

MIT. Consulta el archivo `LICENSE` para más detalles.

---

## Contacto

- ¿Encontraste un bug? [Abre un issue](https://github.com/orlandotellez/bookteka/issues)
- ¿Quieres contribuir? Revisa la sección de contribuciones arriba