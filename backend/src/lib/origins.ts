import { env } from "@/config/env.js";

const DEV_EXTRA_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8081",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

const STAR = "*";

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

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

export const isProductionEnv = isProduction;
