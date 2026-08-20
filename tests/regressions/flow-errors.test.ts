/**
 * A flow that throws must not become silence.
 *
 * The webhook handler catches everything and returns 200, so an exception
 * inside a flow reaches the taxpayer as no reply at all. Three separate
 * handler crashes went unnoticed that way, each looking like the bot had
 * simply stopped responding.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import ConversationContext from "../../src/models/conversationContext.model.js";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot } from "../helpers/bot.js";
import { completeAuth, TEST_TIN } from "../helpers/auth.js";
import { resetAI } from "../helpers/ai.js";

describe("flow errors", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("answers the taxpayer when a flow throws", async () => {
    const bot = new Bot("2348030001701");
    await bot.pick("penalty_query");
    await completeAuth(bot);
    await bot.say(TEST_TIN);

    // Corrupt the collected state so the next step throws on it.
    await ConversationContext.findOneAndUpdate(
      { phone: bot.phone },
      { $set: { "flow_data.penalties": "not-an-array" } },
    );

    const replies = await bot.tap("waiver_all");

    expect(replies.length).toBeGreaterThan(0);
    expect(replies[0]!.body).toMatch(/MENU|AGENT/);
  });

  it("asks which penalty rather than apologising, when none was picked", async () => {
    const bot = new Bot("2348030001702");
    await bot.pick("penalty_query");
    await completeAuth(bot);
    await bot.say(TEST_TIN);

    // "Pay Penalty" reached by doubling back through the waiver branch, so
    // the flow is past penalty selection without anything having been picked.
    await bot.tap("waiver_all");
    const replies = await bot.tap("pay");

    expect(replies.length).toBeGreaterThan(0);
    // It must recover usefully, not fall back on the generic error message.
    expect(replies.at(-1)!.body).not.toMatch(/something went wrong/i);
  });
});
