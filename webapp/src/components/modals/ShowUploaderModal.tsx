import styles from "./ShowUploaderModal.module.css";
import PDFUploader from "../global/PDFUploader";
import { useState, useCallback } from "react";
import { isValidPDF, extractTextFromPDF } from "@/lib/pdfExtractor";
import { toast } from "sonner";
import type { Book } from "@/types/book";

interface ShowUploaderModalProps {
  onAddBook: (name: string, text: string, totalPages?: number) => Promise<Book>;
  setShowUploader: () => void;
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
          toast.error("No se pudo extraer texto del PDF.");
          return;
        }
        const book = await onAddBook(
          file.name,
          result.fullText,
          result.totalPages,
        );

        toast.success(`"${book.name}" añadido a la biblioteca`);
        setShowUploader();
      } catch (error) {
        console.error("Error al procesar el PDF:", error);
        toast.error("Error al procesar el PDF.");
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
