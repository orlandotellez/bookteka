# API Conventions

Convenciones REST transversales para todos los endpoints del backend Bookteka (Express).

---

## Versionado y base URL

| Item | Valor |
|---|---|
| Prefijo global | `/api/v1` |
| Health check | `GET /api/v1/health` |
| Ejemplo base URL dev | `http://localhost:3000/api/v1` |
| Ejemplo base URL Docker | `http://localhost:3001/api/v1` |

---

## HTTP Methods

| Method | Uso |
|---|---|
| `GET` | Lectura (idempotente). Sin body. |
| `POST` | Crear o ejecutar acción. Body JSON o multipart (upload). |
| `PATCH` | Actualización parcial (progreso). |
| `DELETE` | Borrado (con auditoría en books). |

---

## Autenticación

### Transportes soportados (todos válidos en `getSession`/`requireAuth`)

```http
Cookie: accessToken=eyJ...; refreshToken=eyJ...
```
```http
Authorization: Bearer eyJ...
```
```http
x-session-token: eyJ...
x-refresh-token: eyJ...   # solo refresh/logout
```

| Transporte | Plataforma |
|---|---|
| Cookie `httpOnly` | Web (navegador) |
| `Authorization: Bearer` | Clientes HTTP / tests |
| `x-session-token` / `x-refresh-token` | Tauri desktop/Android (WebView cross-site sin cookies) |

### Tokens

| Token | Expira | Contenido |
|---|---|---|
| Access | 15 min | `{ userId, email, role, exp }` |
| Refresh | 7 días | `{ userId, jti (uuid), exp }` + fila en `session` |

### Cookies (login / register / refresh)

| Cookie | httpOnly | Secure (prod) | SameSite (prod / dev) |
|---|---|---|---|
| `accessToken` | sí | sí | `none` / `lax` |
| `refreshToken` | sí | sí | `none` / `lax` |

`Path=/`. MaxAge en ms. Logout limpia ambas con `Max-Age=0` + borra la sesión.

---

## Errores

Shape principal (AppError):

```json
{ "error": "Credenciales inválidas", "code": "UNAUTHORIZED" }
```

Shape de validación (Zod):

```json
{
  "error": "Validation failed",
  "details": [{ "path": "email", "message": "Email inválido" }]
}
```

### Mapeo `Http status + código`

| Status | Código típico | Usar para |
|---|---|---|
| 400 Bad Request | `VALIDATION`, `BAD_REQUEST` | Datos inválidos (Zod), multer. |
| 401 Unauthorized | `UNAUTHORIZED` | Sin token / token inválido / credenciales inválidas / sesión revocada. |
| 403 Forbidden | `FORBIDDEN` | Acceso a libro que no es tuyo. |
| 404 Not Found | `NOT_FOUND` | Recurso no existe. |
| 409 Conflict | `CONFLICT` | Email ya registrado, duplicado. |
| 413 Payload Too Large | `LIMIT_FILE_SIZE` | PDF > 25MB. ⚠️ el mensaje del errorHandler dice "(20MB)" pero el límite real de Multer es 25MB (mensaje desactualizado en el código). |
| 429 Too Many Requests | — | Rate limit excedido. |
| 500 Internal Server Error | `INTERNAL_ERROR` | Bug. Log full stack, mensaje genérico al cliente. |

---

## Validación (Zod 4)

- Schemas en `src/modules/<feature>/presentation/<feature>.dto.ts`.
- El middleware `validate({ body?, params?, query? })` corre en la ruta.
- Falla → `ZodError` → 400 con `details`.

Ejemplo real (`src/modules/books/presentation/books.dto.ts`):

```ts
// El id NO se valida como UUID: es un string no vacío.
const ID = z.string().min(1, "id requerido");
export const BookIdParamSchema = z.object({ id: ID });

export const UpdateBookProgressBodySchema = z.object({
  readingTimeSeconds: z.number().int().nonnegative().optional(),
  currentPage: z.number().int().nonnegative().optional(),
  scrollPosition: z
    .number().nonnegative().finite()
    .transform((v) => Math.round(v))   // el cliente manda floats
    .optional(),
  lastReadAt: z.preprocess(
    (v) => (v === undefined ? v : new Date(v as string | number)),
    z.date({ error: "lastReadAt debe ser string o número" })
      .refine((d) => !isNaN(d.getTime()), { message: "lastReadAt inválido" }),
  ).optional(),
});
```

- **Ninguna validación exige UUID.** Los ids viajan como `TEXT` y el schema solo exige que no estén vacíos.
- `lastReadAt` y `clientTimestamp` usan `preprocess` para aceptar string ISO-8601 o epoch ms, y `refine(!isNaN)` para rechazar el `Invalid Date` que antes se persistía silenciosamente como `null`.
- Los schemas de body **no usan `.strict()`**: claves desconocidas se descartan en silencio (comportamiento por defecto de Zod, `.strip()`). Documentado en el propio `book.schema.ts`.
- `CompleteDayBodySchema` usa `.default({})` para permitir bodies vacíos.

---

## Upload de archivos

- `POST /books/upload` → `multipart/form-data`.
- Multer `memoryStorage`, límite **25 MB** → 413.
- Campos aceptados: `file` o `pdf` (alias), más `title`, `author`, `readingTimeSeconds`, `scrollPosition`, `currentPage`.
- El backend hashea el buffer (SHA-256) y deduplica.

---

## Respuestas de listas

`GET /books` devuelve un array plano (sin paginación):

```json
[
  {
    "id": "uuid",
    "name": "El Quijote.pdf",
    "author": "Cervantes",
    "createdAt": 1710000000000,
    "lastReadAt": 1710000000000,
    "readingTimeSeconds": 120,
    "scrollPosition": 4500,
    "currentPage": 42,
    "fileUrl": "https://...",
    "fileKey": "books/uuid/...",
    "isSynced": true
  }
]
```

> Fechas en **timestamps numéricos (ms)** en esta respuesta específica; el resto de la API usa ISO-8601.

---

## Headers de respuesta standard

| Header | Valor | Quién |
|---|---|---|
| `Content-Type` | `application/json` | Express |
| `Set-Cookie` | `accessToken=...; ...` | login, register, refresh |
| `Content-Type` | `application/pdf` | stream de PDF |
| `Content-Disposition` | `inline; filename="..."` | stream de PDF |
| `ratelimit-*` | límites | express-rate-limit (standardHeaders) |

---

## Health endpoint

`GET /api/v1/health` — verifica DB (`SELECT 1` con timeout de 2s) y R2 (`HeadBucketCommand`). Devuelve **200** si todo OK, **503** si algo falla:

```json
{
  "status": "ok" | "error",
  "db": true,
  "r2": true,
  "timestamp": "ISO-8601"
}
```

> Implementado en `src/http/health.ts`.

---

## Status code por operación

| Operación | Éxito |
|---|---|
| Create (register) | 201 Created |
| Login / refresh / logout | 200 OK |
| List / get | 200 OK |
| Upload libro | 200 OK (devuelve `{ bookId, userBookId }`) |
| Update progreso | 200 OK |
| Delete libro | 200 OK (`{ success, message, auditId }`) |

---

## Rate limits

| Ruta | Límite |
|---|---|
| `/api/v1/auth/*` (salvo get-session) | 10 / 15 min |
| `/api/v1/auth/get-session` | 200 / 15 min |
| `PATCH /api/v1/books/:id/progress` | 600 / 15 min |
| resto de `/api/v1/*` | 100 / 15 min |

---

## Smoke test rápido (cURL)

```bash
# 1. Health
curl http://localhost:3000/api/v1/health

# 2. Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Carlos","email":"carlos@demo.com","password":"MiPassword123"}' \
  -c cookies.txt

# 3. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"carlos@demo.com","password":"MiPassword123"}' \
  -c cookies.txt

# 4. Sesión
curl http://localhost:3000/api/v1/auth/get-session -b cookies.txt

# 5. Subir PDF
curl -X POST http://localhost:3000/api/v1/books/upload \
  -H 'x-session-token: eyJ...' \
  -F 'pdf=@mock/book.pdf' \
  -F 'title=Mi libro'

# 6. Logout
curl -X POST http://localhost:3000/api/v1/auth/logout -b cookies.txt
```

> Ejemplos más completos en `backend-express/http/` (`books.http`, `bookmarks.http`, `streaks.http`).
