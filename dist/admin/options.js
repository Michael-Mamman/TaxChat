import { componentLoader, Components } from "./component-loader.js";
import { dark, light, noSidebar } from "@adminjs/themes";
import resources from "./resources/index.js";
import Taxpayer from "../models/taxpayer.model.js";
import ServiceRequest, { ServiceRequestStatus } from "../models/serviceRequest.model.js";
import Notification from "../models/notification.model.js";
import Session from "../models/session.model.js";
import ConversationContext from "../models/conversationContext.model.js";
import AuditLog from "../models/auditLog.model.js";
console.log('[options::module] ENTER', { loading: true });
const OPEN_REQUEST_STATUSES = [
    ServiceRequestStatus.SUBMITTED,
    ServiceRequestStatus.IN_PROGRESS,
    ServiceRequestStatus.PENDING_INFO,
    ServiceRequestStatus.ESCALATED,
];
const options = {
    resources,
    componentLoader,
    dashboard: {
        component: Components.Dashboard,
        handler: async () => {
            console.log('[options::dashboard.handler] ENTER');
            const [taxpayers, verifiedTaxpayers, openRequests, totalRequests, activeSessions, pendingNotifications, escalatedConversations, auditEvents,] = await Promise.all([
                Taxpayer.countDocuments(),
                Taxpayer.countDocuments({ is_verified: true }),
                ServiceRequest.countDocuments({ status: { $in: OPEN_REQUEST_STATUSES } }),
                ServiceRequest.countDocuments(),
                Session.countDocuments({ is_active: true, expires_at: { $gt: new Date() } }),
                Notification.countDocuments({ status: "pending" }),
                ConversationContext.countDocuments({ is_escalated: true }),
                AuditLog.countDocuments(),
            ]);
            const stats = {
                taxpayers,
                verifiedTaxpayers,
                openRequests,
                totalRequests,
                activeSessions,
                pendingNotifications,
                escalatedConversations,
                auditEvents,
            };
            console.log('[options::dashboard.handler] EXIT', stats);
            return stats;
        },
    },
    defaultTheme: dark.id,
    availableThemes: [dark, light, noSidebar],
    rootPath: "/admin",
    databases: [],
    branding: {
        companyName: "NRS TaxChat",
    },
};
console.log('[options::module] EXIT', { resourceCount: options.resources?.length, rootPath: options.rootPath });
export default options;
