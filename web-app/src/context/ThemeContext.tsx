import { createContext, useContext, useState, useEffect } from "react";

export type ThemeName = "light" | "dark" | "midnight" | "sepia" | "ocean" | "forest";

type ThemeContextType = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: ThemeInfo[];
};

export interface ThemeInfo {
  id: ThemeName;
  name: string;
  icon: string;
  colors: {
    primary: string;
    secondary: string;
  };
}

export const themes: ThemeInfo[] = [
  {
    id: "light",
    name: "Claro",
    icon: "☀️",
    colors: { primary: "#fcf5ee", secondary: "#df8052" },
  },
  {
    id: "dark",
    name: "Oscuro",
    icon: "🌙",
    colors: { primary: "#1c1a16", secondary: "#df8052" },
  },
  {
    id: "midnight",
    name: "Medianoche",
    icon: "✨",
    colors: { primary: "#000000", secondary: "#1a1a1a" },
  },
  {
    id: "sepia",
    name: "Sepia",
    icon: "📜",
    colors: { primary: "#f4ecd8", secondary: "#8b6914" },
  },
  {
    id: "ocean",
    name: "Océano",
    icon: "🌊",
    colors: { primary: "#e0f2fe", secondary: "#0284c7" },
  },
  {
    id: "forest",
    name: "Bosque",
    icon: "🌲",
    colors: { primary: "#ecfdf5", secondary: "#059669" },
  },
];

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeName>("light");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as ThemeName) || "light";
    setThemeState(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
