import { X, Bookmark, User } from "lucide-react";
import styles from "./ReaderHeader.module.css";
import { ReadingTimer } from "./ReadingTimer";
import logoDark from "@/assets/logoDark.svg";
import logoLight from "@/assets/logoLight.svg";
import { useTheme } from "@/context/ThemeContext";
import { isDarkTheme } from "@/context/theme";

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
}: ReaderHeaderProps) => {
  const { theme } = useTheme();
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Lado izquierdo */}
        <div className={styles.logoContainer}>
          {isDarkTheme(theme) ? (
            <>
              <img src={logoDark} alt="logo bookteka" />
            </>
          ) : (
            <>
              <img src={logoLight} alt="logo bookteka" />
            </>
          )}

          <div className={styles.titleContainer}>
            <h1 className={styles.title}>Bookteka</h1>

            {fileName && (
              <p className={styles.fileName}>{fileName.replace(".pdf", "")}</p>
            )}
          </div>
        </div>

        {/* Lado derecho */}
        <div className={styles.right}>
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
              <Bookmark size={20} color="var(--font-color-title)" />
            </button>
          )}

          {onOpenProfile && (
            <button
              className={styles.iconButton}
              onClick={onOpenProfile}
              aria-label="Mi perfil"
            >
              <User size={20} color="var(--font-color-title)" />
            </button>
          )}

          {onClose && (
            <button
              className={`${styles.iconButton} ${styles.closeButton}`}
              onClick={onClose}
              aria-label="Cerrar documento"
            >
              <X size={20} color="var(--font-color-title)" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
