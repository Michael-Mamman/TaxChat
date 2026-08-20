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
  { key: "totalRequests", label: "Total service requests", href: "/admin/resources/ServiceRequest" },
  { key: "activeSessions", label: "Active sessions", href: "/admin/resources/Session" },
  { key: "pendingNotifications", label: "Pending notifications", href: "/admin/resources/Notification" },
  {
    key: "escalatedConversations",
    label: "Escalated conversations",
    href: "/admin/resources/ConversationContext",
  },
  { key: "auditEvents", label: "Audit events", href: "/admin/resources/AuditLog" },
];

const StatCard: React.FC<{ label: string; value: number; href: string }> = ({
  label,
  value,
  href,
}) => (
  <Box
    as="a"
    href={href}
    variant="white"
    p="lg"
    style={{ borderRadius: "8px", flex: "1 1 220px", textDecoration: "none" }}
  >
    <Text opacity={0.7}>{label}</Text>
    <H2 mt="sm">{value.toLocaleString()}</H2>
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
      <Box variant="white" p="xl" m="xl" style={{ borderRadius: "8px" }}>
        <H2>NRS TaxChat Admin</H2>
        <Text mt="default">
          Welcome to the NRS TaxChat administration panel. Use the sidebar to manage taxpayers,
          sessions, service requests, notifications, conversations, and audit logs.
        </Text>
      </Box>

      <Box mx="xl" mb="xl">
        <H5 mb="lg">At a glance</H5>
        {error ? <Text>{error}</Text> : null}
        {!stats && !error ? <Loader /> : null}
        {stats ? (
          <Box flex flexDirection="row" flexWrap="wrap" style={{ gap: "16px" }}>
            {CARDS.map((card) => (
              <StatCard
                key={card.key}
                label={card.label}
                value={stats[card.key]}
                href={card.href}
              />
            ))}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default Dashboard;
