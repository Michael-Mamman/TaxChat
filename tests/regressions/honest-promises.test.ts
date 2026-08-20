/**
 * The bot must not promise something it cannot do.
 *
 * Nothing in the codebase generates a document, and nothing calls
 * whatsappService.sendDocument, so any message saying a PDF is on its way is
 * untrue. Three flows said exactly that. There is also no SMS gateway.
 *
 * These checks are deliberately written against the source rather than a
 * conversation: the promise is in the copy, and that is where it must not
 * come back.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

const FLOW_DIR = "src/services/flows";

function flowSources(): Array<{ file: string; src: string }> {
  return readdirSync(FLOW_DIR)
    .filter((f) => f.endsWith(".flow.ts"))
    .map((f) => ({ file: f, src: readFileSync(`${FLOW_DIR}/${f}`, "utf8") }));
}

describe("honest promises", () => {
  it("nothing actually sends a document yet", () => {
    // Guards the premise of every check below. If a flow starts genuinely
    // delivering documents, this fails and the copy can promise one again.
    const callers = readdirSync("src/services/flows")
      .map((f) => readFileSync(`${FLOW_DIR}/${f}`, "utf8"))
      .filter((src) => /sendDocument|uploadMedia/.test(src));

    expect(callers).toHaveLength(0);
  });

  it("nothing actually sends an email yet", () => {
    // sendEmail is defined but never called, and EMAIL_SERVICE_URL is unset.
    const callers = readdirSync(FLOW_DIR)
      .map((f) => readFileSync(`${FLOW_DIR}/${f}`, "utf8"))
      .filter((src) => /sendEmail/.test(src));

    expect(callers).toHaveLength(0);
  });

  it("no flow claims something will be delivered", () => {
    // Deliberately broad. The first version of this test only looked for PDF
    // wording and missed "will be sent to your registered email address",
    // which is the promise a taxpayer actually reported not receiving.
    const CLAIMS = [
      /will be sent as a PDF/i,
      /receive the document in this chat/i,
      /receive it as a PDF/i,
      /as a PDF in this chat/i,
      /will be sent to your registered (email|phone)/i,
      /check your inbox/i,
      /spam folder/i,
      /receive an SMS/i,
      /sent via SMS/i,
    ];

    const offenders: string[] = [];
    for (const { file, src } of flowSources()) {
      for (const claim of CLAIMS) {
        const line = src.split("\n").find((l) => claim.test(l) && !l.trimStart().startsWith("//"));
        if (line) offenders.push(`${file}: ${line.trim().slice(0, 70)}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
