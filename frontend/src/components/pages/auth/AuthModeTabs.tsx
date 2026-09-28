import styles from "./AuthModeTabs.module.css";
import { useUserPreferences } from "@/store/userPreferencesStore";

export const AuthModeTabs = () => {
  const authMode = useUserPreferences((s) => s.authMode);
  const setAuthMode = useUserPreferences((s) => s.setAuthMode);

  return (
    <div className={styles.tabs} role="tablist" aria-label="Modo de uso">
      <button
        type="button"
        role="tab"
        aria-selected={authMode === "local"}
        className={`${styles.tab} ${authMode === "local" ? styles.tabActive : ""}`}
        onClick={() => setAuthMode("local")}
      >
        Local
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={authMode === "server"}
        className={`${styles.tab} ${authMode === "server" ? styles.tabActive : ""}`}
        onClick={() => setAuthMode("server")}
      >
        Servidor
      </button>
    </div>
  );
};