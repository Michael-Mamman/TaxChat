/**
 * A verification code the taxpayer never receives blocks nine of the ten
 * flows, since only general_enquiry is Tier 0.
 *
 * The SMS gateway is an unconfigured stub: it reported "sent successfully"
 * while nothing left the server, so taxpayers waited for a message that never
 * arrived and then hit "No active OTP found" once it expired.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import OTP from "../../src/models/otp.model.js";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot, only } from "../helpers/bot.js";
import { TEST_TIN, currentOtp } from "../helpers/auth.js";
import { resetAI } from "../helpers/ai.js";

describe("OTP delivery", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("actually sends the code to the taxpayer", async () => {
    const bot = new Bot("2348030000701");
    await bot.pick("tin_retrieval");

    const replies = await bot.say(TEST_TIN);
    const code = await currentOtp(bot.phone);

    // The code must appear in something the taxpayer received, not just in Mongo.
    expect(replies.some((r) => r.body.includes(code))).toBe(true);
  });

  it("does not treat an ordinary message as a failed verification attempt", async () => {
    const bot = new Bot("2348030000702");
    await bot.pick("tin_retrieval");
    await bot.say(TEST_TIN);

    const reply = only(await bot.say("Hello"));
    expect(reply.body).not.toMatch(/no active otp/i);
    expect(reply.body).toMatch(/6-digit/i);

    // An idle greeting must not burn a verification attempt.
    const otp = await OTP.findOne({ phone: bot.phone, is_used: false });
    expect(otp?.attempts).toBe(0);
  });

  it("issues a fresh code on request", async () => {
    const bot = new Bot("2348030000703");
    await bot.pick("tin_retrieval");
    await bot.say(TEST_TIN);
    const first = await currentOtp(bot.phone);

    const replies = await bot.say("resend");
    const second = await currentOtp(bot.phone);

    expect(second).not.toBe(first);
    expect(replies.some((r) => r.body.includes(second))).toBe(true);
  });

  it("completes verification and starts the pending flow", async () => {
    const bot = new Bot("2348030000704");
    await bot.pick("tin_retrieval");
    await bot.say(TEST_TIN);

    const replies = await bot.say(await currentOtp(bot.phone));
    expect(replies.some((r) => /full name/i.test(r.body))).toBe(true);
  });
});

describe("TIN format", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("rejects a badly-formed TIN at authentication, not later", async () => {
    const bot = new Bot("2348030001101");
    await bot.pick("penalty_query");

    // 13 digits: previously accepted here, then rejected by the flow it unlocked.
    const reply = only(await bot.say("2513103687075"));
    expect(reply.body).toMatch(/10-digit/);

    // and a well-formed one still works
    const ok = await bot.say(TEST_TIN);
    expect(ok.some((r) => /verification code/i.test(r.body))).toBe(true);
  });

  it("accepts a TIN written with separators", async () => {
    const bot = new Bot("2348030001102");
    await bot.pick("penalty_query");
    const reply = await bot.say("123456-7890");
    expect(reply.some((r) => /verification code/i.test(r.body))).toBe(true);
  });
});

describe("TIN registration authentication", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("does not ask for a TIN in order to issue one", async () => {
    const bot = new Bot("2348030001401");

    // BRD §3.2 puts TIN registration at Tier 3, whose method is NIN plus a
    // facial match - deliberately not TIN and OTP, because the taxpayer
    // registering has no TIN to give.
    const reply = only(await bot.pick("tin_registration"));

    expect(reply.body).not.toMatch(/enter your TIN/i);
    expect(reply.body).toMatch(/NIN|BVN/i);
  });

  it("reaches the registration flow after identity verification", async () => {
    const bot = new Bot("2348030001402");
    await bot.pick("tin_registration");

    await bot.say("12345678901");          // NIN
    const replies = await bot.say("12345678901"); // KYC

    expect(replies.some((r) => /registration/i.test(r.body))).toBe(true);
  });
});

describe("identity format checks", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("rejects a NIN that is not 11 digits", async () => {
    const bot = new Bot("2348030001501");
    await bot.pick("tin_registration");

    // The stub approves whatever it is given, so the format check has to be
    // ours: a 10-digit number was previously accepted as a NIN.
    const reply = only(await bot.say("2266383733"));
    expect(reply.body).toMatch(/11-digit/);

    const ok = await bot.say("12345678901");
    expect(ok.some((r) => /verified/i.test(r.body))).toBe(true);
  });
});
