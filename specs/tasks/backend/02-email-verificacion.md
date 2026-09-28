# 🔴 Envío del código de verificación por email

## Estado Actual

La verificación de correo está implementada **a medias**. En `src/modules/auth/application/auth.service.ts`:

- `createVerification(identifier)` genera un código aleatorio de 6 caracteres, borra los anteriores, inserta en la tabla `verification` con 15 minutos de expiración y **lo imprime con `console.info`**:
  ```ts
  console.info(`[auth] Código de verificación para ${identifier}: ${value}`);
  ```
- `verifyEmail(identifier, code)` valida el código, marca `email_verified = true` y borra el registro. Esta parte sí funciona.

El servicio de email **existe y no se usa**. `src/modules/auth/application/common/email.utils.ts` implementa `sendEmail({ to, subject, html })` con el SDK de Resend, maneja el error y loguea. `RESEND_API_KEY` y `RESEND_FROM_EMAIL` son variables de entorno obligatorias (`src/config/env.ts`): si faltan, **el backend no arranca**, aunque el correo nunca se mande.

Verificado: `rg "sendEmail|lib/email"` en todo el repo solo encuentra la definición en `src/modules/auth/application/common/email.utils.ts` y su mención en `doc/DOC.md`. Ningún archivo la importa.

El impacto: `email_verified` nunca puede pasar a `true` sin acceso a los logs del servidor. Y `POST /auth/resend-verification` responde siempre igual ("Si el correo existe, se envió un código") para no filtrar qué emails están registrados, lo cual es correcto, pero miente sobre lo que ocurrió.

## Objetivo

Que el código de verificación llegue al correo del usuario, y que `sendEmail` deje de ser código muerto.

## Alcance

- Conectar `createVerification` con `sendEmail`.
- Plantilla HTML del correo.
- Manejo de fallo del envío sin romper el registro.
- Tests del camino feliz y del fallo.

## Fuera de alcance

- Cambiar el mecanismo de código a un link con token.
- Agregar plantillas para otros correos (recuperación de contraseña, etc.): hoy no existe esa functionality.
- Verificación obligatoria antes de usar la app: `email_verified` se guarda pero ninguna ruta la chequea.

## Tareas

- [x] 1. Definir la plantilla HTML del correo de verificación
  - Crear `src/modules/auth/application/common/email-templates.ts` con `verificationEmailTemplate({ code })` que devuelva `{ subject, html }`.
  - El código va en el cuerpo del correo, no en el asunto, para no filtrarlo en logs de servidor de correo.
  - Mantener el registro en mayúsculas tal como lo genera `createVerification` (alfabeto `A-Z0-9`, 6 caracteres).
- [x] 2. Enviar el código desde `createVerification`
  - En `src/modules/auth/application/auth.service.ts`, después del `verification.create`, llamar a `sendEmail({ to: identifier, ...verificationEmailTemplate({ code: value }) })`.
  - **Quitar el `console.info`**: el código no debe quedar en los logs.
  - `createVerification` es `async`; el caller en `register()` ya es async, así que agregar el `await`.
  - Decidir qué pasa si el envío falla: la opción recomendada es loguear con `logger.error` y **no** fallar el registro. El usuario puede pedir un reenvío con `POST /auth/resend-verification`. La alternativa (fallar el registro) deja al usuario sin cuenta si Resend está caído, que es peor.
- [x] 3. Enviar el código también en `resend-verification`
  - `POST /auth/resend-verification` llama `auth.api.createVerification(req.body.email)`, así que hereda el envío con el paso 2. Verificar que el mensaje de respuesta siga siendo el genérico (no revela si el email existe).
- [x] 4. Verificar el límite de tasa del reenvío
  - `authLimiter` ya limita a 10 requests cada 15 min (`src/config/rate-limit.ts`), lo que acota el abuso. Verificar que sea suficiente antes de agregar un límite propio.
- [x] 5. Escribir tests
  - Mockear `src/modules/auth/application/common/email.utils.ts` y verificar que `register()` y `createVerification()` lo llaman con el código correcto.
  - Test del caso de fallo de envío: el registro se completa igual y se loguea.
  - Test de que `console.info` ya no se invoca con el código.

## Criterios de Done

> **Nota sobre el envío físico**: los tests verifican el contrato con `sendEmail` mockeado. Confirmar la entrega real del correo exige una `RESEND_API_KEY` válida en el entorno y una llamada de red; no se hizo en este entorno.

- [~] `register` y `resend-verification` envían un correo real con el código usando el `RESEND_FROM_EMAIL` configurado.
  - Verificado con mock: `register` llama `sendEmail` con el email normalizado; `createVerification` manda el código en el cuerpo (no en el asunto). La entrega física queda pendiente de una clave válida.
- [x] `rg "Código de verificación para"` en el repo no devuelve nada: el código no está en los logs.
- [~] Un usuario puede registrarse, recibir el correo, verificar su dirección y que `users.email_verified` quede en `true`.
  - Verificado por tests: `verifyEmail` marca `email_verified` y borra el código. El paso "recibir el correo" depende de la entrega física de Resend.
- [x] Si Resend falla, el registro se completa y hay un `logger.error` con el detalle (spy sobre `logger.error` en los tests).
- [x] `pnpm test` pasa: 123 tests en 8 suites.
- [x] `specs/modules/backend/01-stack.md` ya no marca `resend` como "integrado pero no usado".
