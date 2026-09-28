import { Cloud, CloudOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserPreferences } from "@/store/userPreferencesStore";
import { CLOUD_REQUIRES_ACCOUNT_ERROR, isCloudAvailable } from "@/lib/cloud";
import styles from "./CloudSyncToggle.module.css";

export const CloudSyncToggle = () => {
  const { authMode, cloudSyncEnabled, setCloudSyncEnabled } =
    useUserPreferences();

  const isLocal = !isCloudAvailable(authMode);

  const isEnabled = !isLocal && cloudSyncEnabled;

  return (
    <div className={styles.container} data-local={isLocal || undefined}>
      <div className={styles.icon}>
        {isEnabled ? (
          <Cloud size={24} color="var(--secondary-color)" />
        ) : (
          <CloudOff size={24} color="var(--font-color-text)" />
        )}
      </div>

      <div className={styles.info}>
        <h3 className={styles.title}>Sincronización en la nube</h3>
        {isLocal ? (
          <>
            <p className={styles.description}>{CLOUD_REQUIRES_ACCOUNT_ERROR}</p>
            <Link to="/auth" className={styles.actionLink}>
              Iniciar sesión o crear cuenta
            </Link>
          </>
        ) : (
          <p className={styles.description}>
            {isEnabled
              ? "Los libros se guardan automáticamente en la nube"
              : "Los libros se guardan solo en este dispositivo"}
          </p>
        )}
      </div>

      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={isEnabled}
          disabled={isLocal}
          onChange={(e) => setCloudSyncEnabled(e.target.checked)}
          aria-label="Sincronización en la nube"
        />
        <span className={styles.slider}></span>
      </label>
    </div>
  );
};
