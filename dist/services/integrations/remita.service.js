import { REMITA_BASE_URL, REMITA_API_KEY, REMITA_MERCHANT_ID, } from "../../config.js";
class RemitaService {
    baseUrl = REMITA_BASE_URL;
    apiKey = REMITA_API_KEY;
    merchantId = REMITA_MERCHANT_ID;
    async getPaymentStatus(reference) {
        console.log("[Remita] getPaymentStatus stub called:", reference);
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
    async verifyPayment(reference) {
        console.log("[Remita] verifyPayment stub called:", reference);
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
    async generateRRR(payload) {
        console.log("[Remita] generateRRR stub called:", JSON.stringify(payload));
        const rrr = `RRR-${Date.now().toString().slice(-12)}`;
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
