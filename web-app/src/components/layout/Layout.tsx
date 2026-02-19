import { Header } from "./Header";
import { Reader } from "@/components/global/Reader";
import { useBookStore } from "@/store/bookStore";
import styles from "./Layout.module.css";
import { useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { currentView, currentBook } = useBookStore();
  const location = useLocation();
  const isProfilePage = location.pathname.includes("/profile");

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
        {!isProfilePage && <Header />}

        <main className={`${isProfilePage ? styles.isProfile : styles.main}`}>
          {children}
        </main>
      </div>
    </>
  );
};
