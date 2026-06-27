// ─────────────────────────────────────────────────────────────────────────────
// THEME SYSTEM — client-side, persisted in localStorage.
//
// Each theme maps to a `[data-theme="…"]` block in globals.css that overrides the
// base CSS variables. "default" matches no selector on purpose, so the base
// @theme tokens (champagne gold on emerald) apply. Selection is stored per-device
// in localStorage and applied before paint by the inline script in layout.js, so
// there's no flash of the wrong theme on load.
// ─────────────────────────────────────────────────────────────────────────────

export const THEME_STORAGE_KEY = "ugcast-theme";
export const DEFAULT_THEME = "default";

// `page` / `primary` are just swatch colors for the picker UI — they mirror the
// surface + accent of each theme block in globals.css.
export const THEMES = [
  { id: "default", name: "Champagne", page: "#0a130d", primary: "#d3b969" },
  { id: "emerald", name: "Emerald", page: "#021410", primary: "#10b981" },
  { id: "cyberpunk", name: "Cyberpunk", page: "#05010a", primary: "#f43f5e" },
  { id: "sunset", name: "Sunset", page: "#140800", primary: "#f97316" },
  { id: "midnight", name: "Midnight", page: "#000000", primary: "#ffffff" },
];

// Event used to notify same-tab subscribers (the native `storage` event only
// fires in *other* tabs).
const THEME_EVENT = "ugcast-theme-change";

// Apply a theme to the document immediately (no persistence).
export function applyTheme(id) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", id || DEFAULT_THEME);
}

// Set + persist a theme and notify subscribers.
export function setTheme(id) {
  applyTheme(id);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // localStorage unavailable (private mode / SSR) — theme still applies for the session.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(THEME_EVENT));
  }
}

// ── useSyncExternalStore plumbing (avoids setState-in-effect) ────────────────
export function subscribeTheme(callback) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getThemeSnapshot() {
  return document.documentElement.getAttribute("data-theme") || DEFAULT_THEME;
}

export function getThemeServerSnapshot() {
  return DEFAULT_THEME;
}
