import { jest } from "@jest/globals";

jest.unstable_mockModule("@/config/prisma.js", () => ({ dbPrisma: {} }));
jest.unstable_mockModule("@/core/storage/s3.client.js", () => ({ r2: {} }));
jest.unstable_mockModule(
  "@/modules/auth/application/common/email.utils.js",
  () => ({ sendEmail: jest.fn() }),
);
jest.unstable_mockModule("@/modules/auth/infrastructure/auth.prisma.repository.js", () => ({
  authPrismaRepository: {},
}));

const { buildEnv } = await import("@/config/env.js");

function validEnv(overrides: Record<string, string> = {}) {
  return {
    DATABASE_URL: "postgres://test:test@localhost:5432/bookteka_test",
    FRONTEND_URL: "http://localhost:1420",
    JWT_SECRET: "a-secret-with-more-than-thirty-two-characters",
    JWT_REFRESH_SECRET: "another-secret-with-more-than-thirty-two-chars",
    R2_ACCESS_KEY_ID: "ak",
    R2_SECRET_ACCESS_KEY: "sk",
    R2_ENDPOINT: "https://test.r2.cloudflarestorage.com",
    R2_BUCKET: "bookteka-test",
    R2_PUBLIC_DOMAIN: "https://test.r2.dev",
    RESEND_API_KEY: "re_test",
    RESEND_FROM_EMAIL: "test@bookteka.com",
    ...overrides,
  };
}

describe("buildEnv", () => {
  it("construye la config completa con todas las variables", () => {
    const config = buildEnv(validEnv());

    expect(config.PORT).toBe(3000);
    expect(config.DATABASE_URL).toContain("bookteka_test");
    expect(config.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(config.R2_ENDPOINT).toContain("r2.cloudflare");
  });

  it("lee PORT del entorno cuando viene", () => {
    const config = buildEnv(validEnv({ PORT: "4000" }));
    expect(config.PORT).toBe(4000);
  });

  it("lanza si falta una variable obligatoria", () => {
    const incomplete = validEnv() as Record<string, string | undefined>;
    delete incomplete.DATABASE_URL;

    expect(() => buildEnv(incomplete)).toThrow(
      "Missing environment variable: DATABASE_URL",
    );
  });

  it("lanza si el JWT_SECRET tiene menos de 32 caracteres", () => {
    expect(() => buildEnv(validEnv({ JWT_SECRET: "corto" }))).toThrow(
      "JWT_SECRET must contain at least 32 characters",
    );
  });

  it("lanza si el JWT_REFRESH_SECRET tiene menos de 32 caracteres", () => {
    expect(() => buildEnv(validEnv({ JWT_REFRESH_SECRET: "corto" }))).toThrow(
      "JWT_REFRESH_SECRET must contain at least 32 characters",
    );
  });

  it("no existe ningún camino con secreto conocido", () => {
    const config = buildEnv(validEnv());
    expect(config.JWT_SECRET).toMatch(/^[\w-]{32,}$/);
    expect(config.JWT_SECRET).not.toBe(config.JWT_REFRESH_SECRET);
  });
});