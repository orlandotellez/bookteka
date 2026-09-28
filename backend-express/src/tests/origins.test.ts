import { jest } from "@jest/globals";

const ORIGINAL_FRONTEND_URL = process.env.FRONTEND_URL;
const ORIGINAL_TRUST = process.env.TRUST_BACKEND_ORIGINS;

function importOriginsFresh() {
  jest.resetModules();
  return import("@/config/origins.js");
}

afterEach(() => {
  process.env.FRONTEND_URL = ORIGINAL_FRONTEND_URL;
  process.env.TRUST_BACKEND_ORIGINS = ORIGINAL_TRUST;
});

describe("isRequestOriginAllowed", () => {
  it("acepta un origin de la lista de desarrollo", async () => {
    process.env.FRONTEND_URL = "http://localhost:1420";
    const { isRequestOriginAllowed } = await importOriginsFresh();
    const req = { headers: {} };

    expect(isRequestOriginAllowed(req, "http://localhost:1420")).toBe(true);
    expect(isRequestOriginAllowed(req, "http://tauri.localhost")).toBe(true);
  });

  it("rechaza un origin ajeno a la allowlist", async () => {
    process.env.FRONTEND_URL = "http://localhost:1420";
    const { isRequestOriginAllowed } = await importOriginsFresh();
    const req = { headers: {} };

    expect(isRequestOriginAllowed(req, "http://evil.example.com")).toBe(false);
  });

  it("devuelve false para origin undefined", async () => {
    process.env.FRONTEND_URL = "http://localhost:1420";
    const { isRequestOriginAllowed } = await importOriginsFresh();
    const req = { headers: {} };

    expect(isRequestOriginAllowed(req, undefined)).toBe(false);
  });
});

describe("allowlist con '*'", () => {
  it("lanza al cargar si FRONTEND_URL contiene '*'", async () => {
    process.env.FRONTEND_URL = "*";

    await expect(importOriginsFresh()).rejects.toThrow(
      "FRONTEND_URL contiene '*' que no está permitido",
    );
  });
});

describe("TRUST_BACKEND_ORIGINS", () => {
  it("con el flag activo, confía en el origin que coincide con el Host", async () => {
    process.env.FRONTEND_URL = "https://app.bookteka.com";
    process.env.TRUST_BACKEND_ORIGINS = "true";
    const { isRequestOriginAllowed } = await importOriginsFresh();

    const req = {
      headers: {
        host: "192.168.1.10:3000",
        "x-forwarded-proto": "http",
      },
    };

    expect(isRequestOriginAllowed(req, "http://192.168.1.10:3000")).toBe(true);
    expect(isRequestOriginAllowed(req, "http://evil.example.com")).toBe(false);
  });

  it("sin el flag, no confía en origins dinámicos", async () => {
    process.env.FRONTEND_URL = "https://app.bookteka.com";
    delete process.env.TRUST_BACKEND_ORIGINS;
    const { isRequestOriginAllowed } = await importOriginsFresh();

    const req = {
      headers: {
        host: "192.168.1.10:3000",
        "x-forwarded-proto": "http",
      },
    };

    expect(isRequestOriginAllowed(req, "http://192.168.1.10:3000")).toBe(false);
  });
});