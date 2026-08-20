import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { Box, H2, H5, Text, Loader } from "@adminjs/design-system";
import { ApiClient } from "adminjs";
const api = new ApiClient();
const CARDS = [
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
const StatCard = ({ label, value, href, }) => (_jsxs(Box, { as: "a", href: href, bg: "container", color: "text", p: "xl", border: "1px solid", borderColor: "border", style: { borderRadius: "8px", textDecoration: "none", display: "block" }, children: [_jsx(Text, { color: "grey60", style: { fontSize: "13px", letterSpacing: "0.02em" }, children: label }), _jsx(H2, { color: "text", style: { margin: "4px 0 0", lineHeight: 1.15 }, children: value.toLocaleString() })] }));
const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        api
            .getDashboard()
            .then((res) => setStats(res.data))
            .catch(() => setError("Could not load dashboard statistics."));
    }, []);
    return (_jsxs(Box, { variant: "grey", children: [_jsxs(Box, { bg: "container", color: "text", p: "xl", mb: "xl", border: "1px solid", borderColor: "border", style: { borderRadius: "8px" }, children: [_jsx(H2, { color: "text", style: { margin: "0 0 8px" }, children: "NRS TaxChat Admin" }), _jsx(Text, { color: "grey60", children: "Manage taxpayers, sessions, service requests, notifications, conversations, and audit logs from the sidebar." })] }), _jsx(H5, { mb: "lg", color: "text", children: "At a glance" }), error ? _jsx(Text, { color: "grey60", children: error }) : null, !stats && !error ? _jsx(Loader, {}) : null, stats ? (_jsx(Box, { style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "16px",
                }, children: CARDS.map((card) => (_jsx(StatCard, { label: card.label, value: stats[card.key], href: card.href }, card.key))) })) : null] }));
};
export default Dashboard;
