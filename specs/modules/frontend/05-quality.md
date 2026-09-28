# Frontend Quality

Convenciones de calidad del código del frontend React de Bookteka: build, typecheck, lint, testing, accesibilidad, performance.

---

## Build

```bash
pnpm build    # tsc && vite build
```

- `tsc` corre primero (typecheck estricto) y luego `vite build`.
- `pdfjs-dist` entra al bundle y dispara el warning de chunk grande de Vite (>500KB). Es esperado: el worker de PDF pesa ~1MB. No hay métricas de bundle commiteadas en el repo; si necesitás números, medilos con `pnpm build` y anotá el resultado acá.

---

## TypeScript (strict)

`frontend/tsconfig.json` + `tsconfig.app.json`:

- `"strict": true`
- `"baseUrl": "."` + `paths: { "@/*": ["src/*"] }`
- `"moduleResolution": "bundler"` (o similar Vite)
- `"jsx": "react-jsx"`

> `pnpm build` (que corre `tsc`) debe pasar limpio antes de mergear.

---

## Testing (Vitest + Testing Library)

```bash
pnpm exec vitest run
```

Configuración en `vite.config.ts` → `test: { environment: "jsdom", setupFiles: "./src/test/setup.ts" }`.

### Cobertura actual (59 tests / 8 archivos)

| Archivo | Cubre |
|---|---|
| `__tests__/components/Loading.test.tsx` | Loading con/sin subtexto. |
| `__tests__/components/Spinner.test.tsx` | Spinner. |
| `__tests__/components/ShowUploaderModal.test.tsx` | Modal de upload (6 tests). |
| `__tests__/components/PDFUploader.test.tsx` | Uploader de PDF. |
| `__tests__/utils/time.test.ts` | Helpers de tiempo. |
| `__tests__/utils/generateId.test.ts` | Generación de IDs. |
| `__tests__/utils/text.test.ts` | normalizeText. |
| `__tests__/store/bookStore.test.ts` | Store principal (Zustand), 20 tests. |

> Sin cobertura de tests: `streakStore`, `userPreferencesStore`, `api/*`, `database/sync.ts`, `routes/*` y toda la vista `reader/`. Ver `specs/tasks/frontend/`.

### Convenciones

- Tests en `__tests__/` (o `*.test.ts(x)` junto al archivo).
- Descripciones en español.
- `@testing-library/jest-dom` + `@testing-library/react` + `user-event`.

---

## Lint / Formato

- ESLint 9 (flat config) + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`.
- Reglas clave: `no-unused-vars`, `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, `react-refresh/only-export-components`.
- Prettier aplicado a landing-page; frontend usa ESLint.

---

## Naming

| Concepto | Convención |
|---|---|
| Component | `PascalCase`. |
| Component file | `PascalCase.tsx`. |
| Hook | `use<Thing>.ts(x)`. |
| Store | `use<Thing>Store` (Zustand). |
| API module | `<feature>.ts` (`auth.ts`, `book.ts`). |
| Type / interface | `PascalCase`. |
| CSS module | `PascalCase.module.css`. |
| Constante | `UPPER_SNAKE` para globales inmutables (`DB_NAME`, `API_URL_STORAGE_KEY`). |

---

## React patterns

- Function components siempre. No class components.
- Custom hooks para lógica reutilizable (`useReadingTimer`, `useBooks`, `useAuthSession`).
- `useMemo`/`useCallback` solo cuando se justifica (listas filtradas de Library, handlers pasados a children).
- Keys estables en listas (`book.id`, `bookmark.id`).
- Zustand con `set`/`get`; persistencia con `persist` middleware.

---

## API patterns

- Siempre via `src/api/<feature>.ts`, nunca fetch directo en pages.
- `ApiError` con `status` + `message`.
- Stores hacen try/catch y setean `error` en el store; pages muestran toast o mensaje inline.
- Requests con `keepalive` para datos críticos al cerrar la app.

---

## Accesibilidad (a11y)

- Inputs con `<label htmlFor>` (componente `Input`).
- `alt` en imágenes reales; iconos decorativos con `alt` descriptivo.
- `aria-busy` en botones con carga; `role="status"` en splash.
- Contraste AA con los tokens de tema (verificar en dark).

---

## Performance

| Regla | Implementación |
|---|---|
| PDF bajo demanda | Se descarga/extrae solo cuando abrís el libro (`getBookById`). |
| Coalescing de progreso | PATCH /progress agrupados 3s por libro. |
| keepalive en unload | `flushPendingCloudProgress(bookId, { keepalive: true })` en `pagehide`. |
| Worker de PDF separado | `pdf.worker.min.js` fuera del bundle principal. |
| Paginación local | 6 libros por página (evita render de listas enormes). |

---

## Code review checklist

Antes de pedir review, verificar:

- [ ] `pnpm build` (tsc + vite) pasa.
- [ ] `pnpm exec vitest run` pasa.
- [ ] Manual smoke test del flujo cambiado (con backend dev corriendo).
- [ ] Si cambiás `bookStore`/`database`: probado add/delete/progress + sync cloud + offline.
- [ ] Si cambiás `authApi`/`sessionToken`: probado login + logout + refresh + get-session.
- [ ] Si cambiás `api/<feature>.ts`: verificar headers de sesión y URLs (`/api/v1`).
- [ ] Si cambiás CSS: verificar tema claro + oscuro (+ splash sin flash blanco).
- [ ] Sin `any`, sin `// @ts-ignore`, sin `console.log` (usar `console.warn`/`error` con contexto).

---

## Anti-patterns prohibidas

- ❌ `any` (usar `unknown` + narrowing).
- ❌ `useEffect` para derivar estado (usar `useMemo`).
- ❌ Mutación directa de estado de Zustand (siempre `set`).
- ❌ Fetch directo en pages (siempre `api/`).
- ❌ URLs hardcodeadas (usar `readApiUrl()` + paths relativos `/api/v1`).
- ❌ Romper el transporte de sesión (cookie + headers deben coexistir).
- ❌ Componentes > 300 líneas — dividir.
