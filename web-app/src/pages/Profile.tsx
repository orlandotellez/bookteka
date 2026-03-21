import { useEffect, useState } from "react";
import UserProfile from "@/components/pages/profile/UserProfile";
import { EditTimeModal } from "@/components/modals/EditTimeModal";
import { useBookStore } from "@/store/bookStore";
import type { Book } from "@/types/book";
import { useStreakStore } from "@/store/streakStore";

const Profile = () => {
  const { books, loadBooks, setReadingTime, uploadBookToCloud, uploadingBookId } = useBookStore();
  const {
    streakData,
    loadStreakData,
    completeDay,
    initializeStreak,
    isStreakLoading,
  } = useStreakStore();
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  useEffect(() => {
    loadBooks();
    loadStreakData();
  }, [loadBooks, loadStreakData]);

  const handleEditTime = (book: Book) => {
    setEditingBook(book);
  };

  const handleSaveTime = async (id: string, totalSeconds: number) => {
    await setReadingTime(id, totalSeconds);
  };

  const handleCloseModal = () => {
    setEditingBook(null);
  };

  return (
    <>
      <UserProfile
        books={books}
        onEditTime={handleEditTime}
        onUploadToCloud={uploadBookToCloud}
        isUploadingBookId={uploadingBookId}
        streakData={streakData || undefined}
        onCompleteDay={completeDay}
        onInitializeStreak={initializeStreak}
        isStreakLoading={isStreakLoading}
      />
      {editingBook && (
        <EditTimeModal
          book={editingBook}
          onSave={handleSaveTime}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default Profile;
