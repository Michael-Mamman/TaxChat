/**
 * Flows that offer to move the taxpayer on must actually move them.
 *
 * Four returns said "I'll redirect you to..." and then completed the flow
 * without starting anything, leaving the taxpayer holding a message that
 * promised a redirect that never came. In testing this swallowed both
 * "Pay Outstanding" and "File Pending Returns" from the TCC compliance menu.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import ConversationContext from "../../src/models/conversationContext.model.js";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot } from "../helpers/bot.js";
import { completeTier2, TEST_TIN } from "../helpers/auth.js";
import { resetAI } from "../helpers/ai.js";

/** Drive Tax Clearance to the compliance-gap menu. */
async function toComplianceGaps(bot: Bot) {
  await bot.pick("tax_clearance");
  await completeTier2(bot);
  return bot.say(TEST_TIN);
}

describe("flow handover", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("offers every resolution option, including the escape hatch", async () => {
    const bot = new Bot("2348030001201");
    const gaps = (await toComplianceGaps(bot)).at(-1)!;

    // Four options: three actions plus "Speak to an Officer". Rendering these
    // as reply buttons would silently drop the fourth.
    expect(gaps.options.map((o) => o.id)).toContain("escalate");
    expect(gaps.options.length).toBeGreaterThan(3);
  });

  it("answers Pay Outstanding instead of falling silent", async () => {
    const bot = new Bot("2348030001202");
    await toComplianceGaps(bot);

    // This threw on undefined liabilities and the error was swallowed, so the
    // tap produced no reply at all.
    const replies = await bot.tap("pay_now");

    expect(replies.length).toBeGreaterThan(0);
    expect(replies.at(-1)!.body).toMatch(/outstanding balance/i);
  });

  it("hands the taxpayer to payment confirmation when they say they have paid", async () => {
    const bot = new Bot("2348030001203");
    await toComplianceGaps(bot);
    await bot.tap("pay_now");

    const replies = await bot.tap("confirm_payment");
    const ctx = await ConversationContext.findOne({ phone: bot.phone });

    expect(replies.length).toBeGreaterThan(0);
    expect(ctx?.current_flow).toBe("payment_confirmation");
  });

  it("answers File Pending Returns instead of falling silent", async () => {
    const bot = new Bot("2348030001204");
    await toComplianceGaps(bot);

    const replies = await bot.tap("file_returns");

    expect(replies.length).toBeGreaterThan(0);
  });

  it("never promises a redirect it does not perform", () => {
    // Guard the phrasing itself: the dead ends existed because these messages
    // were written as an intention rather than as an action.
    const dir = "src/services/flows";
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith(".flow.ts"))
      .filter((f) => /redirect you/i.test(readFileSync(`${dir}/${f}`, "utf8")));

    expect(offenders).toEqual([]);
  });
});
