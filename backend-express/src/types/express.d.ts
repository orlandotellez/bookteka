import "express";

/**
 * Ampliación de los tipos de Express con lo que Bookteka agrega a `Request`.
 *
 * `userId` lo setea `auth.guard` después de verificar la sesión. Todo handler
 * protegido puede leerlo con confianza: si la guard no corrió, no hay sesión
 * y la ruta tampoco debería atender.
 */
declare global {
  namespace Express {
    interface Request {
      /** Id del usuario autenticado. Lo inyecta `requireAuth`. */
      userId?: string;
    }
  }
}

export {};
