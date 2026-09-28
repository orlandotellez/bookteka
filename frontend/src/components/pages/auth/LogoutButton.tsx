import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/lib/auth-api";
import { clearDatabase, resetDatabase } from "@/database";
import { invalidateAuthSession } from "@/lib/useAuthSession";
import { useUserPreferences } from "@/store/userPreferencesStore";
import { toast } from "sonner";

export const LogoutButton = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const authMode = useUserPreferences((s) => s.authMode);

  const handleLogout = async () => {
    setLoading(true);

    try {
      toast.info("Cerrando sesión...");

      await clearDatabase();
      await resetDatabase();

      if (authMode === "server") {
        await authApi.logout();
      }
      invalidateAuthSession();

      navigate("/auth", { replace: true });
    } catch (err) {
      console.error("Error inesperado durante el logout:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        padding: "8px 16px",
        backgroundColor: "var(--error-color)",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? "Cerrando sesión..." : "Cerrar Sesión"}
    </button>
  );
};
