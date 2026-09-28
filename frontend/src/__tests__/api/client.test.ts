import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const crossFetchMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/api-config", () => ({
  readApiUrl: () => "http://test.local/api/v1",
}));

vi.mock("@/lib/fetch", () => ({
  crossFetch: (input: RequestInfo | URL, init?: RequestInit) =>
    crossFetchMock(input, init),
}));

vi.mock("@/lib/sessionToken", () => ({
  getSessionToken: () => "access-123",
  getRefreshToken: () => "refresh-456",
}));

const { api, ApiError } = await import("@/api/client");

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  crossFetchMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ApiError.extractErrorMessage", () => {
  it("extrae el mensaje de { error }", () => {
    const err = new ApiError(400, { error: "No válido" });
    expect(err.message).toBe("No válido");
    expect(err.status).toBe(400);
  });

  it("extrae el mensaje de { message }", () => {
    const err = new ApiError(500, { message: "Internal" });
    expect(err.message).toBe("Internal");
  });

  it("extrae el mensaje de un array con message en el primer elemento", () => {
    const err = new ApiError(422, [{ message: "Primer error" }]);
    expect(err.message).toBe("Primer error");
  });

  it("usa HTTP {status} cuando no hay mensaje", () => {
    const err = new ApiError(404, { code: "NOT_FOUND" });
    expect(err.message).toBe("HTTP 404");
  });
});

describe("api.get/post — comportamiento del transport", () => {
  it("un error de red produce ApiError con status 0", async () => {
    crossFetchMock.mockRejectedValue(new TypeError("network down"));

    await expect(api.get("/books")).rejects.toBeInstanceOf(ApiError);
    await expect(api.get("/books")).rejects.toMatchObject({
      status: 0,
      message: "Error al conectar con el servidor",
    });
  });

  it("un 204 devuelve undefined sin parsear", async () => {
    crossFetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await api.delete("/books/1");

    expect(result).toBeUndefined();
  });

  it("manda credentials include y los headers de sesión", async () => {
    crossFetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await api.get("/books");

    const [input, init] = crossFetchMock.mock.calls[0];
    expect(String(input)).toBe("http://test.local/api/v1/books");
    expect((init as RequestInit).credentials).toBe("include");
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("x-session-token")).toBe("access-123");
    expect(headers.get("x-refresh-token")).toBe("refresh-456");
  });

  it("una respuesta no-ok lanza ApiError con el body crudo", async () => {
    crossFetchMock.mockResolvedValue(
      jsonResponse(401, { error: "No autorizado", code: "UNAUTHORIZED" }),
    );

    await expect(api.get("/streak")).rejects.toMatchObject({
      status: 401,
      message: "No autorizado",
      data: { code: "UNAUTHORIZED" },
    });
  });

  it("usa crossFetch para JSON", async () => {
    crossFetchMock.mockResolvedValue(jsonResponse(200, { currentStreak: 3 }));

    const result = await api.get("/streak");

    expect(crossFetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ currentStreak: 3 });
  });

  it("usa globalThis.fetch para FormData", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { bookId: "b1" }));
    const form = new FormData();
    form.append("pdf", new Blob(["x"]), "libro.pdf");

    await api.post("/books/upload", form);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(crossFetchMock).not.toHaveBeenCalled();
  });

  it("usa globalThis.fetch para raw", async () => {
    fetchMock.mockResolvedValue(new Response("cuerpo", { status: 200 }));

    const res = await api.raw("/books/b1/stream");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res).toBeInstanceOf(Response);
  });

  it("usa globalThis.fetch y manda keepalive cuando se pide", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await api.patch("/books/b1/progress", { currentPage: 2 }, { keepalive: true });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.keepalive).toBe(true);
    expect(crossFetchMock).not.toHaveBeenCalled();
  });
});