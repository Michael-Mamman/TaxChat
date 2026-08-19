/**
 * Drives a conversation the way WhatsApp would.
 *
 * Each method builds a real Meta webhook payload, pushes it through the
 * controller's parser and the conversation service, and returns everything the
 * bot sent in response.
 */
import { parseWebhookMessage } from "../../src/controller/whatsapp.controller.js";
import conversationService from "../../src/services/conversation/conversation.service.js";
import { drainOutbound, resetOutbound, type Reply } from "./outbound.js";

let seq = 0;

function envelope(from: string, message: Record<string, unknown>, contactName = "Test Taxpayer") {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_TEST",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "2348000000000",
                phone_number_id: process.env.PHONE_NUMBER_ID,
              },
              contacts: [{ profile: { name: contactName }, wa_id: from }],
              messages: [{ id: `wamid.TEST.${++seq}`, from, timestamp: "1700000000", ...message }],
            },
          },
        ],
      },
    ],
  };
}

export class Bot {
  constructor(readonly phone: string = "2348030000001") {}

  private async drive(body: unknown): Promise<Reply[]> {
    resetOutbound();
    const parsed = parseWebhookMessage(body);
    if (!parsed) throw new Error("payload produced no actionable message");
    await conversationService.handleIncomingMessage(parsed.context);
    return drainOutbound();
  }

  /** Send a free-text message. */
  say(text: string): Promise<Reply[]> {
    return this.drive(envelope(this.phone, { type: "text", text: { body: text } }));
  }

  /** Tap a reply button. */
  tap(id: string, title = id): Promise<Reply[]> {
    return this.drive(
      envelope(this.phone, {
        type: "interactive",
        interactive: { type: "button_reply", button_reply: { id, title } },
      }),
    );
  }

  /** Choose a row from an interactive list. */
  pick(id: string, title = id): Promise<Reply[]> {
    return this.drive(
      envelope(this.phone, {
        type: "interactive",
        interactive: { type: "list_reply", list_reply: { id, title } },
      }),
    );
  }
}

/**
 * Assert that a turn produced exactly one outbound message, and return it.
 *
 * This is the assertion that catches duplicate sends: a result carrying both
 * `message` and `buttons` used to render as two messages showing identical text.
 */
export function only(replies: Reply[]): Reply {
  if (replies.length !== 1) {
    const summary = replies.map((r) => `  [${r.kind}] ${r.body.slice(0, 70).replace(/\n/g, " ")}`).join("\n");
    throw new Error(`expected exactly 1 reply, got ${replies.length}:\n${summary}`);
  }
  return replies[0]!;
}
