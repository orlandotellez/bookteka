# 01 · Auth — Autenticación y sesión

> ✅ **Implementado en Express** (`backend-express/src/modules/auth/presentation/auth.routes.ts` + `lib/auth.ts`).

Autenticación propia con **JWT access (15 min) + refresh (7 días)** y **rotación real** del refresh token (compare-and-delete de la sesión). Passwords con bcrypt (cost 10).

**Transporte de tokens**:

| Transporte | Uso |
|---|---|
| Cookies `httpOnly` (`accessToken`, `refreshToken`) | Web |
| `Authorization: Bearer` | Clientes HTTP / tests |
| `x-session-token` / `x-refresh-token` | Tauri desktop/Android |

> Register/login/refresh devuelven también los tokens **en el body** (necesario para que Tauri los persista en localStorage).

## Tabla de endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Crea usuario + account + código de verificación + emite tokens. |
| POST | `/auth/login` | No | Login email/password, emite tokens + cookie. |
| POST | `/auth/refresh` | No (refresh token) | Renueva tokens (rotación single-use). |
| POST | `/auth/logout` | No (refresh token) | Revoca sesión + limpia cookies. |
| GET | `/auth/get-session` | No (access token) | Devuelve la sesión actual o 401. |
| POST | `/auth/verify-email` | No | Verifica correo con código de 6 caracteres. |
| POST | `/auth/resend-verification` | No | Reenvía código de verificación. |

---

## POST `/api/v1/auth/register`

- **Auth**: No.

### Request body

```json
{
  "name": "Carlos",
  "email": "carlos@demo.com",
  "password": "MiPassword123"
}
```

### Response 201

```json
{
  "message": "Usuario creado correctamente",
  "user": {
    "id": "uuid",
    "name": "Carlos",
    "email": "carlos@demo.com",
    "email_verified": false,
    "phone": null,
    "image": null,
    "role": "user",
    "created_at": "ISO-8601",
    "updated_at": "ISO-8601"
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### Validaciones (RegisterSchema)

- `name`: string min 2 (requerido).
- `email`: email válido.
- `password`: min 8 chars.

### Errores

- `400` — payload inválido.
- `409` — `El correo ya está registrado`.

### Side effects (transacción Prisma)

1. INSERT `user` (role `user`, `email_verified=false`, email lowercase).
2. INSERT `account` (`provider_id="credentials"`, password bcrypt).
3. `createVerification(email)` — código 6 chars, 15 min (se loguea en consola en dev).
4. `issueTokens` — access + refresh + INSERT `session`.

---

## POST `/api/v1/auth/login`

- **Auth**: No.

### Request body

```json
{ "email": "carlos@demo.com", "password": "MiPassword123" }
```

### Response 200

```json
{
  "message": "Login exitoso",
  "user": { /* PublicUser */ },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### Errores

- `401` — `Credenciales inválidas` (sin distinguir email vs password).

### Side effects

1. bcrypt.compare contra `account.password` (provider `credentials`).
2. `issueTokens` + INSERT `session` + `Set-Cookie`.

---

## POST `/api/v1/auth/refresh`

- **Auth**: No (requiere refresh token válido).

### Request

El refresh token puede venir en:

- Body: `{ "refreshToken": "eyJ..." }`
- Header: `x-refresh-token`
- Cookie: `refreshToken`

### Response 200

```json
{
  "message": "Token renovado correctamente",
  "user": { /* PublicUser */ },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### Errores

- `401` — `Refresh token requerido` / `Refresh token inválido o expirado` / `Sesión inválida` / `Sesión expirada` / `Sesión ya renovada o revocada`.

### Side effects (rotación single-use)

1. Verifica JWT con `JWT_REFRESH_SECRET`.
2. Busca `session` por token; si no existe o expiró → 401 (y borra la expirada).
3. En transacción: `deleteMany({ id: session.id, token })` — si no se borró exactamente 1 fila → 401 (token ya usado, ataque replay).
4. `issueTokens` nuevos + INSERT nueva session.

---

## POST `/api/v1/auth/logout`

- **Auth**: No (con refresh token).

### Request

Refresh token en body, `x-refresh-token` o cookie.

### Response 200

```json
{ "message": "Sesión cerrada correctamente" }
```

### Side effects

1. `DELETE session WHERE token = refreshToken`.
2. `clearAuthCookies` (Max-Age=0).

---

## GET `/api/v1/auth/get-session`

- **Auth**: No (acepta access token de cualquier transporte).

### Response 200

```json
{
  "user": { /* PublicUser */ },
  "session": {
    "id": "access:<jti|userId>",
    "token": "eyJ...",
    "expiresAt": "ISO-8601",
    "userId": "uuid"
  }
}
```

### Response 401

```json
{ "error": "No autorizado", "code": "UNAUTHORIZED" }
```

### Notas

- El access token es stateless: se expone el propio JWT como "session token" del cliente.
- Rechaza usuarios con `deleted_at` seteado.

---

## POST `/api/v1/auth/verify-email`

- **Auth**: No.

### Request body

```json
{ "identifier": "carlos@demo.com", "code": "ABC123" }
```

### Response 200

```json
{ "message": "Correo verificado correctamente" }
```

### Errores

- `401` — código inválido o expirado.
- `404` — usuario no encontrado.

### Side effects

1. Match `verification` por identifier+value.
2. `UPDATE user.email_verified = true`.
3. `DELETE verification`.

---

## POST `/api/v1/auth/resend-verification`

- **Auth**: No.

### Request body

```json
{ "email": "carlos@demo.com" }
```

### Response 200

```json
{
  "message": "Si el correo existe, se envió un código",
  "expiresAt": "ISO-8601"
}
```

### Side effects

1. `DELETE verification` del identifier.
2. INSERT nuevo código (6 chars, 15 min).

> Respuesta genérica para evitar user-enumeration.

---

## JWT Payload

Access token:

```json
{
  "userId": "uuid",
  "email": "carlos@demo.com",
  "role": "user",
  "exp": 1710000000
}
```

Refresh token: `{ userId, jti: "<uuid>", exp }` + fila en `session` (rotación).

---

## Cliente (frontend)

- `authApi.login/register/getSession/refresh/logout` (`src/api/auth.ts`).
- Los tokens se persisten en localStorage (`bookteka.access_token`, `bookteka.refresh_token`).
- `getSession` con 401 → intenta refresh una vez → reintenta; si falla, limpia tokens.
