# Backend Integraciones

Servicios externos que consume el backend, con su protocolo, su autenticación y qué pasa cuando fallan.

---

## Resumen

| Servicio | Estado | Uso real |
|---|---|---|
| **Cloudflare R2** (API S3) | En producción | Guardar y servir los PDFs. |
| **PostgreSQL** | En producción | Base de datos, vía Prisma. |
| **Resend** (email) | **Integrado pero no usado** | El cliente está, la llamada no existe. |

---

## Cloudflare R2 — almacenamiento de PDFs

**Estado:** en producción. Es la dependencia crítica: sin R2, el health check devuelve 503 y ninguna lectura de libro funciona.

| Aspecto | Detalle |
|---|---|
| Servicio | Cloudflare R2, compatible con S3. |
| SDK | `@aws-sdk/client-s3` 3.x, con `@aws-sdk/s3-request-presigner` para URLs firmadas. |
| Cliente | `src/lib/r2.ts` — un `S3Client` con `region: "auto"` y el `endpoint` de `R2_ENDPOINT`. |
| Credenciales | `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` (API token de R2). |
| Bucket | `R2_BUCKET`. |
| Verificación al arrancar | `src/lib/r2.ts` vuelve a validar las cuatro variables y lanza `Faltan variables de entorno R2` si falta alguna. |

### Estructura de las claves

```
books/{userId}/{timestamp}-{nombre-normalizado}
```

`normalizedFileName` (`src/helper/format.ts`) reemplaza espacios por guiones y elimina todo lo que no sea alfanumérico, punto, guion o guion bajo. El timestamp evita colisiones.

### Operaciones usadas

| Operación | Dónde | Para qué |
|---|---|---|
| `PutObjectCommand` | `book.service.ts` — `uploadBook` | Subir el PDF. `ContentType: "application/pdf"`. |
| `GetObjectCommand` | `book.service.ts` — `streamBookPdf` | Servir el PDF por streaming. |
| `GetObjectCommand` + `getSignedUrl` | `book.service.ts` — `downloadBookWithUrl` | URL firmada, válida **15 minutos** (`expiresIn: 60 * 15`). |
| `DeleteObjectCommand` | `src/helper/r2.ts` — `deleteR2Quietly` | Borrar el archivo cuando nadie más lo usa. |
| `HeadBucketCommand` | `src/http /health.ts` | Verificar que el bucket responde. |

### La base de datos nunca guarda el archivo

Solo guarda `fileKey` y `fileUrl` (`prisma/schema.prisma` — modelo `book`). `fileUrl` se arma como `` `${R2_PUBLIC_DOMAIN}/${fileKey}` ``. Si el bucket es privado, ese campo no sirve para leer y hay que pasar por el streaming o la URL firmada.

### Comportamiento ante fallos

| Situación | Qué pasa |
|---|---|
| Falla el `PutObject` en un upload | El error sube como `AppError` y el upload responde 500. **No se crea la fila en la base**: el upload a R2 es lo primero. |
| Falla el `DeleteObject` al borrar un libro | `deleteR2Quietly` loguea con `logger.error` y **no interrumpe**: la fila se borra igual. Se prefiere un archivo huérfano a una fila colgada. El `fileKey` queda en el `metadata` del `audit_log`, así que se puede limpiar después. |
| Falla el `GetObject` al hacer stream | `streamBookPdf` valida `pdfData.Body` y lanza `AppError("INTERNAL_ERROR", 500, "Error al obtener el archivo")`. |
| R2 no responde en el health check | `HeadBucketCommand` con timeout de 2s; el health check responde **503** con `r2: false` y loguea `Healthcheck: R2 unreachable`. |
| El objeto no está en el bucket | `GetObject` lanza `NoSuchKey`. El mapa de `errorHandler` solo cubre P2002/P2025/P2003, así que cae en el 500 genérico. El usuario ve un error opaco. |

**No hay reintentos, ni circuit breaker, ni cola.** Cada request que necesita el archivo falla de forma individual si R2 no responde.

---

## PostgreSQL

**Estado:** en producción.

| Aspecto | Detalle |
|---|---|
| Motor | PostgreSQL 16. |
| Acceso | Prisma 6 con el cliente singleton `dbPrisma` (`src/config/prisma.ts`). |
| Migraciones | `prisma migrate deploy` en el entrypoint de Docker; `prisma migrate dev` en desarrollo. |
| Connection pool | **No hay pool propio.** Prisma gestiona el suyo. `src/config/db.ts` crea un `Pool` de `pg` que nadie usa. |
| Health check | `dbPrisma.$queryRaw\`SELECT 1\`` con timeout de 2s. |

Detalle del modelo en [`../db/`](../db/README.md).

---

## Resend — email transaccional

**Estado:** **integrado pero no usado.**

| Aspecto | Detalle |
|---|---|
| Servicio | Resend. |
| SDK | `resend` 6.x. |
| Cliente | `src/lib/email.ts` — instancia `new Resend(env.RESEND_API_KEY)` a nivel de módulo. |
| API expuesta | `sendEmail({ to, subject, html })`. Loguea y relanza el error si falla. |
| Variables | `RESEND_API_KEY` y `RESEND_FROM_EMAIL`, ambas **obligatorias** al arrancar. |
| Llamadas | **Cero.** `rg "sendEmail\|lib/email"` en el repo solo encuentra la definición. |

### Consecuencia

`POST /auth/register` y `POST /auth/resend-verification` crean el código de verificación en la tabla `verification` y lo **imprimen con `console.info`**:

```ts
console.info(`[auth] Código de verificación para ${identifier}: ${value}`);
```

El usuario nunca recibe el correo. Solo quien tenga acceso a los logs del servidor puede completar la verificación.

Es un estado incoherente: el backend **exige** credenciales de Resend para arrancar y aun así no envía ningún correo. Si Resend estuviera caído, el backend tampoco levantaría.

Detalle y plan: `specs/tasks/backend/02-email-verificacion.md`.

---

## Servicios que el proyecto consume y no documenta

| Servicio | Dónde | Nota |
|---|---|---|
| Bootstrap remoto de la API | `frontend/src/lib/api-config.ts` — `BOOTSTRAP_URL` | Un `config-api.json` en un bucket de R2 que expone `current_api_url`. Es una integración del **frontend**, no del backend. |

---

## Dependencias que no son servicios

| Paquete | Para qué |
|---|---|
| `pino` + `pino-http` | Logging estructurado. |
| `helmet` | Headers de seguridad HTTP. |
| `cors` | Política de CORS. |
| `express-rate-limit` | Rate limiting en memoria. |
| `multer` | Parseo de multipart. |
| `zod` | Validación de entrada. |
| `bcrypt` | Hash de contraseñas. |
| `jsonwebtoken` | Firma y verificación de JWT. |

Ninguna de ellas se comunica con un servicio externo. `bcrypt`, `jsonwebtoken`, `zod`, `pino`, `helmet`, `cors`, `express-rate-limit` y `multer` corren 100% en proceso.
