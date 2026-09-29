import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  syncStreakFromCloudMock,
  getStreakDataMock,
  saveStreakDataMock,
  completeDayInCloudMock,
  initializeStreakInCloudMock,
} = vi.hoisted(() => ({
  syncStreakFromCloudMock: vi.fn(),
  getStreakDataMock: vi.fn(),
  saveStreakDataMock: vi.fn(),
  completeDayInCloudMock: vi.fn(),
  initializeStreakInCloudMock: vi.fn(),
}));

vi.mock("@/database", () => ({
  getStreakData: () => getStreakDataMock(),
  saveStreakData: () => saveStreakDataMock(),
  syncStreakFromCloud: () => syncStreakFromCloudMock(),
  completeDayInCloud: () => completeDayInCloudMock(),
  initializeStreakInCloud: (days: number, startDate?: string) =>
    initializeStreakInCloudMock(days, startDate),
}));

import { useStreakStore } from "@/store/streakStore";

const store = useStreakStore;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  store.setState({ streakData: null, isStreakLoading: false });
  syncStreakFromCloudMock.mockResolvedValue(null);
  getStreakDataMock.mockResolvedValue(null);
  saveStreakDataMock.mockResolvedValue(undefined);
  completeDayInCloudMock.mockResolvedValue(null);
  initializeStreakInCloudMock.mockResolvedValue(null);
});

describe("completeDayIfNeeded", () => {
  // Es lo que dispara el temporizador al arrancar. Necesita ser idempotente:
  // arrancar y parar el timer varias veces en el día no debe sumar días de más.
  it("cuenta el día y devuelve true la primera vez", async () => {
    completeDayInCloudMock.mockResolvedValue({
      currentStreak: 3,
      startDate: "2026-09-01",
      lastActiveDate: "2026-09-28",
      hasCompletedToday: true,
    });

    const counted = await store.getState().completeDayIfNeeded();

    expect(counted).toBe(true);
    expect(store.getState().streakData?.currentStreak).toBe(3);
  });

  it("no vuelve a contar si el día ya estaba", async () => {
    store.setState({
      streakData: {
        currentStreak: 4,
        startDate: "2026-09-01",
        lastActiveDate: "2026-09-28",
        hasCompletedToday: true,
      },
    });

    const counted = await store.getState().completeDayIfNeeded();

    expect(counted).toBe(false);
    expect(completeDayInCloudMock).not.toHaveBeenCalled();
    expect(saveStreakDataMock).not.toHaveBeenCalled();
  });

  it("no infla la racha si se llama varias veces en el día", async () => {
    // El cloud responde que hoy ya estaba: la segunda llamada no debe sumar.
    completeDayInCloudMock.mockResolvedValue({
      currentStreak: 2,
      startDate: "2026-09-01",
      lastActiveDate: "2026-09-28",
      hasCompletedToday: true,
    });

    await store.getState().completeDayIfNeeded();
    const segunda = await store.getState().completeDayIfNeeded();
    const tercera = await store.getState().completeDayIfNeeded();

    expect(segunda).toBe(false);
    expect(tercera).toBe(false);
    expect(completeDayInCloudMock).toHaveBeenCalledTimes(1);
    expect(store.getState().streakData?.currentStreak).toBe(2);
  });

  it("devuelve false si el cloud falla y no hay datos previos", async () => {
    completeDayInCloudMock.mockRejectedValue(new Error("sin red"));

    const counted = await store.getState().completeDayIfNeeded();

    expect(counted).toBe(false);
  });

  it("cae al cálculo local cuando el cloud no responde", async () => {
    completeDayInCloudMock.mockResolvedValue(null);

    const counted = await store.getState().completeDayIfNeeded();

    expect(counted).toBe(true);
    expect(saveStreakDataMock).toHaveBeenCalled();
    expect(store.getState().streakData?.hasCompletedToday).toBe(true);
  });
});
