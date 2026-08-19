/**
 * WhatsApp field limits.
 *
 * Flows produce more than three options in several places - taxClearance offers
 * one action per compliance gap plus "Speak to an Officer" - and truncating to
 * the three-button limit drops the last option, which is the escape hatch, for
 * exactly the taxpayer who most needs it.
 */
import { describe, it, expect, beforeEach } from "vitest";
import whatsappService from "../../src/services/whatsapp/whatsapp.service.js";
import { WA } from "../../src/services/whatsapp/whatsapp.limits.js";
import { drainOutbound, resetOutbound } from "../helpers/outbound.js";

const to = "2348030000401";

describe("whatsapp field limits", () => {
  beforeEach(resetOutbound);

  it("keeps every option when there are more than three", async () => {
    await whatsappService.sendChoice(to, "You have gaps to resolve.", [
      { id: "pay_now", title: "Pay Outstanding" },
      { id: "file_returns", title: "File Returns" },
      { id: "waiver", title: "Request Waiver" },
      { id: "escalate", title: "Speak to Officer" },
    ]);

    const reply = drainOutbound()[0]!;
    expect(reply.kind).toBe("list");
    expect(reply.options.map((o) => o.id)).toContain("escalate");
    expect(reply.options).toHaveLength(4);
  });

  it("renders three short options as reply buttons", async () => {
    await whatsappService.sendChoice(to, "Send your certificate?", [
      { id: "send_whatsapp", title: "Send on WhatsApp" },
      { id: "send_email", title: "Send via Email" },
      { id: "done", title: "No, I'm done" },
    ]);

    const reply = drainOutbound()[0]!;
    expect(reply.kind).toBe("buttons");
    expect(reply.options).toHaveLength(3);
  });

  it("does not truncate an option title past readability", async () => {
    await whatsappService.sendChoice(to, "Pick one.", [
      { id: "a", title: "Follow Up on Remittance" },
      { id: "b", title: "Cancel" },
    ]);

    const reply = drainOutbound()[0]!;
    // Too long for a reply button, so it renders as a list where it fits whole.
    expect(reply.kind).toBe("list");
    expect(reply.options[0]!.title).toBe("Follow Up on Remittance");
  });

  it("never emits a reply-button title over the limit", async () => {
    await whatsappService.sendInteractiveButtonMessage(to, "Body", [
      { id: "a", title: "An Extremely Long Button Title That Cannot Fit" },
    ]);

    const reply = drainOutbound()[0]!;
    expect(reply.options[0]!.title.length).toBeLessThanOrEqual(WA.BUTTON_TITLE_MAX);
  });

  it("splits an over-long body instead of losing the tail", async () => {
    const long = "A".repeat(900) + "\n\n" + "The important closing question?";
    await whatsappService.sendChoice(to, long + "\n\n" + "B".repeat(400), [
      { id: "yes", title: "Yes" },
      { id: "no", title: "No" },
    ]);

    const replies = drainOutbound();
    expect(replies).toHaveLength(2);
    expect(replies[0]!.kind).toBe("text");
    expect(replies[1]!.body.length).toBeLessThanOrEqual(WA.INTERACTIVE_BODY_MAX);
    // Nothing may be silently dropped.
    const combined = replies.map((r) => r.body).join("\n\n");
    expect(combined).toContain("The important closing question?");
    expect(combined.length).toBeGreaterThanOrEqual(1300);
  });
});
