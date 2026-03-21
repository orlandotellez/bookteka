import { authClient } from "@/lib/auth-client.ts";
import styles from "./CardProfile.module.css";

export const CardProfile = () => {
  const { data, isPending, error } = authClient.useSession();

  if (isPending) {
    return <div className={styles.loading}>Cargando perfil del usuario...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        Error al cargar el perfil: {error.message}
      </div>
    );
  }

  if (!data) {
    return <div className={styles.noSession}>No hay una sesión activa.</div>;
  }

  const { user } = data;

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <div className={styles.userInfo}>
          {user.image ? (
            <img
              src={user.image}
              alt={`Foto de ${user.name}`}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
          )}

          <div className={styles.userDetails}>
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <span
              className={`${styles.badge} ${user.emailVerified ? styles.badgeVerified : styles.badgeUnverified
                }`}
            >
              {user.emailVerified ? "✓ Email Verificado" : "⚠ Email sin verificar"}
            </span>
          </div>
        </div>

        <ul className={styles.detailsList}>
          <li><strong>Miembro desde:</strong> {new Date(user.createdAt).toLocaleDateString()}</li>
        </ul>
      </div>

    </div>
  );
};
