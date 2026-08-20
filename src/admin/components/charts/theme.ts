/**
 * Chart palette. The green ramp and the two series steps were run through the
 * dataviz validator against the panel's real surfaces (#FFFFFF light,
 * #1A1A1E dark) and pass every check - ordinal monotonicity, adjacent dL,
 * light-end contrast, single hue, lightness band and 3:1 contrast.
 * Do not hand-tune these without re-running it.
 */
export type ChartPalette = {
  series: string;
  ramp: string[];
  grid: string;
  axis: string;
  muted: string;
  ink: string;
  surface: string;
};

const LIGHT: ChartPalette = {
  series: "#1B8F4B",
  ramp: ["#6FC08F", "#3EA96A", "#1B8F4B", "#0A6A34"],
  grid: "#E1E0D9",
  axis: "#C3C2B7",
  muted: "#898781",
  ink: "#0B0B0B",
  surface: "#FFFFFF",
};

const DARK: ChartPalette = {
  series: "#35A866",
  ramp: ["#1F7A45", "#2E9E5C", "#46BE77", "#78D79E"],
  grid: "#2C2C2A",
  axis: "#383835",
  muted: "#898781",
  ink: "#FFFFFF",
  surface: "#1A1A1E",
};

export const paletteFor = (dark: boolean): ChartPalette => (dark ? DARK : LIGHT);
