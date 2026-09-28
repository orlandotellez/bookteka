import { useAppVersion } from "@/hooks/useAppVersion";
import styles from "./AppVersion.module.css";

/**
 * Tag con la versión instalada de la app (v1.2.0).
 *
 * La versión viene del comando nativo `get_app_version`, que solo existe
 * dentro de Tauri. En `pnpm dev` (web plana) no hay runtime, así que el hook
 * devuelve `null` y el tag no renderiza nada.
 *
 * `className` permite que cada pantalla lo situe según su propio layout.
 */
export function AppVersion({ className }: { className?: string }) {
  const version = useAppVersion();

  if (version === null) return null;

  return (
    <span className={className ? `${styles.tag} ${className}` : styles.tag}>
      v{version}
    </span>
  );
}
