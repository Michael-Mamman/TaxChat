import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import { Box, Text } from "@adminjs/design-system";
/** Charts on a fresh deployment routinely have nothing to draw - say so. */
const Empty = ({ height, message }) => (_jsx(Box, { style: { height: `${height}px`, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Text, { color: "grey60", style: { fontSize: "13px" }, children: message ?? "No data yet" }) }));
export default Empty;
