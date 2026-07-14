import styles from "./ShowUploaderModal.module.css";
import PDFUploader from "@/components/pages/index/PDFUploader";
import { useState, useCallback } from "react";
import { isValidPDF, extractTextFromPDF } from "@/lib/pdfExtractor";
import { toast } from "sonner";
import type { Book } from "@/types/book";

interface ShowUploaderModalProps {
  onAddBook: (name: string, text: string, totalPages?: number, file?: File) => Promise<Book>;
  setShowUploader: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Error desconocido";
}

export const ShowUploaderModal = ({
  setShowUploader,
  onAddBook,
}: ShowUploaderModalProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!isValidPDF(file)) {
        toast.error("Por favor selecciona un archivo PDF válido");
        return;
      }

      setIsUploading(true);

      try {
        const result = await extractTextFromPDF(file);
        if (!result.fullText.trim()) {
          toast.error("No se pudo extraer texto del PDF. El archivo podría ser un documento escaneado sin texto seleccionable.");
          return;
        }
        const book = await onAddBook(
          file.name,
          result.fullText,
          result.totalPages,
          file,
        );

        toast.success(`"${book.name}" añadido a la biblioteca`);
        setShowUploader();
      } catch (error) {
        const msg = getErrorMessage(error);
        console.error("[Upload] Error al procesar el PDF:", {
          fileName: file.name,
          fileSize: file.size,
          error: msg,
          originalError: error,
        });
        toast.error(`Error al procesar el PDF: ${msg}`);
      } finally {
        setIsUploading(false);
      }
    },
    [onAddBook, setShowUploader],
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Añadir nuevo libro</h2>
          <button className={styles.cancelButton} onClick={setShowUploader}>
            Cancelar
          </button>
        </div>

        <PDFUploader onFileSelect={handleFileSelect} isLoading={isUploading} />
      </div>
    </div>
  );
};
