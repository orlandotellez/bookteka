# 04 — Buenas prácticas

Las convenciones que el código ya sigue. Cuando agregues código nuevo, seguí estas; cuando toques código viejo, no las rompas.

---

## Convenciones de código

### Backend (`backend-express/`)

| Tema | Convención | Ejemplo real |
|---|---|---|
| Módulos | ESM. **Todo import local termina en `.js`**, aunque el fuente sea `.ts`. | `import { env } from "@/config/env.js"` |
| Alias | `@/*` → `src/*`. Resuelto por `tsconfig.json` paths, `tsc-alias` en build y `moduleNameMapper` en Jest. | `import { AppError } from "@/helper/errors.js"` |
| Archivos | `snake_case` con sufijo de rol. | `book.controller.ts`, `bookmark.service.ts` |
| Clases | `PascalCase`. | `BookService`, `BookRepository` |
| Exports de servicio | Singleton instanciado en el mismo archivo. **Métodos de instancia, nunca `static`.** | `export const bookService = new BookService()` |
| Funciones | `camelCase`. | `normalizedFileName`, `getUTCDateOnly` |
| Constantes | `UPPER_SNAKE_CASE`. | `ACCESS_TOKEN_SECONDS`, `SCROLL_TOLERANCE_PX` |
| Schemas Zod | `PascalCase` + `Schema`. | `UpdateBookProgressBodySchema` |
| Códigos de error | `UPPER_SNAKE`. | `AppError("FORBIDDEN", 403, "No es tu libro")` |
| DTOs | Sufijo según el propósito. | `UploadBookRequestDTO`, `DeleteBookResponseDTO` |
| Interfaces de repositorio | Prefijo `I`. | `IBookRepository`, `IStreakRepository` |

**Tipos estrictos**: `tsconfig.json` tiene `"strict": true`. Para estrechar tipos, `unknown` + narrowing, nunca `any` ni `@ts-ignore`.

### Frontend (`frontend/`)

| Tema | Convención | Ejemplo real |
|---|---|---|
| Componentes | `PascalCase.tsx`, siempre function component. | `CardBook.tsx`, `StreakCard.tsx` |
| Hooks | `use<Thing>.ts(x)`. | `useReadingTimer.tsx`, `useAuthSession.ts` |
| Stores | `use<Thing>Store` + `Store.ts`. | `useBookStore` en `bookStore.ts` |
| Módulos de API | `<feature>.ts`, kebab no, un feature por archivo. | `api/book.ts`, `api/streak.ts` |
| Estilos | **CSS Modules** (`PascalCase.module.css`). Prohibido Tailwind, styled-components y Emotion. | `CardBook.module.css` |
| Colores y spacing | **Variables CSS** de `index.css`. Nada hardcodeado. | `var(--secondary-color)` |
| Colores de tema | Vía `data-theme`, nunca condicionales en TS. | `[data-theme="dark"]` |
| Tipos | `interface` para objetos, `type` para unions. | `type View = "library" \| "reader" \| "profile"` |
| Imports de API | Siempre `@/api/...`. **Nunca `fetch` directo en una page.** | `import { booksApi } from "@/api/book"` |
| Iconos | `lucide-react`. Nada de SVGs sueltos. | `<Cloud size={16} />` |

### Base de datos

- **Nombres de tabla singulares**, salvo `users`. Solo 4 de los 9 modelos declaran `@@map`; ver `modules/db/schemas/README.md` antes de escribir SQL.
- **Migraciones inmutables**: nunca edites una migración ya aplicada. Generá una nueva con `prisma migrate dev --name <nombre>`.
- **Sin datos en el repo**: `.env` está en `.gitignore`.

---

## Estructura de carpetas

### Backend — una carpeta por capa, un archivo por feature

```
routes/       un router por feature
controllers/  capa HTTP: extrae req, llama service, responde
services/     lógica de negocio
repositories/ queries de datos
schema/       schemas Zod
dto/          tipos de request/response
middleware/   requireAuth, validate, errorHandler
config/       env, prisma, cors, rate-limit, http-logger, shutdown, db
lib/          auth, r2, email, logger, origins
helper/       errors, express, format, r2, time
```

**La dirección de las dependencias es una sola**: `routes → controllers → services → repositories`. Un controller nunca escribe una query; un service nunca toca `req` ni `res`.

### Frontend — componentes por sub-pantalla

```
pages/         rutas (Index, Profile, auth/, NotFound)
components/
  common/      reusables (Input, Spinner, Loading, IconTheme, CloudSyncToggle)
  layout/      Layout, Header
  modals/      ShowUploaderModal, DeleteModal, EditTimeModal, OpenBookModal
  pages/       auth/, index/, profile/, reader/ — un componente por sub-pantalla
api/           un módulo por dominio
database/      IndexedDB: schema, connection, sync, features/
store/         Zustand
lib/           infraestructura (fetch, session, pdf, api-config)
```

> Las features van en `components/pages/<feature>/`, no sueltas en `components/`. Es el resultado de un refactor reciente (`ba2aaec`).

---

## Errores y logging

### Backend

| Situación | Cómo |
|---|---|
| Error de negocio esperado | `throw new AppError("CODE", status, "mensaje en español")` desde el **service**. |
| Error de validación | Dejar que lo tire Zod. El middleware `validate` lo convierte en `ZodError` y el `errorHandler` lo mapea a 400. |
| Error inesperado | Dejar que suba. `errorHandler` loguea con `req.log.error({ err }, "Unhandled exception")` y responde 500 sin filtrar detalles. |
| Mensajes al usuario | En español, sin capitalizar código ni filtrar stack. |

**Nunca** escribas `res.status(500)` a mano en un controller. El `errorHandler` es el único que arma el shape de error.

**Logger**: `pino` con `redact` de `authorization`, `cookie`, `password`, `secret` y `token`. `pino-http` asigna un `req.id` (respeta el header `x-request-id` si viene) y lo devuelve en la respuesta. El health check queda fuera del log automático.

**Logging en el service**: `logger.debug` para decisiones internas (ej. un `PATCH /progress` que no hizo nada), `logger.warn` para degradaciones (R2 caído, DB no alcanzable en el health check).

### Frontend

| Situación | Cómo |
|---|---|
| Error de API | `ApiError` (ya extrae el mensaje de `{ error \| message }`). No reimplementar el parseo. |
| Error en una acción de store | `try/catch` → `console.error("[Dominio] ...:", error)` + `set({ error: "..." })`. **Nunca dejar que rechace sin capturar.** |
| Falla de sync con el cloud | `console.error` y **seguir adelante** con el dato local. El modo offline manda. |
| Mensaje al usuario | `toast` de `sonner` para acciones, texto inline en formularios. |
| Error de sesión | `console.warn`, nunca `console.log`. |

`console.log` está prohibido salvo depuración puntual. No se filtran tokens ni contraseñas en logs.

---

## Commits y ramas

**Conventional Commits.** El historial del repo lo respeta de forma consistente:

```
feat(frontend): agregar paginación en la sección de todos los libros
fix: eliminar scroll horizontal persistente en vista estante
refactor(frontend): separar en componentes la pagina de Profile
chore(frontend): quitar filtro no utilizado para simplificar
doc(specs): agregar carpeta de specs al proyecto
```

| Prefijo | Para qué |
|---|---|
| `feat` | Comportamiento nuevo. |
| `fix` | Corrección de bug. |
| `refactor` | Reestructuración sin cambio de comportamiento. |
| `chore` | Limpieza, dependencias, configuración. |
| `doc` | Documentación. |

Scope opcional, entre paréntesis, aligning al proyecto tocado (`frontend`, `backend`, `specs`).

**Ramas**: el repo no tiene convención documentada ni ramas remotas de referencia. Cuando se defina una, anotarla acá.

---

## Revisión de código

**No hay CI en este repositorio** (`.github/` no existe). La verificación es manual y local:

### Backend

```bash
cd backend-express
pnpm test        # debe pasar completo
pnpm build       # prisma generate + tsc + tsc-alias
```

Checklist:

- [ ] `pnpm test` pasa.
- [ ] `pnpm build` pasa (typecheck estricto).
- [ ] Si tocaste una ruta: la entrada aparece en `src/routes/*.routes.ts` **y** en `src/__tests__/` hay un test HTTP.
- [ ] Si tocaste un service: hay un test con repositorio fake inyectado por constructor.
- [ ] Si tocaste el schema Prisma: hay una migración nueva y `modules/db/schemas/` está actualizado.
- [ ] Los errores de negocio son `AppError`, no `res.status(...)`.
- [ ] Ningún dato sensible en logs ni en la respuesta.

### Frontend

```bash
cd frontend
pnpm exec vitest run
pnpm build       # tsc + vite build
```

Checklist:

- [ ] `pnpm exec vitest run` pasa.
- [ ] `pnpm build` pasa.
- [ ] Si tocaste `bookStore` o `database/`: probaste alta, borrado, progreso, sync y offline.
- [ ] Si tocaste `api/*` o `sessionToken`: probaste login, refresh, get-session y logout.
- [ ] Verificaste el tema claro **y** el oscuro, y que el splash no parpadee.
- [ ] Sin `any`, sin `@ts-ignore`, sin `console.log`.
- [ ] El componente nuevo va en `components/pages/<feature>/`, no suelto en `components/`.

### Antes de abrir un PR

- [ ] Actualizar el spec del módulo si cambió un contrato (endpoint, tabla, pantalla).
- [ ] Revisar `specs/tasks/` y tickear lo que este PR cierra.
- [ ] El mensaje del commit sigue Conventional Commits.
