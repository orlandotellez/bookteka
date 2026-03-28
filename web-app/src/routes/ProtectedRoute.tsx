import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client.ts";
import { useBookStore } from "@/store/bookStore";
import { Loading } from "@/components/common/Loading";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { data: session, isPending, error } = authClient.useSession();
  const { loadBooks, syncBooks, books } = useBookStore();
  const hasLoadedBooks = useRef(false);
  const userId = session?.user?.id;

  useEffect(() => {
    // Solo cargar libros UNA vez cuando:
    // Hay sesión activa, No está pendiente de cargar la sesión, Los libros aún no se han cargado O el array está vacío
    if (userId && !isPending && !hasLoadedBooks.current && books.length === 0) {
      hasLoadedBooks.current = true;
      loadBooks().then(() => {
        syncBooks();
      });
    }
  }, [userId, isPending, loadBooks, syncBooks, books.length]);

  if (isPending) {
    return <Loading text="Cargando contenido..." />;
  }

  if (!session || error) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
};
