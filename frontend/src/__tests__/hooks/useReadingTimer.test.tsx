import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { StrictMode } from "react";
import { useReadingTimer } from "@/hooks/useReadingTimer";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function tick(seconds: number) {
  for (let i = 0; i < seconds; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

function totalReporteA(llamadas: unknown[][]): number {
  return llamadas.reduce((acc, c) => acc + (c[0] as number), 0);
}

function montar() {
  const onTimeUpdate = vi.fn();
  const hook = renderHook(() => useReadingTimer({ onTimeUpdate }), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    ),
  });
  return { onTimeUpdate, ...hook };
}

describe("useReadingTimer - el tiempo leído se reporta una sola vez", () => {
  it.each([
    [5, 5],
    [10, 10],
    [11, 11],
    [30, 30],
    [60, 60],
    [300, 300],
    [600, 600],
  ])("%i segundos reales se reportan como %i, no como la suma acumulada", (
    reales,
    esperado,
  ) => {
    const { result, onTimeUpdate } = montar();

    act(() => result.current.start());
    tick(reales);
    act(() => result.current.pause());

    expect(result.current.sessionSeconds).toBe(reales);
    expect(totalReporteA(onTimeUpdate.mock.calls)).toBe(esperado);
  });
});

describe("useReadingTimer - el contador", () => {
  it("cuenta un segundo por segundo", () => {
    const { result } = montar();

    act(() => result.current.start());
    tick(10);

    expect(result.current.sessionSeconds).toBe(10);
  });

  it("no sigue contando con el timer apagado", () => {
    const { result } = montar();

    act(() => result.current.start());
    tick(10);
    act(() => result.current.pause());
    tick(60);

    expect(result.current.sessionSeconds).toBe(10);
  });

  it("no acumula entre varias sesiones de pausa", () => {
    const { result, onTimeUpdate } = montar();

    act(() => result.current.start());
    tick(4);
    act(() => result.current.pause());
    tick(50);
    act(() => result.current.start());
    tick(6);
    act(() => result.current.pause());

    expect(result.current.sessionSeconds).toBe(10);
    expect(totalReporteA(onTimeUpdate.mock.calls)).toBe(10);
  });

  it("el guardado periódico no pierde ni duplica segundos", () => {
    const onTimeUpdate = vi.fn();
    const { result } = renderHook(() =>
      useReadingTimer({ onTimeUpdate, saveInterval: 10 }),
    );

    act(() => result.current.start());
    tick(35);
    act(() => result.current.pause());

    expect(totalReporteA(onTimeUpdate.mock.calls)).toBe(35);
  });
});

describe("useReadingTimer - guardado al desmontar y al cerrar", () => {
  it("reporta lo pendiente al desmontar", () => {
    const onTimeUpdate = vi.fn();
    const { result, unmount } = renderHook(() =>
      useReadingTimer({ onTimeUpdate }),
    );

    act(() => result.current.start());
    tick(7);
    unmount();

    expect(totalReporteA(onTimeUpdate.mock.calls)).toBe(7);
  });

  it("no duplica al pausar y después desmontar", () => {
    const onTimeUpdate = vi.fn();
    const { result, unmount } = renderHook(() =>
      useReadingTimer({ onTimeUpdate }),
    );

    act(() => result.current.start());
    tick(9);
    act(() => result.current.pause());
    unmount();

    expect(totalReporteA(onTimeUpdate.mock.calls)).toBe(9);
  });

  it("reporta lo pendiente al cerrar la pestaña", () => {
    const onTimeUpdate = vi.fn();
    const { result } = renderHook(() => useReadingTimer({ onTimeUpdate }));

    act(() => result.current.start());
    tick(4);
    act(() => {
      window.dispatchEvent(new Event("beforeunload"));
    });

    expect(totalReporteA(onTimeUpdate.mock.calls)).toBe(4);
  });
});
