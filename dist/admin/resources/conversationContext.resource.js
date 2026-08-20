import ConversationContext from "../../models/conversationContext.model.js";
import { NAV } from "../navigation.js";
import { detailOnly, readOnly, readOnlyListed } from "./shared.js";
console.log("[conversationContext.resource::module] ENTER", { loading: true });
const ConversationContextResource = {
    resource: ConversationContext,
    options: {
        navigation: NAV.MESSAGING,
        listProperties: [
            "phone",
            "current_flow",
            "current_screen",
            "awaiting_input",
            "is_escalated",
            "last_message_at",
        ],
        filterProperties: [
            "phone",
            "current_flow",
            "current_screen",
            "awaiting_input",
            "last_intent",
            "is_escalated",
            "escalated_to",
            "escalation_ticket_id",
            "last_message_at",
        ],
        editProperties: [
            "phone",
            "current_flow",
            "current_screen",
            "current_step",
            "awaiting_input",
            "last_intent",
            "flow_data",
            "is_escalated",
            "escalated_to",
            "escalation_ticket_id",
            "session_id",
            "pending_auth_flow",
            "last_message_at",
            "metadata",
        ],
        sort: { sortBy: "last_message_at", direction: "desc" },
        properties: {
            flow_data: detailOnly,
            metadata: detailOnly,
            createdAt: readOnlyListed,
            updatedAt: readOnly,
        },
    },
};
console.log("[conversationContext.resource::module] EXIT", { navigation: NAV.MESSAGING.name });
export default ConversationContextResource;
