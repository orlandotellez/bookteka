import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// El módulo lee `import.meta.env` al importarse (IS_DEV), así que hay que
// recargar los módulos por cada escenario de entorno.
async function loadApiConfig(forceProduction: boolean) {
  vi.resetModules();
  vi.stubEnv("VITE_FORCE_PRODUCTION", forceProduction ? "true" : "false");
  vi.stubEnv("DEV", !forceProduction);
  return await import("@/lib/api-config");
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function errorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => "",
  } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchBootstrap", () => {
  it("devuelve la URL, la versión y el APK del bucket", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        current_api_url: "https://api.example.com/api/v1",
        app_version: "1.3.0",
        apk_url: "https://cdn.example.com/versions/apk/bookteka-v1.3.0-universal.apk",
      }),
    );
    const { fetchBootstrap } = await loadApiConfig(true);

    const result = await fetchBootstrap();

    expect(result).toEqual({
      apiUrl: "https://api.example.com/api/v1",
      appVersion: "1.3.0",
      apkUrl:
        "https://cdn.example.com/versions/apk/bookteka-v1.3.0-universal.apk",
    });
  });

  it("devuelve null si current_api_url no es una URL válida", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ current_api_url: "no-es-una-url", app_version: "1.3.0" }),
    );
    const { fetchBootstrap } = await loadApiConfig(true);

    await expect(fetchBootstrap()).resolves.toBeNull();
  });

  it("devuelve null si el bucket responde con error", async () => {
    fetchMock.mockResolvedValue(errorResponse(500));
    const { fetchBootstrap } = await loadApiConfig(true);

    await expect(fetchBootstrap()).resolves.toBeNull();
  });

  it("descarta un app_version vacío o con el tipo equivocado", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        current_api_url: "https://api.example.com/api/v1",
        app_version: "   ",
      }),
    );
    const { fetchBootstrap } = await loadApiConfig(true);

    const result = await fetchBootstrap();

    expect(result?.apiUrl).toBe("https://api.example.com/api/v1");
    expect(result?.appVersion).toBeNull();
  });

  it("descarta un apk_url mal formado", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        current_api_url: "https://api.example.com/api/v1",
        app_version: "1.3.0",
        apk_url: "javascript:alert(1)",
      }),
    );
    const { fetchBootstrap } = await loadApiConfig(true);

    const result = await fetchBootstrap();

    expect(result?.appVersion).toBe("1.3.0");
    expect(result?.apkUrl).toBeNull();
  });

  it("cae en la URL de producción si el fetch falla por red", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const { fetchBootstrap, FALLBACK_PRODUCTION_URL } = await loadApiConfig(true);

    const result = await fetchBootstrap();

    expect(result).toEqual({
      apiUrl: FALLBACK_PRODUCTION_URL,
      appVersion: null,
      apkUrl: null,
    });
    expect(FALLBACK_PRODUCTION_URL).not.toBe("https://localhost/api/v1");
  });

  it("no consulta el bucket en dev: usa la API local", async () => {
    const { fetchBootstrap, DEFAULT_API_URL } = await loadApiConfig(false);

    const result = await fetchBootstrap();

    expect(result).toEqual({
      apiUrl: DEFAULT_API_URL,
      appVersion: null,
      apkUrl: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
