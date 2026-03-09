import { useState, useRef, useEffect } from "react";
import { useTheme, themes, type ThemeName } from "@/context/ThemeContext";
import styles from "./ThemeSelector.module.css";
import { ChevronDown } from "lucide-react";

export const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTheme = themes.find((t) => t.id === theme);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.triggerButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Cambiar tema"
      >
        <span className={styles.currentIcon}>{currentTheme?.icon}</span>
        <ChevronDown width={16} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
        />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>Elegir tema</span>
          </div>
          <div className={styles.themeGrid}>
            {themes.map((themeOption) => (
              <button
                key={themeOption.id}
                className={`${styles.themeOption} ${theme === themeOption.id ? styles.themeOptionActive : ""
                  }`}
                onClick={() => {
                  setTheme(themeOption.id as ThemeName);
                  setIsOpen(false);
                }}
              >
                <div
                  className={styles.themePreview}
                  style={{
                    background: `linear-gradient(135deg, ${themeOption.colors.primary} 50%, ${themeOption.colors.secondary} 50%)`,
                  }}
                >
                  <span className={styles.themeIcon}>{themeOption.icon}</span>
                </div>
                <span className={styles.themeName}>{themeOption.name}</span>
                {theme === themeOption.id && (
                  <span className={styles.checkmark}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
