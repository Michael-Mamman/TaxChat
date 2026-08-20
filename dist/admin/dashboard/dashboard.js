import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { Box, H2, Text, Loader } from "@adminjs/design-system";
import { ApiClient } from "adminjs";
import Logo from "../components/logo.js";
import Panel from "../components/charts/panel.js";
import BarChart from "../components/charts/bar-chart.js";
import AreaChart from "../components/charts/area-chart.js";
import RecentTable from "../components/charts/recent-table.js";
const api = new ApiClient();
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const buildCards = (s) => [
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
const StatCard = ({ label, value, hint, href }) => (_jsxs(Box, { as: "a", href: href, bg: "container", color: "text", p: "xl", border: "1px solid", borderColor: "border", style: { borderRadius: "10px", textDecoration: "none", display: "block" }, children: [_jsx(Text, { color: "grey60", style: { fontSize: "13px" }, children: label }), _jsx(H2, { color: "text", style: { margin: "6px 0 0", lineHeight: 1.15 }, children: value.toLocaleString() }), _jsx(Text, { color: "grey60", mt: "sm", style: { fontSize: "12px" }, children: hint })] }));
/** Surfaces the window total and peak in text, so neither needs a hover. */
const activitySubtitle = (s) => {
    const total = s.activityByDay.reduce((sum, d) => sum + d.value, 0);
    const peak = s.activityByDay.reduce((b, d) => (d.value > b.value ? d : b), s.activityByDay[0] ?? { date: "", value: 0 });
    if (!total)
        return "Audit events per day, last 14 days";
    const day = peak.date ? new Date(`${peak.date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
    return `Audit events per day, last 14 days — ${total.toLocaleString()} total, peak ${peak.value.toLocaleString()} on ${day}`;
};
const grid = (min) => ({
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`,
    gap: "16px",
    // Without this, every panel in a row stretches to the tallest one and short
    // charts sit in a half-empty card.
    alignItems: "start",
});
const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        api
            .getDashboard()
            .then((res) => setStats(res.data))
            .catch(() => setError("Could not load dashboard statistics."));
    }, []);
    return (_jsxs(Box, { variant: "grey", children: [_jsxs(Box, { mb: "xxl", style: { display: "flex", alignItems: "center", gap: "16px" }, children: [_jsx(Logo, { width: 54, variant: "mark" }), _jsxs(Box, { children: [_jsx(H2, { color: "text", style: { margin: 0, lineHeight: 1.2 }, children: "Overview" }), _jsx(Text, { color: "grey60", style: { fontSize: "14px" }, children: "Virtual Tax Office \u2014 Nigeria Revenue Service" })] })] }), error ? _jsx(Text, { color: "grey60", children: error }) : null, !stats && !error ? _jsx(Loader, {}) : null, stats ? (_jsxs(_Fragment, { children: [_jsx(Box, { style: grid(240), children: buildCards(stats).map((c) => (_jsx(StatCard, { ...c }, c.label))) }), _jsx(Box, { mt: "xl", children: _jsx(Panel, { title: "Activity", subtitle: activitySubtitle(stats), children: _jsx(AreaChart, { data: stats.activityByDay }) }) }), _jsxs(Box, { mt: "xl", style: grid(420), children: [_jsx(Panel, { title: "Service requests by status", subtitle: "All requests on record", children: _jsx(BarChart, { data: stats.requestsByStatus }) }), _jsx(Panel, { title: "Service requests by type", subtitle: "Top categories", children: _jsx(BarChart, { data: stats.requestsByType }) }), _jsx(Panel, { title: "Taxpayers by authentication tier", subtitle: "Tier 0 unauthenticated \u2192 Tier 3 full KYC", children: _jsx(BarChart, { data: stats.taxpayersByTier, ordinal: true }) }), _jsx(Panel, { title: "Notifications by delivery status", subtitle: "All notifications on record", children: _jsx(BarChart, { data: stats.notificationsByStatus }) })] }), _jsx(Box, { mt: "xl", mb: "xl", children: _jsx(Panel, { title: "Recent service requests", subtitle: "Most recently raised", children: _jsx(RecentTable, { rows: stats.recentRequests }) }) })] })) : null] }));
};
export default Dashboard;
