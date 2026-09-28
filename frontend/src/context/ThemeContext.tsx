import React, { createContext, useContext, useState } from "react";
import {
  isThemeName,
  type ThemeName,
} from "@/context/theme";

type ThemeContextType = {
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const savedTheme = localStorage.getItem("theme");
    return isThemeName(savedTheme) ? savedTheme : "light";
  });

  const changeTheme = (name: ThemeName) => {
    setTheme(name);
    localStorage.setItem("theme", name);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);