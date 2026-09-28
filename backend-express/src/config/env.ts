import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  FRONTEND_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;

  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ENDPOINT: string;
  R2_BUCKET: string;
  R2_PUBLIC_DOMAIN: string;

  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
}

type ProcessEnvLike = Record<string, string | undefined>;

function getEnvVar(processEnv: ProcessEnvLike, key: string): string {
  const value = processEnv[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

function getJwtSecret(
  processEnv: ProcessEnvLike,
  key: "JWT_SECRET" | "JWT_REFRESH_SECRET",
): string {
  const value = processEnv[key];
  if (!value || value.length < 32) {
    throw new Error(`${key} must contain at least 32 characters`);
  }
  return value;
}

export function buildEnv(processEnv: ProcessEnvLike): EnvConfig {
  return {
    PORT: parseInt(processEnv.PORT || "3000", 10),
    DATABASE_URL: getEnvVar(processEnv, "DATABASE_URL"),
    FRONTEND_URL: getEnvVar(processEnv, "FRONTEND_URL"),
    JWT_SECRET: getJwtSecret(processEnv, "JWT_SECRET"),
    JWT_REFRESH_SECRET: getJwtSecret(processEnv, "JWT_REFRESH_SECRET"),
    R2_ACCESS_KEY_ID: getEnvVar(processEnv, "R2_ACCESS_KEY_ID"),
    R2_SECRET_ACCESS_KEY: getEnvVar(processEnv, "R2_SECRET_ACCESS_KEY"),
    R2_ENDPOINT: getEnvVar(processEnv, "R2_ENDPOINT"),
    R2_BUCKET: getEnvVar(processEnv, "R2_BUCKET"),
    R2_PUBLIC_DOMAIN: getEnvVar(processEnv, "R2_PUBLIC_DOMAIN"),
    RESEND_API_KEY: getEnvVar(processEnv, "RESEND_API_KEY"),
    RESEND_FROM_EMAIL: getEnvVar(processEnv, "RESEND_FROM_EMAIL"),
  };
}

export const env: EnvConfig = buildEnv(process.env);