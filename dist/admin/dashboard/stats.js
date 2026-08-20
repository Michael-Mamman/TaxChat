import Taxpayer from "../../models/taxpayer.model.js";
import ServiceRequest, { ServiceRequestStatus } from "../../models/serviceRequest.model.js";
import Notification from "../../models/notification.model.js";
import Session from "../../models/session.model.js";
import ConversationContext from "../../models/conversationContext.model.js";
import AuditLog from "../../models/auditLog.model.js";
console.log('[stats::module] ENTER', { loading: true });
const OPEN_REQUEST_STATUSES = [
    ServiceRequestStatus.SUBMITTED,
    ServiceRequestStatus.IN_PROGRESS,
    ServiceRequestStatus.PENDING_INFO,
    ServiceRequestStatus.ESCALATED,
];
const ACTIVITY_DAYS = 14;
const MAX_TYPE_SLICES = 6;
/** "in_progress" -> "In progress"; leaves coded values like TIN-REG alone. */
const humanise = (value) => {
    if (/^[A-Z0-9-]+$/.test(value))
        return value;
    const spaced = value.replace(/_/g, " ");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
const toSlices = (rows) => rows
    .filter((r) => r._id !== null && r._id !== undefined)
    .map((r) => ({ label: humanise(String(r._id)), value: r.count }))
    .sort((a, b) => b.value - a.value);
/** Keeps the chart under the series ceiling: top N, remainder folded into "Other". */
const capSlices = (slices, max) => {
    if (slices.length <= max)
        return slices;
    const head = slices.slice(0, max);
    const rest = slices.slice(max).reduce((sum, s) => sum + s.value, 0);
    return rest > 0 ? [...head, { label: "Other", value: rest }] : head;
};
/** Zero-fills the window so a quiet day is a gap in the line, not a missing point. */
const fillDays = (rows, days) => {
    const byDate = new Map(rows.map((r) => [r._id, r.count]));
    const out = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        out.push({ date: key, value: byDate.get(key) ?? 0 });
    }
    return out;
};
const TIER_LABELS = ["Tier 0", "Tier 1", "Tier 2", "Tier 3"];
export const buildDashboardStats = async () => {
    console.log('[stats::buildDashboardStats] ENTER');
    const since = new Date();
    since.setDate(since.getDate() - (ACTIVITY_DAYS - 1));
    since.setHours(0, 0, 0, 0);
    const [taxpayers, verifiedTaxpayers, openRequests, totalRequests, activeSessions, pendingNotifications, escalatedConversations, auditEvents, activityRows, statusRows, typeRows, tierRows, notificationRows, recentDocs,] = await Promise.all([
        Taxpayer.countDocuments(),
        Taxpayer.countDocuments({ is_verified: true }),
        ServiceRequest.countDocuments({ status: { $in: OPEN_REQUEST_STATUSES } }),
        ServiceRequest.countDocuments(),
        Session.countDocuments({ is_active: true, expires_at: { $gt: new Date() } }),
        Notification.countDocuments({ status: "pending" }),
        ConversationContext.countDocuments({ is_escalated: true }),
        AuditLog.countDocuments(),
        AuditLog.aggregate([
            { $match: { timestamp: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }, count: { $sum: 1 } } },
        ]),
        ServiceRequest.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        ServiceRequest.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
        Taxpayer.aggregate([{ $group: { _id: "$auth_tier", count: { $sum: 1 } } }]),
        Notification.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        ServiceRequest.find({}, "reference_number type status phone createdAt")
            .sort({ createdAt: -1 })
            .limit(8)
            .lean(),
    ]);
    // Tiers are an ordered scale, so they keep their own order rather than sorting by size.
    const tierCounts = new Map(tierRows.map((r) => [Number(r._id), r.count]));
    const taxpayersByTier = TIER_LABELS.map((label, i) => ({
        label,
        value: tierCounts.get(i) ?? 0,
    }));
    const recentRequests = recentDocs.map((d) => ({
        id: String(d["_id"]),
        reference: String(d["reference_number"] ?? ""),
        type: String(d["type"] ?? ""),
        status: humanise(String(d["status"] ?? "")),
        phone: String(d["phone"] ?? ""),
        createdAt: d["createdAt"] instanceof Date ? d["createdAt"].toISOString() : "",
    }));
    const stats = {
        taxpayers,
        verifiedTaxpayers,
        openRequests,
        totalRequests,
        activeSessions,
        pendingNotifications,
        escalatedConversations,
        auditEvents,
        activityByDay: fillDays(activityRows, ACTIVITY_DAYS),
        requestsByStatus: toSlices(statusRows),
        requestsByType: capSlices(toSlices(typeRows), MAX_TYPE_SLICES),
        taxpayersByTier,
        notificationsByStatus: toSlices(notificationRows),
        recentRequests,
    };
    console.log('[stats::buildDashboardStats] EXIT', {
        taxpayers, totalRequests, activityPoints: stats.activityByDay.length,
    });
    return stats;
};
console.log('[stats::module] EXIT');
