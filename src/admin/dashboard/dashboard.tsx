import React, { useEffect, useState } from "react";
import { Box, H2, Text, Loader } from "@adminjs/design-system";
import { ApiClient } from "adminjs";
import Logo from "../components/logo.js";
import Panel from "../components/charts/panel.js";
import BarChart from "../components/charts/bar-chart.js";
import AreaChart from "../components/charts/area-chart.js";
import RecentTable from "../components/charts/recent-table.js";
import type { DashboardStats } from "./stats-types.js";

const api = new ApiClient();

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

type Card = { label: string; value: number; hint: string; href: string };

const buildCards = (s: DashboardStats): Card[] => [
  {
    label: "Taxpayers",
    value: s.taxpayers,
    hint: `${s.verifiedTaxpayers.toLocaleString()} verified (${pct(s.verifiedTaxpayers, s.taxpayers)}%)`,
    href: "/admin/resources/Taxpayer",
  },
  {
    label: "Open service requests",
    value: s.openRequests,
    hint: `of ${s.totalRequests.toLocaleString()} raised in total`,
    href: "/admin/resources/ServiceRequest",
  },
  {
    label: "Escalated conversations",
    value: s.escalatedConversations,
    hint: "waiting on an officer",
    href: "/admin/resources/ConversationContext",
  },
  {
    label: "Active sessions",
    value: s.activeSessions,
    hint: "currently authenticated",
    href: "/admin/resources/Session",
  },
  {
    label: "Pending notifications",
    value: s.pendingNotifications,
    hint: "queued to send",
    href: "/admin/resources/Notification",
  },
  {
    label: "Audit events",
    value: s.auditEvents,
    hint: "recorded to date",
    href: "/admin/resources/AuditLog",
  },
];

/**
 * Surfaces come off `container`/`text`/`border`; the `white` token that
 * Box variant="white" uses is not theme-aware and renders white-on-white in
 * dark mode. H2 also ships a hardcoded margin that mt/mb props lose to.
 */
const StatCard: React.FC<Card> = ({ label, value, hint, href }) => (
  <Box
    as="a"
    href={href}
    bg="container"
    color="text"
    p="xl"
    border="1px solid"
    borderColor="border"
    style={{ borderRadius: "10px", textDecoration: "none", display: "block" }}
  >
    <Text color="grey60" style={{ fontSize: "13px" }}>
      {label}
    </Text>
    <H2 color="text" style={{ margin: "6px 0 0", lineHeight: 1.15 }}>
      {value.toLocaleString()}
    </H2>
    <Text color="grey60" mt="sm" style={{ fontSize: "12px" }}>
      {hint}
    </Text>
  </Box>
);

/** Surfaces the window total and peak in text, so neither needs a hover. */
const activitySubtitle = (s: DashboardStats): string => {
  const total = s.activityByDay.reduce((sum, d) => sum + d.value, 0);
  const peak = s.activityByDay.reduce((b, d) => (d.value > b.value ? d : b), s.activityByDay[0] ?? { date: "", value: 0 });
  if (!total) return "Audit events per day, last 14 days";
  const day = peak.date ? new Date(`${peak.date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
  return `Audit events per day, last 14 days — ${total.toLocaleString()} total, peak ${peak.value.toLocaleString()} on ${day}`;
};

const grid = (min: number): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`,
  gap: "16px",
  // Without this, every panel in a row stretches to the tallest one and short
  // charts sit in a half-empty card.
  alignItems: "start",
});

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
      <Box mb="xxl" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <Logo width={54} variant="mark" />
        <Box>
          <H2 color="text" style={{ margin: 0, lineHeight: 1.2 }}>
            Overview
          </H2>
          <Text color="grey60" style={{ fontSize: "14px" }}>
            Virtual Tax Office — Nigeria Revenue Service
          </Text>
        </Box>
      </Box>

      {error ? <Text color="grey60">{error}</Text> : null}
      {!stats && !error ? <Loader /> : null}

      {stats ? (
        <>
          <Box style={grid(240)}>
            {buildCards(stats).map((c) => (
              <StatCard key={c.label} {...c} />
            ))}
          </Box>

          <Box mt="xl">
            <Panel title="Activity" subtitle={activitySubtitle(stats)}>
              <AreaChart data={stats.activityByDay} />
            </Panel>
          </Box>

          <Box mt="xl" style={grid(420)}>
            <Panel title="Service requests by status" subtitle="All requests on record">
              <BarChart data={stats.requestsByStatus} />
            </Panel>
            <Panel title="Service requests by type" subtitle="Top categories">
              <BarChart data={stats.requestsByType} />
            </Panel>
            <Panel title="Taxpayers by authentication tier" subtitle="Tier 0 unauthenticated → Tier 3 full KYC">
              <BarChart data={stats.taxpayersByTier} ordinal />
            </Panel>
            <Panel title="Notifications by delivery status" subtitle="All notifications on record">
              <BarChart data={stats.notificationsByStatus} />
            </Panel>
          </Box>

          <Box mt="xl" mb="xl">
            <Panel title="Recent service requests" subtitle="Most recently raised">
              <RecentTable rows={stats.recentRequests} />
            </Panel>
          </Box>
        </>
      ) : null}
    </Box>
  );
};

export default Dashboard;
