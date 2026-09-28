import { AppError } from "@/core/errors/AppError.js";

/**
 * Mensajes de error del sistema, centralizados.
 *
 * Antes vivían interpolados en cada `throw new AppError(...)`. Tenerlos en un
 * solo lugar permite revisarlos de un vistazo y evita que dos módulos
 * escriban el mismo error con textos distintos.
 */
export const ERROR_MESSAGES = {
  // ── auth ──
  INVALID_CREDENTIALS: "Credenciales inválidas",
  EMAIL_ALREADY_REGISTERED: "El correo ya está registrado",
  REFRESH_TOKEN_REQUIRED: "Refresh token requerido",
  REFRESH_TOKEN_INVALID: "Refresh token inválido o expirado",
  SESSION_INVALID: "Sesión inválida",
  SESSION_EXPIRED: "Sesión expirada",
  SESSION_ALREADY_ROTATED: "Sesión ya renovada o revocada",
  USER_NOT_FOUND: "Usuario no encontrado",
  UNAUTHORIZED: "No autorizado",
  VERIFICATION_CODE_INVALID: "Código de verificación inválido",
  VERIFICATION_CODE_EXPIRED: "Código de verificación expirado",
  EMAIL_VERIFIED: "Correo verificado correctamente",
  SESSION_CLOSED: "Sesión cerrada correctamente",
  LOGIN_SUCCESS: "Login exitoso",
  USER_CREATED: "Usuario creado correctamente",
  TOKEN_RENEWED: "Token renovado correctamente",
  /** Genérico a propósito: confirmar si un correo existe filtraría cuentas. */
  VERIFICATION_SENT: "Si el correo existe, se envió un código",

  // ── libros ──
  BOOK_NOT_FOUND_FOR_USER: "Libro no encontrado para este usuario",
  NOT_YOUR_BOOK: "No es tu libro",
  FILE_NOT_FOUND: "File not found",
  FILE_FETCH_ERROR: "Error al obtener el archivo",
  BOOK_DELETED: "Libro eliminado correctamente",

  // ── marcadores ──
  BOOKMARK_NOT_FOUND: "Bookmark no encontrado",
  BOOKMARK_ACCESS_DENIED: "No autorizado o libro no encontrado",

  // ── streak ──
  STREAK_SAVE_ERROR: "Error al guardar la racha",

  // ── http ──
  ROUTE_NOT_FOUND: "Ruta no encontrada",
  VALIDATION_FAILED: "Validation failed",
  INTERNAL_ERROR: "Internal Server Error",
} as const satisfies Record<string, string>;

export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];

/** Constructor abreviado: `throw httpError.unauthorized()` en vez de `new AppError(...)`. */
export const httpError = {
  badRequest: (message: string) => new AppError("BAD_REQUEST", 400, message),
  unauthorized: (message: string = ERROR_MESSAGES.UNAUTHORIZED) =>
    new AppError("UNAUTHORIZED", 401, message),
  forbidden: (message: string) => new AppError("FORBIDDEN", 403, message),
  notFound: (message: string) => new AppError("NOT_FOUND", 404, message),
  conflict: (message: string) => new AppError("CONFLICT", 409, message),
  internal: (message: string = ERROR_MESSAGES.INTERNAL_ERROR) =>
    new AppError("INTERNAL_ERROR", 500, message),
};
