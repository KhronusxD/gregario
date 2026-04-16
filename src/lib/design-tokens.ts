export const colors = {
  forestGreen: "#1A4731",
  actionGreen: "#2D7A4F",
  accentGreen: "#4CAF76",
  surface: "#F8F7F4",
  card: "#FFFFFF",
} as const;

export const fonts = {
  display: "Manrope",
  sans: "Inter",
} as const;

export const radius = {
  sm: "10px",
  md: "16px",
  lg: "20px",
  full: "9999px",
} as const;

export const shadows = {
  card: "0 1px 3px rgba(0, 0, 0, 0.06)",
} as const;

export type ColorToken = keyof typeof colors;
export type RadiusToken = keyof typeof radius;
