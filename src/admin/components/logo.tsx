import React from "react";
import * as styledComponents from "@adminjs/design-system/styled-components";

// The subpath re-exports styled-components, whose vendored typings omit
// useTheme even though the runtime provides it.
const useTheme = (
  styledComponents as unknown as { useTheme: () => { colors?: Record<string, string> } }
).useTheme;

/**
 * The supplied artwork is dark navy on white. On a dark panel that wordmark
 * disappears, so we ship a lifted variant and pick by the surface luminance of
 * the active theme rather than hardcoding one.
 */
const luminance = (hex?: string): number => {
  if (!hex) return 1;
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) return 1;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const useIsDarkSurface = (): boolean => {
  const theme = useTheme();
  return luminance(theme?.colors?.container) < 0.5;
};

const Logo: React.FC<{ width: number; variant?: "full" | "mark" }> = ({
  width,
  variant = "full",
}) => {
  const dark = useIsDarkSurface();
  const base = variant === "mark" ? "taxchat-mark" : "taxchat-logo";
  return (
    <img
      src={`/public/brand/${base}${dark ? "-dark" : ""}.png`}
      alt="TaxChat"
      style={{ width: `${width}px`, height: "auto", display: "block" }}
    />
  );
};

export default Logo;
