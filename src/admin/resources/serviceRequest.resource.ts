import type { ResourceWithOptions } from "adminjs";
import ServiceRequest, { generateReferenceNumber } from "../../models/serviceRequest.model.js";
import { NAV } from "../navigation.js";
import { detailOnly, readOnly, readOnlyListed } from "./shared.js";

console.log("[serviceRequest.resource::module] ENTER", { loading: true });

const ServiceRequestResource: ResourceWithOptions = {
  resource: ServiceRequest,
  options: {
    navigation: NAV.OPERATIONS,
    listProperties: [
      "reference_number",
      "type",
      "status",
      "priority",
      "phone",
      "assigned_officer",
      "createdAt",
    ],
    filterProperties: [
      "reference_number",
      "phone",
      "tin",
      "type",
      "status",
      "priority",
      "assigned_officer",
      "itsm_ticket_id",
      "sla_deadline",
      "createdAt",
    ],
    editProperties: [
      "reference_number",
      "phone",
      "tin",
      "type",
      "status",
      "priority",
      "subject",
      "description",
      "assigned_officer",
      "itsm_ticket_id",
      "sla_deadline",
      "first_response_deadline",
      "resolution_notes",
      "attachments",
      "escalation_count",
      "metadata",
    ],
    sort: { sortBy: "createdAt", direction: "desc" },
    properties: {
      // The model back-fills this on save; the form must not block on it.
      reference_number: { isRequired: false },
      description: { type: "textarea" },
      resolution_notes: { type: "textarea" },
      metadata: detailOnly,
      createdAt: readOnlyListed,
      updatedAt: readOnly,
    },
    actions: {
      new: {
        before: async (request) => {
          console.log("[serviceRequest.resource::new.before] ENTER", {
            hasPayload: !!request.payload,
          });
          if (request.payload && !request.payload.reference_number) {
            console.log("[serviceRequest.resource::new.before] branch: generating reference");
            request.payload.reference_number = generateReferenceNumber();
          }
          console.log("[serviceRequest.resource::new.before] EXIT", {
            reference: request.payload?.reference_number,
          });
          return request;
        },
      },
    },
  },
};

console.log("[serviceRequest.resource::module] EXIT", { navigation: NAV.OPERATIONS.name });

export default ServiceRequestResource;
