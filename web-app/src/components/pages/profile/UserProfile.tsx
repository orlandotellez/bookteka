import {
  User,
  Clock,
  BookOpen,
  ArrowLeft,
  TrendingUp,
  Edit2,
  Cloud,
  CloudOff,
  CloudDownload,
  CloudUpload
} from "lucide-react";
import { formatTime } from "@/utils/time";
import type { Book } from "@/types/book";
import type { ReadingSettings, StreakData } from "@/types/reading";
import styles from "./UserProfile.module.css";
import { Link } from "react-router-dom";
import { StatCard } from "./StatCard";
import { StreakCard } from "./StreakCard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { CardProfile } from "./CardProfile";
import { ReadingSettingsCard } from "./ReadingSettingsCard";
import { downloadBook } from "@/api/book";
import { CloudSyncToggle } from "@/components/common/CloudSyncToggle";
import { Spinner } from "@/components/common/Spinner";

interface UserProfileProps {
  books: Book[];
  onEditTime?: (book: Book) => void;
  onUploadToCloud?: (bookId: string) => void;
  isUploadingBookId?: string | null;
  streakData?: StreakData
  onCompleteDay?: () => Promise<boolean | undefined>;
  onInitializeStreak?: (days: number, startDate?: string) => Promise<void>;
  isStreakLoading?: boolean;
  readingSettings?: ReadingSettings;
  onReadingSettingsChange?: (settings: ReadingSettings) => void;
  onReadingSettingsReset?: () => void;
}

const UserProfile = ({
  books,
  onEditTime,
  onUploadToCloud,
  isUploadingBookId,
  streakData,
  onCompleteDay,
  onInitializeStreak,
  isStreakLoading,
  readingSettings,
  onReadingSettingsChange,
  onReadingSettingsReset,
}: UserProfileProps) => {
  const totalBooks = books.length;
  const totalReadingTime = books.reduce(
    (acc, book) => acc + book.readingTimeSeconds,
    0,
  );
  const booksStarted = books.filter((book) => book.scrollPosition > 0).length;

  const averageTimePerBook =
    totalBooks > 0 ? Math.round(totalReadingTime / totalBooks) : 0;

  const booksByReadingTime = [...books].sort(
    (a, b) => b.readingTimeSeconds - a.readingTimeSeconds,
  );

  const stats = [
    {
      icon: Clock,
      iconProps: { size: 20, color: "var(--secondary-color)" },
      label: "Tiempo total",
      value: formatTime(totalReadingTime),
    },
    {
      icon: BookOpen,
      iconProps: { size: 20, color: "#4ade80" },
      label: "Libros",
      value: totalBooks.toString(),
    },
    {
      icon: TrendingUp,
      iconProps: { size: 20, color: "#5ea2f5" },
      label: "En progreso",
      value: booksStarted.toString(),
    },
    {
      icon: Clock,
      iconProps: { size: 20, color: "#d6a422" },
      label: "Promedio/libro",
      value: formatTime(averageTimePerBook),
    },
  ];

  const handleDownload = async (bookId: string, fileName: string) => {
    try {
      const url = await downloadBook(bookId)

      // Forzar la descarga en el navegador
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert("Error al descargar el archivo");
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <Link className={styles.iconButton} to={"/"}>
            <ArrowLeft size={24} color="var(--font-color-title)" />
          </Link>

          <div className={styles.headerInfo}>
            <div className={styles.avatar}>
              <User size={24} color="var(--secondary-color)" />
            </div>
            <div>
              <h2>Mi Perfil</h2>
              <p>Estadísticas de lectura</p>
            </div>
          </div>
        </div>
      </header>



      <main className={styles.main}>
        <CloudSyncToggle />

        <StreakCard
          streakData={
            streakData ?? {
              currentStreak: 0,
              startDate: null,
              hasCompletedToday: false,
            }
          }
          onCompleteDay={onCompleteDay}
          onInitializeStreak={onInitializeStreak}
          isLoading={isStreakLoading}
        />

        <CardProfile />

        {readingSettings && onReadingSettingsChange && onReadingSettingsReset && (
          <ReadingSettingsCard
            settings={readingSettings}
            onChange={onReadingSettingsChange}
            onReset={onReadingSettingsReset}
          />
        )}

        <article className={styles.article}>
          {/* Stats */}
          <div className={styles.statsGrid}>
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <StatCard
                  key={index}
                  icon={<Icon {...stat.iconProps} />}
                  label={stat.label}
                  value={stat.value}
                />
              );
            })}
          </div>

          {/* Books */}
          {booksByReadingTime.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>
                <TrendingUp size={18} color="var(--font-color-title)" />
                Todos los libros
              </h2>

              {booksByReadingTime.map((book, index) => (
                <div key={book.id} className={styles.bookRow}>
                  <span className={styles.index}>{index + 1}</span>

                  <div className={styles.bookName}>
                    {book.name.replace(".pdf", "")}
                  </div>

                  <span className={styles.time}>
                    {formatTime(book.readingTimeSeconds)}
                  </span>

                  {/* Indicador de sync + Botón acción */}
                  <div className={styles.cloudActions}>
                    {/* Indicador visual */}
                    <div
                      className={styles.syncBadge}
                      title={book.isSynced ? "Sincronizado en la nube" : "Solo en este dispositivo"}
                    >
                      {book.isSynced ? (
                        <Cloud size={14} color="var(--secondary-color)" />
                      ) : (
                        <CloudOff size={14} color="var(--font-color-text)" />
                      )}
                    </div>

                    {/* Botón acción: descargar si está en nube, subir si no */}
                    <div className={styles.actionButtons}>
                      {book.isSynced ? (
                        <button
                          onClick={() => handleDownload(book.id, book.name)}
                          className={styles.actionButton}
                          title="Descargar PDF"
                        >
                          <CloudDownload size={18} color="var(--secondary-color)" />
                        </button>
                      ) : onUploadToCloud ? (
                        <button
                          onClick={() => onUploadToCloud(book.id)}
                          className={styles.actionButton}
                          disabled={!!isUploadingBookId}
                          title={isUploadingBookId ? "Subiendo..." : "Subir a la nube"}
                        >
                          {isUploadingBookId === book.id ? (
                            <Spinner />
                          ) : (
                            <CloudUpload size={18} color="#f97316" />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>


                  {onEditTime && (
                    <button
                      className={styles.iconButton}
                      onClick={() => onEditTime(book)}
                    >
                      <Edit2 size={16} color="var(--font-color-title)" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {books.length === 0 && (
            <div className={styles.empty}>
              Aún no tienes libros. ¡Añade uno para empezar!
            </div>
          )}
        </article>

        <article className={styles.config}>
          <div className={styles.logoutContainer}>
            <LogoutButton />
          </div>
        </article>
      </main>
    </div>
  );
};

export default UserProfile;
