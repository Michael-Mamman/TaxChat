/**
 * BRD §3.3 Flow 4 - Payment Confirmation.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot, only } from "../helpers/bot.js";
import { completeTier1 } from "../helpers/auth.js";
import { resetAI } from "../helpers/ai.js";

const RRR = "467435785468";

describe("flow: payment_confirmation", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("confirms a payment from its reference", async () => {
    const bot = new Bot("2348030001301");
    await bot.pick("payment_confirmation");
    await completeTier1(bot);

    const reply = only(await bot.say(RRR));
    expect(reply.body).toMatch(/Payment Confirmed/i);
    expect(reply.body).toContain(RRR);
  });

  it("accepts a reference written with the RRR prefix", async () => {
    const bot = new Bot("2348030001302");
    await bot.pick("payment_confirmation");
    await completeTier1(bot);

    const reply = only(await bot.say(`RRR-${RRR}`));
    expect(reply.body).toMatch(/Payment Confirmed/i);
  });

  it("does not confirm a payment for something that is not a reference", async () => {
    const bot = new Bot("2348030001303");
    await bot.pick("payment_confirmation");
    await completeTier1(bot);

    // A stale tap on another flow's button used to be looked up and returned a
    // confirmed multi-million naira payment.
    const reply = only(await bot.say("FILE_RETURNS"));
    expect(reply.body).not.toMatch(/Payment Confirmed/i);
    expect(reply.body).toMatch(/RRR/);
  });
});
