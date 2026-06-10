/**
 * Theme token definitions for all 6 visual themes.
 * Ported from web-app's CSS custom properties (index.css [data-theme]).
 */

export interface ThemeTokens {
  primary: string
  secondary: string
  third: string
  four: string
  card: string
  altern: string
  alternSecondary: string
  window: string
  preview: string
  fontColorTitle: string
  fontColorText: string
  border: string
  /** Reader-specific defaults (overridable by user preferences) */
  readerFontSize: number
  readerLineHeight: number
  readerFontFamily: string
  readerWidth: number
}

export type ThemeName = "dark" | "light" | "midnight" | "sepia" | "ocean" | "forest"

export const themes: Record<ThemeName, ThemeTokens> = {
  // ── DARK (default) ─────────────────────────────────────
  dark: {
    primary: "#1c1a16",
    secondary: "#df8052",
    third: "#36281f",
    four: "#25211d",
    card: "#231f1a",
    altern: "#332516",
    alternSecondary: "#5a3315",
    window: "#292420",
    preview: "#171412",
    fontColorTitle: "#ebe7e0",
    fontColorText: "#7e7367",
    border: "#3f3831",
    readerFontSize: 18,
    readerLineHeight: 1.7,
    readerFontFamily: "sans",
    readerWidth: 100,
  },

  // ── LIGHT ──────────────────────────────────────────────
  light: {
    primary: "#fcf5ee",
    secondary: "#df8052",
    third: "#f2e4d9",
    four: "#f4f2ec",
    card: "#f7f4ed",
    altern: "#f7ebda",
    alternSecondary: "#f7d1b2",
    window: "#f1eee6",
    preview: "#f6f4ee",
    fontColorTitle: "#38332e",
    fontColorText: "#7e7367",
    border: "#e0dad1",
    readerFontSize: 18,
    readerLineHeight: 1.7,
    readerFontFamily: "sans",
    readerWidth: 100,
  },

  // ── MIDNIGHT (very dark with black tones) ─────────────
  midnight: {
    primary: "#000000",
    secondary: "#1a1a1a",
    third: "#222222",
    four: "#121212",
    card: "#010101",
    altern: "#202020",
    alternSecondary: "#2a2a2a",
    window: "#0d0d0d",
    preview: "#050505",
    fontColorTitle: "#e5e5e5",
    fontColorText: "#a3a3a3",
    border: "#303030",
    readerFontSize: 18,
    readerLineHeight: 1.7,
    readerFontFamily: "sans",
    readerWidth: 100,
  },

  // ── SEPIA (warm reading) ──────────────────────────────
  sepia: {
    primary: "#f4ecd8",
    secondary: "#8b6914",
    third: "#e8dfc4",
    four: "#f0e6cf",
    card: "#ebe2cf",
    altern: "#e3d6b8",
    alternSecondary: "#c9a227",
    window: "#faf6ed",
    preview: "#f5ebd6",
    fontColorTitle: "#3d3426",
    fontColorText: "#6b5c42",
    border: "#d4c4a8",
    readerFontSize: 18,
    readerLineHeight: 1.7,
    readerFontFamily: "sans",
    readerWidth: 100,
  },

  // ── OCEAN (cool blues) ────────────────────────────────
  ocean: {
    primary: "#e0f2fe",
    secondary: "#0284c7",
    third: "#bae6fd",
    four: "#f0f9ff",
    card: "#e0f2fe",
    altern: "#7dd3fc",
    alternSecondary: "#0369a1",
    window: "#f0f9ff",
    preview: "#e0f2fe",
    fontColorTitle: "#0c4a6e",
    fontColorText: "#475569",
    border: "#7dd3fc",
    readerFontSize: 18,
    readerLineHeight: 1.7,
    readerFontFamily: "sans",
    readerWidth: 100,
  },

  // ── FOREST (nature greens) ────────────────────────────
  forest: {
    primary: "#ecfdf5",
    secondary: "#059669",
    third: "#a7f3d0",
    four: "#f0fdf4",
    card: "#d1fae5",
    altern: "#6ee7b7",
    alternSecondary: "#047857",
    window: "#f0fdf4",
    preview: "#ecfdf5",
    fontColorTitle: "#064e3b",
    fontColorText: "#374151",
    border: "#a7f3d0",
    readerFontSize: 18,
    readerLineHeight: 1.7,
    readerFontFamily: "sans",
    readerWidth: 100,
  },
}

/**
 * Get the default theme name based on system preference.
 * Falls back to "dark".
 */
export function getDefaultThemeName(): ThemeName {
  return "dark"
}
