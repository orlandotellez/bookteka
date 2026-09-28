import type { Response } from "express";
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_SECONDS,
  REFRESH_COOKIE,
  REFRESH_TOKEN_SECONDS,
} from "@/modules/auth/application/common/token.utils.js";

/**
 * Opciones de las cookies de sesión.
 *
 * `sameSite: "none"` en producción es lo que permite que la WebView de
 * Android mande la cookie al backend por IP de la LAN. En desarrollo se usa
 * `lax` porque el proxy de Vite sirve frontend y API en el mismo origin.
 */
function cookieOptions(maxAgeSeconds: number) {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? ("none" as const) : ("lax" as const),
    maxAge: maxAgeSeconds * 1000,
    path: "/",
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_TOKEN_SECONDS));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_TOKEN_SECONDS));
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
}
