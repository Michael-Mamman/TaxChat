import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from "react";
import { useIsDarkSurface } from "../logo.js";
import { paletteFor } from "./theme.js";
import { useElementWidth } from "./use-width.js";
import Empty from "./empty.js";
const H = 190;
const PAD = { top: 12, right: 12, bottom: 26, left: 34 };
const fmtDay = (iso) => {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
/** Single series over time, so one hue and no legend - the panel title names it. */
const AreaChart = ({ data }) => {
    const palette = paletteFor(useIsDarkSurface());
    const { ref, width } = useElementWidth();
    const [hover, setHover] = useState(null);
    if (!data.length) {
        return (_jsx("div", { ref: ref, children: _jsx(Empty, { height: H }) }));
    }
    const plotW = Math.max(60, width - PAD.left - PAD.right);
    const plotH = H - PAD.top - PAD.bottom;
    const max = Math.max(...data.map((d) => d.value), 1);
    // A "nice" top tick beats an axis that reads 1,247.
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    const top = Math.ceil(max / step) * step || 1;
    const x = (i) => PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = (v) => PAD.top + plotH - (v / top) * plotH;
    const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
    const area = `${line} L${x(data.length - 1).toFixed(1)},${PAD.top + plotH} L${x(0).toFixed(1)},${PAD.top + plotH} Z`;
    const gid = "taxchat-area-fill";
    const onMove = (e) => {
        const box = e.currentTarget.getBoundingClientRect();
        const rel = e.clientX - box.left - PAD.left;
        const i = Math.round((rel / plotW) * (data.length - 1));
        setHover(Math.max(0, Math.min(data.length - 1, i)));
    };
    const point = hover !== null ? data[hover] : undefined;
    return (_jsxs("div", { ref: ref, style: { width: "100%", position: "relative" }, children: [_jsxs("svg", { width: width, height: H, role: "img", "aria-label": "Daily activity over the last 14 days", onMouseMove: onMove, onMouseLeave: () => setHover(null), children: [_jsx("defs", { children: _jsxs("linearGradient", { id: gid, x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: palette.series, stopOpacity: "0.28" }), _jsx("stop", { offset: "100%", stopColor: palette.series, stopOpacity: "0.02" })] }) }), [0, top / 2, top].map((v) => (_jsxs("g", { children: [_jsx("line", { x1: PAD.left, x2: PAD.left + plotW, y1: y(v), y2: y(v), stroke: palette.grid, strokeWidth: "1" }), _jsx("text", { x: PAD.left - 8, y: y(v) + 4, textAnchor: "end", fill: palette.muted, style: { fontSize: "10px", fontVariantNumeric: "tabular-nums" }, children: v >= 1000 ? `${Math.round(v / 1000)}k` : v })] }, v))), _jsx("path", { d: area, fill: `url(#${gid})` }), _jsx("path", { d: line, fill: "none", stroke: palette.series, strokeWidth: "2", strokeLinejoin: "round", strokeLinecap: "round" }), data.map((d, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2) ? (_jsx("text", { x: x(i), y: H - 8, textAnchor: i === 0 ? "start" : i === data.length - 1 ? "end" : "middle", fill: palette.muted, style: { fontSize: "10px" }, children: fmtDay(d.date) }, d.date)) : null), (() => {
                        // Direct-label the extreme: the peak should not be tooltip-gated.
                        const peakIdx = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? 0) ? i : best), 0);
                        const peak = data[peakIdx];
                        if (!peak || peak.value === 0 || hover !== null)
                            return null;
                        const px = x(peakIdx);
                        return (_jsxs("g", { children: [_jsx("circle", { cx: px, cy: y(peak.value), r: "3.5", fill: palette.series }), _jsx("text", { x: Math.min(Math.max(px, PAD.left + 14), PAD.left + plotW - 14), y: y(peak.value) - 10, textAnchor: "middle", fill: palette.ink, style: { fontSize: "11px", fontVariantNumeric: "tabular-nums" }, children: peak.value.toLocaleString() })] }));
                    })(), hover !== null && point ? (_jsxs("g", { children: [_jsx("line", { x1: x(hover), x2: x(hover), y1: PAD.top, y2: PAD.top + plotH, stroke: palette.axis, strokeWidth: "1" }), _jsx("circle", { cx: x(hover), cy: y(point.value), r: "4.5", fill: palette.series, stroke: palette.surface, strokeWidth: "2" })] })) : null] }), hover !== null && point ? (_jsxs("div", { style: {
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
                }, children: [_jsx("div", { style: { color: palette.muted, fontSize: "11px" }, children: fmtDay(point.date) }), _jsx("div", { style: { color: palette.ink, fontSize: "14px", fontVariantNumeric: "tabular-nums" }, children: point.value.toLocaleString() })] })) : null] }));
};
export default AreaChart;
