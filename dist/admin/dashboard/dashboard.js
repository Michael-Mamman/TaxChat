import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { Box, H2, H5, Text, Loader } from "@adminjs/design-system";
import { ApiClient } from "adminjs";
const api = new ApiClient();
const CARDS = [
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
const StatCard = ({ label, value, href, }) => (_jsxs(Box, { as: "a", href: href, variant: "white", p: "lg", style: { borderRadius: "8px", flex: "1 1 220px", textDecoration: "none" }, children: [_jsx(Text, { opacity: 0.7, children: label }), _jsx(H2, { mt: "sm", children: value.toLocaleString() })] }));
const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        api
            .getDashboard()
            .then((res) => setStats(res.data))
            .catch(() => setError("Could not load dashboard statistics."));
    }, []);
    return (_jsxs(Box, { variant: "grey", children: [_jsxs(Box, { variant: "white", p: "xl", m: "xl", style: { borderRadius: "8px" }, children: [_jsx(H2, { children: "NRS TaxChat Admin" }), _jsx(Text, { mt: "default", children: "Welcome to the NRS TaxChat administration panel. Use the sidebar to manage taxpayers, sessions, service requests, notifications, conversations, and audit logs." })] }), _jsxs(Box, { mx: "xl", mb: "xl", children: [_jsx(H5, { mb: "lg", children: "At a glance" }), error ? _jsx(Text, { children: error }) : null, !stats && !error ? _jsx(Loader, {}) : null, stats ? (_jsx(Box, { flex: true, flexDirection: "row", flexWrap: "wrap", style: { gap: "16px" }, children: CARDS.map((card) => (_jsx(StatCard, { label: card.label, value: stats[card.key], href: card.href }, card.key))) })) : null] })] }));
};
export default Dashboard;
