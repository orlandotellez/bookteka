import * as pdfjsLib from "pdfjs-dist";
import PDFWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { booksApi } from "@/api/book";
import type { Book } from "@/types/book";

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

async function loadPdf(data: ArrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data });
  return loadingTask.promise;
}

async function extractPageText(pageNum: number, pdf: { getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }> }) {
  const page = await pdf.getPage(pageNum);
  const textContent = await page.getTextContent();
  return (textContent.items as Array<{ str?: string }>)
    .map((item) => item.str ?? "")
    .join(" ")
    .trim();
}

function withPageMarkers(pages: PDFPage[]): string {
  return pages.map((p) => `[PAGE_${p.pageNumber}]\n${p.text}`).join("\n\n");
}

export async function extractTextFromFile(file: File): Promise<PDFExtractResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await loadPdf(arrayBuffer);

  const pages: PDFPage[] = [];
  const totalPages = pdf.numPages;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    pages.push({
      pageNumber: pageNum,
      text: await extractPageText(pageNum, pdf),
    });
  }

  return {
    pages,
    totalPages,
    fullText: withPageMarkers(pages),
  };
}

export async function extractTextFromBook(
  bookId: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  onProgress?.(10);

  const response = await booksApi.stream(bookId);
  if (!response.ok) {
    throw new Error("Error al descargar el PDF");
  }

  onProgress?.(30);
  const arrayBuffer = await response.arrayBuffer();
  onProgress?.(50);

  const pdf = await loadPdf(arrayBuffer);
  const pages: PDFPage[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    pages.push({
      pageNumber: pageNum,
      text: await extractPageText(pageNum, pdf),
    });
    onProgress?.(50 + Math.round((pageNum / pdf.numPages) * 40));
  }

  onProgress?.(100);
  return withPageMarkers(pages);
}

export async function processBookForReading(
  book: Book,
  onProgress?: (progress: number) => void,
): Promise<Book> {
  if (book.text && book.text.length > 10) {
    return book;
  }

  if (!book.id) {
    throw new Error("El libro no tiene ID para descargar");
  }

  try {
    const text = await extractTextFromBook(book.id, onProgress);
    return { ...book, text };
  } catch (error) {
    console.error("Error processing book:", error);
    throw error;
  }
}

export function isValidPDF(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}