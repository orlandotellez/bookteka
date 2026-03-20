import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeName = "light" | "dark"

type ThemeContextType = {
  theme: string;
  toggleTheme: () => void;
};

export interface ThemeInfo {
  id: ThemeName;
  name: string;
  icon: React.ReactNode;
  colors: {
    primary: string;
    secondary: string;
  };
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ThemeName>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";

    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    } else {
      setTheme("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
