import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Text } from "@adminjs/design-system";
import { useIsDarkSurface } from "../logo.js";
import { paletteFor } from "./theme.js";
import Empty from "./empty.js";
const fmt = (iso) => iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";
const RecentTable = ({ rows }) => {
    const palette = paletteFor(useIsDarkSurface());
    if (!rows.length)
        return _jsx(Empty, { height: 120, message: "No service requests yet" });
    const th = {
        textAlign: "left",
        padding: "6px 10px 10px 0",
        fontSize: "11px",
        fontWeight: 600,
        color: palette.muted,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
    };
    const td = {
        padding: "9px 10px 9px 0",
        fontSize: "13px",
        color: palette.ink,
        borderTop: `1px solid ${palette.grid}`,
        whiteSpace: "nowrap",
    };
    return (_jsxs("div", { style: { overflowX: "auto" }, children: [_jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: th, children: "Reference" }), _jsx("th", { style: th, children: "Type" }), _jsx("th", { style: th, children: "Status" }), _jsx("th", { style: th, children: "Phone" }), _jsx("th", { style: th, children: "Raised" })] }) }), _jsx("tbody", { children: rows.map((r) => (_jsxs("tr", { children: [_jsx("td", { style: td, children: _jsx("a", { href: `/admin/resources/ServiceRequest/records/${r.id}/show`, style: { color: palette.series, textDecoration: "none" }, children: r.reference || "-" }) }), _jsx("td", { style: { ...td, color: palette.muted }, children: r.type }), _jsx("td", { style: td, children: r.status }), _jsx("td", { style: { ...td, fontVariantNumeric: "tabular-nums" }, children: r.phone }), _jsx("td", { style: { ...td, color: palette.muted }, children: fmt(r.createdAt) })] }, r.id))) })] }), _jsx(Text, { color: "grey60", mt: "default", style: { fontSize: "12px" }, children: _jsx("a", { href: "/admin/resources/ServiceRequest", style: { color: palette.series, textDecoration: "none" }, children: "View all service requests \u2192" }) })] }));
};
export default RecentTable;
