import { Header } from "./Header";
import { Reader } from "@/components/pages/reader/Reader";
import { useBookStore } from "@/store/bookStore";
import styles from "./Layout.module.css";
import { useLocation } from "react-router-dom";
import { Loading } from "@/components/common/Loading";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { currentView, currentBook, isProcessingPdf, pdfProgress } = useBookStore();
  const location = useLocation();
  const isNotHeaderPage =
    location.pathname.includes("/profile") ||
    location.pathname.startsWith("/auth");

  // si estamos en vista de lector y tenemos un libro, mostramos el lector
  if (currentView === "reader" && currentBook) {
    return (
      <>
        <div>
          {isProcessingPdf ? (
            <Loading
              text={`Preparando libro... ${pdfProgress}%`}
              subtext="Extrayendo texto del PDF"
            />
          ) : (
            <Reader book={currentBook} />
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        {!isNotHeaderPage && <Header />}

        <main className={`${isNotHeaderPage ? styles.isProfile : styles.main}`}>
          {children}
        </main>
      </div>
    </>
  );
};
