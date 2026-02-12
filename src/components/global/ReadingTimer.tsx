import { Play, Pause, Clock } from "lucide-react";
import styles from "./ReadingTimer.module.css";
import { formatTimeShort } from "@/utils/time";

interface ReadingTimerProps {
  isRunning: boolean;
  sessionSeconds: number;
  onToggle: () => void;
}

export const ReadingTimer = ({
  isRunning,
  sessionSeconds,
  onToggle,
}: ReadingTimerProps) => {
  return (
    <div className={styles.container}>
      <button
        className={styles.toggleButton}
        onClick={onToggle}
        aria-label={isRunning ? "Pausar temporizador" : "Iniciar temporizador"}
      >
        {isRunning ? <Pause size={14} /> : <Play size={14} />}
      </button>

      <div className={styles.timeContainer}>
        <Clock size={14} className={styles.clockIcon} />
        <span
          className={`${styles.time} ${
            isRunning ? styles.running : styles.paused
          }`}
        >
          {formatTimeShort(sessionSeconds)}
        </span>
      </div>
    </div>
  );
};
