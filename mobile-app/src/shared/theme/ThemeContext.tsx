import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import * as SecureStore from "expo-secure-store"

import type { ThemeName, ThemeTokens } from "./theme"
import { themes, getDefaultThemeName } from "./theme"

const STORAGE_KEY = "bookteka-theme"

interface ThemeContextType {
  themeName: ThemeName
  theme: ThemeTokens
  setTheme: (name: ThemeName) => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | null>(null)

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<ThemeName>(getDefaultThemeName)
  const [theme, setThemeTokens] = useState<ThemeTokens>(() => themes[getDefaultThemeName()])

  // Load saved theme on mount
  useEffect(() => {
    ; (async () => {
      try {
        const saved = await SecureStore.getItemAsync(STORAGE_KEY)
        if (saved && saved in themes) {
          const name = saved as ThemeName
          setThemeName(name)
          setThemeTokens(themes[name])
        }
      } catch (err) {
        console.warn("Failed to load saved theme:", err)
      }
    })()
  }, [])

  const setTheme = useCallback(async (name: ThemeName) => {
    setThemeName(name)
    setThemeTokens(themes[name])
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, name)
    } catch (err) {
      console.warn("Failed to persist theme:", err)
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ themeName, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider")
  }
  return context
}
