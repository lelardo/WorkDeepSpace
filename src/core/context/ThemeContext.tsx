// src/core/context/ThemeContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';

interface ThemeCtx {
  dark: boolean;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <Ctx.Provider value={{ dark, toggle: () => setDark(p => !p) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);