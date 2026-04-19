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
    console.log("[itsm.service::createTicket] ENTER", {
      type: payload.type,
      subjectLength: payload.subject?.length,
      hasTin: !!payload.taxpayer_tin,
      hasPhone: !!payload.phone,
      hasEmail: !!payload.email,
      priority: payload.priority,
      baseUrl: this.baseUrl,
    });
    console.log("[ITSM] createTicket stub called:", JSON.stringify(payload));

    const now = new Date().toISOString();
    console.log("[itsm.service::createTicket] EXIT", {
      status: 201,
      type: payload.type,
    });
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
    console.log("[itsm.service::getTicketStatus] ENTER", { ticketId });
    console.log("[ITSM] getTicketStatus stub called:", ticketId);

    const now = new Date().toISOString();
    console.log("[itsm.service::getTicketStatus] EXIT", {
      ticketId,
      status: 200,
    });
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
    console.log("[itsm.service::updateTicket] ENTER", {
      ticketId,
      updateKeys: Object.keys(updates ?? {}),
    });
    console.log(
      "[ITSM] updateTicket stub called:",
      ticketId,
      JSON.stringify(updates)
    );

    if (updates.status) {
      console.log("[itsm.service::updateTicket] branch: status update provided");
    } else {
      console.log("[itsm.service::updateTicket] branch: default status in_progress");
    }

    const now = new Date().toISOString();
    console.log("[itsm.service::updateTicket] EXIT", {
      ticketId,
      status: 200,
    });
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
    console.log("[itsm.service::addComment] ENTER", {
      ticketId,
      commentLength: comment?.length,
      author,
    });
    console.log(
      "[ITSM] addComment stub called:",
      ticketId,
      comment,
      author
    );

    console.log("[itsm.service::addComment] EXIT", { ticketId, status: 200 });
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
    console.log("[itsm.service::escalateTicket] ENTER", {
      ticketId,
      reasonLength: reason?.length,
    });
    console.log("[ITSM] escalateTicket stub called:", ticketId, reason);

    console.log("[itsm.service::escalateTicket] EXIT", { ticketId, status: 200 });
    return {
      success: true,
      message: `Ticket ${ticketId} escalated successfully (stub)`,
      status_code: 200,
    };
  }
}

export default new ITSMService();
