import { Flame, Check, Settings } from "lucide-react";
import styles from "./StreakButton.module.css";
import { useState } from "react";
import { toast } from "sonner";

interface StreakButtonProps {
  currentStreak: number;
  hasCompletedToday: boolean;
  startDate: string | null;
  onCompleteDay: () => Promise<boolean | undefined>;
  onInitialize: (days: number, startDate?: string) => Promise<void>;
  isLoading: boolean;
}

export const StreakButton = ({
  currentStreak,
  hasCompletedToday,
  startDate,
  onCompleteDay,
  onInitialize,
  isLoading,
}: StreakButtonProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [customDays, setCustomDays] = useState("14");
  const [customStartDate, setCustomStartDate] = useState("");

  const handleCompleteDay = async () => {
    const success = await onCompleteDay();

    if (success) {
      toast.success("¡Racha completada por hoy! 🔥");
    } else if (success === false) {
      toast("Ya completaste tu racha hoy");
    }
  };

  const handleInitialize = async () => {
    const days = parseInt(customDays, 10);

    if (isNaN(days) || days < 1) {
      toast.error("Por favor ingresa un número válido de días");
      return;
    }

    await onInitialize(days, customStartDate || undefined);
    toast.success(`¡Racha iniciada con ${days} días!`);
    setShowSettings(false);
  };

  const formatStartDate = (dateStr: string | null) => {
    if (!dateStr) return "No iniciada";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className={styles.container}>
      {/* Display */}
      <div className={styles.streakDisplay}>
        <Flame
          size={16}
          className={
            currentStreak > 0 ? styles.flameActive : styles.flameInactive
          }
        />
        <span
          className={
            currentStreak > 0 ? styles.streakActive : styles.streakInactive
          }
        >
          {currentStreak}
        </span>
      </div>

      {/* Complete Day */}
      <button
        onClick={handleCompleteDay}
        disabled={isLoading || hasCompletedToday}
        className={`${styles.completeButton} ${
          hasCompletedToday ? styles.completed : styles.notCompleted
        }`}
      >
        {hasCompletedToday ? (
          <>
            <Check size={16} />
            Hecho
          </>
        ) : (
          <>
            <Flame size={16} />
            Completar día
          </>
        )}
      </button>

      {/* Settings */}
      <div className={styles.settingsWrapper}>
        <button
          className={styles.settingsButton}
          onClick={() => setShowSettings((prev) => !prev)}
        >
          <Settings size={16} />
        </button>

        {showSettings && (
          <div className={styles.popover}>
            <div className={styles.popoverContent}>
              <div className={styles.popoverHeader}>
                <h4>Configurar Racha</h4>
                <p>Iniciada: {formatStartDate(startDate)}</p>
              </div>

              <div className={styles.field}>
                <label>Días de racha inicial</label>
                <input
                  type="number"
                  min="1"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label>Fecha de inicio (opcional)</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>

              <button
                onClick={handleInitialize}
                className={styles.initializeButton}
              >
                Establecer racha
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreakButton;
