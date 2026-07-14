import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import PDFUploader from "@/components/pages/index/PDFUploader";

afterEach(cleanup);

// ─── Helper ─────────────────────────────────────────────────────────────────

/** Crea un archivo PDF falsos para simular la selección */
function createMockPdfFile(name = "test.pdf"): File {
  return new File(["%PDF-1.4 mock content"], name, {
    type: "application/pdf",
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("PDFUploader", () => {
  it("renders the upload prompt when not loading", () => {
    render(<PDFUploader onFileSelect={vi.fn()} isLoading={false} />);

    // Verificar textos principales
    expect(screen.getByText("Sube tu archivo PDF")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Arrastra y suelta aquí, o haz clic para seleccionar",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Formatos soportados: PDF")).toBeInTheDocument();
  });

  it("shows loading state when isLoading is true", () => {
    render(<PDFUploader onFileSelect={vi.fn()} isLoading={true} />);

    // Debe mostrar el texto de carga
    expect(screen.getByText("Procesando PDF...")).toBeInTheDocument();
    expect(
      screen.getByText("Extrayendo texto del documento"),
    ).toBeInTheDocument();

    // NO debe mostrar el texto de soporte cuando está cargando
    expect(screen.queryByText("Formatos soportados: PDF")).toBeNull();
  });

  it("calls onFileSelect when a valid PDF file is selected", () => {
    const handleFileSelect = vi.fn();
    const { container } = render(
      <PDFUploader onFileSelect={handleFileSelect} isLoading={false} />,
    );

    // Buscar el input file dentro del contenedor renderizado
    // NOTA: No usamos getByLabelText porque el label contiene múltiples
    // elementos de texto (h3, p, span) y la coincidencia exacta falla.
    // Alternativas:
    //   - container.querySelector → busca en el DOM del componente
    //   - getByLabelText(..., { exact: false }) → búsqueda parcial
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    // Simular la selección de archivo
    const file = createMockPdfFile("mi-libro.pdf");
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(handleFileSelect).toHaveBeenCalledTimes(1);
    expect(handleFileSelect).toHaveBeenCalledWith(file);
  });

  it("has an accessible file input", () => {
    const { container } = render(
      <PDFUploader onFileSelect={vi.fn()} isLoading={false} />,
    );

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    expect(fileInput).toBeInTheDocument();
    expect(fileInput.type).toBe("file");
    expect(fileInput.accept).toContain(".pdf");
  });

  it("disables the file input when loading", () => {
    const { container } = render(
      <PDFUploader onFileSelect={vi.fn()} isLoading={true} />,
    );

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    expect(fileInput.disabled).toBe(true);
  });

  it("calls onFileSelect with dropped PDF file", () => {
    const handleFileSelect = vi.fn();
    render(<PDFUploader onFileSelect={handleFileSelect} isLoading={false} />);

    // Obtener el elemento dropzone (label) por su texto
    const dropzone = screen.getByText("Sube tu archivo PDF").closest("label");
    expect(dropzone).not.toBeNull();

    const file = createMockPdfFile("drop-libro.pdf");

    // Simular el evento drop
    fireEvent.drop(dropzone!, {
      dataTransfer: {
        files: [file],
        items: [{ kind: "file", type: "application/pdf" }],
      },
    });

    expect(handleFileSelect).toHaveBeenCalledTimes(1);
    expect(handleFileSelect).toHaveBeenCalledWith(file);
  });

  it("renders the Spinner component when loading", () => {
    render(<PDFUploader onFileSelect={vi.fn()} isLoading={true} />);

    const spinner = document.querySelector('[class*="spinner"]');
    expect(spinner).toBeInTheDocument();
  });

  it("does not render the Spinner when not loading", () => {
    render(<PDFUploader onFileSelect={vi.fn()} isLoading={false} />);

    const spinner = document.querySelector('[class*="spinner"]');
    expect(spinner).toBeNull();
  });
});
