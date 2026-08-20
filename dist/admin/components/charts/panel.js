import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Box, Text } from "@adminjs/design-system";
const Panel = ({ title, subtitle, children, }) => (_jsxs(Box, { bg: "container", color: "text", p: "xl", border: "1px solid", borderColor: "border", style: { borderRadius: "10px", minWidth: 0 }, children: [_jsx(Text, { color: "text", style: { fontSize: "14px", fontWeight: 600 }, children: title }), subtitle ? (_jsx(Text, { color: "grey60", style: { fontSize: "12px", marginTop: "2px" }, children: subtitle })) : null, _jsx(Box, { mt: "lg", children: children })] }));
export default Panel;
