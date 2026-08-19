import {
  REMITA_BASE_URL,
  REMITA_API_KEY,
  REMITA_MERCHANT_ID,
} from "../../config.js";
import type {
  IntegrationResponse,
  PaymentStatusResult,
} from "../../types/integration.types.js";

class RemitaService {
  private baseUrl = REMITA_BASE_URL;
  private apiKey = REMITA_API_KEY;
  private merchantId = REMITA_MERCHANT_ID;

  async getPaymentStatus(
    reference: string
  ): Promise<IntegrationResponse<PaymentStatusResult>> {
    console.log("[remita.service::getPaymentStatus] ENTER", {
      referenceLength: reference?.length,
      baseUrl: this.baseUrl,
    });
    console.log("[Remita] getPaymentStatus stub called:", reference);

    console.log("[remita.service::getPaymentStatus] EXIT", {
      status: 200,
      paymentStatus: "POSTED",
    });
    return {
      success: true,
      message: "Payment status retrieved successfully (stub)",
      status_code: 200,
      data: {
        reference,
        amount: 2500000,
        currency: "NGN",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        bank: "First Bank of Nigeria",
        payer_name: "Chukwuemeka Obi Nwosu",
        status: "POSTED",
        tax_type: "CIT",
        period_credited: "2024-01 to 2024-12",
      },
    };
  }

  async verifyPayment(
    reference: string
  ): Promise<IntegrationResponse<PaymentStatusResult>> {
    console.log("[remita.service::verifyPayment] ENTER", {
      referenceLength: reference?.length,
      baseUrl: this.baseUrl,
    });
    console.log("[Remita] verifyPayment stub called:", reference);

    console.log("[remita.service::verifyPayment] EXIT", {
      status: 200,
      paymentStatus: "RECEIVED",
    });
    return {
      success: true,
      message: "Payment verified successfully (stub)",
      status_code: 200,
      data: {
        reference,
        amount: 780000,
        currency: "NGN",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        bank: "GTBank",
        payer_name: "Nwosu Enterprises Ltd",
        status: "RECEIVED",
        tax_type: "VAT",
        period_credited: "2024-Q4",
      },
    };
  }

  async generateRRR(payload: {
    payer_name: string;
    payer_email: string;
    payer_phone: string;
    amount: number;
    description: string;
    tax_type: string;
    tin: string;
  }): Promise<IntegrationResponse<PaymentStatusResult>> {
    console.log("[remita.service::generateRRR] ENTER", {
      amount: payload.amount,
      tax_type: payload.tax_type,
      descriptionLength: payload.description?.length,
      merchantId: this.merchantId ? "(configured)" : "(missing)",
    });
    console.log("[Remita] generateRRR stub called:", JSON.stringify(payload));

    const rrr = `RRR-${Date.now().toString().slice(-12)}`;
    console.log("[remita.service::generateRRR] EXIT", {
      status: 201,
      tax_type: payload.tax_type,
    });
    return {
      success: true,
      message: `RRR generated successfully: ${rrr} (stub)`,
      status_code: 201,
      data: {
        reference: rrr,
        amount: payload.amount,
        currency: "NGN",
        payer_name: payload.payer_name,
        status: "NOT_FOUND",
        tax_type: payload.tax_type,
      },
    };
  }
}

export default new RemitaService();
