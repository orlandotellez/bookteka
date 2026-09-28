# Frontend Module

App de **Bookteka** con React + Vite + TypeScript, dual-target (web + Tauri desktop/Android).

## Contents

1. [01-stack](./01-stack.md) — Stack tecnológico, dual-target, build, deps principales
2. [02-design](./02-design.md) — Sistema de diseño, tokens, temas, componentes
3. [03-architecture](./03-architecture.md) — Estructura de carpetas, stores, API client, IndexedDB
4. [04-screens](./04-screens.md) — Inventario de pantallas con sus features
5. [05-quality](./05-quality.md) — Build, typecheck, testing, convenciones
6. [06-estado](./06-estado.md) — Estrategia de estado global (Zustand + IndexedDB)

## Quick start

```bash
# Desde frontend/
pnpm install
cp .env.example .env
pnpm dev                  # Vite web → http://localhost:1420
pnpm tauri dev            # Desktop (Tauri shell)
pnpm tauri android dev    # Android
pnpm build                # Build producción web
```

## Dual target

| Target | Comando | API base |
|---|---|---|
| Web dev | `pnpm dev` | `/api/v1` (proxy de Vite → `BACKEND_HOST`) |
| Web Docker | `docker compose up` | `/api/v1` (nginx proxya al backend) |
| Desktop dev | `pnpm tauri dev` | `/api/v1` (proxy de Vite) |
| Desktop prod | `pnpm tauri build` | Bootstrap remoto (`config-api.json`) o `localStorage[BOOKTEKA_API_URL]` |
| Android dev | `pnpm tauri android dev` | `VITE_BACKEND_HOST` + `/api/v1` (LAN) |
| Android prod | `pnpm tauri android build` | Bootstrap remoto |

> El arranque lo resuelve `AppBootstrap` (`context/AppBootstrap.tsx`): en dev usa el servidor local; en producción consulta el bootstrap remoto (`config-api.json`) y cae a `FALLBACK_PRODUCTION_URL` si falla. El usuario puede sobrescribir la URL desde `localStorage[BOOKTEKA_API_URL]`.

## Scripts

```jsonc
// frontend/package.json
{
  "scripts": {
    "dev": "vite",
    "production:mode": "VITE_FORCE_PRODUCTION=true pnpm tauri dev",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  }
}
```
