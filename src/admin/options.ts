import type { AdminJSOptions } from "adminjs";
import { componentLoader, Components } from "./component-loader.js";
import { dark, light, noSidebar } from "@adminjs/themes";
import Taxpayer from "../models/taxpayer.model.js";
import ServiceRequest from "../models/serviceRequest.model.js";
import Notification from "../models/notification.model.js";
import AuditLog from "../models/auditLog.model.js";

console.log('[options::module] ENTER', { loading: true });

const TaxpayerResource = {
  resource: Taxpayer,
  options: {
    listProperties: ["phone", "tin", "first_name", "last_name", "auth_tier", "createdAt"],
    sort: { sortBy: "createdAt", direction: "desc" as const },
  },
};
console.log('[options::module] branch: TaxpayerResource defined');

const ServiceRequestResource = {
  resource: ServiceRequest,
  options: {
    listProperties: ["reference_number", "type", "status", "phone", "createdAt"],
    sort: { sortBy: "createdAt", direction: "desc" as const },
  },
};
console.log('[options::module] branch: ServiceRequestResource defined');

const NotificationResource = {
  resource: Notification,
  options: {
    listProperties: ["phone", "type", "template_name", "status", "createdAt"],
    sort: { sortBy: "createdAt", direction: "desc" as const },
  },
};
console.log('[options::module] branch: NotificationResource defined');

const AuditLogResource = {
  resource: AuditLog,
  options: {
    listProperties: ["phone", "action", "channel", "timestamp"],
    sort: { sortBy: "timestamp", direction: "desc" as const },
    actions: {
      edit: { isAccessible: false },
      delete: { isAccessible: false },
      new: { isAccessible: false },
    },
  },
};
console.log('[options::module] branch: AuditLogResource defined');

const options: AdminJSOptions = {
  resources: [TaxpayerResource, ServiceRequestResource, NotificationResource, AuditLogResource],
  componentLoader,
  dashboard: {
    component: Components.Dashboard,
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
