import { Library } from "@/components/global/Library";
import { useBooks } from "@/hooks/useBooks";
import { useCallback, useState } from "react";
import type { Book } from "@/types/book";

type View = "library" | "reader" | "profile";

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("library");
  const [currentBook, setCurrentBook] = useState<Book | null>(null);

  const {
    books,
    isLoading,
    addBook,
    deleteBook,
    //updateReadingTime,
    //setReadingTime,
    //updateScrollPosition,
    getBookById,
    //refreshBooks,
  } = useBooks();

  const handleOpenBook = useCallback(
    async (book: Book) => {
      const freshBook = await getBookById(book.id);
      if (freshBook) {
        setCurrentBook(freshBook);
        setCurrentView("reader");
      }
    },
    [getBookById],
  );

  return (
    <>
      <section>
        <h2>Index</h2>

        <Library
          books={books}
          isLoading={isLoading}
          onAddBook={addBook}
          onDeleteBook={deleteBook}
          onOpenBook={handleOpenBook}
        />
      </section>
    </>
  );
};

export default Index;
