import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  FRONTEND_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;

  R2_ACCESS_KEY: string
  R2_SECRET_KEY: string
  R2_S3_API: string
  R2_BUCKET: string
  R2_PUBLIC_DOMAIN: string

  RESEND_API_KEY: string
  RESEND_FROM_EMAIL: string
}

function getEnvVar(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error("env not found");
  }

  return value;
}

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  DATABASE_URL: getEnvVar("DATABASE_URL"),
  FRONTEND_URL: getEnvVar("FRONTEND_URL"),
  BETTER_AUTH_SECRET: getEnvVar("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: getEnvVar("BETTER_AUTH_URL"),
  R2_ACCESS_KEY: getEnvVar("R2_ACCESS_KEY_ID"),
  R2_SECRET_KEY: getEnvVar("R2_SECRET_ACCESS_KEY"),
  R2_S3_API: getEnvVar("R2_ENDPOINT"),
  R2_BUCKET: getEnvVar("R2_BUCKET"),
  R2_PUBLIC_DOMAIN: getEnvVar("R2_PUBLIC_DOMAIN"),

  RESEND_API_KEY: getEnvVar("RESEND_API_KEY"),
  RESEND_FROM_EMAIL: getEnvVar("RESEND_FROM_EMAIL"),
};
