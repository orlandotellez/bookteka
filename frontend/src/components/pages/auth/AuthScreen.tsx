import type { ReactNode } from "react";
import { useUserPreferences } from "@/store/userPreferencesStore";
import { SideLogo } from "@/components/pages/auth/SideLogo";
import { AuthModeTabs } from "@/components/pages/auth/AuthModeTabs";
import { LocalModePanel } from "@/components/pages/auth/LocalModePanel";
import { IconTheme } from "@/components/common/IconTheme";
import { AppVersion } from "@/components/common/AppVersion";
import styles from "./AuthScreen.module.css";
import loginStyles from "@/pages/auth/Login.module.css";

export const AuthScreen = ({ children }: { children: ReactNode }) => {
  const authMode = useUserPreferences((s) => s.authMode);

  return (
    <section className={loginStyles.container}>
      <SideLogo />

      <div className={styles.side}>
        <div className={styles.topBar}>
          <AuthModeTabs />
          <div className={styles.themeTop}>
            <IconTheme />
          </div>
        </div>

        <div className={styles.content}>
          {authMode === "local" ? <LocalModePanel /> : children}
        </div>

        <AppVersion className={styles.versionBottom} />
      </div>
    </section>
  );
};