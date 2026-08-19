/**
 * Inbound webhook parsing.
 *
 * This mapping is where an interactive reply's *id* becomes the message text,
 * which is the detail the conversation router has to account for.
 */
import { describe, it, expect } from "vitest";
import { parseWebhookMessage } from "../src/controller/whatsapp.controller.js";

const envelope = (message: Record<string, unknown>, phoneNumberId = process.env.PHONE_NUMBER_ID) => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA_TEST",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "2348000000000", phone_number_id: phoneNumberId },
            contacts: [{ profile: { name: "Amina" }, wa_id: "2348030000001" }],
            messages: [{ id: "wamid.TEST.1", from: "2348030000001", timestamp: "1700000000", ...message }],
          },
        },
      ],
    },
  ],
});

describe("parseWebhookMessage", () => {
  it("maps a text message to its body", () => {
    const parsed = parseWebhookMessage(envelope({ type: "text", text: { body: "I forgot my TIN" } }));
    expect(parsed?.context.text).toBe("I forgot my TIN");
    expect(parsed?.context.messageType).toBe("text");
    expect(parsed?.context.contactName).toBe("Amina");
    expect(parsed?.messageId).toBe("wamid.TEST.1");
  });

  it("maps a list reply to its id, not its title", () => {
    const parsed = parseWebhookMessage(
      envelope({ type: "interactive", interactive: { type: "list_reply", list_reply: { id: "tin_retrieval", title: "Find my TIN" } } }),
    );
    expect(parsed?.context.text).toBe("tin_retrieval");
    expect(parsed?.context.interactiveResponse).toMatchObject({ id: "tin_retrieval" });
  });

  it("maps a button reply to its id", () => {
    const parsed = parseWebhookMessage(
      envelope({ type: "interactive", interactive: { type: "button_reply", button_reply: { id: "by_agent_tin", title: "WHT Agent TIN" } } }),
    );
    expect(parsed?.context.text).toBe("by_agent_tin");
  });

  it("exposes media ids for image and document messages", () => {
    const parsed = parseWebhookMessage(envelope({ type: "image", image: { id: "media-123" } }));
    expect(parsed?.context.mediaId).toBe("media-123");
    expect(parsed?.context.text).toBe("media:media-123");
  });

  it("ignores payloads addressed to another number", () => {
    expect(parseWebhookMessage(envelope({ type: "text", text: { body: "hi" } }, "SOMEONE_ELSE"))).toBeNull();
  });

  it("ignores payloads with no messages, such as status callbacks", () => {
    expect(parseWebhookMessage({ entry: [{ changes: [{ value: { statuses: [{ status: "delivered" }] } }] }] })).toBeNull();
  });
});
