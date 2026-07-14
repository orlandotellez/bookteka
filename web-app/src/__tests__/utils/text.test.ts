import { describe, it, expect } from "vitest";
import { normalizeText } from "@/utils/text";

describe("normalizeText", () => {
  it("converts to lowercase", () => {
    expect(normalizeText("HOLA")).toBe("hola");
    expect(normalizeText("CaPitÁN")).toBe("capitan");
  });

  it("removes accents (NFD normalization)", () => {
    expect(normalizeText("canción")).toBe("cancion");
    expect(normalizeText("corazón")).toBe("corazon");
    expect(normalizeText("íñigo")).toBe("inigo");
    expect(normalizeText("über")).toBe("uber");
  });

  it("handles mixed accents and uppercase", () => {
    expect(normalizeText("ÉL ÁRBOL")).toBe("el arbol");
    expect(normalizeText("MÚSICA CLÁSICA")).toBe("musica clasica");
  });

  it("preserves characters without accents", () => {
    expect(normalizeText("hello world")).toBe("hello world");
    expect(normalizeText("123 ABC")).toBe("123 abc");
  });
});
