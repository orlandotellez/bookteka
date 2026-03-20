import moon from "@/assets/moon.svg";
import sun from "@/assets/sun.svg";
import styles from "./IconTheme.module.css";
import { useTheme } from "@/context/ThemeContext";

export const IconTheme = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark"

  return (
    <button onClick={toggleTheme} className={styles.buttonTheme}>
      {isDark ? (
        <img src={sun} alt="sun icon" />
      ) : (
        <img src={moon} alt="moon icon" />
      )}
    </button>
  );
};
