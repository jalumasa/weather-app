import React, { createContext, useContext, useEffect, useState } from "react";

/*
  Theme state.

  Three rules, in order:
    1. An explicit choice wins, and persists.
    2. With no choice on record, follow the operating system.
    3. If the OS preference later changes, follow it - but only while the
       reader hasn't chosen for themselves.

  The attribute this writes to <html> is the same one public/index.html sets
  before React boots, so the first paint is already the right colour.
*/

const STORAGE_KEY = "raincoat-theme";
const ThemeContext = createContext(null);

const systemTheme = () =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

const storedTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch (error) {
    // Private mode and blocked storage both throw; fall back to the system.
    return null;
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => storedTheme() || systemTheme());
  const [isExplicit, setIsExplicit] = useState(() => storedTheme() !== null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    // Lets the browser paint form controls and scrollbars to match.
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    if (isExplicit) return undefined;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const followSystem = (event) => setTheme(event.matches ? "light" : "dark");
    query.addEventListener("change", followSystem);
    return () => query.removeEventListener("change", followSystem);
  }, [isExplicit]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setIsExplicit(true);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      // A theme that doesn't survive a reload still beats a crash.
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return context;
}
