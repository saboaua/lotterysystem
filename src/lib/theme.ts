/** Preset accent themes for back office + login chrome. */

export type ThemePresetId =
  | "violet"
  | "indigo"
  | "emerald"
  | "sky"
  | "rose"
  | "amber"
  | "slate";

export type ThemePreset = {
  id: ThemePresetId;
  label: string;
  /** Primary button / active tab */
  primary: string;
  primaryHover: string;
  /** Soft panel background */
  soft: string;
  /** Ring / focus */
  ring: string;
  /** CSS vars applied to :root */
  vars: Record<string, string>;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "violet",
    label: "Violet",
    primary: "#7c3aed",
    primaryHover: "#6d28d9",
    soft: "#f5f3ff",
    ring: "#8b5cf6",
    vars: {
      "--accent": "#7c3aed",
      "--accent-hover": "#6d28d9",
      "--accent-soft": "#f5f3ff",
      "--accent-ring": "#8b5cf6",
    },
  },
  {
    id: "indigo",
    label: "Indigo",
    primary: "#4f46e5",
    primaryHover: "#4338ca",
    soft: "#eef2ff",
    ring: "#6366f1",
    vars: {
      "--accent": "#4f46e5",
      "--accent-hover": "#4338ca",
      "--accent-soft": "#eef2ff",
      "--accent-ring": "#6366f1",
    },
  },
  {
    id: "emerald",
    label: "Emerald",
    primary: "#059669",
    primaryHover: "#047857",
    soft: "#ecfdf5",
    ring: "#10b981",
    vars: {
      "--accent": "#059669",
      "--accent-hover": "#047857",
      "--accent-soft": "#ecfdf5",
      "--accent-ring": "#10b981",
    },
  },
  {
    id: "sky",
    label: "Sky",
    primary: "#0284c7",
    primaryHover: "#0369a1",
    soft: "#f0f9ff",
    ring: "#0ea5e9",
    vars: {
      "--accent": "#0284c7",
      "--accent-hover": "#0369a1",
      "--accent-soft": "#f0f9ff",
      "--accent-ring": "#0ea5e9",
    },
  },
  {
    id: "rose",
    label: "Rose",
    primary: "#e11d48",
    primaryHover: "#be123c",
    soft: "#fff1f2",
    ring: "#f43f5e",
    vars: {
      "--accent": "#e11d48",
      "--accent-hover": "#be123c",
      "--accent-soft": "#fff1f2",
      "--accent-ring": "#f43f5e",
    },
  },
  {
    id: "amber",
    label: "Amber",
    primary: "#d97706",
    primaryHover: "#b45309",
    soft: "#fffbeb",
    ring: "#f59e0b",
    vars: {
      "--accent": "#d97706",
      "--accent-hover": "#b45309",
      "--accent-soft": "#fffbeb",
      "--accent-ring": "#f59e0b",
    },
  },
  {
    id: "slate",
    label: "Slate",
    primary: "#334155",
    primaryHover: "#1e293b",
    soft: "#f8fafc",
    ring: "#64748b",
    vars: {
      "--accent": "#334155",
      "--accent-hover": "#1e293b",
      "--accent-soft": "#f8fafc",
      "--accent-ring": "#64748b",
    },
  },
];

export function getThemePreset(id?: string | null): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === id) || THEME_PRESETS[0];
}

/** Apply preset CSS variables on documentElement (client only). */
export function applyThemePreset(id?: string | null) {
  if (typeof document === "undefined") return;
  const preset = getThemePreset(id);
  const root = document.documentElement;
  Object.entries(preset.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.dataset.theme = preset.id;
}
