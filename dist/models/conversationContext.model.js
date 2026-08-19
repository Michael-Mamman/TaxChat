import mongoose, { Schema } from "mongoose";
const ConversationContextSchema = new Schema({
    phone: { type: String, required: true, unique: true, index: true },
    current_flow: { type: String },
    current_screen: { type: String },
    current_step: { type: Number },
    flow_data: { type: Schema.Types.Mixed, default: {} },
    awaiting_input: { type: String },
    last_intent: { type: String },
    last_message_at: { type: Date, default: Date.now },
    is_escalated: { type: Boolean, default: false },
    escalated_to: { type: String },
    escalation_ticket_id: { type: String },
    session_id: { type: String },
    pending_auth_flow: { type: String },
    metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });
const ConversationContext = mongoose.model("ConversationContext", ConversationContextSchema);
export default ConversationContext;
