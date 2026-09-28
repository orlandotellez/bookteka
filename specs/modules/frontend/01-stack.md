# Frontend Stack

Stack tecnológico de la app React del Bookteka.

## Runtime

| Dep | Versión | Propósito |
|---|---|---|
| React | 19.x | UI library. |
| Vite | 7.x | Build tool / dev server (port 1420, strictPort). |
| TypeScript | 5.9 | Static typing (strict). |

## UI

| Dep | Propósito |
|---|---|
| CSS Modules | Estilos scoped (`PascalCase.module.css`). |
| `lucide-react` | Iconos SVG. |
| `sonner` | Notificaciones toast (global `Toaster` en `App.tsx`). |
| `ThemeContext` + `ThemeWrapper` | Tema claro/oscuro via `data-theme` en `body`. |

## Routing & estado

| Dep | Propósito |
|---|---|
| React Router 7 | Routing cliente (`/auth/login`, `/auth/register`, `/`, `/profile`). |
| Zustand 5 | Estado global: `bookStore`, `streakStore`, `userPreferencesStore`. |
| React Context | Theme, AppBootstrap. |

## Forms & validación

| Dep | Propósito |
|---|---|
| react-hook-form | Formularios (login, register, modals). |
| `@hookform/resolvers/zod` | Validación con Zod. |
| zod | Schemas (`src/validations/loginValidations.ts`). |

## API / data fetching

| Dep | Propósito |
|---|---|
| fetch nativo + `crossFetch` | HTTP centralizado en `src/api/client.ts`. |
| Tauri `invoke("http_request")` | Bridge Rust (reqwest) en desktop/Android. |
| `sessionToken.ts` | Tokens JWT en localStorage (`bookteka.access_token`, `bookteka.refresh_token`). |
| `sessionCache.ts` | Cache de sesión TTL 5 min con refresh en background. |
| `api-config.ts` | Bootstrap de URL (remoto `config-api.json` + fallback + localStorage). |

> Nota: `axios` sigue en `package.json` pero el código migró al client unificado basado en fetch (port de pos-system).

## Persistencia offline

| Dep | Propósito |
|---|---|
| `idb` | IndexedDB (`bookteka-db`, v4): books, bookmarks, highlights, userProfile, streaks. |

## PDF

| Dep | Propósito |
|---|---|
| `pdfjs-dist` 5.4.624 | Extracción de texto de PDFs. Worker cargado como módulo en `lib/pdfExtractor.ts`; en `lib/pdfService.ts` se apunta a `/pdf.worker.min.js` (⚠️ ese archivo **no existe** en `public/` — ver `specs/tasks/frontend/02-pdf-worker.md`). |

## Desktop (Tauri)

| Dep | Propósito |
|---|---|
| Tauri 2.x | Shell nativo desktop + Android (`src-tauri/` con `gen/android`). |
| `@tauri-apps/api` | IPC (`invoke`). |
| `@tauri-apps/plugin-opener` | Abrir links externos. |
| `reqwest` (Rust) | Cliente HTTP nativo del comando `http_request` (gzip, brotli, http2, rustls). |

---

## Dual-target build

| Target | Comando | Output |
|---|---|---|
| Web dev | `pnpm dev` | `http://localhost:1420` (Vite) |
| Web prod | `pnpm build` | `dist/` |
| Tauri dev | `pnpm tauri dev` | ventana nativa con HMR Vite embebido |
| Tauri prod | `pnpm tauri build` | binario desktop |
| Android dev | `pnpm tauri android dev` | APK debug |
| Android prod | `pnpm tauri android build` | APK release |

Mismo `index.html` + mismo JS bundle. Tauri solo agrega la window chrome / WebView.

---

## Variables de entorno (Vite)

| Var | Default | Propósito |
|---|---|---|
| `VITE_API_URL` | `/api/v1` | Prefijo de la API. |
| `BACKEND_HOST` | `http://localhost:3000` | Host del backend para el proxy de Vite (SIN ruta). |
| `VITE_BACKEND_HOST` | — | Host LAN del backend para Android (SIN ruta). |
| `VITE_FORCE_PRODUCTION` | — | `true` fuerza el modo bootstrap remoto en dev (`pnpm run production:mode`). |

> ⚠️ `BACKEND_HOST`/`VITE_BACKEND_HOST` van **sin** `/api/v1`. Si los incluyes se duplica el prefijo (`/api/v1/api/...`).

---

## Filesystem layout (resumen)

```
frontend/
├── public/
│   ├── tauri.svg
│   └── vite.svg            # ⚠️ no hay pdf.worker.min.js (lo apunta lib/pdfService.ts)
├── src-tauri/                 # Shell nativo Tauri (escrito en Rust, parte del frontend)
│   ├── tauri.conf.json        # productName "bookteka", version 1.1.0, devUrl :1420
│   ├── capabilities/default.json
│   ├── gen/android/           # proyecto Android generado
│   └── src/{main.rs, lib.rs, http_client.rs}   # comando `http_request` (reqwest)
├── index.html                 # splash estático + script inline de tema (6 temas)
├── vite.config.ts             # proxy /api → BACKEND_HOST, port 1420
├── config-api.json            # URL de producción para el bootstrap
├── Dockerfile + nginx.conf    # build web
└── src/
    ├── main.tsx               # StrictMode > AppBootstrap > BrowserRouter > ThemeProvider > AppRoutes
    ├── App.tsx                # ThemeWrapper + Layout + Outlet + Toaster
    ├── index.css              # CSS vars por data-theme (6 temas)
    ├── routes/                # AppRoutes, ProtectedRoute, PublicRoute
    ├── context/               # ThemeContext, AppBootstrap
    ├── pages/                 # Index, Profile, auth/{Login,Register}, NotFound
    ├── components/
    │   ├── common/            # Input, Spinner, Loading, IconTheme, CloudSyncToggle
    │   ├── layout/            # Layout, Header
    │   ├── modals/            # ShowUploaderModal, DeleteModal, EditTimeModal, OpenBookModal
    │   └── pages/             # auth/, index/, profile/, reader/
    ├── api/                   # client.ts, auth.ts, book.ts, bookmark.ts, streak.ts, index.ts
    ├── database/              # schema.ts, connection.ts, sync.ts, features/{books,bookmarks,highlights,streaks,user}
    ├── store/                 # bookStore.ts, streakStore.ts, userPreferencesStore.ts
    ├── hooks/                 # useBooks.tsx (⚠️ sin uso), useReadingTimer.tsx
    ├── lib/                   # api-config, fetch, sessionToken, sessionCache, auth-api, useAuthSession, pdfService, pdfExtractor, apiEnv
    ├── types/                 # auth.ts, book.d.ts, reading.d.ts, user.d.ts
    ├── utils/                 # debounce, generateId, time, text
    ├── validations/           # loginValidations.ts
    ├── test/setup.ts          # setup de Vitest
    └── __tests__/             # Vitest + Testing Library (59 tests en 8 archivos)
```

---

## Path aliases

```jsonc
// tsconfig.app.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

Uso: `import { api } from "@/api/client"`.
