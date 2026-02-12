import { X, Bookmark, User } from "lucide-react";
import styles from "./ReaderHeader.module.css";
import { ReadingTimer } from "./ReadingTimer";
import StreakButton from "./StreakButton";
import logo from "@/assets/logo.svg";

interface StreakData {
  currentStreak: number;
  hasCompletedToday: boolean;
  startDate: string | null;
  onCompleteDay: () => Promise<boolean | undefined>;
  onInitialize: (days: number, startDate?: string) => Promise<void>;
  isLoading: boolean;
}

interface ReaderHeaderProps {
  fileName?: string;
  onClose?: () => void;
  onOpenBookmarks?: () => void;
  onOpenProfile?: () => void;
  showTimer?: boolean;
  isTimerRunning?: boolean;
  sessionSeconds?: number;
  onToggleTimer?: () => void;
  themeToggle?: React.ReactNode;
  streakData?: StreakData;
}

export const ReaderHeader = ({
  fileName,
  onClose,
  onOpenBookmarks,
  onOpenProfile,
  showTimer,
  isTimerRunning = false,
  sessionSeconds = 0,
  onToggleTimer,
  themeToggle,
  streakData,
}: ReaderHeaderProps) => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Lado izquierdo */}
        <div className={styles.logoContainer}>
          <img src={logo} alt="logo bookteka" />

          <div className={styles.titleContainer}>
            <h1 className={styles.title}>Bookteka</h1>

            {fileName && (
              <p className={styles.fileName}>{fileName.replace(".pdf", "")}</p>
            )}
          </div>
        </div>

        {/* Lado derecho */}
        <div className={styles.right}>
          {streakData && (
            <StreakButton
              currentStreak={streakData.currentStreak}
              hasCompletedToday={streakData.hasCompletedToday}
              startDate={streakData.startDate}
              onCompleteDay={streakData.onCompleteDay}
              onInitialize={streakData.onInitialize}
              isLoading={streakData.isLoading}
            />
          )}

          {showTimer && onToggleTimer && (
            <ReadingTimer
              isRunning={isTimerRunning}
              sessionSeconds={sessionSeconds}
              onToggle={onToggleTimer}
            />
          )}

          {themeToggle}

          {onOpenBookmarks && (
            <button
              className={styles.iconButton}
              onClick={onOpenBookmarks}
              aria-label="Marcadores"
            >
              <Bookmark size={20} />
            </button>
          )}

          {onOpenProfile && (
            <button
              className={styles.iconButton}
              onClick={onOpenProfile}
              aria-label="Mi perfil"
            >
              <User size={20} />
            </button>
          )}

          {onClose && (
            <button
              className={`${styles.iconButton} ${styles.closeButton}`}
              onClick={onClose}
              aria-label="Cerrar documento"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
