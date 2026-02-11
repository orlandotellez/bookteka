import logo from "@/assets/logo.svg";
import styles from "./Header.module.css";
import { ShowUploaderModal } from "../modals/ShowUploaderModal";
import { useBookStore } from "@/store/bookStore";

export const Header = () => {
  const { showUploader, setShowUploader, addBook } = useBookStore();

  return (
    <header className={styles.header}>
      <article>
        <div className={styles.logoContainer}>
          <img src={logo} alt="logo bookteka" />
          <p>Bookteka</p>
        </div>

        <div className={styles.buttonContainer}>
          <button onClick={() => setShowUploader(true)}>+ Añadir libro</button>
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
