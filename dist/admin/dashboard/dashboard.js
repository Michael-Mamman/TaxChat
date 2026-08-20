import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { Box, H2, Text, Loader } from "@adminjs/design-system";
import { ApiClient } from "adminjs";
import Logo from "../components/logo.js";
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
const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        api
            .getDashboard()
            .then((res) => setStats(res.data))
            .catch(() => setError("Could not load dashboard statistics."));
    }, []);
    return (_jsxs(Box, { variant: "grey", children: [_jsxs(Box, { mb: "xxl", style: { display: "flex", alignItems: "center", gap: "16px" }, children: [_jsx(Logo, { width: 54, variant: "mark" }), _jsxs(Box, { children: [_jsx(H2, { color: "text", style: { margin: 0, lineHeight: 1.2 }, children: "Overview" }), _jsx(Text, { color: "grey60", style: { fontSize: "14px" }, children: "Virtual Tax Office \u2014 Nigeria Revenue Service" })] })] }), error ? _jsx(Text, { color: "grey60", children: error }) : null, !stats && !error ? _jsx(Loader, {}) : null, stats ? (_jsx(Box, { style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: "16px",
                }, children: buildCards(stats).map((card) => (_jsx(StatCard, { ...card }, card.label))) })) : null] }));
};
export default Dashboard;
