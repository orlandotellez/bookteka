import { useState, useEffect, useCallback, useRef } from "react";

interface UseReadingTimerProps {
  onTimeUpdate?: (seconds: number) => void;
  saveInterval?: number; // Segundos entre guardados
}

/**
 * Hook para el temporizador de lectura
 */
export function useReadingTimer({
  onTimeUpdate,
  saveInterval = 30,
}: UseReadingTimerProps = {}) {
  const [isRunning, setIsRunning] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const lastSaveRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  // Iniciar el temporizador
  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  // Pausar el temporizador
  const pause = useCallback(() => {
    setIsRunning(false);
    // Guardar el tiempo acumulado al pausar
    if (sessionSeconds > lastSaveRef.current && onTimeUpdate) {
      const secondsToSave = sessionSeconds - lastSaveRef.current;
      onTimeUpdate(secondsToSave);
      lastSaveRef.current = sessionSeconds;
    }
  }, [sessionSeconds, onTimeUpdate]);

  // Resetear la sesión
  const reset = useCallback(() => {
    setIsRunning(false);
    setSessionSeconds(0);
    lastSaveRef.current = 0;
  }, []);

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
        setSessionSeconds((prev) => prev + 1);
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

  // Efecto para guardar periódicamente
  useEffect(() => {
    if (
      isRunning &&
      sessionSeconds > 0 &&
      sessionSeconds - lastSaveRef.current >= saveInterval &&
      onTimeUpdate
    ) {
      const secondsToSave = sessionSeconds - lastSaveRef.current;
      onTimeUpdate(secondsToSave);
      lastSaveRef.current = sessionSeconds;
    }
  }, [sessionSeconds, saveInterval, isRunning, onTimeUpdate]);

  // Guardar al desmontar si hay tiempo pendiente
  useEffect(() => {
    return () => {
      if (sessionSeconds > lastSaveRef.current && onTimeUpdate) {
        const secondsToSave = sessionSeconds - lastSaveRef.current;
        onTimeUpdate(secondsToSave);
      }
    };
  }, []);

  return {
    isRunning,
    sessionSeconds,
    start,
    pause,
    reset,
    toggle,
  };
}
