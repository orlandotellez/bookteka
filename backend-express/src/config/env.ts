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

function getEnvVar(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

function getJwtSecret(key: "JWT_SECRET" | "JWT_REFRESH_SECRET"): string {
  const value = process.env[key];
  if (!value || value.length < 32) {
    throw new Error(`${key} must contain at least 32 characters`);
  }
  return value;
}

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  DATABASE_URL: getEnvVar("DATABASE_URL"),
  FRONTEND_URL: getEnvVar("FRONTEND_URL"),
  JWT_SECRET: getJwtSecret("JWT_SECRET"),
  JWT_REFRESH_SECRET: getJwtSecret("JWT_REFRESH_SECRET"),
  R2_ACCESS_KEY_ID: getEnvVar("R2_ACCESS_KEY_ID"),
  R2_SECRET_ACCESS_KEY: getEnvVar("R2_SECRET_ACCESS_KEY"),
  R2_ENDPOINT: getEnvVar("R2_ENDPOINT"),
  R2_BUCKET: getEnvVar("R2_BUCKET"),
  R2_PUBLIC_DOMAIN: getEnvVar("R2_PUBLIC_DOMAIN"),
  RESEND_API_KEY: getEnvVar("RESEND_API_KEY"),
  RESEND_FROM_EMAIL: getEnvVar("RESEND_FROM_EMAIL"),
};