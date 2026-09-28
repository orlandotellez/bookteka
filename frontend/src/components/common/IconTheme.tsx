import styles from "./IconTheme.module.css";
import { THEMES, THEME_LABELS, type ThemeName } from "@/context/theme";
import { useTheme } from "@/context/ThemeContext";

export const IconTheme = () => {
  const { theme, setTheme } = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as ThemeName);
  };

  return (
    <label className={styles.buttonTheme}>
      <span className="sr-only">Tema</span>
      <select value={theme} onChange={handleChange} aria-label="Tema visual">
        {THEMES.map((name) => (
          <option key={name} value={name}>
            {THEME_LABELS[name]}
          </option>
        ))}
      </select>
    </label>
  );
};