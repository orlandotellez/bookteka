import type { AuthMode } from "@/store/userPreferencesStore";

export const CLOUD_REQUIRES_ACCOUNT_ERROR =
  "La sincronización en la nube requiere una cuenta de Bookteka";

export function isCloudAvailable(authMode: AuthMode): boolean {
  return authMode === "server";
}
