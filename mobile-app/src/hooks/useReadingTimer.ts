import { useState, useRef, useEffect, useCallback } from "react"
import { AppState, type AppStateStatus } from "react-native"

export interface UseReadingTimerProps {
  /** Called with delta seconds to save (called periodically + on pause + on background) */
  onTimeUpdate?: (seconds: number) => void
  /** Interval for periodic saves in seconds (default 30) */
  saveInterval?: number
}

export function useReadingTimer({
  onTimeUpdate,
  saveInterval = 30,
}: UseReadingTimerProps = {}) {
  const [isRunning, setIsRunning] = useState(false)
  const [sessionSeconds, setSessionSeconds] = useState(0)

  // Refs to avoid stale closures in intervals
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const sessionSecondsRef = useRef(0)
  const lastSaveRef = useRef(0)
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSavedRef = useRef(false)

  // Keep callback ref in sync
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate
  }, [onTimeUpdate])

  // Keep sessionSeconds ref in sync
  useEffect(() => {
    sessionSecondsRef.current = sessionSeconds
  }, [sessionSeconds])

  /**
   * Save accumulated time delta since last save.
   * Uses a guard to prevent duplicate saves within the same cycle.
   */
  const saveTime = useCallback(() => {
    if (isSavedRef.current) return

    const currentOnTimeUpdate = onTimeUpdateRef.current
    const currentSeconds = sessionSecondsRef.current

    if (currentSeconds > lastSaveRef.current && currentOnTimeUpdate) {
      const secondsToSave = currentSeconds - lastSaveRef.current
      if (secondsToSave > 0) {
        isSavedRef.current = true
        currentOnTimeUpdate(secondsToSave)
        lastSaveRef.current = currentSeconds
        // Release guard after a small delay
        setTimeout(() => {
          isSavedRef.current = false
        }, 100)
      }
    }
  }, [])

  // ── Tick interval (1s) ──────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      tickIntervalRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current)
        tickIntervalRef.current = null
      }
    }

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current)
        tickIntervalRef.current = null
      }
    }
  }, [isRunning])

  // ── Save interval (30s) ────────────────────────────────────
  useEffect(() => {
    if (!isRunning || !onTimeUpdateRef.current) return

    saveIntervalRef.current = setInterval(() => {
      // Read fresh value inside the interval
      const currentSeconds = sessionSecondsRef.current
      const secondsToSave = currentSeconds - lastSaveRef.current

      if (secondsToSave > 0 && !isSavedRef.current) {
        isSavedRef.current = true
        onTimeUpdateRef.current!(secondsToSave)
        lastSaveRef.current = currentSeconds
        setTimeout(() => {
          isSavedRef.current = false
        }, 100)
      }
    }, saveInterval * 1000)

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current)
        saveIntervalRef.current = null
      }
    }
  }, [isRunning, saveInterval])

  // ── AppState listener (save on background) ──────────────────
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        // Save accumulated time when app goes to background
        const currentSeconds = sessionSecondsRef.current
        const secondsToSave = currentSeconds - lastSaveRef.current
        if (secondsToSave > 0 && onTimeUpdateRef.current) {
          onTimeUpdateRef.current(secondsToSave)
          lastSaveRef.current = currentSeconds
        }
      }
    }

    const subscription = AppState.addEventListener("change", handleAppStateChange)
    return () => subscription.remove()
  }, [])

  // ── Save on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      const currentSeconds = sessionSecondsRef.current
      const secondsToSave = currentSeconds - lastSaveRef.current
      if (secondsToSave > 0 && onTimeUpdateRef.current) {
        onTimeUpdateRef.current(secondsToSave)
      }
    }
  }, [])

  // ── Controls ────────────────────────────────────────────────
  const start = useCallback(() => {
    setIsRunning(true)
  }, [])

  const pause = useCallback(() => {
    setIsRunning(false)
    saveTime()
  }, [saveTime])

  const reset = useCallback(() => {
    saveTime()
    setIsRunning(false)
    setSessionSeconds(0)
    lastSaveRef.current = 0
  }, [saveTime])

  const toggle = useCallback(() => {
    if (isRunning) {
      pause()
    } else {
      start()
    }
  }, [isRunning, pause, start])

  return {
    isRunning,
    sessionSeconds,
    start,
    pause,
    reset,
    toggle,
  }
}
