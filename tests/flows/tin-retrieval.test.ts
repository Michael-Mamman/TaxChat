/**
 * BRD §3.3 Flow 2 - TIN Retrieval, driven start to finish.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import ConversationContext from "../../src/models/conversationContext.model.js";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot, only } from "../helpers/bot.js";
import { completeTier1 } from "../helpers/auth.js";
import { resetAI } from "../helpers/ai.js";

describe("flow: tin_retrieval", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("runs to completion and releases the conversation afterwards", async () => {
    const bot = new Bot("2348030000201");

    // Cold open: welcome text plus the ten-service main menu.
    const hello = await bot.say("hi");
    const menu = hello.find((r) => r.kind === "list");
    expect(menu).toBeDefined();
    expect(menu!.options).toHaveLength(10);

    // Selecting a Tier 1 service gates on TIN + OTP first.
    const gate = only(await bot.pick("tin_retrieval"));
    expect(gate.body).toMatch(/TIN/i);
    await completeTier1(bot);

    // The flow resumes and asks for the registered name.
    const askName = only(await bot.say("Amina Bello Ibrahim"));
    // The flow's own wording must be the interactive body, not a generic prompt.
    expect(askName.body).toMatch(/Amina Bello Ibrahim/);
    expect(askName.options.map((o) => o.id)).toEqual(["nin", "phone", "email", "dob"]);

    // Identifier type, then value.
    const askNin = only(await bot.pick("nin"));
    expect(askNin.body).toMatch(/11-digit/i);

    const matches = only(await bot.say("12345678901"));
    expect(matches.body).toMatch(/2 possible matches/);
    // FR-2.6: the TIN must never be shown in full.
    expect(matches.body).not.toMatch(/1234567890\b/);

    // Choosing a match reads back results captured on the previous turn.
    const chosen = only(await bot.say("1"));
    expect(chosen.kind).toBe("buttons");
    expect(chosen.body).toMatch(/Nassarawa Tax Office/);
    expect(chosen.options.map((o) => o.id)).toEqual(["send_whatsapp", "send_email", "done"]);
    for (const opt of chosen.options) {
      expect(opt.title.length).toBeLessThanOrEqual(20);
    }

    // Completion.
    const done = await bot.tap("send_email");
    expect(done.some((r) => /Amina Bello Ibrahim/.test(r.body))).toBe(true);

    // The flow must release the conversation, or the next message re-enters it.
    const end = await ConversationContext.findOne({ phone: bot.phone });
    expect(end?.current_flow).toBeUndefined();
    expect(end?.awaiting_input).toBeUndefined();

    // And the bot is usable again.
    const again = await bot.say("hello");
    expect(again.some((r) => r.kind === "list")).toBe(true);
  });
});
