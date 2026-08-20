/**
 * The bot must not promise something it cannot do.
 *
 * Documents are now generated and sent over WhatsApp, so saying a certificate
 * is attached is true. Email and SMS are still unwired - sendEmail has no
 * callers and EMAIL_SERVICE_URL is unset, SMS_GATEWAY_URL likewise - so any
 * message pointing the taxpayer at an inbox is still a promise we cannot keep.
 *
 * These check the source rather than a conversation, because the promise lives
 * in the copy and that is where it must not come back.
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
  it("still cannot send email", () => {
    // The premise behind the email rule below. If a flow ever genuinely calls
    // sendEmail, this fails and the inbox wording is allowed back.
    const callers = flowSources().filter(({ src }) => /sendEmail/.test(src));
    expect(callers.map((c) => c.file)).toEqual([]);
  });

  it("no flow points the taxpayer at an inbox", () => {
    const CLAIMS = [
      /will be sent to your registered email/i,
      /check your inbox/i,
      /spam folder/i,
    ];

    const offenders: string[] = [];
    for (const { file, src } of flowSources()) {
      for (const claim of CLAIMS) {
        const line = src
          .split("\n")
          .find((l) => claim.test(l) && !l.trimStart().startsWith("//"));
        if (line) offenders.push(`${file}: ${line.trim().slice(0, 70)}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("no flow promises an SMS", () => {
    // SMS_GATEWAY_URL is unset and the SMS service is a stub.
    const offenders = flowSources()
      .filter(({ src }) => /receive an SMS|notification via SMS|sent via SMS/i.test(src))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it("no flow says a document will arrive later", () => {
    // Documents are sent in the same turn now, so "shortly" is wrong even
    // though delivery works.
    const offenders: string[] = [];
    for (const { file, src } of flowSources()) {
      const line = src
        .split("\n")
        .find((l) => /in this chat shortly|will be sent as a PDF/i.test(l) && !l.trimStart().startsWith("//"));
      if (line) offenders.push(`${file}: ${line.trim().slice(0, 70)}`);
    }

    expect(offenders).toEqual([]);
  });
});
