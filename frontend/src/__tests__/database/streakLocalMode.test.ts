import { describe, it, expect, beforeEach, vi } from "vitest";

const streakApiGet = vi.fn();
const streakApiComplete = vi.fn();

vi.mock("@/api/streak", () => ({
  streakApi: {
    get: () => streakApiGet(),
    complete: () => streakApiComplete(),
  },
}));

const dbGet = vi.fn();
const dbPut = vi.fn();
vi.mock("@/database/connection", () => ({
  getDatabase: () => Promise.resolve({ get: dbGet, put: dbPut }),
  getCurrentUserId: () => "local-user",
}));

const prefs = { authMode: "local" as "local" | "server" };
vi.mock("@/store/userPreferencesStore", () => ({
  useUserPreferences: { getState: () => ({ ...prefs }) },
}));

const { syncStreakFromCloud, completeDayInCloud } = await import(
  "@/database/features/streaks"
);

beforeEach(() => {
  vi.clearAllMocks();
  prefs.authMode = "local";
  dbGet.mockResolvedValue(null);
  dbPut.mockResolvedValue(undefined);
});

describe("racha en modo local", () => {
  // Sin este gate, `getCurrentUserId()` devuelve "local-user" (truthy) y las
  // tres funciones llamaban a la red contra un backend inexistente.
  it("syncStreakFromCloud no llama a la API", async () => {
    await expect(syncStreakFromCloud()).resolves.toBeNull();
    expect(streakApiGet).not.toHaveBeenCalled();
  });

  it("completeDayInCloud no llama a la API", async () => {
    await expect(completeDayInCloud()).resolves.toBeNull();
    expect(streakApiComplete).not.toHaveBeenCalled();
  });

  it("tampoco escribe en IndexedDB", async () => {
    await completeDayInCloud();
    await syncStreakFromCloud();
    expect(dbPut).not.toHaveBeenCalled();
  });
});

describe("racha en modo servidor", () => {
  beforeEach(() => {
    prefs.authMode = "server";
    streakApiComplete.mockResolvedValue({
      currentStreak: 7,
      startDate: "2026-01-01",
      lastActiveDate: "2026-09-28",
      hasCompletedToday: true,
    });
  });

  it("completeDayInCloud sí llama a la API y guarda en caché local", async () => {
    const result = await completeDayInCloud();

    expect(streakApiComplete).toHaveBeenCalled();
    expect(result?.currentStreak).toBe(7);
    expect(dbPut).toHaveBeenCalled();
  });

  it("syncStreakFromCloud sí llama a la API", async () => {
    streakApiGet.mockResolvedValue({
      currentStreak: 4,
      startDate: "2026-02-01",
      lastActiveDate: "2026-09-28",
      hasCompletedToday: true,
    });

    const result = await syncStreakFromCloud();

    expect(streakApiGet).toHaveBeenCalled();
    expect(result?.currentStreak).toBe(4);
  });
});
