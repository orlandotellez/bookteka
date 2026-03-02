import { useState, useEffect, useCallback, useRef } from "react";

interface UseReadingTimerProps {
  onTimeUpdate?: (seconds: number) => void;
  saveInterval?: number; // Segundos entre guardados
}

/**
 * Hook para el temporizador de lectura
 * Implementa un sistema de guardado robusto para evitar duplicados
 */
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
  
  // Mantener actualizada la referencia al callback
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  // Función para guardar tiempo - solo se ejecuta una vez por período
  const saveTime = useCallback(() => {
    // Evitar guardado múltiple en el mismo ciclo
    if (isSavedRef.current) return;
    
    const currentOnTimeUpdate = onTimeUpdateRef.current;
    if (sessionSeconds > lastSaveRef.current && currentOnTimeUpdate) {
      const secondsToSave = sessionSeconds - lastSaveRef.current;
      
      if (secondsToSave > 0) {
        isSavedRef.current = true;
        currentOnTimeUpdate(secondsToSave);
        lastSaveRef.current = sessionSeconds;
        
        // Resetear el flag después de un pequeño delay
        setTimeout(() => {
          isSavedRef.current = false;
        }, 100);
      }
    }
  }, [sessionSeconds]);

  // Iniciar el temporizador
  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  // Pausar el temporizador y guardar inmediatamente
  const pause = useCallback(() => {
    setIsRunning(false);
    saveTime();
  }, [saveTime]);

  // Resetear la sesión
  const reset = useCallback(() => {
    saveTime();
    setIsRunning(false);
    setSessionSeconds(0);
    lastSaveRef.current = 0;
  }, [saveTime]);

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

  // Efecto para guardado periódico - usa setInterval independiente
  useEffect(() => {
    if (!isRunning || !onTimeUpdateRef.current) return;
    
    const saveIntervalId = setInterval(() => {
      setSessionSeconds((current) => {
        const secondsToSave = current - lastSaveRef.current;
        
        if (secondsToSave > 0 && !isSavedRef.current) {
          isSavedRef.current = true;
          onTimeUpdateRef.current!(secondsToSave);
          lastSaveRef.current = current;
          
          setTimeout(() => {
            isSavedRef.current = false;
          }, 100);
        }
        
        return current;
      });
    }, saveInterval * 1000);

    return () => clearInterval(saveIntervalId);
  }, [isRunning, saveInterval]);

  // Guardar al desmontar el componente - usa refs para evitar dependencias problemáticas
  useEffect(() => {
    const currentSessionSeconds = sessionSeconds;
    const currentLastSave = lastSaveRef.current;
    const currentCallback = onTimeUpdateRef.current;
    
    return () => {
      if (currentSessionSeconds > currentLastSave && currentCallback) {
        const secondsToSave = currentSessionSeconds - currentLastSave;
        if (secondsToSave > 0) {
          currentCallback(secondsToSave);
        }
      }
    };
  }, []); // Solo se ejecuta al desmontar

  // Guardar cuando el usuario cierra la pestaña/navegador
  useEffect(() => {
    const handleBeforeUnload = () => {
      const secondsToSave = sessionSeconds - lastSaveRef.current;
      if (secondsToSave > 0 && onTimeUpdateRef.current) {
        onTimeUpdateRef.current(secondsToSave);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []); // Solo se ejecuta al montar/desmontar

  return {
    isRunning,
    sessionSeconds,
    start,
    pause,
    reset,
    toggle,
  };
}
