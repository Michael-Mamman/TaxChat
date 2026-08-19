/**
 * Escalation must be a door that opens from both sides.
 *
 * No officer workbench is connected, so nothing calls returnFromEscalation on
 * its own. Without a taxpayer-side exit, asking for a human left the number
 * permanently unusable - every later message was forwarded to a ticket nobody
 * reads, and the bot never replied again.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import ConversationContext from "../../src/models/conversationContext.model.js";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot } from "../helpers/bot.js";
import { resetAI } from "../helpers/ai.js";

describe("escalation exit", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("acknowledges messages sent while escalated", async () => {
    const bot = new Bot("2348030000501");
    await bot.say("agent");

    const replies = await bot.say("is anyone there?");
    expect(replies.length).toBeGreaterThan(0);
    expect(replies[0]!.body).toMatch(/officer/i);
  });

  it("lets the taxpayer leave the handover with MENU", async () => {
    const bot = new Bot("2348030000502");
    await bot.say("agent");
    expect((await ConversationContext.findOne({ phone: bot.phone }))?.is_escalated).toBe(true);

    const replies = await bot.say("menu");

    const after = await ConversationContext.findOne({ phone: bot.phone });
    expect(after?.is_escalated).toBe(false);
    expect(replies.some((r) => r.kind === "list")).toBe(true);
  });

  it.each(["exit", "cancel", "stop", "end"])("also leaves on '%s'", async (word) => {
    const bot = new Bot(`234803000060${["exit", "cancel", "stop", "end"].indexOf(word)}`);
    await bot.say("agent");
    await bot.say(word);
    expect((await ConversationContext.findOne({ phone: bot.phone }))?.is_escalated).toBe(false);
  });

  it("recovers if the handover left no ticket to forward to", async () => {
    const bot = new Bot("2348030000503");
    await bot.say("agent");
    // Simulate a half-failed handover: escalated, but the ticket id is gone.
    await ConversationContext.findOneAndUpdate(
      { phone: bot.phone },
      { $unset: { escalation_ticket_id: 1 } },
    );

    const replies = await bot.say("hello?");

    expect(replies.length).toBeGreaterThan(0);
    expect((await ConversationContext.findOne({ phone: bot.phone }))?.is_escalated).toBe(false);
  });

  it("is usable again after leaving the handover", async () => {
    const bot = new Bot("2348030000504");
    await bot.say("agent");
    await bot.say("menu");

    const replies = await bot.pick("general_enquiry");
    expect(replies.length).toBeGreaterThan(0);
    const ctx = await ConversationContext.findOne({ phone: bot.phone });
    expect(ctx?.current_flow).toBe("general_enquiry");
  });
});
