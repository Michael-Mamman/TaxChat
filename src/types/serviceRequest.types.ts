export interface CreateServiceRequestPayload {
  phone: string;
  tin?: string;
  type: string;
  subject: string;
  description: string;
  priority?: "low" | "medium" | "high" | "critical";
  attachments?: string[];
  metadata?: Record<string, unknown>;
}

export interface ServiceRequestUpdatePayload {
  status?: string;
  resolution_notes?: string;
  assigned_officer?: string;
  itsm_ticket_id?: string;
  metadata?: Record<string, unknown>;
}

export interface SLAConfig {
  type: string;
  response_hours: number;
  resolution_hours: number;
  priority_multiplier: Record<string, number>;
}
