import { describe, it, expect, vi, beforeEach } from "vitest";
import { useStreakStore } from "@/store/streakStore";
import { getDateString } from "@/utils/time";

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

describe("streakStore.loadStreakData", () => {
  it("usa la respuesta del cloud cuando responde", async () => {
    syncStreakFromCloudMock.mockResolvedValue({
      currentStreak: 5,
      startDate: "2026-05-01",
      lastActiveDate: "2026-05-05",
      hasCompletedToday: true,
    });

    await store.getState().loadStreakData();

    expect(store.getState().streakData?.currentStreak).toBe(5);
    expect(store.getState().streakData?.hasCompletedToday).toBe(true);
  });

  it("usa los locales de IndexedDB cuando el cloud responde null y no hay estado", async () => {
    syncStreakFromCloudMock.mockResolvedValue(null);
    getStreakDataMock.mockResolvedValue({
      currentStreak: 3,
      startDate: "2026-05-01",
      lastActiveDate: "2026-05-03",
    });

    await store.getState().loadStreakData();

    const data = store.getState().streakData;
    expect(data?.currentStreak).toBe(3);
    expect(data).not.toBeNull();
  });

  it("si el cloud rechaza, mantiene el estado actual y no lo pisa con null", async () => {
    store.setState({
      streakData: {
        currentStreak: 7,
        startDate: "2026-04-01",
        lastActiveDate: "2026-05-07",
        hasCompletedToday: false,
      },
    });
    syncStreakFromCloudMock.mockRejectedValue(new Error("offline"));

    await store.getState().loadStreakData();

    expect(store.getState().streakData?.currentStreak).toBe(7);
  });

  it("nunca deja el estado en null si ya había datos", async () => {
    store.setState({
      streakData: {
        currentStreak: 9,
        startDate: "2026-04-01",
        lastActiveDate: "2026-05-09",
        hasCompletedToday: true,
      },
    });
    syncStreakFromCloudMock.mockRejectedValue(new Error("offline"));
    getStreakDataMock.mockResolvedValue(null);

    await store.getState().loadStreakData();

    expect(store.getState().streakData?.currentStreak).toBe(9);
  });
});

describe("streakStore.completeDay", () => {
  it("usa el cloud como fuente de verdad", async () => {
    completeDayInCloudMock.mockResolvedValue({
      currentStreak: 6,
      startDate: "2026-05-01",
      lastActiveDate: "2026-05-06",
      hasCompletedToday: true,
    });

    const result = await store.getState().completeDay();

    expect(result).toBe(true);
    expect(store.getState().streakData?.currentStreak).toBe(6);
  });

  it("devuelve false si el día ya estaba completado en el cloud", async () => {
    completeDayInCloudMock.mockResolvedValue({
      currentStreak: 3,
      startDate: "2026-05-01",
      lastActiveDate: "2026-05-03",
      hasCompletedToday: false,
    });

    const result = await store.getState().completeDay();

    expect(result).toBe(false);
  });

  it("usa el fallback local cuando el cloud responde null y ayer se leyó", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    completeDayInCloudMock.mockResolvedValue(null);
    store.setState({
      streakData: {
        currentStreak: 2,
        startDate: "2026-05-01",
        lastActiveDate: getDateString(yesterday),
        hasCompletedToday: false,
      },
    });

    const result = await store.getState().completeDay();

    expect(result).toBe(true);
    expect(store.getState().streakData?.currentStreak).toBe(3);
    expect(saveStreakDataMock).toHaveBeenCalled();
  });

  it("crea la racha desde cero si no había datos y el cloud responde null", async () => {
    completeDayInCloudMock.mockResolvedValue(null);

    const result = await store.getState().completeDay();

    expect(result).toBe(true);
    expect(store.getState().streakData?.currentStreak).toBe(1);
  });

  it("si el cloud rechaza, devuelve undefined y no toca el estado", async () => {
    completeDayInCloudMock.mockRejectedValue(new Error("offline"));
    store.setState({ streakData: null });

    const result = await store.getState().completeDay();

    expect(result).toBeUndefined();
    expect(store.getState().streakData).toBeNull();
  });
});

describe("streakStore.initializeStreak", () => {
  it("delega en el backend cuando responde", async () => {
    initializeStreakInCloudMock.mockResolvedValue({
      currentStreak: 15,
      startDate: "2026-04-01",
      lastActiveDate: "2026-05-06",
      hasCompletedToday: true,
    });

    await store.getState().initializeStreak(15, "2026-04-01");

    expect(initializeStreakInCloudMock).toHaveBeenCalledWith(
      0,
      "2026-04-01",
    );
    expect(store.getState().streakData?.currentStreak).toBe(15);
  });
});

describe("persistencia", () => {
  it("guarda solo streakData bajo la clave bookteka-streak", () => {
    store.setState({
      streakData: {
        currentStreak: 4,
        startDate: "2026-05-01",
        lastActiveDate: "2026-05-04",
        hasCompletedToday: true,
      },
      isStreakLoading: true,
    });

    const raw = localStorage.getItem("bookteka-streak");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? "{}") as {
      state?: { streakData?: unknown; isStreakLoading?: unknown };
    };
    expect(parsed.state?.streakData).toBeDefined();
    expect(parsed.state?.isStreakLoading).toBeUndefined();
  });
});