import * as pdfjsLib from "pdfjs-dist";
import PDFWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configurar el worker de PDF.js usando una versión compatible
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWorker;

export interface PDFPage {
  pageNumber: number;
  text: string;
}

export interface PDFExtractResult {
  pages: PDFPage[];
  totalPages: number;
  fullText: string;
}

/**
 * Extrae todo el texto de un archivo PDF con información de páginas
 * @param file - Archivo PDF a procesar
 * @returns Promise con el resultado de extracción incluyendo páginas
 */
export async function extractTextFromPDF(
  file: File,
): Promise<PDFExtractResult> {
  // Convertir el archivo a ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Cargar el documento PDF
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages: PDFPage[] = [];
  const totalPages = pdf.numPages;

  // Extraer texto de cada página
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Procesar los items de texto de la página
    const pageText = textContent.items
      .map((item) => {
        if ("str" in item) {
          return item.str;
        }
        return "";
      })
      .join(" ");

    pages.push({
      pageNumber: pageNum,
      text: pageText.trim(),
    });
  }

  // Generar texto completo con marcadores de página
  const fullText = pages
    .map((p) => `[PAGE_${p.pageNumber}]\n${p.text}`)
    .join("\n\n");

  return {
    pages,
    totalPages,
    fullText,
  };
}

/**
 * Valida si el archivo es un PDF válido
 */
export function isValidPDF(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}
