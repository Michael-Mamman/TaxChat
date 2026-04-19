import { AKRAA_AI_URL, AKRAA_AI_API_KEY } from "../../config.js";
class AkraaAIService {
    baseUrl = AKRAA_AI_URL;
    apiKey = AKRAA_AI_API_KEY;
    async classifyIntent(text, context) {
        console.log("[AkraaAI] classifyIntent stub called:", text, context ? JSON.stringify(context) : "(no context)");
        const lowerText = text.toLowerCase();
        let intent = "general_enquiry";
        let confidence = 0.82;
        let suggestedFlow = "GENERAL_ENQUIRY";
        const entities = {};
        if (lowerText.includes("tin") && lowerText.includes("register")) {
            intent = "tin_registration";
            confidence = 0.95;
            suggestedFlow = "TIN_REGISTRATION";
        }
        else if (lowerText.includes("tin") || lowerText.includes("tax id")) {
            intent = "tin_retrieval";
            confidence = 0.91;
            suggestedFlow = "TIN_RETRIEVAL";
        }
        else if (lowerText.includes("pay") || lowerText.includes("payment")) {
            intent = "payment_confirmation";
            confidence = 0.89;
            suggestedFlow = "PAYMENT_CONFIRMATION";
        }
        else if (lowerText.includes("file") || lowerText.includes("filing")) {
            intent = "filing_support";
            confidence = 0.87;
            suggestedFlow = "FILING_SUPPORT";
        }
        else if (lowerText.includes("assessment") ||
            lowerText.includes("tax bill")) {
            intent = "assessment_query";
            confidence = 0.88;
            suggestedFlow = "ASSESSMENT_QUERY";
        }
        else if (lowerText.includes("penalty") ||
            lowerText.includes("fine")) {
            intent = "penalty_query";
            confidence = 0.86;
            suggestedFlow = "PENALTY_QUERY";
        }
        else if (lowerText.includes("clearance") ||
            lowerText.includes("tcc")) {
            intent = "tax_clearance";
            confidence = 0.93;
            suggestedFlow = "TAX_CLEARANCE";
        }
        else if (lowerText.includes("wht") ||
            lowerText.includes("withholding")) {
            intent = "wht_credit_note";
            confidence = 0.9;
            suggestedFlow = "WHT_CREDIT_NOTE";
        }
        else if (lowerText.includes("update") &&
            lowerText.includes("profile")) {
            intent = "profile_update";
            confidence = 0.92;
            suggestedFlow = "PROFILE_UPDATE";
        }
        // Simple entity extraction from stub
        const tinMatch = text.match(/\b\d{10}\b/);
        if (tinMatch) {
            entities["tin"] = tinMatch[0];
        }
        const yearMatch = text.match(/\b(20\d{2})\b/);
        if (yearMatch) {
            entities["tax_year"] = yearMatch[1];
        }
        return {
            success: true,
            message: "Intent classified successfully (stub)",
            status_code: 200,
            data: {
                intent,
                confidence,
                entities,
                suggested_flow: suggestedFlow,
                language: "en",
            },
        };
    }
    async generateAnswer(question) {
        console.log("[AkraaAI] generateAnswer stub called:", question);
        return {
            success: true,
            message: "Answer generated successfully (stub)",
            status_code: 200,
            data: {
                answer: "Based on the current Nigerian tax laws, here is the relevant information:\n\n" +
                    "The Value Added Tax (VAT) rate in Nigeria is *7.5%*, effective from February 1, 2020. " +
                    "This applies to the supply of all goods and services except those specifically listed " +
                    "as exempt or zero-rated under the First Schedule to the VAT Act.\n\n" +
                    "Exempt items include basic food items, medical and pharmaceutical products, " +
                    "educational materials, and baby products. Exported goods and services are zero-rated.",
                citations: [
                    "Value Added Tax Act, Cap V1 LFN 2004 (as amended by Finance Act 2019)",
                    "Section 2 - Taxable goods and services",
                    "First Schedule - Exempt goods and services",
                ],
                confidence: 0.85,
            },
        };
    }
    async generateResponse(intent, context) {
        console.log("[AkraaAI] generateResponse stub called:", intent, JSON.stringify(context));
        const responseMap = {
            tin_registration: "I can help you register for a TIN. Let me guide you through the process. Please provide your full name and identification details.",
            tin_retrieval: "I'll help you retrieve your TIN. Please provide your registered name, phone number, or NIN so I can look it up.",
            payment_confirmation: "I can check your payment status. Please provide the Remita Retrieval Reference (RRR) or payment reference number.",
            filing_support: "I can assist with your tax filing. Which tax type would you like to file for -- CIT, VAT, PAYE, or WHT?",
            assessment_query: "Let me look up your tax assessment details. Please provide your TIN or assessment reference number.",
            penalty_query: "I can check any penalties on your account. Please provide your TIN so I can pull up the details.",
            tax_clearance: "I'll help you with your Tax Clearance Certificate application. Please provide your TIN to get started.",
            wht_credit_note: "I can help you check your Withholding Tax credit notes. Please provide your TIN or the deducting party's TIN.",
            profile_update: "I can help you update your taxpayer profile. What information would you like to change?",
            general_enquiry: "Thank you for contacting NRS TaxChat. How can I assist you today? I can help with TIN registration, tax filing, payments, assessments, and more.",
        };
        const responseText = responseMap[intent] ?? responseMap["general_enquiry"];
        return {
            success: true,
            message: responseText,
            status_code: 200,
            data: {
                intent,
                confidence: 1.0,
                entities: context,
                suggested_flow: intent.toUpperCase(),
                language: "en",
            },
        };
    }
    async extractEntities(text) {
        console.log("[AkraaAI] extractEntities stub called:", text);
        const entities = {};
        // Stub entity extraction patterns
        const tinMatch = text.match(/\b\d{10}\b/);
        if (tinMatch) {
            entities["tin"] = tinMatch[0];
        }
        const ninMatch = text.match(/\b\d{11}\b/);
        if (ninMatch) {
            entities["nin"] = ninMatch[0];
        }
        const bvnMatch = text.match(/\b\d{11}\b/);
        if (bvnMatch) {
            entities["bvn"] = bvnMatch[0];
        }
        const phoneMatch = text.match(/\b0[789][01]\d{8}\b/);
        if (phoneMatch) {
            entities["phone"] = phoneMatch[0];
        }
        const yearMatch = text.match(/\b(20\d{2})\b/);
        if (yearMatch) {
            entities["tax_year"] = yearMatch[1];
        }
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) {
            entities["email"] = emailMatch[0];
        }
        const rrrMatch = text.match(/RRR[-\s]?\d{12}/i);
        if (rrrMatch) {
            entities["rrr"] = rrrMatch[0];
        }
        return {
            success: true,
            message: `Extracted ${Object.keys(entities).length} entities (stub)`,
            status_code: 200,
            data: {
                intent: "entity_extraction",
                confidence: 0.85,
                entities,
                language: "en",
            },
        };
    }
}
export default new AkraaAIService();
