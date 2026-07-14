import { describe, it, expect, vi } from "vitest";
import { generateId } from "@/utils/generateId";

describe("generateId", () => {
  it("returns a string", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
  });

  it("returns unique values on consecutive calls", () => {
    // Si llamamos a generateId varias veces, cada ID debe ser diferente
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it("uses crypto.randomUUID when available", () => {
    // Mockeamos crypto.randomUUID para controlar lo que devuelve
    const mockUUID = "550e8400-e29b-41d4-a716-446655440000";
    vi.spyOn(crypto, "randomUUID").mockReturnValue(mockUUID);

    const id = generateId();

    // Debe devolver el UUID mockeado
    expect(id).toBe(mockUUID);

    // Restauramos el mock para no afectar otros tests
    vi.restoreAllMocks();
  });

  it("falls back when crypto.randomUUID is not available", () => {
    // Simulamos un entorno sin crypto.randomUUID
    const originalRandomUUID = crypto.randomUUID;

    // @ts-expect-error - Eliminamos randomUUID para probar el fallback
    delete crypto.randomUUID;

    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);

    // Restauramos para no romper otros tests
    crypto.randomUUID = originalRandomUUID;
  });
});
