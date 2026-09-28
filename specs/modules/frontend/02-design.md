# Frontend Design

Sistema de diseño de Bookteka — tokens CSS, theming, componentes, patrones de UI.

---

## Principios

1. **Legibilidad primero**. Es una app de lectura: tipografía, contraste y espacios de lectura dominan el diseño.
2. **Tokens primero**. Cualquier valor (color, spacing, font-size) sale de CSS variables en `index.css`. Nunca hardcoded.
3. **Temas por `data-theme`**. 6 temas definidos en CSS (light, dark, midnight, sepia, ocean, forest); solo light/dark son seleccionables desde TS hoy.
4. **Sin flash blanco**: `index.html` aplica el tema y un splash estático antes del primer paint.

---

## Tokens (CSS variables)

Definidos en `src/index.css` con `data-theme` en `body` (lo setea `ThemeWrapper` con `useLayoutEffect`).

### Temas y colores base

| Token | light | dark | Uso |
|---|---|---|---|
| `--primary-color` | `#fcf5ee` | `#1c1a16` | Fondo de app. |
| `--secondary-color` | `#df8052` | `#df8052` | Acento / acciones (naranja). |
| `--third-color` | `#f2e4d9` | `#36281f` | Superficies secundarias. |
| `--four-color` | `#f4f2ec` | `#25211d` | Inputs / fondos. |
| `--card-color` | `#f7f4ed` | `#231f1a` | Cards. |
| `--altern-color` | `#f7ebda` | `#332516` | Variantes de acento. |
| `--altern-secondary-color` | `#f7d1b2` | `#5a3315` | Variantes de acento. |
| `--window-color` | `#f1eee6` | `#292420` | Ventanas. |
| `--preview-color` | `#f6f4ee` | `#171412` | Preview / vista previa. |
| `--font-color-title` | `#38332e` | `#ebe7e0` | Títulos / texto principal. |
| `--font-color-text` | `#7e7367` | `#7e7367` | Texto secundario. |
| `--border-color` | `#e0dad1` | `#3f3831` | Bordes. |

### Temas adicionales (definidos en CSS, sin selector TS hoy)

| Tema | Primary | Title |
|---|---|---|
| `midnight` | `#000000` | `#e5e5e5` |
| `sepia` | `#f4ecd8` | `#3d3426` |
| `ocean` | `#e0f2fe` | `#0c4a6e` |
| `forest` | `#ecfdf5` | `#064e3b` |

> Los colores del **splash** (`--splash-bg`/`--splash-fg`) se definen por script inline en `index.html` usando `--primary-color`/`--font-color-title` de cada tema.

### Otros tokens

```css
:root {
  --max-width: 1100px;
  --error-color: #dc3545;
  --padding: 20px;
}
```

---

## Componentes base

Ubicados en `src/components/common/`:

| Componente | Uso |
|---|---|
| `Input` | Input con label + error (usa `register` de react-hook-form). |
| `Spinner` | Loader circular con `@keyframes spin`. |
| `Loading` | Pantalla/overlay de carga con texto + subtexto opcional. |
| `IconTheme` | Toggle de tema (sun/moon). |
| `CloudSyncToggle` | Toggle de sync con la nube (persiste en `userPreferencesStore`). |

> No hay biblioteca de componentes de UI (ni Radix, ni MUI). Todo es CSS Modules + componentes locales.

---

## Patrón de página

```tsx
// src/pages/<Name>.tsx estructura común
export default function Profile() {
  // 1. Hooks del store (Zustand) + estado local
  // 2. Effects (load de datos al montar)
  // 3. Handlers
  // 4. Render con CSS Modules
  return (
    <main className={styles.main}>
      <header>...</header>
      <Componente />
    </main>
  );
}
```

---

## Estados de UI

### Loading

- `Loading` global con texto (`"Cargando libros..."`, `"Cargando contenido..."`).
- Spinner en botones (subir a la nube, submit).
- Overlay de preparación de PDF: `"Preparando libro... {n}%"` con `isProcessingPdf` + `pdfProgress`.

### Empty

- Biblioteca vacía: icono + título ("Tu biblioteca está vacía") + CTA "Añadir tu primer libro".
- Perfil sin libros: "Aún no tienes libros. ¡Añade uno para empezar!".

### Error

- Toast rojo (`sonner`) en errores globales.
- Mensaje inline en forms (login/register).
- `error` del store con mensajes ("Error al cargar los libros").

### Success

- Toast verde discreto ("Libro eliminado").

---

## Modal patterns

- `ShowUploaderModal` — subir PDF (drag & drop o file picker).
- `DeleteModal` — confirmación de borrado.
- `EditTimeModal` — editar tiempo de lectura de un libro (desde perfil).

---

## Iconografía

- `lucide-react`. Iconos usados: `Book`, `Grid`, `Menu`, `Plus`, `User`, `Clock`, `BookOpen`, `TrendingUp`, `Edit2`, `Cloud`, `CloudOff`, `CloudDownload`, `CloudUpload`, `ArrowLeft`, `X`, `ChevronDown`, `Search`, `Flame` (streak), etc.

---

## Tema oscuro / claro

- Toggle en header (`IconTheme`).
- Persiste en `localStorage["theme"]`.
- Default: `light`.
- `ThemeContext` inicializa de forma síncrona desde localStorage (lazy initializer) para evitar flash.
- `ThemeWrapper` aplica `data-theme` en `body` con `useLayoutEffect` (antes del paint).
- `index.html` aplica el tema al `<html>` antes del primer paint + splash estático.

---

## Accesibilidad (a11y)

| Guideline | Implementación |
|---|---|
| Contraste | Tokens diseñados para contraste (naranja sobre fondos claros/oscuros). |
| Focus | Visible en botones e inputs (default browser + CSS). |
| Labels | `<label htmlFor>` en cada input del formulario (componente `Input`). |
| Alt text | Logo con `alt="logo bookteka"`, iconos con `alt`. |
| ARIA | `role="status"`/`aria-live` en splash; `aria-busy` en botones con carga. |

---

## Layout (App shell)

```
┌──────────────────────────────────────────────┐
│  HEADER [logo] [theme toggle] [+ Añadir] [👤] │
├──────────────────────────────────────────────┤
│  MAIN CONTENT                                │
│  (routed page o Reader según currentView)    │
└──────────────────────────────────────────────┘
```

- El header se oculta en `/profile` y rutas `/auth`.
- El `Layout` decide: si `currentView === "reader"` y hay `currentBook`, renderiza `<Reader />` en vez del contenido ruteado.
- `--max-width: 1100px` centra el contenido.

---

## Performance

- Code-split: el bundle de pdf.js se separa del main (`pdf.worker.min`).
- PDFs se descargan bajo demanda (`getBookById` → `processBookForReading` con progreso).
- Coalescing de `PATCH /progress` (3s) para evitar storms de requests al scrollear.
- `flushPendingCloudProgress` con `keepalive` en `pagehide`/`visibilitychange`.

---

## No usar

- ❌ Tailwind, styled-components, Emotion.
- ❌ Bibliotecas de UI pesadas (MUI, Radix) salvo decisión explícita.
- ❌ Estilos inline para valores estáticos (siempre CSS Modules o tokens).
