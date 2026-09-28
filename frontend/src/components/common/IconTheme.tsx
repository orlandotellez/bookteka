import { useEffect, useRef, useState } from "react";
import styles from "./IconTheme.module.css";
import { THEMES, THEME_LABELS, type ThemeName } from "@/context/theme";
import { useTheme } from "@/context/ThemeContext";

const THEME_COLORS: Record<ThemeName, { primary: string; accent: string }> = {
  light: { primary: "#fcf5ee", accent: "#df8052" },
  dark: { primary: "#1c1a16", accent: "#df8052" },
  midnight: { primary: "#000000", accent: "#1a1a1a" },
  sepia: { primary: "#f4ecd8", accent: "#8b6914" },
  ocean: { primary: "#e0f2fe", accent: "#0284c7" },
  forest: { primary: "#ecfdf5", accent: "#059669" },
};

export const IconTheme = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const close = () => {
    setOpen(false);
    setActiveIndex(THEMES.indexOf(theme));
  };

  const select = (name: ThemeName) => {
    setTheme(name);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(THEMES.indexOf(theme));
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % THEMES.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + THEMES.length) % THEMES.length);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        select(THEMES[activeIndex]);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
    }
  };

  const activeId = open ? `theme-option-${THEMES[activeIndex]}` : undefined;

  return (
    <div ref={pickerRef} className={styles.picker}>
      <button
        type="button"
        className={styles.themeButton}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-activedescendant={activeId}
      >
        <span className={styles.swatch} aria-hidden="true">
          <span
            className={styles.swatchDot}
            style={{ backgroundColor: THEME_COLORS[theme].primary }}
          />
          <span
            className={styles.swatchDot}
            style={{ backgroundColor: THEME_COLORS[theme].accent }}
          />
        </span>
        <span className={styles.currentLabel}>{THEME_LABELS[theme]}</span>
      </button>

      {open && (
        <ul className={styles.dropdown} role="listbox" aria-label="Tema visual">
          {THEMES.map((name, index) => (
            <li key={name} role="option" id={`theme-option-${name}`} aria-selected={name === theme}>
              <button
                type="button"
                className={`${styles.option} ${index === activeIndex ? styles.optionActive : ""}`}
                onClick={() => select(name)}
              >
                <span className={styles.optionSwatch} aria-hidden="true">
                  <span
                    className={styles.optionDot}
                    style={{ backgroundColor: THEME_COLORS[name].primary }}
                  />
                  <span
                    className={styles.optionDot}
                    style={{ backgroundColor: THEME_COLORS[name].accent }}
                  />
                </span>
                <span className={styles.optionLabel}>{THEME_LABELS[name]}</span>
                {name === theme && <span className={styles.check}>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};