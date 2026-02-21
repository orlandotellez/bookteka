import { Navigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client.ts";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) {
    return <p>Loading...</p>;
  }

  if (!session || error) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
};
