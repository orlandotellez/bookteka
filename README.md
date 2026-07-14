# Bookteka

![TypeScript](https://img.shields.io/badge/typescript-%233178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/node.js-%23339933.svg?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![React](https://img.shields.io/badge/react-%2320232A.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![React Native](https://img.shields.io/badge/React%20Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1C1E24?style=for-the-badge&logo=expo&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Astro](https://img.shields.io/badge/astro-%23000000.svg?style=for-the-badge&logo=astro&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Rust](https://img.shields.io/badge/rust-%23000000.svg?style=for-the-badge&logo=rust&logoColor=white)
![Prisma](https://img.shields.io/badge/prisma-%232D3748.svg?style=for-the-badge&logo=prisma&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%232496ED.svg?style=for-the-badge&logo=docker&logoColor=white)

**Bookteka** es una plataforma completa para gestionar y leer libros digitales con seguimiento de progreso de lectura, disponible en web y dispositivos móviles.

## Estructura del Proyecto

Este monorepo contiene **cinco proyectos** independientes:

```
bookteka-repo/
├── backend-express/    # API REST (Express + TypeScript)
├── backend-rust/       # API REST (Rust — migración en progreso)
├── web-app/            # Aplicación web SPA (React + Vite)
├── mobile-app/         # Aplicación móvil (React Native + Expo)
├── landing-page/       # Página de marketing (Astro)
├── docker-compose.yml  # Orquestación completa del stack
└── .env.example        # Variables de entorno globales
```

| Proyecto | Tecnología | Propósito |
|----------|------------|-----------|
| `backend-express/` | Node.js + Express + TypeScript | API REST principal |
| `backend-rust/` | Rust | Migración del backend a Rust (en progreso) |
| `web-app/` | React 19 + Vite + TypeScript | Aplicación web de lectura |
| `mobile-app/` | React Native + Expo + TypeScript | Aplicación móvil |
| `landing-page/` | Astro + TypeScript | Página de marketing estática |

---

## Requisitos Previos

- **Node.js** (v20 o superior)
- **pnpm** (gestor de paquetes)
  ```bash
  npm install -g pnpm
  ```
- **Docker** y **Docker Compose** (para el stack completo)
- **Rust** (solo para desarrollo del backend-rust)

---

## Inicio Rápido (Docker — stack completo)

La forma más fácil de levantar todo el proyecto:

```bash
# 1. Clonar
git clone https://github.com/orlandotellez/bookteka.git
cd BOOKTEKA-REPO

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Levantar PostgreSQL + Backend + Frontend
docker compose up --build
```

Esto levanta:
- **PostgreSQL 16** en `localhost:5433`
- **Backend Express** en `localhost:3001`
- **Frontend Web** en `localhost:8081`

---

## Instalación Manual (por proyecto)

### Backend Express

```bash
cd backend-express
cp .env.example .env     # Configurar variables
pnpm install
pnpm prisma:generate     # Generar cliente Prisma
pnpm dev                 # Iniciar en modo desarrollo (puerto 3000)
```

### Web App

```bash
cd web-app
cp .env.example .env
pnpm install
pnpm dev                 # Iniciar en modo desarrollo (puerto 5173)
```

### Mobile App

```bash
cd mobile-app
cp .env.example .env
pnpm install
pnpm start               # Iniciar Expo dev server
pnpm android             # Abrir en Android
pnpm ios                 # Abrir en iOS
```

### Landing Page

```bash
cd landing-page
pnpm install
pnpm dev                 # Iniciar en modo desarrollo (puerto 4321)
```

---

## Configuración del Entorno

### Variables globales (raíz)

```env
# Base de datos
DATABASE_URL=postgres://usuario:password@localhost:5432/bookteka_db

# Backend
PORT=3000
FRONTEND_URL=http://localhost:5173
BETTER_AUTH_SECRET=tu_secret
BETTER_AUTH_URL=http://localhost:3000

# Cloudflare R2 (almacenamiento de archivos)
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=...
R2_PUBLIC_DOMAIN=...
R2_BUCKET=...

# Resend (emails)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### Web App

```env
VITE_API_URL=/api          # URL del backend
```

---

## Scripts Disponibles

### Backend Express (`backend-express/`)

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Iniciar servidor en modo desarrollo (tsx watch) |
| `pnpm build` | Compilar TypeScript + generar Prisma |
| `pnpm start` | Iniciar servidor en producción |
| `pnpm test` | Ejecutar tests (Jest) |
| `pnpm test:watch` | Tests en modo watch |

### Web App (`web-app/`)

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Iniciar servidor de desarrollo (Vite) |
| `pnpm build` | Compilar para producción |
| `pnpm lint` | Verificar código con ESLint |
| `pnpm preview` | Vista previa de producción |
| `pnpm test` | Ejecutar tests (Vitest) |
| `pnpm test:watch` | Tests en modo watch |

### Mobile App (`mobile-app/`)

| Comando | Descripción |
|---------|-------------|
| `pnpm start` | Iniciar Expo dev server |
| `pnpm android` | Abrir en Android |
| `pnpm ios` | Abrir en iOS |
| `pnpm web` | Abrir en navegador |

### Landing Page (`landing-page/`)

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Iniciar servidor de desarrollo |
| `pnpm build` | Construir para producción |
| `pnpm preview` | Vista previa de producción |

---

## API Endpoints

### Autenticación (Better Auth)

Toda la autenticación se maneja a través de **Better Auth** en `/api/auth/*`. El backend usa cookies para gestión de sesiones.

### Libros (`/api/books`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/books` | Obtener libros del usuario |
| `POST` | `/api/books/upload` | Subir libro PDF |
| `GET` | `/api/books/:id/download` | Descargar libro |
| `GET` | `/api/books/:id/stream` | Stream de PDF |
| `PATCH` | `/api/books/:id/progress` | Actualizar progreso de lectura |
| `DELETE` | `/api/books/:id` | Eliminar libro |

### Marcadores (`/api/books/:bookId/bookmarks`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/books/:bookId/bookmarks` | Obtener marcadores de un libro |
| `POST` | `/api/books/:bookId/bookmarks` | Crear marcador |
| `DELETE` | `/api/books/:bookId/bookmarks/:bookmarkId` | Eliminar marcador |

### Rachas de Lectura (`/api/streak`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/streak` | Obtener racha del usuario |
| `POST` | `/api/streak/initialize` | Inicializar racha |
| `POST` | `/api/streak/complete` | Marcar día completado |

### Health Check

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/health` | Estado de la API (DB + R2) |

---

## Tecnologías Utilizadas

### Backend Express
- **Express** v5 — Framework HTTP
- **TypeScript** — Tipado estático
- **Prisma** v6 — ORM para PostgreSQL
- **Zod** v4 — Validación de esquemas
- **Better Auth** v1.5 — Autenticación
- **Cloudflare R2** — Almacenamiento de PDFs
- **Resend** — Envío de emails
- **Pino** — Logging estructurado
- **Helmet** — Seguridad HTTP
- **express-rate-limit** — Rate limiting
- **Jest** + **Supertest** — Tests
- **Multer** — Upload de archivos

### Web App
- **React** v19 — Biblioteca de UI
- **Vite** v7 — Build tool
- **TypeScript** v5 — Tipado estático
- **React Router** v7 — Enrutamiento
- **Zustand** v5 — Estado global
- **Better Auth** — Autenticación
- **React Hook Form** + **Zod** — Formularios
- **PDF.js** v5 — Renderizado de PDFs
- **IndexedDB (idb)** — Almacenamiento offline
- **Axios** — Cliente HTTP
- **Lucide React** — Iconos
- **Sonner** — Notificaciones toast
- **Vitest** + **Testing Library** — Tests
- **ESLint** — Linting

### Mobile App
- **React Native** 0.81 — Framework móvil
- **Expo** v54 — Plataforma RN
- **Expo Router** v6 — Enrutamiento basado en archivos
- **TypeScript** — Tipado estático
- **Zustand** v5 — Estado global
- **React Hook Form** + **Zod** — Formularios
- **Expo SQLite** — Base de datos local
- **Expo SecureStore** — Almacenamiento seguro
- **Expo DocumentPicker** — Selección de archivos
- **WebView** — Visualización de PDFs
- **Lucide React Native** — Iconos

### Landing Page
- **Astro** v5 — Framework SSG
- **TypeScript** — Tipado estático
- **Prettier** — Formateo de código

---

## Rutas de la Aplicación

### Web App

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/auth/login` | Público | Inicio de sesión |
| `/auth/register` | Público | Registro de usuario |
| `/` | Protegido | Dashboard / Biblioteca |
| `/profile` | Protegido | Perfil de usuario |

### Mobile App

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/(auth)/login` | Público | Inicio de sesión |
| `/(auth)/register` | Público | Registro de usuario |
| `/(tabs)` | Protegido | Biblioteca + Perfil (tab bar) |
| `/reader/[id]` | Protegido | Lector de libros |

### Landing Page
- `/` — Página principal de marketing

---

## Despliegue

### Docker (producción)

El `docker-compose.yml` incluye el stack completo. Para producción:

```bash
# Usar el archivo de entorno de producción
cp .env.example .env
# Configurar las variables según el entorno
docker compose up -d --build
```

### Web App — standalone

```bash
cd web-app
docker build -t bookteka-web .
docker run -p 8080:8080 bookteka-web
```

También puede desplegarse en cualquier hosting estático (Vercel, Netlify, etc.):
```bash
cd web-app
pnpm build
# Subir contenido de dist/
```

### Backend Express — standalone

```bash
cd backend-express
docker build -t bookteka-api .
docker run -p 3000:3000 bookteka-api
```

### Landing Page

Sitio estático, desplegable en cualquier hosting:
```bash
cd landing-page
pnpm build
# Subir contenido de dist/
```

---

## Backend Rust (migración en progreso)

Actualmente se está migrando el backend de Express a Rust. El proyecto está en fase inicial.

```bash
cd backend-rust
cargo build
```

---

## Estructura de Archivos

### Backend Express
```
backend-express/
├── src/
│   ├── __tests__/       # Tests automatizados
│   ├── config/          # Configuración (env, prisma, cors, rate-limit)
│   ├── controllers/     # Controladores de rutas
│   ├── dto/             # Data Transfer Objects
│   ├── helper/          # Utilidades
│   ├── lib/             # Auth, R2, Logger
│   ├── middleware/       # Auth, validación, error handler
│   ├── repositories/    # Acceso a datos
│   ├── routes/          # Definición de rutas
│   ├── schema/          # Esquemas Zod
│   ├── services/        # Lógica de negocio
│   ├── types/           # Tipos TypeScript
│   └── server.ts        # Entry point
├── prisma/              # Esquema y migraciones Prisma
├── http/                # Archivos para tests HTTP
├── doc/                 # Documentación
├── Dockerfile
└── package.json
```

### Web App
```
web-app/
├── src/
│   ├── __tests__/       # Tests con Vitest + Testing Library
│   ├── api/             # Cliente Axios
│   ├── assets/          # Recursos estáticos
│   ├── components/      # Componentes React
│   ├── context/         # Contextos (Theme, etc.)
│   ├── database/        # IndexedDB (idb)
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilidades (PDF, auth)
│   ├── pages/           # Páginas de la app
│   ├── routes/          # Configuración de rutas
│   ├── store/           # Zustand stores
│   ├── types/           # Tipos TypeScript
│   ├── utils/           # Funciones auxiliares
│   └── validations/     # Esquemas Zod
├── public/              # Assets públicos
├── Dockerfile
├── nginx.conf           # Configuración Nginx para producción
├── vite.config.ts
└── vitest.config.ts
```

### Mobile App
```
mobile-app/
├── app/                 # Expo Router (rutas basadas en archivos)
│   ├── (auth)/          # Login, Register
│   ├── (tabs)/          # Biblioteca, Perfil
│   ├── reader/          # Lector de libros
│   ├── _layout.tsx      # Root layout
│   └── +not-found.tsx
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── features/        # Lógica y UI por feature
│   ├── hooks/           # Custom hooks
│   ├── store/           # Zustand stores
│   ├── shared/          # Componentes compartidos
│   └── utils/           # Utilidades
├── assets/              # Imágenes y recursos
├── app.config.ts        # Configuración de Expo
└── package.json
```

### Landing Page
```
landing-page/
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── layouts/         # Layouts de página
│   ├── pages/           # Páginas (Astro)
│   └── styles/          # Estilos globales
├── public/              # Assets estáticos
├── astro.config.mjs
└── package.json
```

---

## Tests

### Backend Express
```bash
cd backend-express
pnpm test            # Ejecutar tests
pnpm test:watch      # Modo watch
```
Usa **Jest** + **Supertest** para tests de integración.

### Web App
```bash
cd web-app
pnpm test            # Ejecutar tests
pnpm test:watch      # Modo watch
```
Usa **Vitest** + **Testing Library** para tests unitarios y de componentes.

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
lsof -i :5173    # Web App
lsof -i :4321    # Landing Page
```

### Error de TypeScript
```bash
cd web-app
pnpm build    # Regenerar tipos
```

### Error de Prisma
```bash
cd backend-express
pnpm prisma:generate
pnpm prisma:migrate-dev
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

- **ESLint** para consistencia en web-app
- **Prettier** para formato en landing-page
- **Conventional Commits**
- TypeScript strict mode habilitado

---

## Licencia

MIT. Consulta el archivo `LICENSE` para más detalles.

---

## Contacto

- ¿Encontraste un bug? [Abre un issue](https://github.com/orlandotellez/bookteka/issues)
- ¿Quieres contribuir? Revisa la sección de contribuciones arriba
