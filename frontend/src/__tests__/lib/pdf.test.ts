import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Book } from "@/types/book";

const getTextContentMock = vi.fn();
const getPageMock = vi.fn();
const getDocumentMock = vi.fn();

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: (args: unknown) => getDocumentMock(args),
}));

const streamMock = vi.fn();
vi.mock("@/api/book", () => ({
  booksApi: { stream: (bookId: string) => streamMock(bookId) },
}));

const { extractTextFromFile, extractTextFromBook, processBookForReading } =
  await import("@/lib/pdf");

function mockPdf(totalPages: number, pagesText: string[][]) {
  getPageMock.mockImplementation(async (pageNum: number) => ({
    getTextContent: async () => ({ items: pagesText[pageNum - 1].map((str) => ({ str })) }),
  }));
  getDocumentMock.mockReturnValue({
    promise: Promise.resolve({
      numPages: totalPages,
      getPage: getPageMock,
    }),
  });
}

function toFile(byteLength = 1024): File {
  return new File([new Uint8Array(byteLength)], "libro.pdf", {
    type: "application/pdf",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getTextContentMock.mockReset();
});

describe("extractTextFromFile", () => {
  it("devuelve páginas, total de páginas y texto con marcadores", async () => {
    mockPdf(2, [["En", "un", "lugar"], ["de", "la", "Mancha"]]);

    const result = await extractTextFromFile(toFile());

    expect(result.totalPages).toBe(2);
    expect(result.pages[0]).toEqual({ pageNumber: 1, text: "En un lugar" });
    expect(result.fullText).toBe("[PAGE_1]\nEn un lugar\n\n[PAGE_2]\nde la Mancha");
  });

  it("normaliza líneas vacías por página", async () => {
    mockPdf(1, [["", "", ""]]);

    const result = await extractTextFromFile(toFile());

    expect(result.pages[0].text).toBe("");
  });
});

describe("extractTextFromBook", () => {
  it("descarga por stream, extrae y reporta progreso", async () => {
    mockPdf(2, [["hola"], ["mundo"]])
    streamMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    });

    const progress: number[] = [];
    const text = await extractTextFromBook("book-1", (p) => progress.push(p));

    expect(streamMock).toHaveBeenCalledWith("book-1");
    expect(text).toBe("[PAGE_1]\nhola\n\n[PAGE_2]\nmundo");
    expect(progress[0]).toBe(10);
    expect(progress[progress.length - 1]).toBe(100);
  });

  it("lanza si el stream no responde ok", async () => {
    streamMock.mockResolvedValue({ ok: false });

    await expect(extractTextFromBook("book-1")).rejects.toThrow(
      "Error al descargar el PDF",
    );
  });
});

describe("processBookForReading", () => {
  it("no descarga si el libro ya tiene texto", async () => {
    const book: Book = {
      id: "book-1",
      name: "Libro",
      text: "x".repeat(20),
      readingTimeSeconds: 0,
      scrollPosition: 0,
      lastReadAt: 0,
      createdAt: 0,
    };

    const result = await processBookForReading(book);

    expect(result).toBe(book);
    expect(streamMock).not.toHaveBeenCalled();
  });

  it("descarga y extrae cuando el libro no tiene texto", async () => {
    mockPdf(1, [["capitulo uno"]]);
    streamMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    });
    const book: Book = {
      id: "book-1",
      name: "Libro",
      text: "",
      readingTimeSeconds: 0,
      scrollPosition: 0,
      lastReadAt: 0,
      createdAt: 0,
    };

    const result = await processBookForReading(book);

    expect(result.text).toContain("[PAGE_1]");
    expect(streamMock).toHaveBeenCalledWith("book-1");
  });
});

describe("contrato extractor ↔ reader", () => {
  const PAGE_REGEX = /^\[PAGE_(\d+)\]\s*/;

  it("el regex del reader encuentra los marcadores del formato unificado", async () => {
    mockPdf(2, [["primera"], ["segunda"]]);

    const { fullText } = await extractTextFromFile(toFile());

    const markers = fullText
      .split("\n\n")
      .map((paragraph) => {
        const match = paragraph.match(PAGE_REGEX);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null);

    expect(markers).toEqual([1, 2]);
  });

  it("el mismo formato llega por el camino de los libros de la nube", async () => {
    mockPdf(1, [["texto"]]);
    streamMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    });

    const text = await extractTextFromBook("book-1");

    expect(text.split("\n\n")[0]).toMatch(PAGE_REGEX);
  });
});