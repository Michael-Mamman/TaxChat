/**
 * Document generation and delivery.
 *
 * The bot had offered a TIN certificate, a Tax Clearance Certificate and an
 * assessment statement since the beginning, and never sent any of them -
 * nothing generated a file and nothing called sendDocument.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { connectTestDb, resetDb, disconnectTestDb } from "../helpers/db.js";
import { Bot } from "../helpers/bot.js";
import { completeAuth, completeTier2, TEST_TIN } from "../helpers/auth.js";
import { resetAI } from "../helpers/ai.js";
import documentService from "../../src/services/documents/document.service.js";

describe("document generation", () => {
  const written: string[] = [];

  afterAll(async () => {
    // These call the generator directly, so nothing else removes the files.
    const { rmSync } = await import("node:fs");
    for (const p of written) rmSync(p, { force: true });
  });

  it("produces a real PDF for a tax clearance certificate", async () => {
    const doc = await documentService.generateTCC({
      reference: "TCC-TEST1234",
      taxpayerName: "Amina Bello Ibrahim",
      tin: "1234567890",
      validUntil: "31 December 2026",
    });
    written.push(doc.path);

    expect(existsSync(doc.path)).toBe(true);
    expect(doc.filename).toMatch(/\.pdf$/);

    const bytes = readFileSync(doc.path);
    // A PDF the taxpayer can actually open.
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("produces a statement covering every assessment", async () => {
    const doc = await documentService.generateAssessmentStatement({
      reference: "STMT-TEST1234",
      tin: "1234567890",
      assessments: [
        { tax_type: "CIT", period: "2025", assessed_amount: 2_500_000, paid_amount: 2_500_000, balance: 0, status: "Paid" },
        { tax_type: "VAT", period: "2025-Q4", assessed_amount: 780_000, paid_amount: 500_000, balance: 280_000, status: "Partially Paid" },
      ],
    });
    written.push(doc.path);

    const bytes = readFileSync(doc.path);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("gives each document a distinct file, so one cannot overwrite another", async () => {
    const [a, b] = await Promise.all([
      documentService.generateTINCertificate({
        reference: "TIN-AAA", taxpayerName: "A", tin: "1111111111", taxOffice: "Jos",
      }),
      documentService.generateTINCertificate({
        reference: "TIN-BBB", taxpayerName: "B", tin: "2222222222", taxOffice: "Abuja",
      }),
    ]);

    written.push(a.path, b.path);

    expect(a.path).not.toBe(b.path);
    expect(existsSync(a.path)).toBe(true);
    expect(existsSync(b.path)).toBe(true);
  });
});

describe("document delivery", () => {
  beforeAll(connectTestDb);
  beforeEach(async () => {
    await resetDb();
    resetAI();
  });
  afterAll(disconnectTestDb);

  it("sends the TIN certificate to the taxpayer", async () => {
    const bot = new Bot("2348030001901");
    await bot.pick("tin_retrieval");
    await completeAuth(bot);
    await bot.say("Amina Bello Ibrahim");
    await bot.pick("nin");
    await bot.say("12345678901");
    await bot.say("1");

    const replies = await bot.tap("send_whatsapp");

    const document = replies.find((r) => r.kind === "document");
    expect(document, "no document was sent").toBeDefined();
    expect(document!.body).toMatch(/TIN Certificate/i);
  });

  it("removes the generated file once it has been sent", async () => {
    const { readdirSync } = await import("node:fs");
    const before = new Set(readdirSync("uploads"));

    const bot = new Bot("2348030001902");
    await bot.pick("tin_retrieval");
    await completeAuth(bot);
    await bot.say("Amina Bello Ibrahim");
    await bot.pick("nin");
    await bot.say("12345678901");
    await bot.say("1");
    await bot.tap("send_whatsapp");

    // The file exists only to be uploaded. Leaving it fills the disk with
    // documents containing taxpayer data.
    const added = readdirSync("uploads").filter((f) => !before.has(f));
    expect(added).toEqual([]);
  });

  it("sends the assessment statement", async () => {
    const bot = new Bot("2348030001903");
    await bot.pick("assessment_query");
    await completeTier2(bot);
    await bot.pick("view_assessment");
    await bot.say(TEST_TIN);

    const replies = await bot.tap("download");

    const document = replies.find((r) => r.kind === "document");
    expect(document, "no statement was sent").toBeDefined();
  });
});
