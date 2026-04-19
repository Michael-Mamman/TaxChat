import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IConversationContext extends Document {
  phone: string;
  current_flow?: string;
  current_screen?: string;
  current_step?: number;
  flow_data: Record<string, unknown>;
  awaiting_input?: string;
  last_intent?: string;
  last_message_at: Date;
  is_escalated: boolean;
  escalated_to?: string;
  escalation_ticket_id?: string;
  session_id?: string;
  pending_auth_flow?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationContextSchema = new Schema<IConversationContext>(
  {
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
  },
  { timestamps: true },
);

const ConversationContext: Model<IConversationContext> = mongoose.model<IConversationContext>(
  "ConversationContext",
  ConversationContextSchema,
);

export default ConversationContext;
