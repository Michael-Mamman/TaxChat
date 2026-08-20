/**
 * BRD §3.3 Flow 5 - Profile Update.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot, only } from "../helpers/bot.js";
import { completeTier2 } from "../helpers/auth.js";
import { resetAI } from "../helpers/ai.js";

describe("flow: profile_update", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("does not trap the taxpayer on the verification step", async () => {
    const bot = new Bot("2348030001001");
    await bot.pick("profile_update");
    await completeTier2(bot);

    await bot.pick("email");
    await bot.say("someone@example.com");

    // Tapping a different field from the earlier list must move on, not repeat
    // "enter a valid 6-digit code" forever.
    const switched = only(await bot.pick("phone"));
    expect(switched.body).not.toMatch(/6-digit/);
    expect(switched.body).toMatch(/phone/i);
  });

  it("explains what it wants when the input is not a code", async () => {
    const bot = new Bot("2348030001002");
    await bot.pick("profile_update");
    await completeTier2(bot);
    await bot.pick("email");
    await bot.say("someone@example.com");

    const reply = only(await bot.say("what is going on"));
    expect(reply.body).toMatch(/6-digit/);
    // and must always offer a way out
    expect(reply.body).toMatch(/MENU|AGENT/);
  });
});
