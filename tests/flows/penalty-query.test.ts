/**
 * BRD §3.3 Flow 8 - Penalty Query and Waiver.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot, only } from "../helpers/bot.js";
import { completeAuth, TEST_TIN } from "../helpers/auth.js";
import { resetAI } from "../helpers/ai.js";

describe("flow: penalty_query", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("records the scope and amount on an all-penalties waiver", async () => {
    const bot = new Bot("2348030001601");
    await bot.pick("penalty_query");
    await completeAuth(bot);

    const list = (await bot.say(TEST_TIN)).at(-1)!;
    expect(list.body).toMatch(/Total Penalties/i);

    await bot.tap("waiver_all");
    await bot.pick("financial_hardship");
    const submitted = only(await bot.say("I do not have the necessary means to repay"));

    // The ticket previously read "Single penalty: N/A" and "NGN 0" even though
    // the taxpayer had asked to waive every penalty on the account.
    expect(submitted.body).toMatch(/waiver request has been submitted/i);
    expect(submitted.body).not.toMatch(/N\/A/);
    expect(submitted.body).not.toMatch(/NGN 0\b/);
    expect(submitted.body).toMatch(/50,000/);
  });

  it("does not submit an empty waiver when the taxpayer doubles back", async () => {
    const bot = new Bot("2348030001602");
    await bot.pick("penalty_query");
    await completeAuth(bot);
    await bot.say(TEST_TIN);

    // The path taken in testing: waiver-all, then stale taps on Pay All, Pay
    // Penalty and the singular Request Waiver. However it ends up, it must
    // never file a ticket for "N/A" worth NGN 0 - and must never go quiet.
    const seen: string[] = [];
    for (const step of ["waiver_all", "pay_all", "pay", "waiver"]) {
      const replies = await bot.tap(step);
      expect(replies.length, `no reply to ${step}`).toBeGreaterThan(0);
      seen.push(...replies.map((r) => r.body));
    }
    seen.push(...(await bot.pick("financial_hardship")).map((r) => r.body));
    seen.push(...(await bot.say("I do not have the means to repay")).map((r) => r.body));

    const transcript = seen.join("\n");
    expect(transcript).not.toMatch(/Single penalty: N\/A/);
    expect(transcript).not.toMatch(/Amount: NGN 0\b/);
  });
});
