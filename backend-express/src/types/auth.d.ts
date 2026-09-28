/**
 * Tipos globales de autenticación.
 *
 * Los tipos de dominio viven en `modules/auth/domain/auth.entities.ts`. Este
 * archivo solo declara lo que es transversal a toda la app.
 */
import type { ROLE } from "@prisma/client";

export type { ROLE };

/** Proveedores de cuenta soportados. Hoy solo contraseñas. */
export type AccountProvider = "credentials";

declare global {
  namespace Auth {
    /** Claims del access token: los verifica el backend, no el cliente. */
    interface AccessTokenClaims {
      userId: string;
      email: string;
      role: ROLE;
    }

    /** Claims del refresh token. El `jti` distingue dos refresh del mismo usuario. */
    interface RefreshTokenClaims {
      userId: string;
      jti: string;
    }
  }
}

export {};
