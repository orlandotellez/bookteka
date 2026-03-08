import moon from "@/assets/moon.svg";
import sun from "@/assets/sun.svg";
import styles from "./IconTheme.module.css";
import { useTheme } from "@/context/ThemeContext";

export const IconTheme = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "midnight";
  
  return (
    <button className={styles.buttonTheme}>
      {isDark ? (
        <img src={sun} alt="sun icon" />
      ) : (
        <img src={moon} alt="moon icon" />
      )}
    </button>
  );
};
