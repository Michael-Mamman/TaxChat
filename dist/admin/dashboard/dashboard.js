import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Box, H2, Text } from "@adminjs/design-system";
const Dashboard = () => {
    return (_jsx(Box, { variant: "grey", children: _jsxs(Box, { variant: "white", p: "xl", m: "xl", style: { borderRadius: "8px" }, children: [_jsx(H2, { children: "NRS TaxChat Admin" }), _jsx(Text, { mt: "default", children: "Welcome to the NRS TaxChat administration panel. Use the sidebar to manage taxpayers, service requests, notifications, and audit logs." })] }) }));
};
export default Dashboard;
