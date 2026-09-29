import styles from "./StreakCard.module.css";
import { Flame, Check } from "lucide-react";

export const StreakCard = ({
  streakData,
}: {
  streakData: {
    currentStreak: number;
    startDate: string | null;
    hasCompletedToday: boolean;
  };
}) => {
  // Función para formatear fecha - maneja diferentes formatos
  const formatDate = (str: string | null | undefined) => {
    if (!str) return "No iniciada";

    // Convertir a string por seguridad
    const dateStr = String(str);

    // Si viene con formato ISO (contiene T), extraer solo la fecha
    let cleanDate = dateStr;
    if (dateStr.includes("T")) {
      cleanDate = dateStr.split("T")[0];
    }

    // La fecha debe ser YYYY-MM-DD
    const parts = cleanDate.split("-");
    if (parts.length !== 3) {
      // Si no se puede parsear, mostrar algo legible
      try {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("es-ES");
        }
      } catch {
        return "No iniciada";
      }
      return "No iniciada";
    }

    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  return (
    <div className={styles.streakCard}>
      <div className={styles.streakLeft}>
        <div className={styles.flame}>
          <Flame size={28} color="var(--secondary-color)" />
        </div>
        <div>
          <div className={styles.streakNumber}>{streakData.currentStreak}</div>
          <div className={styles.streakText}>días de racha</div>
          <div className={styles.streakDate}>
            Inicio: {formatDate(streakData.startDate)}
          </div>
          {streakData.hasCompletedToday && (
            <div className={styles.streakDate}>
              <Check size={12} /> Completado hoy
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
