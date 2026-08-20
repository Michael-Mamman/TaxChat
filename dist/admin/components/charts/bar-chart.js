import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from "react";
import { useIsDarkSurface } from "../logo.js";
import { paletteFor } from "./theme.js";
import { useElementWidth } from "./use-width.js";
import Empty from "./empty.js";
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
const BarChart = ({ data, ordinal = false }) => {
    const palette = paletteFor(useIsDarkSurface());
    const { ref, width } = useElementWidth();
    const [hover, setHover] = useState(null);
    if (!data.length || data.every((d) => d.value === 0)) {
        return (_jsx("div", { ref: ref, children: _jsx(Empty, { height: 140 }) }));
    }
    const max = Math.max(...data.map((d) => d.value), 1);
    const height = data.length * ROW_H + Math.max(0, data.length - 1) * GAP;
    const total = data.reduce((s, d) => s + d.value, 0);
    const valueW = 8 + String(max.toLocaleString()).length * 8;
    const trackW = Math.max(40, width - LABEL_W - valueW - VALUE_PAD);
    return (_jsx("div", { ref: ref, style: { width: "100%" }, children: _jsx("svg", { width: width, height: height, role: "img", "aria-label": `Bar chart, ${data.length} categories`, children: data.map((d, i) => {
                const y = i * (ROW_H + GAP);
                const w = d.value > 0 ? Math.max(3, (d.value / max) * trackW) : 0;
                const fill = ordinal
                    ? palette.ramp[Math.min(i, palette.ramp.length - 1)]
                    : palette.series;
                const share = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (_jsxs("g", { onMouseEnter: () => setHover(i), onMouseLeave: () => setHover(null), children: [_jsx("title", { children: `${d.label}: ${d.value.toLocaleString()} (${share}%)` }), _jsx("rect", { x: 0, y: y, width: width, height: ROW_H, rx: 4, fill: hover === i ? palette.grid : "transparent" }), _jsx("text", { x: 0, y: y + ROW_H / 2 + 4, fill: palette.muted, style: { fontSize: "12px" }, children: d.label.length > 19 ? `${d.label.slice(0, 18)}…` : d.label }), _jsx("rect", { x: LABEL_W, y: y + 7, width: w, height: ROW_H - 14, rx: 4, fill: fill }), _jsx("text", { x: LABEL_W + w + VALUE_PAD, y: y + ROW_H / 2 + 4, fill: palette.ink, style: { fontSize: "12px", fontVariantNumeric: "tabular-nums" }, children: d.value.toLocaleString() })] }, d.label));
            }) }) }));
};
export default BarChart;
