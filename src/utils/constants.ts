/** SLA configurations per ITSM service type */
export const SLA_CONFIGS: Record<
  string,
  { response_hours: number; resolution_hours: number; priority: string }
> = {
  "TIN-REG": { response_hours: 1, resolution_hours: 48, priority: "medium" },
  "TCC-APP": { response_hours: 1, resolution_hours: 120, priority: "high" },
  "PAY-TRACE": { response_hours: 2, resolution_hours: 48, priority: "high" },
  "PROFILE-UPD": { response_hours: 2, resolution_hours: 48, priority: "medium" },
  "FILING-SUPPORT": { response_hours: 0, resolution_hours: 0, priority: "medium" },
  "ASSESS-QUERY": { response_hours: 4, resolution_hours: 120, priority: "medium" },
  "ASSESS-OBJ": { response_hours: 4, resolution_hours: 120, priority: "high" },
  "PENALTY-QUERY": { response_hours: 4, resolution_hours: 72, priority: "medium" },
  "PENALTY-WAIVER": { response_hours: 4, resolution_hours: 72, priority: "high" },
  "WHT-CREDIT-QUERY": { response_hours: 2, resolution_hours: 72, priority: "medium" },
  "GENERAL": { response_hours: 0, resolution_hours: 0, priority: "low" },
};

/** Welcome message shown to new/returning users */
export const WELCOME_MESSAGE = `Welcome to NRS TaxChat!

I'm your AI tax assistant. I can help you with tax services without visiting an office.

What would you like to do today?`;

/** Main menu options matching BRD 10 service flows */
export const MAIN_MENU_OPTIONS = [
  { id: "tin_registration", title: "Register for TIN", description: "Register for a new Tax Identification Number" },
  { id: "tin_retrieval", title: "Find my TIN", description: "Look up your existing TIN" },
  { id: "tax_clearance", title: "Tax Clearance Certificate", description: "Apply for or check TCC status" },
  { id: "payment_confirmation", title: "Check payment status", description: "Verify a tax payment was received" },
  { id: "profile_update", title: "Update my details", description: "Update your taxpayer profile" },
  { id: "filing_support", title: "File a return", description: "Get help with tax return filing" },
  { id: "assessment_query", title: "Query an assessment", description: "View or dispute a tax assessment" },
  { id: "penalty_query", title: "Check a penalty", description: "Query penalties or request a waiver" },
  { id: "wht_credit_note", title: "WHT credit note", description: "Withholding tax credit enquiry" },
  { id: "general_enquiry", title: "Ask a question", description: "Ask a general tax question" },
] as const;

/** Keywords that trigger escalation to live agent */
export const ESCALATION_KEYWORDS = [
  "agent",
  "human",
  "talk to someone",
  "speak to someone",
  "live agent",
  "real person",
  "help me",
  "frustrated",
  "complaint",
];

/** Keyword that returns to main menu */
export const MENU_KEYWORDS = ["menu", "start", "home", "back"];

/** Greeting keywords that trigger welcome message */
export const GREETING_KEYWORDS = ["hi", "hello", "hey", "start", "menu", "good morning", "good afternoon", "good evening"];
