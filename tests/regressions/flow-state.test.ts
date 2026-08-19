/**
 * Regression cover for conversation state that must survive between turns.
 *
 * Flows accumulate answers by mutating the data object they are handed, and the
 * router is the only place that can make those mutations durable.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import ConversationContext from "../../src/models/conversationContext.model.js";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot, only } from "../helpers/bot.js";
import { queueClassification, resetAI } from "../helpers/ai.js";
import { completeTier1 } from "../helpers/auth.js";

describe("conversation state", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("persists data a flow collects across turns", async () => {
    const bot = new Bot("2348030000101");

    await bot.pick("tin_retrieval");
    await completeTier1(bot);
    await bot.say("Amina Bello Ibrahim");

    const ctx = await ConversationContext.findOne({ phone: bot.phone });
    const data = ctx?.flow_data as Record<string, unknown>;
    expect(data.name).toBe("Amina Bello Ibrahim");
  });

  it("carries earlier answers forward into later steps", async () => {
    const bot = new Bot("2348030000102");

    await bot.pick("tin_retrieval");
    await completeTier1(bot);
    await bot.say("Amina Bello Ibrahim");
    await bot.pick("nin");

    const ctx = await ConversationContext.findOne({ phone: bot.phone });
    const data = ctx?.flow_data as Record<string, unknown>;
    // Both must be present: the identifier type chosen this turn, and the name
    // captured two turns ago.
    expect(data.identifier_type).toBe("nin");
    expect(data.name).toBe("Amina Bello Ibrahim");
  });

  it("lets the taxpayer escape a flow by typing MENU", async () => {
    const bot = new Bot("2348030000103");

    await bot.pick("tin_retrieval");
    await completeTier1(bot);
    const mid = await ConversationContext.findOne({ phone: bot.phone });
    expect(mid?.current_flow).toBe("tin_retrieval");

    await bot.say("menu");

    const after = await ConversationContext.findOne({ phone: bot.phone });
    expect(after?.current_flow).toBeUndefined();
    expect(after?.awaiting_input).toBeUndefined();
    expect(after?.flow_data).toEqual({});
  });
});
