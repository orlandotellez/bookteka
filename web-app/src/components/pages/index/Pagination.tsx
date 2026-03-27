import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Pagination.module.css";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generar números de página a mostrar
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Mostrar todas las páginas si son 5 o menos
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Lógica para mostrar páginas con elipsis
      if (currentPage <= 3) {
        // Primeros números: 1, 2, 3, 4, ..., 10
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Últimos números: 1, ..., 7, 8, 9, 10
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        // Números del medio: 1, ..., 4, 5, 6, ..., 10
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className={styles.container}>
      <div className={styles.info}>
        Mostrando <span className={styles.range}>{startItem}-{endItem}</span> de{" "}
        <span className={styles.total}>{totalItems}</span> libros
      </div>

      <div className={styles.controls}>
        {/* Botón anterior */}
        <button
          className={`${styles.button} ${styles.arrowButton}`}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Números de página */}
        <div className={styles.pageNumbers}>
          {getPageNumbers().map((page, index) =>
            typeof page === "number" ? (
              <button
                key={index}
                className={`${styles.button} ${
                  page === currentPage ? styles.active : ""
                }`}
                onClick={() => onPageChange(page)}
                aria-label={`Página ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            ) : (
              <span key={index} className={styles.ellipsis}>
                {page}
              </span>
            )
          )}
        </div>

        {/* Botón siguiente */}
        <button
          className={`${styles.button} ${styles.arrowButton}`}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Página siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};
