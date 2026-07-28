import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

type ThemeCtx = {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
};

const Ctx = createContext<ThemeCtx>({ mode: "dark", resolved: "dark", setMode: () => {} });
const STORAGE_KEY = "miq-theme";

function systemPrefersDark() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored) setModeState(stored);
  }, []);

  useEffect(() => {
    const apply = () => {
      const next = mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;
      setResolved(next);
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.style.colorScheme = next;
    };
    apply();
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [mode]);

  const value = useMemo<ThemeCtx>(
    () => ({
      mode,
      resolved,
      setMode: (m) => {
        setModeState(m);
        window.localStorage.setItem(STORAGE_KEY, m);
      },
    }),
    [mode, resolved],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
