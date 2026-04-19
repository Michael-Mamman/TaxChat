import itsmService from "../integrations/itsm.service.js";
import ConversationContext from "../../models/conversationContext.model.js";
import whatsappService from "../whatsapp/whatsapp.service.js";
import auditLogService from "../auditLog.service.js";
class EscalationService {
    async escalateToAgent(phone, reason, context) {
        console.log('[escalation.service::escalateToAgent] ENTER', { phone, reason, hasContext: !!context });
        try {
            console.log('[escalation.service::escalateToAgent] branch: try create ticket');
            // Create ITSM ticket for escalation
            const ticket = await itsmService.createTicket({
                type: "GENERAL",
                subject: `Escalation: ${reason}`,
                description: `Taxpayer requested escalation.\nReason: ${reason}\nContext: ${JSON.stringify(context || {})}`,
                phone,
                priority: "high",
            });
            console.log('[escalation.service::escalateToAgent] branch: ticket created', { ticketId: ticket.data?.ticket_id });
            // Mark conversation as escalated
            await ConversationContext.findOneAndUpdate({ phone }, {
                is_escalated: true,
                escalated_to: ticket.data?.assigned_to,
                escalation_ticket_id: ticket.data?.ticket_id,
                current_flow: undefined,
                awaiting_input: undefined,
            }, { upsert: true });
            console.log('[escalation.service::escalateToAgent] branch: conversation marked escalated');
            // Notify taxpayer
            await whatsappService.sendMessage(phone, `You're being connected to an NRS officer. They will have the context of our conversation.\n\nReference: ${ticket.data?.reference || "N/A"}\n\nPlease wait, an officer will respond shortly. During business hours (Mon-Fri, 8AM-5PM WAT), average wait time is 5-10 minutes.`);
            console.log('[escalation.service::escalateToAgent] branch: taxpayer notified');
            await auditLogService.log(phone, "escalated_to_agent", { reason, ticket_id: ticket.data?.ticket_id });
            const ticketId = ticket.data?.ticket_id;
            if (ticketId != null) {
                console.log('[escalation.service::escalateToAgent] branch: ticketId present');
            }
            else {
                console.log('[escalation.service::escalateToAgent] branch: ticketId missing');
            }
            console.log('[escalation.service::escalateToAgent] EXIT', { success: true, ticketId });
            return {
                success: true,
                message: "Escalated to live agent",
                ...(ticketId != null ? { ticket_id: ticketId } : {}),
            };
        }
        catch (err) {
            console.log('[escalation.service::escalateToAgent] branch: catch error');
            console.error("[Escalation] Failed:", err);
            await whatsappService.sendMessage(phone, "I'm sorry, I'm unable to connect you to an agent right now. Please try again later or call the NRS helpline.");
            console.log('[escalation.service::escalateToAgent] EXIT', { success: false });
            return { success: false, message: "Escalation failed" };
        }
    }
    async forwardToAgent(phone, message) {
        console.log('[escalation.service::forwardToAgent] ENTER', { phone, messageLength: message?.length });
        const context = await ConversationContext.findOne({ phone });
        if (!context?.escalation_ticket_id) {
            console.log('[escalation.service::forwardToAgent] branch: no escalation ticket on context');
            console.log('[escalation.service::forwardToAgent] EXIT', { forwarded: false });
            return;
        }
        console.log('[escalation.service::forwardToAgent] branch: forwarding comment to ITSM');
        // Forward message to ITSM ticket as a comment
        await itsmService.addComment(context.escalation_ticket_id, message, `Taxpayer (${phone})`);
        console.log('[escalation.service::forwardToAgent] EXIT', { forwarded: true });
    }
    async returnFromEscalation(phone, resolution) {
        console.log('[escalation.service::returnFromEscalation] ENTER', { phone, hasResolution: !!resolution });
        await ConversationContext.findOneAndUpdate({ phone }, {
            is_escalated: false,
            escalated_to: undefined,
            escalation_ticket_id: undefined,
        });
        console.log('[escalation.service::returnFromEscalation] branch: context cleared');
        let message;
        if (resolution) {
            console.log('[escalation.service::returnFromEscalation] branch: resolution present');
            message = `Your query has been resolved: ${resolution}\n\nIs there anything else I can help with? Type MENU to see all services.`;
        }
        else {
            console.log('[escalation.service::returnFromEscalation] branch: no resolution');
            message = "Your query has been resolved. Is there anything else I can help with? Type MENU to see all services.";
        }
        await whatsappService.sendMessage(phone, message);
        await auditLogService.log(phone, "returned_from_escalation", { resolution });
        console.log('[escalation.service::returnFromEscalation] EXIT', { phone });
    }
}
export default new EscalationService();
