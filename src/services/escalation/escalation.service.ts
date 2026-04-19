import itsmService from "../integrations/itsm.service.js";
import ConversationContext from "../../models/conversationContext.model.js";
import whatsappService from "../whatsapp/whatsapp.service.js";
import auditLogService from "../auditLog.service.js";

class EscalationService {
  async escalateToAgent(
    phone: string,
    reason: string,
    context?: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string; ticket_id?: string }> {
    try {
      // Create ITSM ticket for escalation
      const ticket = await itsmService.createTicket({
        type: "GENERAL",
        subject: `Escalation: ${reason}`,
        description: `Taxpayer requested escalation.\nReason: ${reason}\nContext: ${JSON.stringify(context || {})}`,
        phone,
        priority: "high",
      });

      // Mark conversation as escalated
      await ConversationContext.findOneAndUpdate(
        { phone },
        {
          is_escalated: true,
          escalated_to: ticket.data?.assigned_to,
          escalation_ticket_id: ticket.data?.ticket_id,
          current_flow: undefined,
          awaiting_input: undefined,
        },
        { upsert: true },
      );

      // Notify taxpayer
      await whatsappService.sendMessage(
        phone,
        `You're being connected to an NRS officer. They will have the context of our conversation.\n\nReference: ${ticket.data?.reference || "N/A"}\n\nPlease wait, an officer will respond shortly. During business hours (Mon-Fri, 8AM-5PM WAT), average wait time is 5-10 minutes.`,
      );

      await auditLogService.log(phone, "escalated_to_agent", { reason, ticket_id: ticket.data?.ticket_id });

      const ticketId = ticket.data?.ticket_id;
      return {
        success: true,
        message: "Escalated to live agent",
        ...(ticketId != null ? { ticket_id: ticketId } : {}),
      };
    } catch (err) {
      console.error("[Escalation] Failed:", err);
      await whatsappService.sendMessage(
        phone,
        "I'm sorry, I'm unable to connect you to an agent right now. Please try again later or call the NRS helpline.",
      );
      return { success: false, message: "Escalation failed" };
    }
  }

  async forwardToAgent(phone: string, message: string): Promise<void> {
    const context = await ConversationContext.findOne({ phone });
    if (!context?.escalation_ticket_id) return;

    // Forward message to ITSM ticket as a comment
    await itsmService.addComment(
      context.escalation_ticket_id,
      message,
      `Taxpayer (${phone})`,
    );
  }

  async returnFromEscalation(
    phone: string,
    resolution?: string,
  ): Promise<void> {
    await ConversationContext.findOneAndUpdate(
      { phone },
      {
        is_escalated: false,
        escalated_to: undefined,
        escalation_ticket_id: undefined,
      },
    );

    const message = resolution
      ? `Your query has been resolved: ${resolution}\n\nIs there anything else I can help with? Type MENU to see all services.`
      : "Your query has been resolved. Is there anything else I can help with? Type MENU to see all services.";

    await whatsappService.sendMessage(phone, message);

    await auditLogService.log(phone, "returned_from_escalation", { resolution });
  }
}

export default new EscalationService();
