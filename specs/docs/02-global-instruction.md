# 02 — Visión general e índice

## Visión general

Bookteka es un monorepo de tres proyectos independientes que comparten un contrato de API y una base de datos.

```
BOOKTEKA-REPO/
├── backend-express/   API REST. Express 5 + TypeScript + Prisma + PostgreSQL.
├── frontend/          Aplicación. React 19 + Vite 7 + Tauri 2 (web, desktop, Android).
├── landing-page/      Sitio de marketing. Astro 5, estático, sin API.
├── docker-compose.yml Orquestación: PostgreSQL + backend + frontend.
└── specs/             Este árbol de documentación.
```

El flujo de una petición: la app llama a `/api/v1/...` → el backend valida el JWT → el service aplica la regla de negocio → el repository consulta PostgreSQL → los bytes del PDF salen de Cloudflare R2, nunca de la base de datos.

## Índice de módulos

| Módulo | Archivos | Para qué sirve |
|---|---|---|
| **backend** | [README](../modules/backend/README.md) · [01-stack](../modules/backend/01-stack.md) · [02-architecture](../modules/backend/02-architecture.md) · [03-api](../modules/backend/03-api.md) | Stack del servidor, capas MVC y convenciones REST transversales. |
| **db** | [README](../modules/db/README.md) · [setup](../modules/db/setup.md) · [schemas/](../modules/db/schemas/README.md) (9 tablas) · [enums/](../modules/db/enums/README.md) · [use-cases/](../modules/db/use-cases/README.md) | Las 9 tablas de PostgreSQL, sus columnas, índices, relaciones y los flujos que las tocan. |
| **frontend** | [README](../modules/frontend/README.md) · [01-stack](../modules/frontend/01-stack.md) · [02-design](../modules/frontend/02-design.md) · [03-architecture](../modules/frontend/03-architecture.md) · [04-screens](../modules/frontend/04-screens.md) · [05-quality](../modules/frontend/05-quality.md) · [06-estado](../modules/frontend/06-estado.md) | Stack de la app, sistema de diseño, arquitectura, inventario de pantallas y estrategia de estado. |
| **api** | [README](../modules/api/README.md) · [01-auth](../modules/api/01-auth.md) · [02-books](../modules/api/02-books.md) · [03-bookmarks](../modules/api/03-bookmarks.md) · [04-streak](../modules/api/04-streak.md) | Contrato endpoint por endpoint: método, ruta, auth, request, response y errores. |

| Documentos | Para qué sirven |
|---|---|
| [01-descripcion-proyecto](./01-descripcion-proyecto.md) | Qué es el producto, para quién y qué queda explícitamente fuera. |
| [03-ejecucion-local](./03-ejecucion-local.md) | Comandos reales para levantar, testear y compilar. |
| [04-buenas-practicas](./04-buenas-practicas.md) | Convenciones de código, estructura, errores y commits. |
| [05-requisitos-no-funcionales](./05-requisitos-no-funcionales.md) | Rendimiento, seguridad, escalabilidad y disponibilidad. |
| [06-glosario](./06-glosario.md) | Términos del dominio. |
| [07-decisiones](./07-decisiones.md) | Registro de decisiones arquitectónicas. |
| [documentacion-cliente](../documentacion-cliente.md) | Documento de negocio para el cliente, en lenguaje simple. |
| [tasks/](../tasks/README.md) | Deuda y trabajo pendiente, con archivo de origen en cada tarea. |

## Referencia rápida del stack

| Capa | Tecnología | Versión |
|---|---|---|
| API | Express | 5.x |
| Lenguaje backend | TypeScript (ESM, strict) | 5.9 |
| ORM | Prisma | 6.x |
| Base de datos | PostgreSQL | 16 |
| Storage de PDFs | Cloudflare R2 (API S3) | — |
| Email | Resend (integrado, sin usar) | 6.x |
| Validación | Zod | 4.x |
| Tests backend | Jest + Supertest | 30.x / 7.x |
| UI | React | 19.x |
| Bundler | Vite | 7.x |
| Shell nativo | Tauri | 2.x |
| Estado | Zustand | 5.x |
| Persistencia local | IndexedDB (`idb`) | 8.x |
| PDF | pdf.js | 5.4.624 |
| Tests frontend | Vitest + Testing Library | 4.x |
| Landing | Astro | 5.x |
| Package manager | pnpm | 10.15 |

## Cómo navegar este árbol

**Para entender el producto de punta a punta, en orden:**
`descripcion-proyecto.md` → `docs/01` → `docs/06-glosario` → `documentacion-cliente.md`

**Para tocar el backend:**
`modules/backend/02-architecture` (capas) → `modules/api/<feature>` (contrato) → `modules/tasks/backend/` (deuda)

**Para tocar la base de datos:**
`modules/db/schemas/index` — leer siempre antes de escribir SQL crudo. Los nombres de tabla son singulares salvo `users`.

**Para tocar la UI:**
`modules/frontend/02-design` (tokens) → `modules/frontend/04-screens` (qué existe) → `modules/frontend/03-architecture` (dónde va) → `modules/tasks/frontend/`

**Antes de implementar cualquier cosa:**
revisar `tasks/README.md`. Toda la deuda conocida está ahí, con el archivo del que salió.
