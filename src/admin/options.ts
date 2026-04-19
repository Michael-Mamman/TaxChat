import type { AdminJSOptions } from "adminjs";
import { componentLoader, Components } from "./component-loader.js";
import { dark, light, noSidebar } from "@adminjs/themes";
import Taxpayer from "../models/taxpayer.model.js";
import ServiceRequest from "../models/serviceRequest.model.js";
import Notification from "../models/notification.model.js";
import AuditLog from "../models/auditLog.model.js";

const TaxpayerResource = {
  resource: Taxpayer,
  options: {
    listProperties: ["phone", "tin", "first_name", "last_name", "auth_tier", "createdAt"],
    sort: { sortBy: "createdAt", direction: "desc" as const },
  },
};

const ServiceRequestResource = {
  resource: ServiceRequest,
  options: {
    listProperties: ["reference_number", "type", "status", "phone", "createdAt"],
    sort: { sortBy: "createdAt", direction: "desc" as const },
  },
};

const NotificationResource = {
  resource: Notification,
  options: {
    listProperties: ["phone", "type", "template_name", "status", "createdAt"],
    sort: { sortBy: "createdAt", direction: "desc" as const },
  },
};

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

export default options;
