# 🔴 El worker de PDF apunta a un archivo que no existe

## Estado Actual

Hay **dos** módulos de extracción de texto en el frontend, y el que se usa para los libros de la nube está roto.

### `lib/pdfService.ts` — el que falla

Línea 5:
```ts
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
```

El directorio `frontend/public/` contiene **solo** `tauri.svg` y `vite.svg`. No hay ningún `pdf.worker.min.js`. La request a `/pdf.worker.min.js` da 404, `pdf.js` no puede iniciar su worker y `downloadAndExtractPdfText` lanza.

Este es el camino que se usa en `bookStore.getBookById` cuando un libro viene de la nube sin texto local (`needsDownload = book.fileUrl && (!book.text || book.text.length < 10)`) y en `bookStore.downloadBookFromCloud`. Es decir: **abrir por primera vez un libro sincronizado falla**, y el store deja el error en `error: "Error al procesar el PDF"`.

### `lib/pdfExtractor.ts` — el que funciona

Línea 4:
```ts
import PDFWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWorker;
```

El sufijo `?url` es una directiva de Vite: el bundle resuelve la URL del worker en build. Esto **sí funciona** y es el patrón correcto. Lo usa `ShowUploaderModal` para el archivo que el usuario acaba de elegir.

### Y los dos no coinciden en el formato de salida

| Módulo | Marcador de página | ¿Quién lo consume? |
|---|---|---|
| `pdfService.ts` | `` `[PAGE_${pageNum}] ${pageText}` `` | El reader busca el patrón para navegar. |
| `pdfExtractor.ts` | `` `[PAGE_${pageNumber}]\n${pageText}` `` | Idéntico en apariencia, pero ver abajo. |

`TextReader.tsx` parsea el texto con una expresión regular para encontrar los marcadores. Si el formato cambia, la navegación por página deja de funcionar silenciosamente.

## Objetivo

Un solo camino de extracción, con el worker resuelto por el bundler, y el mismo formato de marcadores en todos lados.

## Alcance

- Arreglar la ruta del worker.
- Unificar los dos módulos en uno.
- Un único formato de marcador de página.
- Tests de las dos funciones.

## Fuera de alcance

- Renderizado del PDF en canvas (hoy solo se extrae texto).
- OCR para PDF escaneados.
- Precarga de libros.
- Cambiar `pdfjs-dist` de versión.

## Tareas

- [ ] 1. Confirmar el fallo antes de tocar nada
  - Levantar un libro sincronizado en la app y verificar en la consola que aparece un 404 de `/pdf.worker.min.js`.
  - Agregar el archivo a `public/` sería un parche; **no es la solución** (ver tarea 3).
- [ ] 2. Unificar los dos módulos en uno
  - `lib/pdfExtractor.ts` es el que funciona. `lib/pdfService.ts` tiene además `downloadAndExtractPdfText`, `downloadPdfToBlob`, `getSignedDownloadUrl` y `processBookForReading`.
  - Decidir la forma final. Lo recomendado: un solo módulo, por ejemplo `lib/pdf.ts`, que exporte:
    - `extractTextFromFile(file: File): Promise<PDFExtractResult>` (lo que hoy hace `pdfExtractor.ts`).
    - `extractTextFromBook(bookId: string, onProgress?): Promise<string>` (lo que hoy hace `downloadAndExtractPdfText`).
    - `processBookForReading(book, onProgress?): Promise<Book>` (la orquestación con el no-op cuando ya hay texto).
  - Borrar `lib/pdfExtractor.ts` y `lib/pdfService.ts`.
  - Actualizar los imports en `frontend/src/components/modals/ShowUploaderModal.tsx`, `frontend/src/store/bookStore.ts` y los tests.
- [ ] 3. Fijar el worker con el patrón de Vite en el módulo único
  - `import PDFWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"` + `pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWorker`.
  - **No** agregar un `.js` a mano en `public/`: la dependencia se rompe en el update de `pdfjs-dist` y no pasa por el hash de contenido de Vite, así que puede quedar cacheado.
- [ ] 4. Unificar el formato del marcador de página
  - Elegir uno y aplicarlo en las dos funciones. Recomendado: `[PAGE_n]` seguido de un salto de línea, que es lo que hace `pdfExtractor.ts` y lo más legible al inspeccionar el texto.
  - Verificar contra el parser de `TextReader.tsx` (`components/pages/reader/TextReader.tsx`) que la expresión regular sigue encontrando los marcadores. Este archivo tiene 567 líneas: no lo reescribas, ajustá el regex si hace falta.
- [ ] 5. Borrar las funciones sin uso de `pdfService.ts`
  - `downloadPdfToBlob(fileUrl)` y `getSignedDownloadUrl(bookId)`: `rg` confirma que cada una aparece **solo** en el archivo que las define.
  - El flujo de descarga real usa `booksApi.stream` + `processBookForReading`.
- [ ] 6. Agregar tests
  - `extractTextFromFile` con un PDF de fixture pequeño: devuelve el número de páginas correcto y el texto con marcadores.
  - `processBookForReading` con un libro que ya tiene texto: no llama a la red (el no-op de `book.text.length > 10`).
  - Verificar que el regex de `TextReader` encuentra los marcadores que genera el extractor. Este es el test que más valor da: es el contrato entre los dos módulos.

## Criterios de Done

- [ ] Abrir un libro sincronizado por primera vez descarga y extrae el texto sin error.
- [ ] No hay ninguna referencia a `/pdf.worker.min.js` en el código.
- [ ] Existe un solo módulo de PDF y un solo formato de marcador de página.
- [ ] La navegación por página del reader funciona con el texto que genera el extractor.
- [ ] `pnpm exec vitest run` pasa con los tests nuevos, incluido el de compatibilidad extractor ↔ reader.
- [ ] `pnpm build` pasa (el `?url` de Vite tiene que resolver en build, no solo en dev).
- [ ] `specs/modules/frontend/03-architecture.md` describe el módulo único.
