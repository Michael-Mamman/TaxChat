/**
 * Regression cover for how inbound messages are routed.
 *
 * Interactive replies carry an internal id rather than anything the taxpayer
 * wrote, so keyword matching must not see them; free-text keywords must be
 * specific enough not to hijack ordinary sentences.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import ConversationContext from "../../src/models/conversationContext.model.js";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot, only } from "../helpers/bot.js";
import { queueClassification, resetAI } from "../helpers/ai.js";
import { completeTier1 } from "../helpers/auth.js";

describe("message routing", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("does not escalate when a reply id merely contains 'agent'", async () => {
    const bot = new Bot("2348030000104");

    await bot.pick("wht_credit_note");
    await completeTier1(bot);
    await bot.pick("by_agent_tin");

    const ctx = await ConversationContext.findOne({ phone: bot.phone });
    expect(ctx?.is_escalated).toBeFalsy();
    expect(ctx?.current_flow).toBe("wht_credit_note");
  });

  it("does not reset to the main menu when a reply id equals 'back'", async () => {
    const bot = new Bot("2348030000105");

    await bot.pick("penalty_query");
    await completeTier1(bot);
    await bot.tap("back");

    const ctx = await ConversationContext.findOne({ phone: bot.phone });
    expect(ctx?.current_flow).toBe("penalty_query");
  });

  it("treats 'help' as a request for a human, but not 'help me file my VAT'", async () => {
    const escalating = new Bot("2348030000106");
    await escalating.say("help");
    const escalated = await ConversationContext.findOne({ phone: escalating.phone });
    expect(escalated?.is_escalated).toBe(true);

    const asking = new Bot("2348030000107");
    queueClassification("filing_support");
    await asking.say("can you help me file my VAT");
    const notEscalated = await ConversationContext.findOne({ phone: asking.phone });
    expect(notEscalated?.is_escalated).toBeFalsy();
  });

  it("does not greet someone asking for their history", async () => {
    const bot = new Bot("2348030000108");
    queueClassification("filing_support");
    const replies = await bot.say("history");
    // A greeting would open with the welcome text; a classified message starts a flow.
    expect(replies.some((r) => /Welcome to NRS TaxChat/.test(r.body))).toBe(false);
  });
});
