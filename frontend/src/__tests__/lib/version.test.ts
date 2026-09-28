import { describe, it, expect } from "vitest";
import { isNewerVersion, parseVersion } from "@/lib/version";

describe("parseVersion", () => {
  it("descompone una versión semver en números", () => {
    expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
  });

  it("tolera espacios alrededor", () => {
    expect(parseVersion("  1.2.3  ")).toEqual([1, 2, 3]);
  });

  it("rellena con 0 los segmentos no numéricos", () => {
    expect(parseVersion("1.x.3")).toEqual([1, 0, 3]);
  });
});

describe("isNewerVersion", () => {
  it("detecta un patch más nuevo", () => {
    expect(isNewerVersion("1.2.1", "1.2.0")).toBe(true);
  });

  it("detecta un minor más nuevo", () => {
    expect(isNewerVersion("1.3.0", "1.2.9")).toBe(true);
  });

  it("detecta un major más nuevo", () => {
    expect(isNewerVersion("2.0.0", "1.99.99")).toBe(true);
  });

  it("compara numéricamente, no lexicográficamente", () => {
    expect(isNewerVersion("1.10.0", "1.9.0")).toBe(true);
    expect(isNewerVersion("1.9.0", "1.10.0")).toBe(false);
  });

  it("devuelve false con versiones iguales", () => {
    expect(isNewerVersion("1.2.0", "1.2.0")).toBe(false);
  });

  it("devuelve false cuando la remota es más vieja", () => {
    expect(isNewerVersion("1.2.0", "1.2.1")).toBe(false);
  });

  it("trata los segmentos faltantes como 0", () => {
    // "1.2.1" vs "1.2" → el patch implícito es 0
    expect(isNewerVersion("1.2.1", "1.2")).toBe(true);
    expect(isNewerVersion("1.2", "1.2.0")).toBe(false);
  });

  it("no se rompe con valores no numéricos", () => {
    expect(isNewerVersion("1.2.x", "1.2.0")).toBe(false);
    expect(isNewerVersion("1.2.1", "1.2.x")).toBe(true);
  });
});
