// Non-secret, localStorage-backed app settings: which provider/model to
// extract with, an optional custom base URL (for OpenAI-compatible /
// local-model use), and the light/dark theme. The API key itself is
// never stored here -- it stays in-memory only (React state in
// App.jsx), matching the app's existing "never persisted" stance.

const STORAGE_KEY = "skein-settings";

export const DEFAULT_SETTINGS = {
  provider: "anthropic", // "anthropic" | "openai-compatible" | "webllm"
  model: "",
  baseUrl: "",
  theme: "dark", // "dark" | "light"
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}
