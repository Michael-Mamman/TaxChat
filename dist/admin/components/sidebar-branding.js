import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import { Box } from "@adminjs/design-system";
import { Link } from "react-router-dom";
import Logo from "./logo.js";
/**
 * Replaces the stock sidebar header, which renders the AdminJS logotype.
 */
const SidebarBranding = () => (_jsx(Box, { p: "xl", style: { flexShrink: 0 }, children: _jsx(Link, { to: "/admin", style: { display: "block", textDecoration: "none" }, children: _jsx(Logo, { width: 150 }) }) }));
export default SidebarBranding;
