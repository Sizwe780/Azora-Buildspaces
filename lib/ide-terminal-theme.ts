/**
 * Shared terminal color theme for all terminal instances.
 * Uses CSS custom properties where possible for runtime theming.
 * ANSI palette colors remain static as xterm.js requires concrete values.
 */
export const terminalTheme = {
  background: "#09090b",
  foreground: "#fafafa",
  cursor: "#22d3ee",
  cursorAccent: "#09090b",
  selectionBackground: "#27272a",
  selectionForeground: "#fafafa",
  black: "#09090b",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
  magenta: "#d946ef",
  cyan: "#06b6d4",
  white: "#fafafa",
  brightBlack: "#52525b",
  brightRed: "#f87171",
  brightGreen: "#4ade80",
  brightYellow: "#facc15",
  brightBlue: "#60a5fa",
  brightMagenta: "#e879f9",
  brightCyan: "#22d3ee",
  brightWhite: "#ffffff",
} as const
