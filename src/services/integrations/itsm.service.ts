import axios from "axios";
import { ITSM_BASE_URL, ITSM_API_KEY } from "../../config.js";
import type {
  IntegrationResponse,
  ITSMTicket,
} from "../../types/integration.types.js";

class ITSMService {
  private baseUrl = ITSM_BASE_URL;
  private apiKey = ITSM_API_KEY;

  async createTicket(payload: {
    type: string;
    subject: string;
    description: string;
    taxpayer_tin?: string;
    phone?: string;
    email?: string;
    priority?: string;
  }): Promise<IntegrationResponse<ITSMTicket>> {
    console.log("[ITSM] createTicket stub called:", JSON.stringify(payload));

    const now = new Date().toISOString();
    return {
      success: true,
      message: "Ticket created successfully (stub)",
      status_code: 201,
      data: {
        ticket_id: `ITSM-${Date.now()}`,
        reference: `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        type: payload.type,
        status: "open",
        subject: payload.subject,
        description: payload.description,
        assigned_to: "Support Queue",
        sla_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        created_at: now,
        updated_at: now,
      },
    };
  }

  async getTicketStatus(
    ticketId: string
  ): Promise<IntegrationResponse<ITSMTicket>> {
    console.log("[ITSM] getTicketStatus stub called:", ticketId);

    const now = new Date().toISOString();
    return {
      success: true,
      message: "Ticket retrieved successfully (stub)",
      status_code: 200,
      data: {
        ticket_id: ticketId,
        reference: "REF-A1B2C3D4",
        type: "general_enquiry",
        status: "in_progress",
        subject: "Tax filing clarification",
        description:
          "Taxpayer requests clarification on annual filing requirements.",
        assigned_to: "Adebayo Olufemi",
        sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        updated_at: now,
      },
    };
  }

  async updateTicket(
    ticketId: string,
    updates: Partial<{
      status: string;
      subject: string;
      description: string;
      assigned_to: string;
      priority: string;
    }>
  ): Promise<IntegrationResponse<ITSMTicket>> {
    console.log(
      "[ITSM] updateTicket stub called:",
      ticketId,
      JSON.stringify(updates)
    );

    const now = new Date().toISOString();
    return {
      success: true,
      message: "Ticket updated successfully (stub)",
      status_code: 200,
      data: {
        ticket_id: ticketId,
        reference: "REF-A1B2C3D4",
        type: "general_enquiry",
        status: updates.status ?? "in_progress",
        subject: updates.subject ?? "Tax filing clarification",
        description:
          updates.description ??
          "Taxpayer requests clarification on annual filing requirements.",
        assigned_to: updates.assigned_to ?? "Adebayo Olufemi",
        sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        updated_at: now,
      },
    };
  }

  async addComment(
    ticketId: string,
    comment: string,
    author: string
  ): Promise<IntegrationResponse> {
    console.log(
      "[ITSM] addComment stub called:",
      ticketId,
      comment,
      author
    );

    return {
      success: true,
      message: `Comment added to ticket ${ticketId} by ${author} (stub)`,
      status_code: 200,
    };
  }

  async escalateTicket(
    ticketId: string,
    reason: string
  ): Promise<IntegrationResponse> {
    console.log("[ITSM] escalateTicket stub called:", ticketId, reason);

    return {
      success: true,
      message: `Ticket ${ticketId} escalated successfully (stub)`,
      status_code: 200,
    };
  }
}

export default new ITSMService();
