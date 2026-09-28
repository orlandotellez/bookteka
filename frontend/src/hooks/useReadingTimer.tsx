import { useState, useEffect, useCallback, useRef } from "react";

interface UseReadingTimerProps {
  onTimeUpdate?: (seconds: number) => void;
  saveInterval?: number; // Segundos entre guardados
}

export function useReadingTimer({
  onTimeUpdate,
  saveInterval = 30,
}: UseReadingTimerProps = {}) {
  const [isRunning, setIsRunning] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const lastSaveRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const isSavedRef = useRef(false);
  const sessionSecondsRef = useRef(0);

  // Mantener actualizada la referencia al callback
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  const flushPending = useCallback(() => {
    if (isSavedRef.current) return;

    const callback = onTimeUpdateRef.current;
    const current = sessionSecondsRef.current;
    const secondsToSave = current - lastSaveRef.current;

    if (secondsToSave <= 0 || !callback) return;

    isSavedRef.current = true;
    callback(secondsToSave);
    lastSaveRef.current = current;

    setTimeout(() => {
      isSavedRef.current = false;
    }, 100);
  }, []);

  // Iniciar el temporizador
  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  // Pausar el temporizador y guardar inmediatamente
  const pause = useCallback(() => {
    setIsRunning(false);
    flushPending();
  }, [flushPending]);

  // Resetear la sesión
  const reset = useCallback(() => {
    flushPending();
    setIsRunning(false);
    setSessionSeconds(0);
    sessionSecondsRef.current = 0;
    lastSaveRef.current = 0;
  }, [flushPending]);

  // Toggle del temporizador
  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  // Efecto para el contador
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        // El ref primero: `flushPending` puede dispararse en el mismo ciclo
        // y necesita ver el segundo que acaba de pasar.
        sessionSecondsRef.current += 1;
        setSessionSeconds(sessionSecondsRef.current);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    if (!onTimeUpdateRef.current) return;

    const saveIntervalId = setInterval(() => {
      flushPending();
    }, saveInterval * 1000);

    return () => clearInterval(saveIntervalId);
  }, [isRunning, saveInterval, flushPending]);

  useEffect(() => {
    return () => {
      flushPending();
    };
  }, [flushPending]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPending();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flushPending]);

  return {
    isRunning,
    sessionSeconds,
    start,
    pause,
    reset,
    toggle,
  };
}
