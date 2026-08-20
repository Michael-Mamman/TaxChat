import React from "react";
import { Box, Icon, cssClass } from "@adminjs/design-system";
import { styled } from "@adminjs/design-system/styled-components";
import { useSelector } from "react-redux";
import * as AdminJS from "adminjs";
import ThemeToggle from "./theme-toggle.js";

/**
 * Mirrors the stock top bar, plus the theme toggle.
 * LanguageSelect is dropped deliberately: it renders null unless more than one
 * locale is configured, and this panel only ships `en`.
 */
// The vendored styled-components typings do not infer the theme here.
type Themed = {
  theme: {
    sizes: Record<string, string>;
    borders: Record<string, string>;
    colors: Record<string, string>;
  };
};

const NavBar = styled(Box)`
  height: ${({ theme }: Themed) => theme.sizes["navbarHeight"]};
  border-bottom: ${({ theme }: Themed) => theme.borders["default"]};
  background: ${({ theme }: Themed) => theme.colors["container"]};
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  align-items: center;
`;
NavBar.defaultProps = { className: cssClass("NavBar") };

// Both are exported on the AdminJS global but absent from its typings.
const { LoggedIn, Version } = AdminJS as unknown as {
  LoggedIn: React.ComponentType<Record<string, unknown>>;
  Version: React.ComponentType<Record<string, unknown>>;
};

type Session = { email?: string } | null;

const TopBar: React.FC<{ toggleSidebar?: () => void }> = ({ toggleSidebar }) => {
  const session = useSelector((state: { session?: Session }) => state.session);
  const paths = useSelector((state: { paths?: unknown }) => state.paths);
  const versions = useSelector((state: { versions?: unknown }) => state.versions);

  return (
    <NavBar data-css="topbar">
      <Box
        py="lg"
        px={["default", "lg"]}
        onClick={toggleSidebar}
        display={["block", "block", "block", "block", "none"]}
        style={{ cursor: "pointer" }}
      >
        <Icon icon="Menu" size={24} />
      </Box>

      {/* Version carries flexGrow:1, so it doubles as the spacer. */}
      {Version ? <Version versions={versions} /> : <Box flexGrow={1} />}

      <ThemeToggle />

      {session && session.email && LoggedIn ? <LoggedIn session={session} paths={paths} /> : null}
    </NavBar>
  );
};

export default TopBar;
