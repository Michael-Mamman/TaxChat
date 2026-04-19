export type FlowName =
  | "tin_registration"
  | "tin_retrieval"
  | "tax_clearance"
  | "payment_confirmation"
  | "profile_update"
  | "filing_support"
  | "assessment_query"
  | "penalty_query"
  | "wht_credit_note"
  | "general_enquiry";

export interface MenuOption {
  id: string;
  title: string;
  description?: string;
}

export interface ConversationState {
  phone: string;
  flow?: FlowName;
  step: number;
  data: Record<string, unknown>;
  awaiting?: string;
  auth_tier: number;
}

export interface FlowStepResult {
  message?: string;
  menu_options?: MenuOption[];
  buttons?: Array<{ id: string; title: string }>;
  flow_message?: {
    flow_id: string;
    flow_token: string;
    cta: string;
    screen: string;
  };
  document?: {
    media_id: string;
    filename: string;
    caption?: string;
  };
  next_step?: number;
  awaiting_input?: string;
  flow_complete?: boolean;
  requires_auth_tier?: number;
  escalate?: boolean;
  escalation_reason?: string;
}

export interface IncomingMessageContext {
  from: string;
  text: string;
  contactName?: string;
  messageType: string;
  interactiveResponse?: Record<string, unknown>;
  mediaId?: string;
}
