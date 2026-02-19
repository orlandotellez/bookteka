import {
  User,
  Clock,
  BookOpen,
  ArrowLeft,
  TrendingUp,
  Edit2,
  Flame,
  Check,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { formatTime } from "@/utils/time";
import type { Book } from "@/types/book";
import styles from "./UserProfile.module.css";
import { Link } from "react-router-dom";

interface UserProfileProps {
  books: Book[];
  onEditTime?: (book: Book) => void;
  streakData?: {
    currentStreak: number;
    hasCompletedToday: boolean;
    startDate: string | null;
  };
  onCompleteDay?: () => Promise<boolean | undefined>;
  onInitializeStreak?: (days: number, startDate?: string) => Promise<void>;
  isStreakLoading?: boolean;
}

const UserProfile = ({
  books,
  onEditTime,
  streakData,
  onCompleteDay,
  onInitializeStreak,
  isStreakLoading,
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
        {streakData && (
          <StreakCard
            streakData={streakData}
            onCompleteDay={onCompleteDay}
            onInitializeStreak={onInitializeStreak}
            isLoading={isStreakLoading}
          />
        )}

        {/* Stats */}
        <div className={styles.statsGrid}>
          <StatCard
            icon={<Clock size={20} color="var(--secondary-color)" />}
            label="Tiempo total"
            value={formatTime(totalReadingTime)}
          />
          <StatCard
            icon={<BookOpen size={20} color="#4ade80" />}
            label="Libros"
            value={totalBooks.toString()}
          />
          <StatCard
            icon={<TrendingUp size={20} color="#5ea2f5" />}
            label="En progreso"
            value={booksStarted.toString()}
          />
          <StatCard
            icon={<Clock size={20} color="#d6a422" />}
            label="Promedio/libro"
            value={formatTime(averageTimePerBook)}
          />
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
      </main>
    </div>
  );
};

export default UserProfile;

/* ---------- Subcomponents ---------- */

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className={styles.statCard}>
    <div className={styles.statIcon}>{icon}</div>
    <div className={styles.statValue}>{value}</div>
    <div className={styles.statLabel}>{label}</div>
  </div>
);

const StreakCard = ({
  streakData,
  onCompleteDay,
  onInitializeStreak,
  isLoading,
}: any) => {
  const [showSettings, setShowSettings] = useState(false);
  const [days, setDays] = useState("14");
  const [date, setDate] = useState("");

  const handleCompleteDay = async () => {
    if (!onCompleteDay) return;
    const success = await onCompleteDay();
    if (success) alert("¡Racha completada!");
    else alert("Ya completaste hoy");
  };

  const handleInit = async () => {
    if (!onInitializeStreak) return;
    const d = parseInt(days, 10);
    if (isNaN(d) || d < 1) {
      alert("Número inválido");
      return;
    }
    await onInitializeStreak(d, date || undefined);
    setShowSettings(false);
  };

  const formatDate = (str: string | null) => {
    if (!str) return "No iniciada";
    return new Date(str).toLocaleDateString();
  };

  return (
    <div className={styles.streakCard}>
      <div className={styles.streakLeft}>
        <div className={styles.flame}>
          <Flame size={28} />
        </div>
        <div>
          <div className={styles.streakNumber}>{streakData.currentStreak}</div>
          <div className={styles.streakText}>días de racha</div>
          <div className={styles.streakDate}>
            Inicio: {formatDate(streakData.startDate)}
          </div>
        </div>
      </div>

      <div className={styles.streakActions}>
        <button
          className={styles.primaryButton}
          disabled={isLoading || streakData.hasCompletedToday}
          onClick={handleCompleteDay}
        >
          {streakData.hasCompletedToday ? (
            <>
              <Check size={16} /> Completado
            </>
          ) : (
            <>
              <Flame size={16} /> Completar día
            </>
          )}
        </button>

        <button
          className={styles.iconButton}
          onClick={() => setShowSettings((v) => !v)}
        >
          <Settings size={16} />
        </button>

        {showSettings && (
          <div className={styles.popover}>
            <label>Días iniciales</label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />

            <label>Fecha inicio</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <button className={styles.primaryButton} onClick={handleInit}>
              Establecer racha
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
