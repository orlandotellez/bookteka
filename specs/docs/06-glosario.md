# 06 — Glosario

Términos del dominio de Bookteka. Todos aparecen en el código; la columna de la derecha dice dónde.

---

## Account

Fila de la tabla `account` que guarda las credenciales de un usuario. Bookteka solo usa el proveedor `credentials`: el `password` es el hash bcrypt. Las columnas `access_token`/`refresh_token` existen para proveedores externos que hoy no se usan.

*Código: `prisma/schema.prisma` (modelo `account`), `src/lib/auth.ts`.*

## Access token

JWT de vida corta (15 minutos) que prueba la identidad del usuario. No se guarda en la base de datos: se verifica firmando. Contiene `userId`, `email` y `role`.

*Código: `src/lib/auth.ts` — `signAccessToken`.*

## Auditoría (audit log)

Registro de acciones sensibles. Hoy solo se escribe al eliminar un libro: acción `DELETE`, entidad `BOOK`, con metadata del título, autor, key y tamaño.

*Código: tabla `audit_log`, `src/services/book.service.ts` — `deleteBook`.*

## Bookmark (marcador)

Referencia guardada dentro de un libro: un nombre, el número de página y un preview del texto. Pertenece a un `user_book`, no al libro directamente, para que el acceso dependa del usuario.

*Código: tabla `bookmark`, `src/services/bookmark.service.ts`.*

## Coalescer de progreso

Mecanismo del frontend que agrupa los cambios de lectura durante 3 segundos y los manda en un solo `PATCH /progress`. Evita una request por cada movimiento de scroll.

*Código: `frontend/src/store/bookStore.ts` — `scheduleCloudProgress`, `CLOUD_COALESCE_MS`.*

## Deduplicación de libros

Cuando dos usuarios suben el mismo PDF, el backend calcula el SHA-256 del contenido y busca si ya existe. Si existe, no sube el archivo de nuevo: solo crea la relación del segundo usuario con el libro ya guardado. El espacio en R2 se comparte.

*Código: `src/services/book.service.ts` — `uploadBook`; restricción `@unique` en `book.fileHash`.*

## Escaneo (viewer / lector)

Vista de lectura de la app. No es una ruta: `Layout` la renderiza cuando el estado del store es `currentView === "reader"`. Muestra el texto extraído del PDF, no el PDF original.

*Código: `frontend/src/components/layout/Layout.tsx`, `frontend/src/components/pages/reader/`.*

## Extraction de texto (extracción de texto)

Proceso de convertir un PDF en texto plano dentro del dispositivo, usando pdf.js. El resultado se cachea en IndexedDB con marcadores de página (`[PAGE_n]`) para poder navegar después.

*Código: `frontend/src/lib/pdfExtractor.ts` y `frontend/src/lib/pdfService.ts`.*

## File hash

SHA-256 del contenido del PDF. Es la clave de deduplicación: identifica el archivo por su contenido, no por su nombre.

*Código: `src/helper/format.ts` — `generateFileHash`.*

## File key

Ruta del objeto dentro del bucket de R2, con formato `books/{userId}/{timestamp}-{nombre-normalizado}`. Es la referencia real; la URL pública se arma como `{R2_PUBLIC_DOMAIN}/{fileKey}`.

*Código: `src/services/book.service.ts` — `uploadBook`.*

## Highlight (resaltado)

Fragmento de texto marcado con un color. Existe **solo en el dispositivo**: hay store y tabla en IndexedDB, pero ningún endpoint en el backend, así que no se sincroniza.

*Código: `frontend/src/database/features/highlights.ts`, store de tipos `HighlightColor`.*

## Merge de sincronización

Regla que decide qué valor gana cuando el dato local y el de la nube difieren. Para el progreso siempre gana **el mayor** (`Math.max`) de `readingTimeSeconds`, `scrollPosition`, `currentPage` y `lastReadAt`. El texto y el blob se conservan siempre del lado local.

*Código: `frontend/src/database/sync.ts` — `syncBooksFromCloud`.*

## Progreso de lectura

Conjunto de datos que indica hasta dónde llegó una persona en un libro: página actual, posición de scroll, segundos acumulados y fecha de última lectura. Vive en la tabla `user_book`.

*Código: tabla `user_book`, `src/services/book.service.ts` — `updateBookProgress`.*

## Refresh token

JWT de vida larga (7 días) que permite renovar el access token sin pedir la contraseña. Cada refresh **rota** el token: el anterior se borra de la tabla `session` y no vuelve a servir.

*Código: `src/lib/auth.ts` — `signRefreshToken`, `refresh`.*

## Racha (streak)

Días consecutivos de lectura. Una fila por usuario en `user_streak`. Si hoy ya se completó, no vuelve a contar; si la última lectura fue ayer, se incrementa; si no, se reinicia en 1.

*Código: `src/services/streak.service.ts`, tabla `user_streak`.*

## Sesión (session)

Fila de la tabla `session` que representa un refresh token vigente. Guarda el token, la fecha de expiración, la IP y el user agent. Es lo que hace que un logout o una revocación sea efectivo de inmediato.

*Código: `src/lib/auth.ts` — `createSession`.*

## Soft delete

Borrado lógico: la fila no se elimina, se marca con `deleted_at`. Bookteka lo usa **solo** en usuarios; login y sesión filtran siempre por `deleted_at IS NULL`. Los libros se borran de verdad.

*Código: `prisma/schema.prisma` (modelo `user`).*

## Stream de PDF

Endpoint que reenvía el contenido del PDF desde R2 a través del backend, con `Content-Type: application/pdf` y `Content-Disposition: inline`. Existe para que el navegador no dependa del CORS del bucket.

*Código: `src/services/book.service.ts` — `streamBookPdf`.*

## Transports de sesión

Las cuatro formas en que el cliente puede presentar sus tokens: cookie `httpOnly`, header `Authorization: Bearer`, header `x-session-token` y header `x-refresh-token`. Los headers existen porque la WebView de Android no puede usar cookies cross-site. **Las cuatro tienen que seguir funcionando.**

*Código: `src/lib/auth.ts` — `tokenFromHeaders`, `cookieOptions`.*

## User book (libro del usuario)

Fila que une un usuario con un libro y guarda su progreso. Es la llave de todo el control de acceso: si no existe `user_book` para ese par usuario-libro, las operaciones devuelven 403.

*Código: tabla `user_book`, `src/repositories/book.repository.ts` — `findUserBook`.*

## Verificación de correo

Proceso de confirmar que un email existe. Se genera un código de 6 caracteres con 15 minutos de validez, se guarda en `verification` y se marca `email_verified = true` al acertarlo. **El código no se envía por email**: se imprime en la consola del servidor.

*Código: `src/lib/auth.ts` — `createVerification`, `verifyEmail`.*
