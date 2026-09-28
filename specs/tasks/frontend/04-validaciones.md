# 🟡 Validaciones y detalles de experiencia

## Estado Actual

Los formularios y la sesión tienen desajustes concretos entre el frontend, el backend y la base de datos.

### El mínimo de contraseña no coincide

| Dónde | Regla | Consecuencia |
|---|---|---|
| `frontend/src/validations/loginValidations.ts` — `loginSchema` | `password.min(6)` | El frontend acepta 6 caracteres. |
| `frontend/src/validations/loginValidations.ts` — `registerSchema` | `password.min(6)` | Idem para el registro. |
| `backend-express/src/modules/auth/presentation/auth.dto.ts` — `RegisterSchema` | `password.min(8, "La contraseña debe tener al menos 8 caracteres")` | **El registro exige 8.** |
| `backend-express/src/modules/auth/presentation/auth.dto.ts` — `LoginSchema` | `password.min(8, ...)` | El login exige 8. |

Un usuario puede escribir 6 caracteres, pasar la validación del cliente, y recibir un 400 del servidor. La contraseña nunca llega a crearse: el registro falla en el primer intento y el usuario no sabe por qué, porque el mensaje que ve no viene del backend.

### Los mensajes de validación están mal

```ts
password: z
  .string()
  .min(6, "El minimo de caracteres es de 2")
  .max(100, "El maximo de caracateres es de 10"),
```

Tres errores en dos líneas:
- `.min(6, ...)` con el mensaje "El minimo de caracteres es de **2**".
- `.max(100, ...)` con el mensaje "El maximo de caracateres es de **10**".
- "caracateres" está mal escrito.

Además el mismo schema se usa en login y en register, así que el mensaje aparece en los dos formularios.

### `confirmPassword` sin reglas propias

`registerSchema` declara `confirmPassword: z.string()` y valida el match con un `.refine()` a nivel de objeto. Consequences:
- No hay `min` ni `required`: un string vacío pasa la validación de tipo y el `.refine` compara `password === ""`, que es falso, así que el error aparece — pero como error de "no coinciden", no de "falta la confirmación".
- El `.refine` usa `path: ["confirmPassword"]`, que es la forma correcta de señalar el campo.

### Errores del backend en los formularios

`LoginForm.tsx` y `RegisterForm.tsx` manejan el error, pero el backend devuelve dos shapes distintos:
- `AppError` → `{ error: "Credenciales inválidas", code: "UNAUTHORIZED" }`
- `ZodError` → `{ error: "Validation failed", details: [{ path, message }] }`

`ApiError.extractErrorMessage` toma el primer campo string que encuentre, así que en el caso de Zod el usuario ve `"Validation failed"` en lugar del mensaje real del campo. Para el login no es grave (el error real es "Credenciales inválidas"), pero para un formulario con más campos sería una pantalla inútil.

### Accesibilidad sin verificar

`index.html` declara `<html lang="es">` y el `Documenter` es correcto en la estructura básica, pero:

| Punto | Estado |
|---|---|
| Contraste de los 6 temas | No verificado. `--font-color-text: #7e7367` sobre `--primary-color: #fcf5ee` en `light` y `#1c1a16` en `dark` (mismo valor de texto para claro y oscuro) — el mismo gris sobre fondos muy distintos. |
| Foco de teclado | No hay estilos de `:focus-visible` en ningún `.module.css`. Se ve el focus por defecto del navegador, que sobre fondos oscuros puede no ser visible. |
| Navegación por teclado en el estante | `BookShelfView.tsx` (499 líneas) implementa drag & drop. No hay alternativa con teclado. |
| `aria-live` | Solo en el splash (`SplashScreen` con `role="status"` y `aria-live="polite"`). Las operaciones async de la biblioteca (subir, borrar, preparar PDF) no anuncian su resultado a lectores de pantalla. |
| Errores de formulario | `Input.tsx` tiene `<label htmlFor>`, pero falta `aria-invalid` y `aria-describedby` apuntando al mensaje de error. |

### Sin script de lint ni formato en el frontend

`eslint` y las dependencias de plugins están instaladas pero no hay `eslint.config.js`. No hay Prettier. Ver `specs/tasks/backend/05-ci-y-calidad.md` tarea 6.

## Objetivo

Que las validaciones del cliente y del servidor digan lo mismo, que los mensajes sean correctos, y que la app sea operable con teclado y con lector de pantalla.

## Alcance

- Alinear los mínimos de contraseña.
- Corregir los mensajes.
- Agregar atributos de accesibilidad a los inputs.
- Verificar contraste de los temas.
- Ofrecer una alternativa con teclado al drag & drop.

## Fuera de alcance

- i18n: la app es solo en español y no hay estructura de traducciones.
- Testing visual de accesibilidad (axe-core en Jest): valioso, pero es un proyecto aparte.
- Rediseño de los mensajes para que sean más "amables": primero tienen que ser correctos.

## Tareas

- [ ] 1. Alinear el mínimo de contraseña
  - En `frontend/src/validations/loginValidations.ts`, subir `min(6)` a `min(8)` en `loginSchema` y `registerSchema`, con el mismo mensaje que el backend: "La contraseña debe tener al menos 8 caracteres".
  - Agregar la constante compartida en el schema para que el mensaje no se duplique.
- [ ] 2. Corregir los mensajes de validación
  - `max(100, "El máximo de caracteres es de 100")`.
  - Corregir "caracateres".
  - Agregar acentos a los mensajes: hoy no tienen tilde ("minimo", "maximo", "Correo inválido" sí la tiene). Mantener el criterio del resto de la app.
- [ ] 3. Agregar reglas propias a `confirmPassword`
  - `z.string().min(1, "Confirmá tu contraseña")` para que el campo vacío dé un mensaje propio, y dejar el `.refine` para el match.
- [ ] 4. Propagar los mensajes del backend a los formularios
  - `ApiError` ya guarda `data` completo (`api/client.ts` — el campo `data`). Agregar un helper que, si `data.details` existe, devuelva el mensaje del primer detalle en vez de `"Validation failed"`.
  - Verificar que el mensaje caiga en el `Input` correcto, no en un toast genérico.
- [ ] 5. Verificar el contraste de los 6 temas
  - Calcular el ratio de contraste de `--font-color-title` y `--font-color-text` contra `--primary-color`, `--card-color` y `--window-color` en cada tema.
  - El caso dudoso es `--font-color-text: #7e7367`, que es idéntico en `light` y en `dark`. Contra `#fcf5ee` ronda 4.6:1; contra `#1c1a16` sube, pero hay que confirmarlo.
  - Objetivo: **AA**, o sea 4.5:1 para texto normal y 3:1 para texto grande.
  - Si algún tema no llega, corregir el token del texto secundario, no el fondo.
- [ ] 6. Agregar estilos de foco visible
  - Una regla global en `index.css` con `:focus-visible` que aplique `outline` usando `--secondary-color`, con contraste verificado.
  - Hoy no hay ningún estilo de foco: se depende del default del navegador.
- [ ] 7. Agregar atributos ARIA a `Input.tsx`
  - `aria-invalid={!!error}` y `aria-describedby` con el `id` del mensaje de error, siguiendo el patrón que `AppBootstrap.tsx` ya usa correctamente para su formulario manual.
- [ ] 8. Dar alternativa con teclado al drag & drop del estante
  - `BookShelfView.tsx` es el archivo más grande del frontend (499 líneas) y el drag & drop no tiene equivalente con teclado.
  - La opción más simple y suficiente: agregar botones "mover al inicio" / "mover al final" en el menú de cada libro, que llaman a `bookStore.moveBook` con los ids de los extremos. Reutiliza la lógica existente, no la duplica.
  - Si se quiere algo más completo, mover la reordenación a un patrón de "agarrar con espacio / soltar con enter", que es el estándar de ARIA para listas reordenables. Más trabajo.
- [ ] 9. Anunciar el resultado de las operaciones async
  - Subir un libro, borrarlo y preparar un PDF cambian el contenido sin que un lector de pantalla se entere.
  - Agregar una región `aria-live="polite"` en la pantalla de biblioteca y announce el resultado de esas operaciones.

## Criterios de Done

- [ ] Una contraseña de 6 caracteres es rechazada en el formulario con un mensaje claro, sin necesidad de llegar al servidor.
- [ ] Todos los mensajes de `loginValidations.ts` son correctos y están en español con acentos.
- [ ] Un 400 de validación del backend muestra el mensaje real del campo, no `"Validation failed"`.
- [ ] Los 6 temas pasan contraste AA en texto normal y grande, verificado con una herramienta.
- [ ] Todos los elementos interactivos tienen foco visible.
- [ ] Los libros se pueden reordenar sin mouse.
- [ ] `pnpm build` y `pnpm test` pasan.
