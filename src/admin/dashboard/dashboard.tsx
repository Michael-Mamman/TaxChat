import React, { useEffect, useState } from "react";
import { Box, H2, H5, Text, Loader } from "@adminjs/design-system";
import { ApiClient } from "adminjs";

type DashboardStats = {
  taxpayers: number;
  verifiedTaxpayers: number;
  openRequests: number;
  totalRequests: number;
  activeSessions: number;
  pendingNotifications: number;
  escalatedConversations: number;
  auditEvents: number;
};

const api = new ApiClient();

const CARDS: Array<{ key: keyof DashboardStats; label: string; href: string }> = [
  { key: "taxpayers", label: "Taxpayers", href: "/admin/resources/Taxpayer" },
  { key: "verifiedTaxpayers", label: "Verified taxpayers", href: "/admin/resources/Taxpayer" },
  { key: "openRequests", label: "Open service requests", href: "/admin/resources/ServiceRequest" },
  {
    key: "totalRequests",
    label: "Total service requests",
    href: "/admin/resources/ServiceRequest",
  },
  { key: "activeSessions", label: "Active sessions", href: "/admin/resources/Session" },
  {
    key: "pendingNotifications",
    label: "Pending notifications",
    href: "/admin/resources/Notification",
  },
  {
    key: "escalatedConversations",
    label: "Escalated conversations",
    href: "/admin/resources/ConversationContext",
  },
  { key: "auditEvents", label: "Audit events", href: "/admin/resources/AuditLog" },
];

/**
 * `variant="white"` hardcodes the `white` colour token, which the dark theme
 * never overrides - it renders white text on a white card. Drive the surface
 * off `container`/`text` instead so the panel works in both themes.
 */
const StatCard: React.FC<{ label: string; value: number; href: string }> = ({
  label,
  value,
  href,
}) => (
  <Box
    as="a"
    href={href}
    bg="container"
    color="text"
    p="xl"
    border="1px solid"
    borderColor="border"
    style={{ borderRadius: "8px", textDecoration: "none", display: "block" }}
  >
    <Text color="grey60" style={{ fontSize: "13px", letterSpacing: "0.02em" }}>
      {label}
    </Text>
    {/* H2 ships a hardcoded `margin: 48px 0 32px`, which the mt/mb props lose to. */}
    <H2 color="text" style={{ margin: "4px 0 0", lineHeight: 1.15 }}>
      {value.toLocaleString()}
    </H2>
  </Box>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDashboard<DashboardStats>()
      .then((res) => setStats(res.data))
      .catch(() => setError("Could not load dashboard statistics."));
  }, []);

  return (
    <Box variant="grey">
      <Box
        bg="container"
        color="text"
        p="xl"
        mb="xl"
        border="1px solid"
        borderColor="border"
        style={{ borderRadius: "8px" }}
      >
        <H2 color="text" style={{ margin: "0 0 8px" }}>
          NRS TaxChat Admin
        </H2>
        <Text color="grey60">
          Manage taxpayers, sessions, service requests, notifications, conversations, and audit
          logs from the sidebar.
        </Text>
      </Box>

      <H5 mb="lg" color="text">
        At a glance
      </H5>

      {error ? <Text color="grey60">{error}</Text> : null}
      {!stats && !error ? <Loader /> : null}

      {stats ? (
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          {CARDS.map((card) => (
            <StatCard key={card.key} label={card.label} value={stats[card.key]} href={card.href} />
          ))}
        </Box>
      ) : null}
    </Box>
  );
};

export default Dashboard;
