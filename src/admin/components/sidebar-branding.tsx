import React from "react";
import { Box } from "@adminjs/design-system";
import { Link } from "react-router-dom";
import Logo from "./logo.js";

/**
 * Replaces the stock sidebar header, which renders the AdminJS logotype.
 */
const SidebarBranding: React.FC = () => (
  <Box p="xl" style={{ flexShrink: 0 }}>
    <Link to="/admin" style={{ display: "block", textDecoration: "none" }}>
      <Logo width={150} />
    </Link>
  </Box>
);

export default SidebarBranding;
