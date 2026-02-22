import moon from "@/assets/moon.svg";
import sun from "@/assets/sun.svg";
import styles from "./IconTheme.module.css";
import { useTheme } from "@/context/ThemeContext";

export const IconTheme = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <>
      <button onClick={toggleTheme} className={styles.buttonTheme}>
        {theme === "light" ? (
          <>
            <img src={moon} alt="moon icon" />
          </>
        ) : (
          <>
            <img src={sun} alt="sun icon" />
          </>
        )}
      </button>
    </>
  );
};
