import type { Book } from "@/types/book";
import { useState, useMemo, useCallback } from "react";
import { isValidPDF, extractTextFromPDF } from "@/lib/pdfExtractor";
import { toast } from "sonner";
import { CardBook } from "./CardBook";
import PDFUploader from "./PDFUploader";

interface LibraryProps {
  books: Book[];
  isLoading: boolean;
  onAddBook: (name: string, text: string, totalPages?: number) => Promise<Book>;
  onDeleteBook: (id: string) => Promise<void>;
  onOpenBook: (book: Book) => void;
}

type SortBy = "recent" | "name" | "time";
type FilterStatus = "all" | "reading" | "unstarted";

export const Library = ({
  books,
  isLoading,
  onAddBook,
  onDeleteBook,
  onOpenBook,
}: LibraryProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");

  const processedBooks = useMemo(() => {
    let filtered = [...books];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((b) => b.name.toLowerCase().includes(q));
    }

    // Filter
    if (filterStatus === "reading") {
      filtered = filtered.filter((b) => b.scrollPosition > 0);
    } else if (filterStatus === "unstarted") {
      filtered = filtered.filter((b) => b.scrollPosition === 0);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "recent") return b.lastReadAt - a.lastReadAt;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "time") return b.readingTimeSeconds - a.readingTimeSeconds;
      return 0;
    });

    return filtered;
  }, [books, searchQuery, filterStatus, sortBy]);

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
        //     setShowUploader(false);
      } catch (error) {
        console.error("Error al procesar el PDF:", error);
        toast.error("Error al procesar el PDF.");
      } finally {
        setIsUploading(false);
      }
    },
    [onAddBook],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await onDeleteBook(id);
        toast.success("Libro eliminado");
      } catch {
        toast.error("Error al eliminar el libro");
      }
    },
    [onDeleteBook],
  );

  const renderBooks = (booksToRender: Book[]) => {
    return (
      <div>
        {booksToRender.map((book) => (
          <CardBook
            key={book.id}
            book={book}
            onOpen={onOpenBook}
            onDelete={handleDelete}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <div>
        <PDFUploader onFileSelect={handleFileSelect} isLoading={isUploading} />
      </div>
      <article>{renderBooks(processedBooks)}</article>
    </>
  );
};
