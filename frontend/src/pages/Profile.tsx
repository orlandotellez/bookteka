import { useEffect, useState } from "react";
import type { Book } from "@/types/book";
import type { ReadingSettings, LibraryView } from "@/types/reading";
import styles from "./Profile.module.css";
import { StreakCard } from "@/components/pages/profile/StreakCard";
import { CardProfile } from "@/components/pages/profile/CardProfile";
import ProfileHeader from "@/components/pages/profile/ProfileHeader";
import ProfileTabs, { type ProfileTab } from "@/components/pages/profile/ProfileTabs";
import ProfileStats from "@/components/pages/profile/ProfileStats";
import ProfileBooksTable from "@/components/pages/profile/ProfileBooksTable";
import ProfileConfig from "@/components/pages/profile/ProfileConfig";
import { downloadBook } from "@/api/book";
import { EditTimeModal } from "@/components/modals/EditTimeModal";
import { useBookStore } from "@/store/bookStore";
import { useStreakStore } from "@/store/streakStore";
import { useUserPreferences } from "@/store/userPreferencesStore";

const Profile = () => {
  const {
    books,
    setReadingTime,
    uploadBookToCloud,
    uploadingBookId,
  } = useBookStore();
  const { streakData, loadStreakData } = useStreakStore();
  const {
    defaultReadingSettings,
    setDefaultReadingSettings,
    resetReadingSettings,
    defaultView,
    setDefaultView,
  } = useUserPreferences();

  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("data");

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

  const handleDefaultViewChange = (view: LibraryView) => {
    setDefaultView(view);
  };

  const handleDownload = async (bookId: string, fileName: string) => {
    try {
      const url = await downloadBook(bookId);

      // Forzar la descarga en el navegador
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert("Error al descargar el archivo");
    }
  };

  return (
    <>
      <div className={styles.container}>
        <ProfileHeader />

        <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />

        <main className={styles.main}>
          {activeTab === "config" ? (
            <ProfileConfig
              defaultView={defaultView}
              onDefaultViewChange={handleDefaultViewChange}
              readingSettings={defaultReadingSettings}
              onReadingSettingsChange={handleReadingSettingsChange}
              onReadingSettingsReset={handleReadingSettingsReset}
            />
          ) : (
            <>
              <StreakCard
                streakData={
                  streakData ?? {
                    currentStreak: 0,
                    startDate: null,
                    hasCompletedToday: false,
                  }
                }
              />

              <CardProfile />

              <article className={styles.article}>
                <ProfileStats books={books} />

                <ProfileBooksTable
                  books={books}
                  uploadingBookId={uploadingBookId}
                  onEditTime={handleEditTime}
                  onUpload={uploadBookToCloud}
                  onDownload={handleDownload}
                />
              </article>
            </>
          )}
        </main>
      </div>

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