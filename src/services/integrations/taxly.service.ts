import { TAXLY_BASE_URL, TAXLY_API_KEY } from "../../config.js";
import type {
  IntegrationResponse,
  EInvoiceData,
  WHTCreditNote,
} from "../../types/integration.types.js";

class TaxlyService {
  private baseUrl = TAXLY_BASE_URL;
  private apiKey = TAXLY_API_KEY;

  async getEInvoiceData(
    tin: string,
    period?: string
  ): Promise<IntegrationResponse<EInvoiceData>> {
    console.log("[taxly.service::getEInvoiceData] ENTER", {
      tinLength: tin?.length,
      hasPeriod: !!period,
      baseUrl: this.baseUrl,
    });
    console.log("[Taxly] getEInvoiceData stub called:", tin, period);

    if (period) {
      console.log("[taxly.service::getEInvoiceData] branch: using provided period");
    } else {
      console.log("[taxly.service::getEInvoiceData] branch: defaulting to current period");
    }

    const effectivePeriod =
      period ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

    console.log("[taxly.service::getEInvoiceData] EXIT", {
      status: 200,
      effectivePeriod,
    });
    return {
      success: true,
      message: "E-Invoice data retrieved successfully (stub)",
      status_code: 200,
      data: {
        tin,
        period: effectivePeriod,
        output_vat: 1250000,
        input_vat: 875000,
        net_vat: 375000,
        total_sales: 16666667,
        total_purchases: 11666667,
        invoice_count: 47,
      },
    };
  }

  async verifyEInvoice(
    invoiceRef: string
  ): Promise<IntegrationResponse<WHTCreditNote>> {
    console.log("[taxly.service::verifyEInvoice] ENTER", {
      invoiceRef,
      baseUrl: this.baseUrl,
    });
    console.log("[Taxly] verifyEInvoice stub called:", invoiceRef);

    console.log("[taxly.service::verifyEInvoice] EXIT", {
      invoiceRef,
      status: 200,
    });
    return {
      success: true,
      message: "E-Invoice verified successfully (stub)",
      status_code: 200,
      data: {
        credit_note_id: `CN-${invoiceRef}`,
        deducting_party_tin: "9876543210",
        deducting_party_name: "Federal Ministry of Finance",
        amount: 5000000,
        wht_amount: 250000,
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]!,
        invoice_reference: invoiceRef,
        is_remitted: true,
        verification_url: `https://taxly.ng/verify/${invoiceRef}`,
      },
    };
  }

  async getWHTCreditNotes(
    identifier: string
  ): Promise<IntegrationResponse<WHTCreditNote[]>> {
    console.log("[taxly.service::getWHTCreditNotes] ENTER", {
      identifierLength: identifier?.length,
      baseUrl: this.baseUrl,
    });
    console.log("[Taxly] getWHTCreditNotes stub called:", identifier);

    if (identifier.length === 10) {
      console.log("[taxly.service::getWHTCreditNotes] branch: identifier treated as TIN");
    } else {
      console.log("[taxly.service::getWHTCreditNotes] branch: identifier treated as invoice ref");
    }

    console.log("[taxly.service::getWHTCreditNotes] EXIT", { status: 200, count: 1 });
    return {
      success: true,
      message: "WHT credit notes retrieved successfully (stub)",
      status_code: 200,
      data: [
        {
          credit_note_id: `CN-${Date.now().toString().slice(-8)}`,
          deducting_party_tin:
            identifier.length === 10 ? identifier : "1234567890",
          deducting_party_name: "Nigerian National Petroleum Corporation",
          amount: 10000000,
          wht_amount: 500000,
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]!,
          ...(identifier.length !== 10 ? { invoice_reference: identifier } : {}),
          is_remitted: true,
          verification_url: "https://taxly.ng/verify/cn-stub",
        },
      ],
    };
  }
}

export default new TaxlyService();
