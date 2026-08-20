/**
 * BRD §3.3 Flow 6 - Filing Support.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot, only } from "../helpers/bot.js";
import { completeTier1, TEST_TIN } from "../helpers/auth.js";
import { resetAI } from "../helpers/ai.js";

describe("flow: filing_support", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("gives guidance for the tax type that was selected", async () => {
    const bot = new Bot("2348030000901");
    await bot.pick("filing_support");
    await completeTier1(bot);

    await bot.pick("VAT");
    await bot.say(TEST_TIN);
    const guide = only(await bot.tap("guidance"));

    expect(guide.body).toMatch(/VAT Filing Guide/);
    expect(guide.body).not.toMatch(/CIT Filing Guide/);
  });

  it("switches tax type when a row from an earlier list is tapped", async () => {
    const bot = new Bot("2348030000902");
    await bot.pick("filing_support");
    await completeTier1(bot);

    // Work through CIT first...
    await bot.pick("CIT");
    await bot.say(TEST_TIN);
    const citGuide = only(await bot.tap("guidance"));
    expect(citGuide.body).toMatch(/CIT Filing Guide/);

    // ...then tap VAT from the original list, which WhatsApp still allows.
    const switched = only(await bot.pick("VAT"));
    expect(switched.body).toMatch(/VAT/);

    await bot.say(TEST_TIN);
    const vatGuide = only(await bot.tap("guidance"));
    expect(vatGuide.body).toMatch(/VAT Filing Guide/);
    expect(vatGuide.body).not.toMatch(/CIT Filing Guide/);
  });
});
