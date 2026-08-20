import type { ResourceWithOptions } from "adminjs";
import AuditLog from "../../models/auditLog.model.js";
import { NAV } from "../navigation.js";
import { detailOnly } from "./shared.js";

console.log("[auditLog.resource::module] ENTER", { loading: true });

const AuditLogResource: ResourceWithOptions = {
  resource: AuditLog,
  options: {
    navigation: NAV.SYSTEM,
    listProperties: ["phone", "action", "channel", "session_id", "timestamp"],
    filterProperties: ["phone", "action", "channel", "session_id", "ip_address", "timestamp"],
    sort: { sortBy: "timestamp", direction: "desc" },
    properties: {
      details: detailOnly,
    },
    actions: {
      // Audit trail is append-only - it is written by the app, never by hand.
      new: { isAccessible: false },
      edit: { isAccessible: false },
      delete: { isAccessible: false },
      bulkDelete: { isAccessible: false },
    },
  },
};

console.log("[auditLog.resource::module] EXIT", { navigation: NAV.SYSTEM.name });

export default AuditLogResource;
