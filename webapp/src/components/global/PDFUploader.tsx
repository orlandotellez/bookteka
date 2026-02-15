import { useCallback, useState } from "react";
import { Upload, FileText } from "lucide-react";
import styles from "./PDFUploader.module.css";

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

/**
 * Componente para subir archivos PDF
 * Soporta drag & drop y selección de archivo
 */
const PDFUploader = ({ onFileSelect, isLoading }: PDFUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type === "application/pdf") {
          onFileSelect(file);
        }
      }
    },
    [onFileSelect],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFileSelect(e.target.files[0]);
      }
    },
    [onFileSelect],
  );

  return (
    <div className={styles.wrapper}>
      <label
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          ${styles.dropzone}
          ${isDragging ? styles.dragging : ""}
          ${isLoading ? styles.loading : ""}
        `}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className={styles.input}
          disabled={isLoading}
        />

        <div
          className={`
            ${styles.iconContainer}
            ${isDragging ? styles.iconDragging : ""}
          `}
        >
          {isLoading ? (
            <FileText className={`${styles.icon} ${styles.pulse}`} />
          ) : (
            <Upload
              className={`
                ${styles.icon}
                ${isDragging ? styles.iconActive : ""}
              `}
            />
          )}
        </div>

        <h3 className={styles.title}>
          {isLoading ? "Procesando PDF..." : "Sube tu archivo PDF"}
        </h3>

        <p className={styles.description}>
          {isLoading
            ? "Extrayendo texto del documento"
            : "Arrastra y suelta aquí, o haz clic para seleccionar"}
        </p>

        {!isLoading && (
          <span className={styles.supportText}>Formatos soportados: PDF</span>
        )}
      </label>
    </div>
  );
};

export default PDFUploader;
