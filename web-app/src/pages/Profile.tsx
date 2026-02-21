import { useEffect, useState } from "react";
import UserProfile from "@/components/global/UserProfile";
import { EditTimeModal } from "@/components/modals/EditTimeModal";
import { useBookStore } from "@/store/bookStore";
import type { Book } from "@/types/book";
import { useStreakStore } from "@/store/streakStore";

const Profile = () => {
  const { books, loadBooks, setReadingTime } = useBookStore();
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
