import React, { useState } from "react";
import { useIsDarkSurface } from "../logo.js";
import { paletteFor } from "./theme.js";
import { useElementWidth } from "./use-width.js";
import Empty from "./empty.js";
import type { DayPoint } from "../../dashboard/stats-types.js";

const H = 190;
const PAD = { top: 12, right: 12, bottom: 26, left: 34 };

const fmtDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/** Single series over time, so one hue and no legend - the panel title names it. */
const AreaChart: React.FC<{ data: DayPoint[] }> = ({ data }) => {
  const palette = paletteFor(useIsDarkSurface());
  const { ref, width } = useElementWidth();
  const [hover, setHover] = useState<number | null>(null);

  if (!data.length) {
    return (
      <div ref={ref}>
        <Empty height={H} />
      </div>
    );
  }

  const plotW = Math.max(60, width - PAD.left - PAD.right);
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  // A "nice" top tick beats an axis that reads 1,247.
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step || 1;

  const x = (i: number) => PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${PAD.top + plotH} L${x(0).toFixed(1)},${PAD.top + plotH} Z`;
  const gid = "taxchat-area-fill";

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = e.clientX - box.left - PAD.left;
    const i = Math.round((rel / plotW) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  const point = hover !== null ? data[hover] : undefined;

  return (
    <div ref={ref} style={{ width: "100%", position: "relative" }}>
      <svg
        width={width}
        height={H}
        role="img"
        aria-label="Daily activity over the last 14 days"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.series} stopOpacity="0.28" />
            <stop offset="100%" stopColor={palette.series} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, top / 2, top].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={PAD.left + plotW} y1={y(v)} y2={y(v)} stroke={palette.grid} strokeWidth="1" />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fill={palette.muted}
              style={{ fontSize: "10px", fontVariantNumeric: "tabular-nums" }}>
              {v >= 1000 ? `${Math.round(v / 1000)}k` : v}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={palette.series} strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />

        {data.map((d, i) =>
          i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2) ? (
            <text key={d.date} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              fill={palette.muted} style={{ fontSize: "10px" }}>
              {fmtDay(d.date)}
            </text>
          ) : null,
        )}

        {(() => {
          // Direct-label the extreme: the peak should not be tooltip-gated.
          const peakIdx = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? 0) ? i : best), 0);
          const peak = data[peakIdx];
          if (!peak || peak.value === 0 || hover !== null) return null;
          const px = x(peakIdx);
          return (
            <g>
              <circle cx={px} cy={y(peak.value)} r="3.5" fill={palette.series} />
              <text
                x={Math.min(Math.max(px, PAD.left + 14), PAD.left + plotW - 14)}
                y={y(peak.value) - 10}
                textAnchor="middle"
                fill={palette.ink}
                style={{ fontSize: "11px", fontVariantNumeric: "tabular-nums" }}
              >
                {peak.value.toLocaleString()}
              </text>
            </g>
          );
        })()}

        {hover !== null && point ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke={palette.axis} strokeWidth="1" />
            <circle cx={x(hover)} cy={y(point.value)} r="4.5" fill={palette.series}
              stroke={palette.surface} strokeWidth="2" />
          </g>
        ) : null}
      </svg>

      {hover !== null && point ? (
        <div
          style={{
            position: "absolute",
            left: `${Math.min(Math.max(x(hover) - 60, 0), Math.max(0, width - 120))}px`,
            top: "0px",
            width: "120px",
            pointerEvents: "none",
            background: palette.surface,
            border: `1px solid ${palette.grid}`,
            borderRadius: "6px",
            padding: "6px 8px",
            textAlign: "center",
          }}
        >
          <div style={{ color: palette.muted, fontSize: "11px" }}>{fmtDay(point.date)}</div>
          <div style={{ color: palette.ink, fontSize: "14px", fontVariantNumeric: "tabular-nums" }}>
            {point.value.toLocaleString()}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AreaChart;
