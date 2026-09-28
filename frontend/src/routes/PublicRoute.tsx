import { Navigate } from "react-router-dom";
import { useAuthSession } from "@/lib/useAuthSession";
import { useUserPreferences } from "@/store/userPreferencesStore";
import { Loading } from "@/components/common/Loading";

export const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isPending } = useAuthSession();
  const authMode = useUserPreferences((s) => s.authMode);

  if (isPending) return <Loading text="Verificando..." />;

  if (session && authMode === "server") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
