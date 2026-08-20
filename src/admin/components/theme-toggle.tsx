import React, { useState } from "react";
import { Box, Icon } from "@adminjs/design-system";
import { useSelector } from "react-redux";
import { useIsDarkSurface } from "./logo.js";

/**
 * AdminJS binds its ThemeProvider to `window.THEME` at bundle load, so the
 * theme cannot be swapped in place. The choice is saved against the session and
 * the page reloaded, which is why this shows a pending state while it saves.
 *
 * The current mode is read from the active theme's own surface rather than from
 * a theme id, so a renamed or custom theme still toggles the right way.
 */
const ThemeToggle: React.FC = () => {
  const isDark = useIsDarkSurface();
  const [busy, setBusy] = useState(false);
  const rootPath = useSelector(
    (state: { paths?: { rootPath?: string } }) => state.paths?.rootPath ?? "/admin",
  );

  const target = isDark ? "light" : "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${rootPath}/set-theme?theme=${encodeURIComponent(target)}`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(String(res.status));
      window.location.reload();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={busy}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "36px",
        height: "36px",
        marginRight: "8px",
        borderRadius: "8px",
        border: "none",
        background: "transparent",
        color: "inherit",
        cursor: busy ? "progress" : "pointer",
        opacity: busy ? 0.5 : 1,
      }}
    >
      <Icon icon={isDark ? "Sun" : "Moon"} size={18} />
    </Box>
  );
};

export default ThemeToggle;
