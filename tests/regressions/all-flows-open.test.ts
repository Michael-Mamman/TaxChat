/**
 * Sweep: every flow must open cleanly.
 *
 * Covers the whole menu in one pass rather than asserting per flow. The key
 * assertion is `only()` - a result carrying both `message` and `buttons` used
 * to render as two messages with identical text, which happens in 54 places
 * across the ten flows.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import ConversationContext from "../../src/models/conversationContext.model.js";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot, only } from "../helpers/bot.js";
import { completeTier1 } from "../helpers/auth.js";
import { resetAI } from "../helpers/ai.js";
import { MAIN_MENU_OPTIONS } from "../../src/utils/constants.js";
import { WA } from "../../src/services/whatsapp/whatsapp.limits.js";

describe("every flow opens cleanly", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it.each(MAIN_MENU_OPTIONS.map((o) => o.id))("%s", async (flowId) => {
    const bot = new Bot(`23480300003${MAIN_MENU_OPTIONS.findIndex((o) => o.id === flowId).toString().padStart(2, "0")}`);

    const first = only(await bot.pick(flowId));

    // Tier 0 flows start immediately; the rest gate on TIN + OTP first.
    let opening = first;
    const ctx = await ConversationContext.findOne({ phone: bot.phone });
    if (ctx?.current_flow === "auth") {
      expect(first.body).toMatch(/TIN/i);
      const resumed = await completeTier1(bot);
      // The flow resumes during OTP verification; its opening message is the
      // last thing sent on that turn, after the "Verified" acknowledgement.
      opening = resumed[resumed.length - 1]!;
    }

    expect(opening.body.trim().length).toBeGreaterThan(0);

    // WhatsApp field limits must hold for whatever the flow rendered.
    if (opening.kind === "buttons") {
      expect(opening.options.length).toBeLessThanOrEqual(WA.REPLY_BUTTONS_MAX);
      for (const o of opening.options) {
        expect(o.title.length).toBeLessThanOrEqual(WA.BUTTON_TITLE_MAX);
      }
    }
    if (opening.kind === "list") {
      expect(opening.options.length).toBeLessThanOrEqual(WA.LIST_ROWS_MAX);
      for (const o of opening.options) {
        expect(o.title.length).toBeLessThanOrEqual(WA.ROW_TITLE_MAX);
        if (o.description) expect(o.description.length).toBeLessThanOrEqual(WA.ROW_DESCRIPTION_MAX);
      }
    }
    if (opening.kind !== "text") {
      expect(opening.body.length).toBeLessThanOrEqual(WA.INTERACTIVE_BODY_MAX);
    }
  });
});
