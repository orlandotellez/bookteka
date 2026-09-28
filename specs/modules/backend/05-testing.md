# Backend Testing

Estrategia de pruebas del backend Express: qué cubre cada suite, qué no cubre nada, y qué comandos existen.

---

## Framework

| Herramienta | Versión | Rol |
|---|---|---|
| `jest` + `@jest/globals` | 30.x | Runner. |
| `ts-jest` | 29.x | Transformación de TypeScript con soporte ESM. |
| `supertest` | 7.x | Requests HTTP contra la app real de Express. |

Configuración en `backend-express/jest.config.ts`:

- Preset `ts-jest/presets/default-esm`, con `extensionsToTreatAsEsm: [".ts"]`.
- `testEnvironment: "node"`.
- `moduleNameMapper` resuelve tanto los imports relativos con `.js` como el alias `@/*`.
- `testMatch`: `**/__tests__/**/*.test.ts` y `**/?(*.)+(spec|test).ts`.
- `clearMocks: true`.

> **ESM requiere el flag de Node.** Por eso el script lleva `NODE_OPTIONS=--experimental-vm-modules`. Correr `npx jest` a mano sin ese flag falla.

---

## Comandos

```bash
cd backend-express
pnpm test              # NODE_OPTIONS=--experimental-vm-modules jest
pnpm test:watch        # lo mismo, en modo watch
```

```bash
NODE_OPTIONS=--experimental-vm-modules pnpm exec jest --coverage
```

La medición real (87% stmts) está en la sección de cobertura de este archivo.

---

## Niveles de prueba

El backend prueba en **dos niveles**, y esa es la decisión de diseño más importante de la suite.

### Nivel 1 — HTTP (Supertest sobre la app real)

Se monta la app de Express completa (con `requireAuth`, `validate`, rate limits y `errorHandler`) y se le hacen requests. Prueban el contrato: rutas, status codes, validaciones, mapeo de errores.

> **Importan `@/app`, no `@/server`.** `src/server.ts` es el bootstrap: abre un puerto e instala signal handlers. No debe estar en el camino del test. Además no tiene default export, así que `mod.default` daba `undefined` y TypeScript rechazaba la suite entera.

| Suite | Endpoints | Líneas |
|---|---|---|
| `src/modules/books/_tests_/presentation/books.routes.test.ts` | `GET /books`, `POST /books/upload`, `DELETE /books/:id`, `PATCH /books/:id/progress`, `GET /books/:id/download`, `GET /books/:id/stream` | 1005 |
| `src/modules/bookmarks/_tests_/presentation/bookmarks.routes.test.ts` | `GET/POST /books/:bookId/bookmarks`, `PATCH/DELETE /:bookmarkId` | 616 |
| `src/modules/streak/_tests_/presentation/streak.routes.test.ts` | `GET /streak`, `POST /streak/complete`, `POST /streak/initialize` | 412 |
| `src/tests/example.test.ts` | Plantilla | 5 |

### Nivel 2 — Service con repositorio fake

Se instancia el service con un repositorio falso inyectado por el constructor y se verifican las llamadas. Aíslan la lógica de negocio de HTTP y de base de datos.

| Suite | Cubre | Líneas |
|---|---|---|
| `src/modules/books/_tests_/application/books.service.test.ts` | `getUserBooks`, `uploadBook`, `deleteBook`, `updateBookProgress`, `downloadBookWithUrl`, `streamBookPdf` | 573 |
| `src/modules/streak/_tests_/application/streak.service.test.ts` | `getUserStreak`, `completeDay`, `initializeStreak` | 346 |
| `src/modules/bookmarks/_tests_/application/bookmarks.service.test.ts` | `getBookmarks`, `createBookmark`, `updateBookmark`, `deleteBookmark` | 214 |

**Total: 150 tests en 12 suites**.

### Por qué funciona la inyección

Los services reciben el repositorio por constructor con un default:
```ts
export class BookService {
  constructor(private readonly repo: BookRepository = bookRepository) {}
}
```
Un test puede hacer `new BookService(fakeRepo as unknown as BookRepository)`. `lib/auth.ts` tiene el mismo patrón: `issueTokens(user, headers?, client: Pick<typeof dbPrisma, "session"> = dbPrisma)`.

---

## Qué cubren bien las pruebas

Las reglas de negocio más difíciles están cubiertas:

| Regla | Suite |
|---|---|
| El progreso solo avanza si hay avance real (tolerancia de 50px en scroll) | `book.service.test.ts` — `updateBookProgress` |
| Deduplicación por hash SHA-256 | `book.service.test.ts` — `uploadBook` |
| El objeto de R2 solo se borra si no hay otros usuarios | `book.service.test.ts` — `deleteBook` |
| La auditoría se escribe dentro de la misma transacción que el borrado | `book.service.test.ts` — `deleteBook` |
| `403` cuando el libro no es del usuario | `bookmark.service.test.ts`, `book.test.ts` |
| La racha no se cuenta dos veces el mismo día | `streak.service.test.ts` — `completeDay` |
| La racha se reinicia en 1 si se saltó un día | `streak.service.test.ts` — `completeDay` |
| `clientDate` del cliente gana sobre la fecha del servidor | `streak.service.test.ts` |
| Carrera por `P2002` al crear la racha | `streak.service.test.ts` |
| `updateStreakConditionally` devuelve `null` si otro request ganó | `streak.service.test.ts` |

---

## Qué no cubre nada

| Área | Por qué importa | Tamaño |
|---|---|---|
| **`src/modules/auth/application/auth.service.ts`** | 373 líneas con toda la criptografía, el login, el registro, la rotación de tokens y la verificación de correo. **Cero tests.** | La pieza con más superficie de seguridad |
| **PUT de marcadores** | Cubierto desde `specs/tasks/backend/01-integridad-contrato.md`. | — |
| **`src/config/env.ts`** | Validación de secretos y longitud mínima. Sin test. | — |
| **`src/config/rate-limit.ts`** | Los cuatro limiters. Sin test. | — |
| **`src/config/cors.ts` + `src/config/origins.ts`** | Allowlist, el rechazo de `*`, `TRUST_BACKEND_ORIGINS`. Sin test. | — |
| **`src/http/health.ts`** | Ni el 503 cuando R2 no responde ni el timeout de 2s. Sin test. | — |
| **`src/config/error-handler.ts`** | El mapeo de códigos Prisma (P2002/P2025/P2003). Sin test. | — |
| **Límite de upload** | 413 cuando el PDF pasa los 25MB. Sin test. | — |
| **Alias `file` vs `pdf`** en el upload | Los dos campos están soportados; nadie verifica que ambos funcionen. | — |

Plan de cierre: `specs/tasks/backend/05-ci-y-calidad.md` tareas 3 y 4.

---

## Cobertura medida

`NODE_OPTIONS=--experimental-vm-modules pnpm exec jest --coverage` (2026-09-28):

| Métrica | Valor |
|---|---|
| Statements | **87.22%** |
| Branches | **78.85%** |
| Functions | **70.14%** |
| Lines | **87.51%** |

El test de cobertura corre con `testTimeout: 10_000` (jest.config.ts): bajo instrumentación la app completa tarda más de 5s en montarse. El flake del 401 que apareció en la tarea 04 era este timeout, no un bug.

**No hay umbral establecido en CI** — se mide, no se gatea. Si mañana se quiere umbral, el número real ya está acá para decidirlo con datos.

---

## Convenciones

| Tema | Convención |
|---|---|
| Ubicación | `src/modules/<feature>/_tests_/{application,presentation}/<feature>.<capa>.test.ts`. |
| Nombres de `describe` | Nombre del endpoint o del método, con la ruta real: `describe("PATCH /api/v1/books/:id/progress")`. |
| Nombres de `it` | En español, con `entonces` o la forma `hace X → Y`. |
| Aislamiento | `clearMocks: true` global. |
| Datos de prueba | Objetos literales en el test. No hay factories ni fixtures compartidos. |
| Módulo bajo prueba | `@/app`, nunca `@/server`. |
| Base de datos | Las suites de service usan repositorios fake. Las de HTTP usan Supertest contra la app: verificar si alguna necesita una base real antes de agregar una. |

### Plantilla

`src/tests/example.test.ts` es la referencia mínima del estilo del proyecto.

---

## Qué falta como infraestructura

| Gap | Consecuencia |
|---|---|
| **No hay CI** | `.github/` no existe. Nada corre estos tests automáticamente. |
| ~~Tests no herméticos~~ **✅ resuelto** | `src/tests/setup.ts` inyecta las variables vía `setupFiles` de Jest. Verificado: 123/123 tests con el `.env` fuera. La CI no necesita `.env`. |
| ~~No hay reporter de cobertura~~ **✅ medido** | 87.22% stmts / 87.51% lines. Ver sección de cobertura. |
| **No hay umbral** | Nada impide que caiga. |
| **No hay lint en el backend** | A diferencia del frontend, el backend no tiene ESLint ni siquiera instalado. |
| **No hay tests de integración contra PostgreSQL** | Las suites HTTP prueban el contrato pero no las queries reales de Prisma. `P2002`, `P2003` y los `updateMany` condicionales nunca se ejecutan contra una base. |
