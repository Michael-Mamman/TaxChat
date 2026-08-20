/**
 * Regression cover for outbound message dispatch.
 *
 * A flow result carrying both a message and buttons must render as one message,
 * not as the same text sent twice.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import ConversationContext from "../../src/models/conversationContext.model.js";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot, only } from "../helpers/bot.js";
import { queueClassification, resetAI } from "../helpers/ai.js";
import { completeTier1 } from "../helpers/auth.js";

describe("outbound dispatch", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("sends each turn's text exactly once", async () => {
    const bot = new Bot("2348030000109");

    await bot.pick("tin_retrieval");
    await completeTier1(bot);
    await bot.say("Amina Bello Ibrahim");
    await bot.pick("nin");
    const replies = await bot.say("12345678901");

    const reply = only(replies);
    expect(reply.body.length).toBeGreaterThan(0);
  });
});

describe("flow completion", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("closes the conversation once, not twice", async () => {
    const bot = new Bot("2348030000801");
    await bot.pick("tin_retrieval");
    await completeTier1(bot);
    await bot.say("Amina Bello Ibrahim");
    await bot.pick("nin");
    await bot.say("12345678901");
    await bot.say("1");

    const replies = await bot.tap("done");
    const closers = replies.filter((r) => /anything else/i.test(r.body));
    expect(closers).toHaveLength(1);
  });
});
