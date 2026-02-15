import { Header } from "./Header";
import { Reader } from "@/components/global/Reader";
import { useBookStore } from "@/store/bookStore";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { currentView, currentBook } = useBookStore();

  // si estamos en vista de lector y tenemos un libro, mostramos el lector
  if (currentView === "reader" && currentBook) {
    return (
      <>
        <div>
          <Reader book={currentBook} />
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <Header />

        <main className={styles.main}>{children}</main>
      </div>
    </>
  );
};
