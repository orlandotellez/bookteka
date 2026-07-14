import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { ShowUploaderModal } from "@/components/modals/ShowUploaderModal";
import type { Book } from "@/types/book";

afterEach(cleanup);

// ─── Mock de pdfExtractor ───────────────────────────────────────────────────
// ShowUploaderModal usa isValidPDF y extractTextFromPDF de lib/pdfExtractor.
// Las mockeamos para no tener que cargar pdfjs-dist en los tests.

vi.mock("@/lib/pdfExtractor", () => ({
  isValidPDF: vi.fn(() => true),
  extractTextFromPDF: vi.fn(() =>
    Promise.resolve({
      pages: [{ pageNumber: 1, text: "Texto de prueba" }],
      totalPages: 1,
      fullText: "[PAGE_1]\nTexto de prueba",
    }),
  ),
}));

// ─── Mock de sonner (toast) ─────────────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockPdfFile(): File {
  return new File(["%PDF-1.4 mock"], "mi-libro.pdf", {
    type: "application/pdf",
  });
}

/** Obtiene el input[type="file"] dentro del modal */
function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  if (!input) throw new Error("Input file no encontrado");
  return input;
}

const defaultProps = {
  setShowUploader: vi.fn(),
  onAddBook: vi.fn().mockResolvedValue({
    id: "new-book-1",
    name: "mi-libro.pdf",
    text: "[PAGE_1]\nTexto de prueba",
  } as Book),
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("ShowUploaderModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the modal with title and cancel button", () => {
    render(<ShowUploaderModal {...defaultProps} />);

    expect(screen.getByText("Añadir nuevo libro")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  it("calls setShowUploader when clicking Cancel", () => {
    render(<ShowUploaderModal {...defaultProps} />);

    fireEvent.click(screen.getByText("Cancelar"));
    expect(defaultProps.setShowUploader).toHaveBeenCalledTimes(1);
  });

  it("calls onAddBook when a valid PDF is selected", async () => {
    const { container } = render(<ShowUploaderModal {...defaultProps} />);

    const fileInput = getFileInput(container);
    const file = createMockPdfFile();
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verificar que se procesó el PDF y se llamó a onAddBook
    await waitFor(() => {
      expect(defaultProps.onAddBook).toHaveBeenCalledTimes(1);
    });

    // Debe llamarse con el nombre del archivo, el texto extraído, totalPages y el archivo
    expect(defaultProps.onAddBook).toHaveBeenCalledWith(
      "mi-libro.pdf",
      "[PAGE_1]\nTexto de prueba",
      1,
      file,
    );
  });

  it("closes the modal after successful upload", async () => {
    const { container } = render(<ShowUploaderModal {...defaultProps} />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [createMockPdfFile()] } });

    await waitFor(() => {
      expect(defaultProps.setShowUploader).toHaveBeenCalledTimes(1);
    });
  });

  it("shows loading state while processing", async () => {
    // Hacer que extractTextFromPDF demore
    const { extractTextFromPDF } = await import("@/lib/pdfExtractor");
    vi.mocked(extractTextFromPDF).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                pages: [{ pageNumber: 1, text: "Texto" }],
                totalPages: 1,
                fullText: "[PAGE_1]\nTexto",
              }),
            100,
          ),
        ),
    );

    const { container } = render(<ShowUploaderModal {...defaultProps} />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [createMockPdfFile()] } });

    // Debería mostrar "Procesando PDF..." mientras carga
    expect(screen.getByText("Procesando PDF...")).toBeInTheDocument();

    // Esperar a que termine (el timeout de 100ms)
    await waitFor(() => {
      expect(defaultProps.setShowUploader).toHaveBeenCalled();
    });
  }, 10000);

  it("shows error toast when PDF extraction fails", async () => {
    const { extractTextFromPDF } = await import("@/lib/pdfExtractor");
    vi.mocked(extractTextFromPDF).mockRejectedValueOnce(
      new Error("PDF corrupto"),
    );

    const { toast } = await import("sonner");

    const { container } = render(<ShowUploaderModal {...defaultProps} />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [createMockPdfFile()] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });

    // Debería mostrar el mensaje de error específico
    expect(toast.error).toHaveBeenCalledWith(
      "Error al procesar el PDF: PDF corrupto",
    );

    // NO debería cerrar el modal (setShowUploader no se llama)
    expect(defaultProps.setShowUploader).not.toHaveBeenCalled();
  });
});
