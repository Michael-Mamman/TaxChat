import type { ResourceWithOptions } from "adminjs";
import Notification from "../../models/notification.model.js";
import { NAV } from "../navigation.js";
import { detailOnly, readOnly, readOnlyListed } from "./shared.js";

console.log("[notification.resource::module] ENTER", { loading: true });

const NotificationResource: ResourceWithOptions = {
  resource: Notification,
  options: {
    navigation: NAV.MESSAGING,
    listProperties: ["phone", "type", "template_name", "status", "sent_at", "createdAt"],
    filterProperties: [
      "phone",
      "type",
      "template_name",
      "status",
      "service_request_id",
      "whatsapp_message_id",
      "scheduled_at",
      "sent_at",
      "createdAt",
    ],
    editProperties: [
      "phone",
      "type",
      "template_name",
      "template_params",
      "status",
      "scheduled_at",
      "sent_at",
      "whatsapp_message_id",
      "service_request_id",
      "error_message",
    ],
    sort: { sortBy: "createdAt", direction: "desc" },
    properties: {
      template_params: detailOnly,
      error_message: { type: "textarea" },
      delivery_status_updated_at: readOnly,
      createdAt: readOnlyListed,
      updatedAt: readOnly,
    },
  },
};

console.log("[notification.resource::module] EXIT", { navigation: NAV.MESSAGING.name });

export default NotificationResource;
