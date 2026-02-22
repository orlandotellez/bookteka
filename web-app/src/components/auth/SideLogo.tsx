import styles from "./SideLogo.module.css";
import logoDark from "../../assets/logoDark.svg";
import logoLight from "../../assets/logoLight.svg";
import { useTheme } from "@/context/ThemeContext";

export const SideLogo = () => {
  const { theme } = useTheme();
  return (
    <>
      <article className={styles.container}>
        {theme == "dark" ? (
          <>
            <img src={logoDark} alt="logo bookteka" />
          </>
        ) : (
          <>
            <img src={logoLight} alt="logo bookteka" />
          </>
        )}
        <h1>BOOKTEKA</h1>
      </article>
    </>
  );
};
