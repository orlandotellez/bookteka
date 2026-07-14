import { describe, it, expect } from "vitest";
import { formatTime, formatTimeShort, getDateString } from "@/utils/time";

// ─── describe / it / expect ─────────────────────────────────────────────────
// Los tests se organizan en:
//   describe("nombre del grupo", () => { ... })  → agrupa tests relacionados
//   it("descripción del caso", () => { ... })     → un caso de test individual
//   expect(valor).toBe(algo)                      → aserción
//   expect(valor).toEqual(algo)                   → aserción para objetos/arrays

describe("formatTime", () => {
  it("formats only seconds", () => {
    expect(formatTime(0)).toBe("0s");
    expect(formatTime(5)).toBe("5s");
    expect(formatTime(59)).toBe("59s");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(60)).toBe("1m 0s");
    expect(formatTime(61)).toBe("1m 1s");
    expect(formatTime(3661)).toBe("1h 1m 1s");
  });

  it("formats hours, minutes and seconds", () => {
    expect(formatTime(3600)).toBe("1h 0m 0s");
    expect(formatTime(7322)).toBe("2h 2m 2s");
  });

  it("handles large values", () => {
    expect(formatTime(100000)).toBe("27h 46m 40s");
  });
});

describe("formatTimeShort", () => {
  it("formats as MM:SS when less than an hour", () => {
    expect(formatTimeShort(0)).toBe("00:00");
    expect(formatTimeShort(5)).toBe("00:05");
    expect(formatTimeShort(61)).toBe("01:01");
    expect(formatTimeShort(3599)).toBe("59:59");
  });

  it("formats as HH:MM:SS when an hour or more", () => {
    expect(formatTimeShort(3600)).toBe("01:00:00");
    expect(formatTimeShort(3661)).toBe("01:01:01");
  });

  it("pads with leading zeros", () => {
    expect(formatTimeShort(1)).toBe("00:01");
    expect(formatTimeShort(10)).toBe("00:10");
    expect(formatTimeShort(600)).toBe("10:00");
  });
});

describe("getDateString", () => {
  it("returns YYYY-MM-DD format", () => {
    const date = new Date(2026, 0, 15); // 15 de enero de 2026
    expect(getDateString(date)).toBe("2026-01-15");
  });

  it("pads month and day with zeros", () => {
    const date = new Date(2026, 2, 5); // 5 de marzo de 2026
    expect(getDateString(date)).toBe("2026-03-05");
  });

  it("handles December", () => {
    const date = new Date(2026, 11, 31);
    expect(getDateString(date)).toBe("2026-12-31");
  });
});
