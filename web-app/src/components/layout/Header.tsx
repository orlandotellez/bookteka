import logoLight from "@/assets/logoLight.svg";
import logoDark from "@/assets/logoDark.svg";
import styles from "./Header.module.css";
import { ShowUploaderModal } from "../modals/ShowUploaderModal";
import { useBookStore } from "@/store/bookStore";
import { useTheme } from "@/context/ThemeContext";
import moon from "@/assets/moon.svg";
import sun from "@/assets/sun.svg";
import { User } from "lucide-react";
import { Link } from "react-router-dom";

export const Header = () => {
  const { showUploader, setShowUploader, addBook } = useBookStore();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={styles.header}>
      <article>
        <div className={styles.logoContainer}>
          {theme == "dark" ? (
            <>
              <img src={logoDark} alt="logo bookteka" />
            </>
          ) : (
            <>
              <img src={logoLight} alt="logo bookteka" />
            </>
          )}
          <div className={styles.article}>
            <h1>Bookteka</h1>
            <p>Lee siempre, mente mejor</p>
          </div>
        </div>

        <div className={styles.buttons}>
          <button onClick={toggleTheme} className={styles.buttonTheme}>
            {theme === "light" ? (
              <>
                <img src={moon} alt="" />
              </>
            ) : (
              <>
                <img src={sun} alt="" />
              </>
            )}
          </button>

          <div className={styles.buttonContainer}>
            <button onClick={() => setShowUploader(true)}>
              + Añadir libro
            </button>
            <div className={styles.iconProfile}>
              <Link to={"/profile"}>
                <User size={30} color="#ebe7e0" />
              </Link>
            </div>
          </div>
        </div>
      </article>

      {showUploader && (
        <ShowUploaderModal
          setShowUploader={() => setShowUploader(false)}
          onAddBook={addBook}
        />
      )}
    </header>
  );
};
