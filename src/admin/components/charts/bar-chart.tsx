import React, { useState } from "react";
import { useIsDarkSurface } from "../logo.js";
import { paletteFor } from "./theme.js";
import { useElementWidth } from "./use-width.js";
import Empty from "./empty.js";
import type { Slice } from "../../dashboard/stats-types.js";

const ROW_H = 30;
const GAP = 8;
const LABEL_W = 136;
const VALUE_PAD = 8;

/**
 * Horizontal bars: the job is magnitude, so one hue and length carries the
 * value. `ordinal` switches to the validated 4-step ramp for scales that are
 * genuinely ordered (auth tiers) rather than ranked by size. Every bar is
 * direct-labelled, so nothing rests on colour alone.
 */
const BarChart: React.FC<{ data: Slice[]; ordinal?: boolean }> = ({ data, ordinal = false }) => {
  const palette = paletteFor(useIsDarkSurface());
  const { ref, width } = useElementWidth();
  const [hover, setHover] = useState<number | null>(null);

  if (!data.length || data.every((d) => d.value === 0)) {
    return (
      <div ref={ref}>
        <Empty height={140} />
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const height = data.length * ROW_H + Math.max(0, data.length - 1) * GAP;
  const total = data.reduce((s, d) => s + d.value, 0);
  const valueW = 8 + String(max.toLocaleString()).length * 8;
  const trackW = Math.max(40, width - LABEL_W - valueW - VALUE_PAD);

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={width} height={height} role="img" aria-label={`Bar chart, ${data.length} categories`}>
        {data.map((d, i) => {
          const y = i * (ROW_H + GAP);
          const w = d.value > 0 ? Math.max(3, (d.value / max) * trackW) : 0;
          const fill = ordinal
            ? (palette.ramp[Math.min(i, palette.ramp.length - 1)] as string)
            : palette.series;
          const share = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <g
              key={d.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${d.label}: ${d.value.toLocaleString()} (${share}%)`}</title>
              <rect
                x={0}
                y={y}
                width={width}
                height={ROW_H}
                rx={4}
                fill={hover === i ? palette.grid : "transparent"}
              />
              <text x={0} y={y + ROW_H / 2 + 4} fill={palette.muted} style={{ fontSize: "12px" }}>
                {d.label.length > 19 ? `${d.label.slice(0, 18)}…` : d.label}
              </text>
              <rect x={LABEL_W} y={y + 7} width={w} height={ROW_H - 14} rx={4} fill={fill} />
              <text
                x={LABEL_W + w + VALUE_PAD}
                y={y + ROW_H / 2 + 4}
                fill={palette.ink}
                style={{ fontSize: "12px", fontVariantNumeric: "tabular-nums" }}
              >
                {d.value.toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default BarChart;
