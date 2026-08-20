import React from "react";
import { Text } from "@adminjs/design-system";
import { useIsDarkSurface } from "../logo.js";
import { paletteFor } from "./theme.js";
import Empty from "./empty.js";
import type { RecentRequest } from "../../dashboard/stats-types.js";

const fmt = (iso: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

const RecentTable: React.FC<{ rows: RecentRequest[] }> = ({ rows }) => {
  const palette = paletteFor(useIsDarkSurface());
  if (!rows.length) return <Empty height={120} message="No service requests yet" />;

  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "6px 10px 10px 0",
    fontSize: "11px",
    fontWeight: 600,
    color: palette.muted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "9px 10px 9px 0",
    fontSize: "13px",
    color: palette.ink,
    borderTop: `1px solid ${palette.grid}`,
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Reference</th>
            <th style={th}>Type</th>
            <th style={th}>Status</th>
            <th style={th}>Phone</th>
            <th style={th}>Raised</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={td}>
                <a href={`/admin/resources/ServiceRequest/records/${r.id}/show`}
                   style={{ color: palette.series, textDecoration: "none" }}>
                  {r.reference || "-"}
                </a>
              </td>
              <td style={{ ...td, color: palette.muted }}>{r.type}</td>
              <td style={td}>{r.status}</td>
              <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{r.phone}</td>
              <td style={{ ...td, color: palette.muted }}>{fmt(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Text color="grey60" mt="default" style={{ fontSize: "12px" }}>
        <a href="/admin/resources/ServiceRequest" style={{ color: palette.series, textDecoration: "none" }}>
          View all service requests →
        </a>
      </Text>
    </div>
  );
};

export default RecentTable;
