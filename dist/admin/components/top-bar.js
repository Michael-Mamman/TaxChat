import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Box, Icon, cssClass } from "@adminjs/design-system";
import { styled } from "@adminjs/design-system/styled-components";
import { useSelector } from "react-redux";
import * as AdminJS from "adminjs";
import ThemeToggle from "./theme-toggle.js";
const NavBar = styled(Box) `
  height: ${({ theme }) => theme.sizes["navbarHeight"]};
  border-bottom: ${({ theme }) => theme.borders["default"]};
  background: ${({ theme }) => theme.colors["container"]};
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  align-items: center;
`;
NavBar.defaultProps = { className: cssClass("NavBar") };
// Both are exported on the AdminJS global but absent from its typings.
const { LoggedIn, Version } = AdminJS;
const TopBar = ({ toggleSidebar }) => {
    const session = useSelector((state) => state.session);
    const paths = useSelector((state) => state.paths);
    const versions = useSelector((state) => state.versions);
    return (_jsxs(NavBar, { "data-css": "topbar", children: [_jsx(Box, { py: "lg", px: ["default", "lg"], onClick: toggleSidebar, display: ["block", "block", "block", "block", "none"], style: { cursor: "pointer" }, children: _jsx(Icon, { icon: "Menu", size: 24 }) }), Version ? _jsx(Version, { versions: versions }) : _jsx(Box, { flexGrow: 1 }), _jsx(ThemeToggle, {}), session && session.email && LoggedIn ? _jsx(LoggedIn, { session: session, paths: paths }) : null] }));
};
export default TopBar;
