import { Navigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client.ts";
import { Loading } from "@/components/common/Loading";

export const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <Loading text="Verificando..." />;

  // Si ya hay sesión, redirigir al Index
  if (session) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
