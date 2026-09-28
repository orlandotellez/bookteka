export type ThemeName =
  | "light"
  | "dark"
  | "midnight"
  | "sepia"
  | "ocean"
  | "forest";

export const THEMES: ThemeName[] = [
  "light",
  "dark",
  "midnight",
  "sepia",
  "ocean",
  "forest",
];

export const THEME_LABELS: Record<ThemeName, string> = {
  light: "Claro",
  dark: "Oscuro",
  midnight: "Medianoche",
  sepia: "Sepia",
  ocean: "Océano",
  forest: "Bosque",
};

export function isDarkTheme(theme: ThemeName): boolean {
  return theme === "dark" || theme === "midnight";
}

export function isThemeName(value: string | null): value is ThemeName {
  return value !== null && (THEMES as string[]).includes(value);
}