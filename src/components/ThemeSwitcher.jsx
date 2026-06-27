"use client";

import { useSyncExternalStore } from "react";
import { FiCheck } from "react-icons/fi";
import {
  THEMES, DEFAULT_THEME, setTheme,
  subscribeTheme, getThemeSnapshot, getThemeServerSnapshot,
} from "@/lib/themes";

export default function ThemeSwitcher() {
  const current = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  // Anything not in our list (e.g. the SSR fallback) resolves to the default.
  const active = THEMES.some((t) => t.id === current) ? current : DEFAULT_THEME;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {THEMES.map((theme) => {
        const isActive = theme.id === active;
        return (
          <button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            aria-pressed={isActive}
            className={`group relative rounded-xl border p-3 text-left transition-all ${
              isActive
                ? "border-primary-500/60 glow-primary"
                : "border-glass-border hover:border-primary-500/30"
            }`}
          >
            {/* Swatch preview */}
            <div
              className="h-12 w-full rounded-lg border border-glass-border mb-2.5 overflow-hidden flex items-end p-1.5"
              style={{ background: theme.page }}
            >
              <span className="h-3.5 w-3.5 rounded-full shadow" style={{ background: theme.primary }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">{theme.name}</span>
              {isActive && (
                <span className="flex items-center justify-center h-4 w-4 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-bg-page">
                  <FiCheck className="text-[9px]" />
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
