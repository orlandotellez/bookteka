# 🟡 Integridad del esquema y datos que crecen

## Estado Actual

El esquema de `prisma/schema.prisma` tiene 9 modelos y está bien diseñado en lo que importa: `fileHash` único para deduplicar, `@@unique([userId, bookId])` en `user_book`, cascade en todas las FKs e índices en cada clave foránea. Los problemas son de **operación**, no de diseño.

### Tablas que crecen sin límite

| Tabla | Cómo crece | Cuándo se limpia |
|---|---|---|
| `session` | Una fila por refresh, y cada refresh **rota** el token: la fila vieja se borra y se crea una nueva. Cada login suma filas. | **Nunca, de forma proactiva.** Solo se borra cuando alguien intenta usar un token vencido (`getRefreshTokenUser` → `deleteMany`). Si un usuario cierra sesión y nunca vuelve, su fila queda para siempre. |
| `verification` | Una fila por `register` y por cada `resend-verification`. `createVerification` borra las del mismo `identifier` antes de insertar, así que no se acumulan **para un mismo email**. Pero los emails que se registran una sola vez y nunca verifican dejan una fila muerta para siempre. | **Nunca.** Mismo patrón: solo al intentar verificar un código expirado. |
| `audit_log` | Una fila por libro eliminado. Nunca se lee de nuevo: no hay endpoint ni query que la consulte. | Nunca. Es un log de auditoría, así que crecer es esperable, pero no hay política de retención. |

`verification` y `session` son tablas que deberían tener una purga programada. Hoy no hay ningún job, script ni migración que las limpie.

### Índices que faltan

| Consulta | Índice actual | Falta |
|---|---|---|
| Buscar el `book` de un usuario por título, para un buscador | `book` no tiene índice de búsqueda de texto. `title` y `author` no tienen índice. | No hay búsqueda por título en el backend. La búsqueda de la biblioteca es **client-side**: `Index.tsx` filtra con `normalizeText` sobre los libros ya descargados. Es coherente con el diseño offline, pero significa que `GET /books` trae la biblioteca completa en cada request. |
| Listar sesiones activas de un usuario | `@@index([user_id])` | Suficiente para el uso actual. |
| Buscar `user_streak` por usuario | `userId @unique` + `@@index([userId])` | El `@unique` ya crea el índice. El `@@index` adicional es redundante. |
| Audit log por rango de fechas | `@@index([createdAt])` | Existe. Suficiente. |

### Columnas sin uso

| Columna | Dónde | Nota |
|---|---|---|
| `user.phone`, `user.image` | `user` | Nullables, nunca escritas. `PublicUser` las expone en cada respuesta de auth. |
| `account.access_token`, `refresh_token`, `id_token`, `scope`, `access_token_expires_at`, `refresh_token_expires_at` | `account` | 6 columnas para proveedores OAuth que no existen. El único proveedor es `credentials` (`lib/auth.ts` — `provider_id: "credentials"`). |
| `audit_log.metadata` | `audit_log` | Se llena con `bookTitle`, `bookAuthor`, `fileKey`, `fileSize`, `deletedAt` en `book.service.ts`. No hay forma de leerlo. |

### Soft delete usado en un solo lugar

`user.deleted_at` es el único soft delete del sistema, y **nadie lo escribe**: no hay ningún endpoint ni script que borre un usuario. El campo está preparado (`login` y `getSession` ya filtran por `deleted_at: null`) pero la operación que lo llenaría no existe.

### Migraciones con nombre engañoso

Tres de las seis migraciones se llaman `_init`:

| Migración | Qué hace realmente |
|---|---|
| `20260802010336_init` | `ALTER TYPE "ROLE" ADD VALUE IF NOT EXISTS 'user'` |
| `20260802234345_init` | Quita el `DEFAULT` de dos columnas |
| `20260801000000_add_jwt_auth` | Renombra `user` → `users` y crea 3 tablas |

`prisma migrate dev` genera el nombre automáticamente cuando no se pasa `--name`, y alguien lo dejó por default tres veces. No rompen nada, pero hacen que `prisma migrate status` y la lectura del historial no digan nada.

### Hardcodeo de credenciales de desarrollo

`docker-compose.yml` tiene `POSTGRES_PASSWORD: bookteka123` en texto plano y `DATABASE_URL` con la misma contraseña. Aceptable para desarrollo local, pero el mismo compose se usa para levantar "el stack completo", así que hay que aclarar que es solo para local.

## Objetivo

Que las tablas de sesión y verificación no crezcan sin control, y que el historial de migraciones sea legible.

## Alcance

- Purga de `session` y `verification`.
- Nombres de migración correctos de acá en adelante.
- Clarificar que las credenciales del compose son de desarrollo.
- Evaluar la redundancia del índice de `user_streak`.

## Fuera de alcance

- Cambiar el esquema: agregar índices que la app no consulta es ruido.
- Implementar borrado de usuario con soft delete (eso es una feature).
- Implementar OAuth.
- Un job scheduler como dependencia nueva: la purga puede ser un script.

## Tareas

- [ ] 1. Crear la purga de `session` expiradas
  - Agregar `src/scripts/purge-sessions.ts` (o una función en `src/modules/auth/application/auth.service.ts` expuesta por comando) que haga `deleteMany({ where: { expires_at: { lt: new Date() } } })`.
  - Executarla desde `docker-entrypoint.sh` antes de `prisma migrate deploy`, o como paso de un job externo (Railway cron, si se configura).
  - Decidir si se borra por antigüedad (`expires_at`) o por inactividad. `expires_at` es suficiente.
- [ ] 2. Crear la purga de `verification` expiradas
  - Mismo patrón: `deleteMany({ where: { expires_at: { lt: new Date() } } })`.
  - `createVerification` ya borra las del mismo `identifier`, así que esto es para los emails que se registraron una vez y nunca volvieron.
- [ ] 3. Documentar la política de retención de `audit_log`
  - Hoy no hay lectura ni retención. Decidir explícitamente: si es un log de auditoría, se conserva y se documenta que es de solo lectura para análisis manual. Si eso no es aceptable, agregar una purga por antigüedad.
  - Si se decide que hay que leerlo, el trabajo real es un endpoint de consulta con autorización, que no existe.
- [ ] 4. Dejar de generar migraciones `_init`
  - Adoptar `prisma migrate dev --name <nombre_descriptivo>` como regla. Ya está en `specs/modules/db/setup.md`.
  - **No renombrar las tres migraciones existentes**: el nombre es parte de la identidad de la migración en la tabla `_prisma_migrations`. Renombrarlas rompe el historial. Se documenta que son confusas y punto.
- [ ] 5. Quitar el índice redundante de `user_streak`
  - `userId` es `@unique`, lo que ya crea un índice único. El `@@index([userId])` explícito es redundante.
  - Requiere una migración nueva. Es de bajo impacto: decidir si vale el costo de tocar el esquema por ganarle un índice.
- [ ] 6. Evaluar el costo de `GET /books` sin paginación
  - Devuelve todos los libros del usuario con un `include` anidado. Con cientos de libros la respuesta crece sin cota y el cliente los descarga todos para filtrar en memoria.
  - Antes de agregar paginación al backend, medir: cuántos libros tiene un usuario típico. Si el número es bajo, dejarlo así y documentarlo.
  - Si se pagina, el merge de `syncBooksFromCloud` (`frontend/src/database/sync.ts`) tiene que cambiar: hoy trae la lista completa justamente para poder hacer merge de todos los locales.
- [ ] 7. Aclarar en `docker-compose.yml` que las credenciales son de desarrollo
  - Agregar un comentario en el `environment:` del servicio `db` y en el `DATABASE_URL` del servicio `backend`.
  - No mover las credenciales a `.env`: son de desarrollo y tenerlas explícitas ayuda a que cualquiera levante el stack sin configurar nada.

## Criterios de Done

- [ ] Existe un comando que purga `session` y `verification` expiradas, y está documentado en `specs/modules/db/setup.md`.
- [ ] Correr la purga sobre una base con datos de prueba no rompe nada y reduce el tamaño de ambas tablas.
- [ ] La política de retención de `audit_log` está escrita en los specs.
- [ ] Las migraciones nuevas se llaman con `--name <descriptivo>`; el README de `db/setup.md` lo dice.
- [ ] Está decidido y documentado si `GET /books` se pagina o se deja como está, con el número real de libros por usuario.
