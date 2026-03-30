import { useEffect, useState } from "react";
import UserProfile from "@/components/pages/profile/UserProfile";
import { EditTimeModal } from "@/components/modals/EditTimeModal";
import { useBookStore } from "@/store/bookStore";
import type { Book } from "@/types/book";
import { useStreakStore } from "@/store/streakStore";
import { useUserPreferences } from "@/store/userPreferencesStore";
import type { ReadingSettings } from "@/types/reading";

const Profile = () => {
  const { books, setReadingTime, uploadBookToCloud, uploadingBookId } = useBookStore();
  const {
    streakData,
    loadStreakData,
    completeDay,
    initializeStreak,
    isStreakLoading,
  } = useStreakStore();
  const {
    defaultReadingSettings,
    setDefaultReadingSettings,
    resetReadingSettings,
  } = useUserPreferences();
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  useEffect(() => {
    // Solo cargar datos de racha, los libros ya están cargados en el store
    loadStreakData();
  }, [loadStreakData]);

  const handleEditTime = (book: Book) => {
    setEditingBook(book);
  };

  const handleSaveTime = async (id: string, totalSeconds: number) => {
    await setReadingTime(id, totalSeconds);
  };

  const handleCloseModal = () => {
    setEditingBook(null);
  };

  const handleReadingSettingsChange = (settings: ReadingSettings) => {
    setDefaultReadingSettings(settings);
  };

  const handleReadingSettingsReset = () => {
    resetReadingSettings();
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
        readingSettings={defaultReadingSettings}
        onReadingSettingsChange={handleReadingSettingsChange}
        onReadingSettingsReset={handleReadingSettingsReset}
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
