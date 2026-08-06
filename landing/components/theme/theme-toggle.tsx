"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      aria-pressed={isDark}
      suppressHydrationWarning
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-2 transition-colors hover:border-border-strong hover:text-ink-1 hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent ${className}`}
    >
      <Sun className="h-4 w-4 scale-100 dark:scale-0 transition-transform duration-300" aria-hidden />
      <Moon className="absolute h-4 w-4 scale-0 dark:scale-100 transition-transform duration-300" aria-hidden />
    </button>
  );
}
