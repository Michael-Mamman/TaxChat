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
/** Accent sampled from the TaxChat mark. */
const BRAND_COLORS = {
    primary100: "#109040",
    primary80: "#2FA85C",
    primary60: "#5CBF80",
    primary40: "#98D8AE",
    primary20: "#D6EFDF",
};
/**
 * The dark theme pins its own primary100 (#256BEE), and a theme's own colours
 * beat `branding.theme` - so the accent has to be replaced in the theme too or
 * dark mode keeps the stock blue.
 */
const brandDark = {
    ...dark,
    overrides: {
        ...dark.overrides,
        colors: { ...(dark.overrides?.colors ?? {}), ...BRAND_COLORS },
    },
};
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
    defaultTheme: brandDark.id,
    availableThemes: [brandDark, light, noSidebar],
    rootPath: "/admin",
    databases: [],
    branding: {
        companyName: "TaxChat",
        // Our own SidebarBranding/Login components render the logo, and these two
        // flags stop AdminJS injecting its logotype and "made with love" footer.
        logo: false,
        withMadeWithLove: false,
        favicon: "/public/brand/favicon.png",
        // AdminJS's stock indigo accent is a big part of its out-of-the-box look.
        theme: { colors: BRAND_COLORS },
    },
};
console.log('[options::module] EXIT', { resourceCount: options.resources?.length, rootPath: options.rootPath });
export default options;
