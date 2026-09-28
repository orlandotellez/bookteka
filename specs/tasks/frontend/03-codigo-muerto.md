# 🟡 Código muerto y duplicación en el frontend

## Estado Actual

Verificado con `rg` sobre `frontend/src`. Cada entrada de esta lista aparece **solo** en el archivo que la define.

### Módulo o hook sin un solo import

| Símbolo | Archivo | Qué es |
|---|---|---|
| `useBooks` | `frontend/src/hooks/useBooks.tsx` | Un hook completo de 122 líneas con `books`, `addBook`, `deleteBook`, `getBookById`, `updateReadingTime`, `setReadingTime`, `updateScrollPosition`. Es una **segunda implementación** del estado de la biblioteca, que ya vive en `useBookStore`. |
| `downloadPdfToBlob` | `frontend/src/lib/pdfService.ts` | **✅ Resuelto en `02-trabajo-pdf.md`**: no se portó al módulo único. |
| `getSignedDownloadUrl` | `frontend/src/lib/pdfService.ts` | **✅ Resuelto en `02-trabajo-pdf.md`**: no se portó al módulo único. |
| — | `frontend/src/__tests__/setup.ts` | Duplica `src/test/setup.ts`. `vite.config.ts` solo referencia el segundo. |

`useBooks` es la más peligrosa de la lista: no es código inerte cualquiera, es un clon de un dominio con las mismas operaciones y la misma forma de API. Cualquiera que lo encuentre va a usarlo y la biblioteca va a quedar con dos fuentes de verdad.

### Dependencias sin uso

| Dependencia | `package.json` | Verificación |
|---|---|---|
| `axios` | `dependencies` | `rg axios frontend/src` → **0 resultados**. El cliente HTTP es `api/client.ts`, basado en `fetch` + `crossFetch`. Quedó de una migración anterior. |

### Duplicación que sí está viva

| Duplicado | Archivos | Riesgo |
|---|---|---|
| Estado de la biblioteca | `hooks/useBooks.tsx` vs `store/bookStore.ts` | Alto: dos APIs para el mismo dominio. |
| Extracción de PDF | ~~`lib/pdfExtractor.ts` vs `lib/pdfService.ts`~~ **✅ resuelto** | Un solo módulo `lib/pdf.ts`. Ver `02-trabajo-pdf.md`. |
| Estado de tema | `context/ThemeContext.tsx` vs los 6 temas de `index.css` | Medio: `index.css` define `light`, `dark`, `midnight`, `sepia`, `ocean` y `forest`, y el script inline de `index.html` tiene un objeto `themes` con los 6. Pero `ThemeContext` solo maneja `light` y `dark`: |

```ts
export type ThemeName = "light" | "dark";
const [theme, setTheme] = useState<ThemeName>(() => {
  const savedTheme = localStorage.getItem("theme");
  return savedTheme === "dark" ? "dark" : "light";
});
const toggleTheme = () => {
  const newTheme = theme === "light" ? "dark" : "light";
  ...
};
```

Cuatro temas están escritos, con su paleta completa, y **no hay forma de elegirlos**. `index.html` los contempla, así que si alguien pone `localStorage.theme = "sepia"` a mano, el splash lo respeta pero `ThemeProvider` lo resetea a `light` en el primer render.

### Bloque vacío en el logout

`components/pages/auth/LogoutButton.tsx`:
```ts
toast.info("Cerrando sesión...");
try {
} catch (syncError) {
  console.warn("Error al sincronizar al logout:", syncError);
}
```
Un `try` con cuerpo vacío y un `catch` que solo loguea. Es el rastro de una sincronización que se eliminó y cuyo `catch` quedó.

### Detalle de robustez

`LogoutButton` borra la base de datos local **antes** de cerrar sesión en el servidor:
```ts
await clearDatabase();
await resetDatabase();
await authApi.logout();
```
Si `authApi.logout()` falla, el usuario ya perdió sus libros locales y además tiene que volver a hacer login. El orden inverso es más seguro: cerrar sesión en el servidor primero, y recién después borrar lo local.

## Objetivo

Que no queden clones de un dominio ni dependencias que no se usan, y que los cuatro temas que existen en el CSS sean alcanzables o se borren.

## Alcance

- Eliminar el código muerto y la dependencia `axios`.
- Resolver la duplicación de estado de la biblioteca.
- Cerrar la brecha de los 6 temas frente a los 2 que el contexto maneja.
- Arreglar el bloque vacío del logout y su orden de operaciones.

## Fuera de alcance

- Agregar los temas que faltan.
- Rediseñar `ThemeContext` con un reducer.
- Cambiar el gestor de estado.

## Tareas

- [x] 1. Borrar `hooks/useBooks.tsx`
  - Confirmado: ningún archivo lo importa. `store/bookStore.ts` es la fuente de verdad de la biblioteca.
  - Borrar el archivo. Si en el futuro hace falta un hook de solo lectura, se extrae del store, no se clona.
- [x] 2. Borrar `downloadPdfToBlob` y `getSignedDownloadUrl` de `lib/pdfService.ts`
  - Resuelto: no se portaron al módulo único de `02-trabajo-pdf.md`.
- [x] 3. Quitar `axios` de `frontend/package.json`
  - `rg axios frontend/src` no devuelve nada.
  - `pnpm remove axios` y verificar que `pnpm build` sigue pasando.
- [x] 4. Borrar `src/__tests__/setup.ts`
  - Resuelto en `01-cobertura-tests.md` (commit de scripts de test): el duplicado ya no existe. Aquí se confirma el criterio.
  - Duplica `src/test/setup.ts`, que es el que referencia `vite.config.ts`.
- [x] 5. Decidir qué pasa con los 6 temas
  - **Decisión con el usuario: opción A (exponer los 6).** `ThemeName` pasa a 6 valores (light, dark, midnight, sepia, ocean, forest) y `IconTheme` es un selector. `ThemeName`/`THEMES`/`THEME_LABELS`/`isDarkTheme`/`isThemeName` viven en `context/theme.ts` (así el fast-refresh del contexto queda sin const sueltas); `ThemeContext` solo exporta el Provider y el hook. Lo que era `theme === "dark"` para los logos pasó a `isDarkTheme(theme)` (dark y midnight usan el logo oscuro; el resto el claro). Contraste AA verificado: todos los temas ≥ 8.2:1.
  - Opción A (recomendada): exponer los 6. `ThemeContext` pasa a `ThemeName = "light" | "dark" | "midnight" | "sepia" | "ocean" | "forest"`, `toggleTheme` pasa a un setter de tema elegido, y `IconTheme` (`components/common/IconTheme.tsx`) muestra un selector en vez de un toggle. La paleta ya está escrita en `index.css` y en el script de `index.html`: **no hay que elegir colores, ya están elegidos**.
  - Opción B: borrar `midnight`, `sepia`, `ocean` y `forest` de `index.css` y del script de `index.html`, y quedarse con el toggle.
  - Lo que no es opción: dejarlos como están. Son 40 líneas de CSS por tema que nadie puede ver.
  - Si se elige la A, verificar contraste AA en cada tema (ver `specs/modules/frontend/02-design.md`).
- [x] 6. Arreglar el bloque vacío de `LogoutButton.tsx`
  - El `try` vacío se eliminó en la tarea 05-ci (ESLint `no-empty`). Acá se corrige el orden: `authApi.logout()` → `clearDatabase()`/`resetDatabase()` → navegar. Si el logout falla, la base local queda intacta y el `finally` restaura el botón.
  - Borrar el `try {} catch {}` vacío.
  - Invertir el orden: `authApi.logout()` primero, `clearDatabase()` + `resetDatabase()` después.
  - El `catch` actual loguea y deja el botón en estado de carga permanente (`setLoading(false)` solo se llama en el `catch`, no en el `finally`). Agregar un `finally`.
- [x] 7. Evaluar el logout por cambio de usuario
  - Decisión: **documentar la limitación, no implementar el borrado por userId ahora**. El botón de logout es la única vía de cierre y borra toda la base local. Si en el futuro se cierra sesión por expiración o por otro lado, este punto se reabre.
  - `clearDatabase()` borra **toda** la base local, no la del usuario que sale. Hoy el botón es la única vía de logout, así que funciona.
  - Si se agrega cierre de sesión por expiración de sesión o desde otro lado, la DB local del usuario anterior queda ahí y es accesible.
  - Decidir si se implementa borrado por `userId` (los stores de IndexedDB ya tienen índice `by-userId`) o si se documenta la limitación.

## Criterios de Done

- [x] `frontend/src/hooks/useBooks.tsx` no existe.
- [x] `axios` fuera de `package.json` y `pnpm build` pasa.
- [x] `src/__tests__/setup.ts` no existe.
- [x] Los 6 temas de `index.css` son alcanzables desde el selector de `IconTheme`. No quedó estado intermedio.
- [x] `LogoutButton.tsx` sin bloques vacíos y con `finally` que restaura el botón.
- [x] Si el logout falla en el servidor, los libros locales no se pierden: el borrado de la base ocurre después del `logout()` exitoso.
- [x] `pnpm build` y `pnpm test` pasan: 131/131, build OK, lint 0 errores.
