# Tasks — Deuda y trabajo pendiente de Bookteka

Esta carpeta es la **única fuente de trabajo** del proyecto. Cada tarea describe algo que el código hace mal, hace a medias o deja sin cubrir, y cita el archivo real del que salió.

## Qué hay en esta carpeta y qué no

| Es | No es |
|---|---|
| Deuda técnica con evidencia en un archivo | Una lista de deseos |
| Bugs reproducibles hoy | Features inventadas |
| Huecos de seguridad, tests y documentación | Un backlog de producto |

Si una feature de producto todavía no existe y hay que decidir si se quiere, **no va acá**. Eso se conversa antes de escribir código.

## Cómo usar las listas

1. Leé el `## Estado Actual` de la tarea. Siempre cita código real, con la línea o el nombre del símbolo.
2. Ejecutá las tareas raíz **en orden**: el número es la secuencia. Los pasos con `→` debajo son el detalle de implementación del paso anterior.
3. Marcá el checkbox solo cuando el comportamiento está verificado, no cuando el código está escrito.
4. Al terminar, tildá los `## Criterios de Done`.
5. **Nunca borres ni renombres un archivo de tarea.** El progreso se registra marcando checkboxes. Si una tarea deja de ser válida, agregá una nota al final explicando por qué y dejala visible.

## Estructura de cada archivo

```markdown
# <Área>

## Estado Actual      Qué hay hoy en el código, con rutas reales
## Objetivo           El comportamiento terminado, en una frase
## Alcance             Qué entra
## Fuera de alcance    Qué no entra
## Tareas              Checklist numerado; el número es el orden de ejecución
## Criterios de Done   Cómo se verifica que terminó
```

## Mapa de la carpeta

| Carpeta | Cubre |
|---|---|
| [`backend/`](./backend/) | API Express: contrato incompleto, email sin enviar, configuración, código muerto, ausencia de CI. |
| [`db/`](./db/) | Esquema Prisma: purga de datos que crece, índices faltantes, migraciones sin higiene. |
| [`frontend/`](./frontend/) | App React: cobertura de tests, worker de PDF roto, código muerto, validaciones que no coinciden con el backend. |

## Orden de arranque sugerido

1. [`frontend/02-trabajo-pdf.md`](./frontend/02-trabajo-pdf.md) — el worker de PDF apunta a un archivo inexistente: la lectura de libros de la nube está rota.
2. [`backend/01-integridad-contrato.md`](./backend/01-integridad-contrato.md) — el cliente llama un endpoint que no existe y los ejemplos de request están desactualizados.
3. [`backend/02-email-verificacion.md`](./backend/02-email-verificacion.md) — la verificación de correo no envía el código.
4. [`frontend/01-cobertura-tests.md`](./frontend/01-cobertura-tests.md) — la vista de lectura entera está sin testear.
5. [`backend/05-ci-y-calidad.md`](./backend/05-ci-y-calidad.md) — no hay CI: nada obliga a que los tests pasen.

## Leyenda

- 🔴 Rompe funcionalidad hoy
- 🟠 Deuda que va a costar caro si se acumula
- 🟡 Falta de cobertura, limpieza o documentación
