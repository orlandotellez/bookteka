import { Cloud, CloudOff } from "lucide-react";
import { useUserPreferences } from "@/store/userPreferencesStore";
import styles from "./CloudSyncToggle.module.css";

export const CloudSyncToggle = () => {
  const { cloudSyncEnabled, setCloudSyncEnabled } = useUserPreferences();

  return (
    <div className={styles.container}>
      <div className={styles.icon}>
        {cloudSyncEnabled ? (
          <Cloud size={24} color="var(--secondary-color)" />
        ) : (
          <CloudOff size={24} color="var(--font-color-text)" />
        )}
      </div>

      <div className={styles.info}>
        <h3 className={styles.title}>Sincronización en la nube</h3>
        <p className={styles.description}>
          {cloudSyncEnabled
            ? "Los libros se guardan automáticamente en la nube"
            : "Los libros se guardan solo en este dispositivo"}
        </p>
      </div>

      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={cloudSyncEnabled}
          onChange={(e) => setCloudSyncEnabled(e.target.checked)}
        />
        <span className={styles.slider}></span>
      </label>
    </div>
  );
};
