# 01 — Descripción del proyecto

## Qué es

**Bookteka** es una biblioteca personal de PDFs con seguimiento de lectura. El usuario sube sus libros, los lee en un lector de texto con progreso persistente, marca páginas concretas, resalta fragmentos y mantiene una racha de días consecutivos de lectura.

La misma aplicación corre en tres formatos: web (navegador), escritorio (Tauri) y Android (WebView de Tauri). El libro es un solo bundle; lo que cambia es el shell y cómo se resuelve la URL del backend.

## Para quién

| Actor | Qué hace |
|---|---|
| **Lector** (usuario registrado) | Sube libros, lee, marca, resalta, completa la racha diaria, gestiona sus estadísticas. Es el único actor con actividad en el producto hoy. |
| **Admin** | Existe en el enum `ROLE` de la base de datos y en el payload del token, pero **no hay ninguna ruta, pantalla ni guard que lo use**. No es un actor funcional todavía. |
| **Visitante** | Solo ve `/auth/login` y `/auth/register`. `PublicRoute` lo rebota a `/` si ya tiene sesión. |
| **Landing page** | Visitantes de `landing-page/` (Astro). Sin login, sin datos, sin API. |

## Problema que resuelve

1. **Perder el lugar.** Al reabrir un PDF hay que buscar la página a mano. Bookteka guarda página, posición de scroll y tiempo acumulado por libro, y los restaura.
2. **Bibliotecas dispersas.** Los PDFs están en carpetas de un lado y el historial de lectura no existe. Bookteka los cataloga con título, autor y fecha de última lectura.
3. **El hábito de leer se pierde.** Sin recordatorios ni continuidad visible, leer tres días y abandonar es lo normal. La racha diaria convierte la lectura en algo que se puede sostener en el tiempo.
4. **Leer en cualquier dispositivo.** El progreso se sincroniza: lo que leés en el escritorio aparece en el teléfono.

## Funcionalidades principales

1. **Registro, login, logout y renovación de sesión** con JWT (access 15 min, refresh 7 días con rotación de un solo uso).
2. **Verificación de correo** por código de 6 caracteres. *Implementada a medias: el código se genera y se valida, pero no se envía por email (ver `specs/tasks/backend/02-email-verificacion.md`).*
3. **Subida de PDFs** hasta 25 MB, con deduplicación por hash SHA-256: dos personas que suben el mismo PDF comparten el archivo almacenado.
4. **Biblioteca** con búsqueda, filtro por estado de lectura y tres vistas: estante (con drag & drop para reordenar), grilla y lista con paginación de 6 por página.
5. **Lector de texto** con extracción del PDF en el dispositivo, navegación por página, control de tipografía, cronómetro de lectura y modo lectura sin distracciones.
6. **Marcadores por página** con nombre y vista previa del texto, y **resaltados** en 5 colores.
7. **Racha de lectura** diaria, con inicialización manual opcional a partir de una fecha de inicio.
8. **Estadísticas** de perfil: tiempo total, cantidad de libros, libros en progreso y promedio por libro.
9. **Sincronización** con el backend con merge que nunca hace retroceder el progreso.
10. **Functionamiento sin red**: libros, texto extraído y progreso viven en IndexedDB.

## Fuera de alcance

Lo siguiente **no existe** en el código. No está en los specs como pendiente porque no se ha decidido que vaya a existir:

- Panel de administración. El rol existe en el enum; la interfaz no.
- Cualquier integración social (OAuth). `account` tiene columnas `access_token`/`refresh_token` para provedores, pero el único proveedor usado es `credentials` (`lib/auth.ts`).
- Suscripciones, pagos o planes.
- Editor o anotaciones dentro del PDF. Bookteka extrae texto y lo muestra; no renderiza el PDF original.
- Compartir bibliotecas entre usuarios. El modelo es de biblioteca individual: un `book` puede estar en varias `user_book`, pero eso es efecto de la deduplicación, no una función de compartir.
- Sincronización de resaltados. Existen solo en IndexedDB, sin endpoints.
- Sincronización de marcadores en la operación de *update*: el cliente intenta un `PATCH` que el backend no implementa.
- Aplicación móvil nativa. Android sale de Tauri sobre el mismo código web; no hay proyecto React Native/Expo.
