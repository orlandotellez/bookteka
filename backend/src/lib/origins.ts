import type { Request } from "express";
import { env } from "@/config/env.js";

const STAR = "*";

const DEV_EXTRA_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8081",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

function parseOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const isProduction = process.env.NODE_ENV === "production";

const configured = parseOrigins(env.FRONTEND_URL);

if (configured.includes(STAR)) {
  throw new Error(
    "FRONTEND_URL contiene '*' que no está permitido (incompatible con credentials:true de CORS).",
  );
}

export const ALLOWED_ORIGINS: string[] = isProduction
  ? configured
  : [...configured, ...DEV_EXTRA_ORIGINS];

/**
 * Confía en cualquier Origin que venga del proxy inverso, es decir, cuyo
 * host coincida con `X-Forwarded-Host` (o, en su defecto, `Host`). Esto
 * permite acceder desde cualquier IP/puerto de la LAN sin editar `compose`.
 * Activar sólo cuando el servicio está detrás de un proxy de confianza.
 */
export const TRUST_BACKEND_ORIGINS: boolean =
  process.env.TRUST_BACKEND_ORIGINS === "true";

function protoFromRequest(req: Pick<Request, "headers">): string {
  const fwd = req.headers["x-forwarded-proto"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!;
  return "http";
}

function hostFromRequest(req: Pick<Request, "headers">): string | undefined {
  const fwd = req.headers["x-forwarded-host"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!;
  const host = req.headers.host;
  if (typeof host === "string" && host.length > 0) return host;
  return undefined;
}

/**
 * Origen "esperado" según lo que el navegador dijo al proxy. Se compara
 * con el `Origin` que envía el cliente para detectar accesos LAN sin
 * tener que listar cada IP en `FRONTEND_URL`.
 */
function expectedOriginFromRequest(
  req: Pick<Request, "headers">,
): string | undefined {
  const host = hostFromRequest(req);
  if (!host) return undefined;
  return `${protoFromRequest(req)}://${host}`;
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Versión per-request: además de la lista estática, confía en el Origin
 * si coincide con el host que nginx reenvió. Sólo se aplica cuando
 * `TRUST_BACKEND_ORIGINS=true`.
 */
export function isRequestOriginAllowed(
  req: Pick<Request, "headers">,
  origin: string | undefined,
): boolean {
  if (isAllowedOrigin(origin)) return true;
  if (!origin) return false;
  if (!TRUST_BACKEND_ORIGINS) return false;
  return origin === expectedOriginFromRequest(req);
}

/**
 * Lista derivada para casos (como better-auth) que necesitan `trustedOrigins`
 * resuelto en cada request. Si el flag está activo, devuelve el Origin del
 * request siempre que su host coincida con el del proxy.
 */
export function originsForRequest(
  req: Pick<Request, "headers">,
): string[] {
  const origin = req.headers.origin;
  if (
    TRUST_BACKEND_ORIGINS &&
    typeof origin === "string" &&
    origin === expectedOriginFromRequest(req) &&
    !ALLOWED_ORIGINS.includes(origin)
  ) {
    return [...ALLOWED_ORIGINS, origin];
  }
  return ALLOWED_ORIGINS;
}

export const isProductionEnv = isProduction;
