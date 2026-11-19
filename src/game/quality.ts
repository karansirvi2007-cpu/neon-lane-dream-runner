export type GraphicsQuality = "low" | "high";
export const GRAPHICS = {
  low: { dpr: 1, shadows: false, shadowSize: 512, particles: false },
  high: { dpr: 1.5, shadows: true, shadowSize: 1024, particles: true },
} as const;