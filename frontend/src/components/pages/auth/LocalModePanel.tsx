import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LocalModePanel.module.css";
import { useUserPreferences } from "@/store/userPreferencesStore";

export const LocalModePanel = () => {
  const navigate = useNavigate();
  const setAuthMode = useUserPreferences((s) => s.setAuthMode);
  const [loading, setLoading] = useState(false);

  const enterLocal = () => {
    setLoading(true);
    setAuthMode("local");
    navigate("/", { replace: true });
  };

  return (
    <div className={styles.panel} role="tabpanel">
      <h4 className={styles.title}>Tu biblioteca, sin cuenta</h4>
      <p className={styles.description}>
        Todo lo que agregues queda en este dispositivo. Sin conexión, sin
        sincronizar, sin límite de uso.
      </p>
      <button
        type="button"
        className={styles.enterButton}
        onClick={enterLocal}
        disabled={loading}
      >
        {loading ? "Entrando..." : "Entrar sin cuenta"}
      </button>
    </div>
  );
};