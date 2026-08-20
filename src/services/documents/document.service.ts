import fs from "fs";
import path from "path";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

/**
 * Generates the PDFs TaxChat hands to taxpayers over WhatsApp.
 *
 * Amounts are written as "NGN 280,000" rather than with the naira sign. The
 * standard PDF fonts are WinAnsi-encoded and have no glyph for U+20A6, so the
 * symbol would render as a substitute character on a document carrying a
 * revenue authority's name. The rest of the bot already says NGN.
 */

const OUTPUT_DIR = path.join(process.cwd(), "uploads");

/** Where a third party can check a document is genuine (BRD §3.3). */
const VERIFY_BASE_URL = process.env.VERIFY_BASE_URL || "https://verify.nrs.gov.ng";

const COLOURS = {
  ink: "#1a1a1a",
  muted: "#5f6b6b",
  rule: "#d5dcdc",
  accent: "#0b6b53",
} as const;

export interface GeneratedDocument {
  /** Absolute path on disk. The caller is responsible for removing it. */
  path: string;
  /** Name the taxpayer sees in WhatsApp. */
  filename: string;
}

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

/** A filename that cannot collide, and cannot be guessed from the reference. */
function outputPath(prefix: string): string {
  ensureOutputDir();
  const unique = crypto.randomBytes(6).toString("hex");
  return path.join(OUTPUT_DIR, `${prefix}-${unique}.pdf`);
}

function money(amount: number): string {
  return `NGN ${amount.toLocaleString("en-NG")}`;
}

function today(): string {
  return new Date().toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Header block shared by every document. */
function header(doc: PDFKit.PDFDocument, title: string, subtitle: string): void {
  doc
    .fillColor(COLOURS.accent)
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("Nigeria Revenue Service", { align: "left" });

  doc
    .fillColor(COLOURS.muted)
    .fontSize(9)
    .font("Helvetica")
    .text("Virtual Tax Office", { align: "left" });

  doc.moveDown(1.2);
  doc.fillColor(COLOURS.ink).fontSize(16).font("Helvetica-Bold").text(title);
  doc.fillColor(COLOURS.muted).fontSize(10).font("Helvetica").text(subtitle);

  doc.moveDown(0.8);
  const y = doc.y;
  doc.moveTo(50, y).lineTo(545, y).strokeColor(COLOURS.rule).lineWidth(1).stroke();
  doc.moveDown(1);
}

/** A label/value row. */
function field(doc: PDFKit.PDFDocument, label: string, value: string): void {
  doc.fillColor(COLOURS.muted).fontSize(9).font("Helvetica").text(label.toUpperCase());
  doc.fillColor(COLOURS.ink).fontSize(12).font("Helvetica-Bold").text(value);
  doc.moveDown(0.6);
}

/**
 * Authorisation block. BRD §3.3 describes the TCC as carrying a digital
 * signature; this is the visible half of that. The cryptographic half belongs
 * with the NRS signing service and does not exist yet, so nothing here claims
 * the document is cryptographically signed.
 */
function authorisation(doc: PDFKit.PDFDocument, reference: string): void {
  const y = 500;
  doc
    .moveTo(50, y)
    .lineTo(250, y)
    .strokeColor(COLOURS.rule)
    .lineWidth(1)
    .stroke();

  doc
    .fillColor(COLOURS.ink)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Authorised electronically", 50, y + 8);

  doc
    .fillColor(COLOURS.muted)
    .fontSize(9)
    .font("Helvetica")
    .text("Nigeria Revenue Service", 50, y + 24)
    .text(`Document ID ${reference}`, 50, y + 37);
}

/** Footer with the verification QR code, per BRD §3.3. */
async function footer(doc: PDFKit.PDFDocument, reference: string): Promise<void> {
  const verifyUrl = `${VERIFY_BASE_URL}/${encodeURIComponent(reference)}`;
  const qr = await QRCode.toBuffer(verifyUrl, { margin: 0, width: 220 });

  const y = 640;
  doc.moveTo(50, y).lineTo(545, y).strokeColor(COLOURS.rule).lineWidth(1).stroke();

  doc.image(qr, 50, y + 18, { width: 78 });

  doc
    .fillColor(COLOURS.ink)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Verify this document", 146, y + 22);

  doc
    .fillColor(COLOURS.muted)
    .fontSize(9)
    .font("Helvetica")
    .text(
      `Scan the code, or enter reference ${reference} at ${VERIFY_BASE_URL}.`,
      146,
      y + 38,
      { width: 399 },
    );

  doc
    .fillColor(COLOURS.muted)
    .fontSize(8)
    .text(`Issued ${today()} via NRS TaxChat on WhatsApp.`, 146, y + 66, { width: 399 });
}

/** Render a document and resolve once it is fully written to disk. */
function render(
  filePath: string,
  build: (doc: PDFKit.PDFDocument) => Promise<void> | void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(filePath);

    // Resolve on the stream, not on doc.end(): the bytes are not on disk until
    // the write stream closes, and uploadMedia reads the file synchronously.
    stream.on("finish", () => resolve());
    stream.on("error", reject);
    doc.on("error", reject);
    doc.pipe(stream);

    Promise.resolve(build(doc))
      .then(() => doc.end())
      .catch(reject);
  });
}

class DocumentService {
  /** Tax Clearance Certificate (BRD §3.3 Flow 3). */
  async generateTCC(input: {
    reference: string;
    taxpayerName: string;
    tin: string;
    validUntil: string;
  }): Promise<GeneratedDocument> {
    console.log('[document.service::generateTCC] ENTER', { reference: input.reference });
    const filePath = outputPath("tcc");

    await render(filePath, async (doc) => {
      header(doc, "Tax Clearance Certificate", "Issued under the Nigeria Tax Administration Act");

      field(doc, "Certificate reference", input.reference);
      field(doc, "Taxpayer", input.taxpayerName);
      field(doc, "Tax Identification Number", input.tin);
      field(doc, "Valid until", input.validUntil);

      doc.moveDown(0.6);
      doc
        .fillColor(COLOURS.ink)
        .fontSize(10)
        .font("Helvetica")
        .text(
          "This is to certify that the taxpayer named above has met their tax obligations " +
            "for the period assessed, and that no tax liability remains outstanding as at the date of issue.",
          { width: 495, align: "left" },
        );

      authorisation(doc, input.reference);
      await footer(doc, input.reference);
    });

    const filename = `NRS-Tax-Clearance-${input.reference}.pdf`;
    console.log('[document.service::generateTCC] EXIT', { filename });
    return { path: filePath, filename };
  }

  /** TIN certificate (BRD §3.3 Flow 2). Carries the unmasked TIN. */
  async generateTINCertificate(input: {
    reference: string;
    taxpayerName: string;
    tin: string;
    taxOffice: string;
    registeredOn?: string;
  }): Promise<GeneratedDocument> {
    console.log('[document.service::generateTINCertificate] ENTER', { reference: input.reference });
    const filePath = outputPath("tin");

    await render(filePath, async (doc) => {
      header(doc, "Tax Identification Number Certificate", "Confirmation of taxpayer registration");

      field(doc, "Taxpayer", input.taxpayerName);
      field(doc, "Tax Identification Number", input.tin);
      field(doc, "Tax office", input.taxOffice);
      if (input.registeredOn) field(doc, "Registered on", input.registeredOn);

      doc.moveDown(0.6);
      doc
        .fillColor(COLOURS.ink)
        .fontSize(10)
        .font("Helvetica")
        .text(
          "This certificate confirms the registration of the taxpayer named above. " +
            "It shows your Tax Identification Number in full - keep it secure and share it only where required.",
          { width: 495 },
        );

      authorisation(doc, input.reference);
      await footer(doc, input.reference);
    });

    const filename = `NRS-TIN-Certificate-${input.reference}.pdf`;
    console.log('[document.service::generateTINCertificate] EXIT', { filename });
    return { path: filePath, filename };
  }

  /** Assessment statement (BRD §3.3 Flow 7). */
  async generateAssessmentStatement(input: {
    reference: string;
    tin: string;
    assessments: Array<{
      tax_type: string;
      period?: string;
      tax_year?: number;
      assessed_amount: number;
      paid_amount: number;
      balance: number;
      status: string;
      due_date?: string;
    }>;
  }): Promise<GeneratedDocument> {
    console.log('[document.service::generateAssessmentStatement] ENTER', { reference: input.reference, rows: input.assessments.length });
    const filePath = outputPath("assessment");

    await render(filePath, async (doc) => {
      header(doc, "Assessment Statement", "Summary of assessments on your tax account");

      field(doc, "Tax Identification Number", input.tin);
      field(doc, "Statement reference", input.reference);

      doc.moveDown(0.4);

      for (const a of input.assessments) {
        const period = a.period ?? (a.tax_year ? String(a.tax_year) : "-");
        doc
          .fillColor(COLOURS.ink)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(`${a.tax_type} (${period})`);

        doc
          .fillColor(COLOURS.muted)
          .fontSize(10)
          .font("Helvetica")
          .text(
            `Assessed ${money(a.assessed_amount)}   Paid ${money(a.paid_amount)}   ` +
              `Balance ${money(a.balance)}`,
          );

        doc.text(`Status: ${a.status}${a.due_date ? `   Due: ${a.due_date}` : ""}`);
        doc.moveDown(0.6);
      }

      const totals = input.assessments.reduce(
        (acc, a) => ({
          assessed: acc.assessed + a.assessed_amount,
          paid: acc.paid + a.paid_amount,
          balance: acc.balance + a.balance,
        }),
        { assessed: 0, paid: 0, balance: 0 },
      );

      const y = doc.y + 4;
      doc.moveTo(50, y).lineTo(545, y).strokeColor(COLOURS.rule).lineWidth(1).stroke();
      doc.moveDown(0.8);

      doc.fillColor(COLOURS.ink).fontSize(11).font("Helvetica-Bold").text("Totals");
      doc
        .fillColor(COLOURS.ink)
        .fontSize(10)
        .font("Helvetica")
        .text(
          `Assessed ${money(totals.assessed)}   Paid ${money(totals.paid)}   ` +
            `Outstanding ${money(totals.balance)}`,
        );

      await footer(doc, input.reference);
    });

    const filename = `NRS-Assessment-Statement-${input.reference}.pdf`;
    console.log('[document.service::generateAssessmentStatement] EXIT', { filename });
    return { path: filePath, filename };
  }
}

export default new DocumentService();
