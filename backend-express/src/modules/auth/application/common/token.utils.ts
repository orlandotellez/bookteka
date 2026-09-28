import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "@/config/env.js";
import { generateTokenId } from "@/modules/auth/application/common/crypto.utils.js";
import type { HeaderMap, TokenPayload } from "@/modules/auth/domain/auth.entities.js";

/** Vida del access token: 15 minutos. */
export const ACCESS_TOKEN_SECONDS = 15 * 60;

/** Vida del refresh token: 7 días. */
export const REFRESH_TOKEN_SECONDS = 7 * 24 * 60 * 60;

export const ACCESS_COOKIE = "accessToken";
export const REFRESH_COOKIE = "refreshToken";

/** Lee un header sin importar si viene en minúsculas o mayúsculas. */
function getHeader(
  headers: HeaderMap | undefined,
  name: string,
): string | undefined {
  const value = headers?.[name.toLowerCase()] ?? headers?.[name];
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Parsea el header `Cookie` en un objeto plano. */
export function parseCookies(
  cookieHeader: string | undefined,
): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").flatMap((part) => {
      const separator = part.indexOf("=");
      if (separator < 0) return [];
      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      return key ? [[key, decodeURIComponent(value)]] : [];
    }),
  );
}

/**
 * Extrae los tokens de la request, con este orden de prioridad:
 *
 * 1. `Authorization: Bearer` (clientes HTTP y tests)
 * 2. `x-session-token` / `x-refresh-token` (Tauri: la WebView de Android es
 *    cross-site y las cookies `SameSite=Lax` no viajan)
 * 3. cookies `accessToken` / `refreshToken` (web)
 *
 * Los cuatro transportes tienen que seguir funcionando.
 */
export function tokenFromHeaders(headers: HeaderMap | undefined): {
  accessToken?: string;
  refreshToken?: string;
} {
  const authorization = getHeader(headers, "authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : undefined;
  const sessionHeader = getHeader(headers, "x-session-token");
  const refreshHeader = getHeader(headers, "x-refresh-token");
  const cookies = parseCookies(getHeader(headers, "cookie"));
  return {
    accessToken: bearerToken || sessionHeader || cookies[ACCESS_COOKIE],
    refreshToken: refreshHeader || cookies[REFRESH_COOKIE],
  };
}

/** Firma el access token con `{ userId, email, role }`. */
export function signAccessToken(user: {
  id: string;
  email: string;
  role: TokenPayload["role"];
}): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    } satisfies TokenPayload,
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_SECONDS } satisfies SignOptions,
  );
}

/** Firma el refresh token con `{ userId, jti }`. */
export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, jti: generateTokenId() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_SECONDS } satisfies SignOptions,
  );
}

/** Verifica el access token. Devuelve `null` si está mal firmado o expirado. */
export function verifyAccessToken(
  token: string,
): (JwtPayload & TokenPayload) | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload & TokenPayload;
  } catch {
    return null;
  }
}

/** Verifica el refresh token. Lanza si está mal firmado o expirado. */
export function verifyRefreshToken(
  token: string,
): JwtPayload & { userId?: string; jti?: string } {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload & {
      userId?: string;
      jti?: string;
    };
  } catch {
    return {};
  }
}
