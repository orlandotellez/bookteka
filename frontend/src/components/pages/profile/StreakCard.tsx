import styles from "./StreakCard.module.css";
import { useState } from "react";
import { Flame, Settings, Check } from "lucide-react";

export const StreakCard = ({
  streakData,
  onInitializeStreak,
}: {
  streakData: {
    currentStreak: number;
    startDate: string | null;
    hasCompletedToday: boolean;
  };
  onInitializeStreak: (days: number, startDate?: string) => Promise<void>;
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [startDate, setStartDate] = useState("");

  const handleInit = async () => {
    if (!onInitializeStreak || !startDate) {
      alert("Selecciona una fecha de inicio");
      return;
    }

    await onInitializeStreak(0, startDate);
    setShowSettings(false);
    setStartDate("");
  };

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

      <div className={styles.streakActions}>
        <button
          className={styles.iconButton}
          onClick={() => setShowSettings((v) => !v)}
        >
          <Settings size={16} />
        </button>

        {showSettings && (
          <div className={styles.popover}>
            <label>Fecha de inicio de la racha</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
              Selecciona desde qué día empezaste a leer
            </p>

            <button className={styles.primaryButton} onClick={handleInit}>
              Establecer racha
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
