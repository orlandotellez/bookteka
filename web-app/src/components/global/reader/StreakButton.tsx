import { Flame, Check } from "lucide-react";
import styles from "./StreakButton.module.css";
import { toast } from "sonner";

interface StreakButtonProps {
  currentStreak: number;
  hasCompletedToday: boolean;
  onCompleteDay: () => Promise<boolean | undefined>;
  isLoading: boolean;
}

export const StreakButton = ({
  currentStreak,
  hasCompletedToday,
  onCompleteDay,
  isLoading,
}: StreakButtonProps) => {
  const handleCompleteDay = async () => {
    const success = await onCompleteDay();

    if (success) {
      toast.success("¡Racha completada por hoy! 🔥");
    } else if (success === false) {
      toast("Ya completaste tu racha hoy");
    }
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
        className={`${styles.completeButton} ${hasCompletedToday ? styles.completed : styles.notCompleted
          }`}
      >
        {hasCompletedToday ? (
          <>
            <Check size={16} />
          </>
        ) : (
          <>
            <Flame size={16} />
          </>
        )}
      </button>
    </div>
  );
};

export default StreakButton;
