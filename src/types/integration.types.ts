/** Generic wrapper used by all integration stubs */
export interface IntegrationResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
  status_code?: number;
}

// === JTB / TIN ===
export interface TINLookupResult {
  tin: string;
  taxpayer_name: string;
  first_name: string;
  last_name: string;
  tax_type: string;
  tax_office: string;
  registration_date: string;
  status: "active" | "inactive" | "deregistered";
  phone?: string;
  email?: string;
}

// === NIMC / NIN ===
export interface NINVerificationResult {
  nin: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  photo_base64?: string;
  is_valid: boolean;
}

// === NIBSS / BVN ===
export interface BVNVerificationResult {
  bvn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  is_valid: boolean;
}

// === Remita / Payment ===
export interface PaymentStatusResult {
  reference: string;
  amount: number;
  currency: string;
  date?: string;
  bank?: string;
  payer_name?: string;
  status: "RECEIVED" | "POSTED" | "NOT_FOUND" | "FAILED";
  tax_type?: string;
  period_credited?: string;
}

// === ITSM / myservice ===
export interface ITSMTicket {
  ticket_id: string;
  reference: string;
  type: string;
  status: string;
  subject: string;
  description: string;
  assigned_to?: string;
  sla_deadline?: string;
  created_at: string;
  updated_at: string;
}

// === TaxProMax ===
export interface FilingStatus {
  tin: string;
  tax_year: number;
  tax_type: string;
  period?: string;
  filing_date?: string;
  status: "filed" | "pending" | "overdue";
  amount_due?: number;
}

export interface AssessmentDetail {
  assessment_id: string;
  reference?: string;
  tin: string;
  tax_type: string;
  tax_year: number;
  period?: string;
  assessed_amount: number;
  paid_amount: number;
  balance: number;
  due_date: string;
  basis?: string;
  status: string;
}

export interface ComplianceCheckResult {
  tin: string;
  is_compliant: boolean;
  filings: FilingStatus[];
  outstanding_assessments: AssessmentDetail[];
  penalties: PenaltyDetail[];
}

export interface PenaltyDetail {
  penalty_id: string;
  type: string;
  amount: number;
  reason: string;
  statutory_basis?: string;
  original_due_date?: string;
  status: string;
}

// === NLU / Akraa AI ===
export interface NLUClassification {
  intent: string;
  confidence: number;
  entities: Record<string, string>;
  suggested_flow?: string;
  language?: string;
}

// === WHT Credit ===
export interface WHTCreditNote {
  credit_note_id: string;
  deducting_party_tin: string;
  deducting_party_name: string;
  amount: number;
  wht_amount: number;
  date: string;
  invoice_reference?: string;
  is_remitted: boolean;
  verification_url?: string;
}

// === Taxly / E-Invoice ===
export interface EInvoiceData {
  tin: string;
  period: string;
  output_vat: number;
  input_vat: number;
  net_vat: number;
  total_sales: number;
  total_purchases: number;
  invoice_count: number;
}
