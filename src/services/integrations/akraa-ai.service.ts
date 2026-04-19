import { AKRAA_AI_URL, AKRAA_AI_API_KEY } from "../../config.js";
import type {
  IntegrationResponse,
  NLUClassification,
} from "../../types/integration.types.js";

class AkraaAIService {
  private baseUrl = AKRAA_AI_URL;
  private apiKey = AKRAA_AI_API_KEY;

  async classifyIntent(
    text: string,
    context?: Record<string, unknown>
  ): Promise<IntegrationResponse<NLUClassification>> {
    console.log("[akraa-ai.service::classifyIntent] ENTER", {
      textLength: text?.length,
      hasContext: !!context,
      baseUrl: this.baseUrl,
    });
    console.log(
      "[AkraaAI] classifyIntent stub called:",
      text,
      context ? JSON.stringify(context) : "(no context)"
    );

    const lowerText = text.toLowerCase();

    let intent = "general_enquiry";
    let confidence = 0.82;
    let suggestedFlow = "GENERAL_ENQUIRY";
    const entities: Record<string, string> = {};

    if (lowerText.includes("tin") && lowerText.includes("register")) {
      console.log("[akraa-ai.service::classifyIntent] branch: tin_registration matched");
      intent = "tin_registration";
      confidence = 0.95;
      suggestedFlow = "TIN_REGISTRATION";
    } else if (lowerText.includes("tin") || lowerText.includes("tax id")) {
      console.log("[akraa-ai.service::classifyIntent] branch: tin_retrieval matched");
      intent = "tin_retrieval";
      confidence = 0.91;
      suggestedFlow = "TIN_RETRIEVAL";
    } else if (lowerText.includes("pay") || lowerText.includes("payment")) {
      console.log("[akraa-ai.service::classifyIntent] branch: payment_confirmation matched");
      intent = "payment_confirmation";
      confidence = 0.89;
      suggestedFlow = "PAYMENT_CONFIRMATION";
    } else if (lowerText.includes("file") || lowerText.includes("filing")) {
      console.log("[akraa-ai.service::classifyIntent] branch: filing_support matched");
      intent = "filing_support";
      confidence = 0.87;
      suggestedFlow = "FILING_SUPPORT";
    } else if (
      lowerText.includes("assessment") ||
      lowerText.includes("tax bill")
    ) {
      console.log("[akraa-ai.service::classifyIntent] branch: assessment_query matched");
      intent = "assessment_query";
      confidence = 0.88;
      suggestedFlow = "ASSESSMENT_QUERY";
    } else if (
      lowerText.includes("penalty") ||
      lowerText.includes("fine")
    ) {
      console.log("[akraa-ai.service::classifyIntent] branch: penalty_query matched");
      intent = "penalty_query";
      confidence = 0.86;
      suggestedFlow = "PENALTY_QUERY";
    } else if (
      lowerText.includes("clearance") ||
      lowerText.includes("tcc")
    ) {
      console.log("[akraa-ai.service::classifyIntent] branch: tax_clearance matched");
      intent = "tax_clearance";
      confidence = 0.93;
      suggestedFlow = "TAX_CLEARANCE";
    } else if (
      lowerText.includes("wht") ||
      lowerText.includes("withholding")
    ) {
      console.log("[akraa-ai.service::classifyIntent] branch: wht_credit_note matched");
      intent = "wht_credit_note";
      confidence = 0.9;
      suggestedFlow = "WHT_CREDIT_NOTE";
    } else if (
      lowerText.includes("update") &&
      lowerText.includes("profile")
    ) {
      console.log("[akraa-ai.service::classifyIntent] branch: profile_update matched");
      intent = "profile_update";
      confidence = 0.92;
      suggestedFlow = "PROFILE_UPDATE";
    } else {
      console.log("[akraa-ai.service::classifyIntent] branch: default general_enquiry");
    }

    // Simple entity extraction from stub
    const tinMatch = text.match(/\b\d{10}\b/);
    if (tinMatch) {
      console.log("[akraa-ai.service::classifyIntent] branch: tin entity found");
      entities["tin"] = tinMatch[0];
    } else {
      console.log("[akraa-ai.service::classifyIntent] branch: no tin entity");
    }
    const yearMatch = text.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      console.log("[akraa-ai.service::classifyIntent] branch: tax_year entity found");
      entities["tax_year"] = yearMatch[1]!;
    } else {
      console.log("[akraa-ai.service::classifyIntent] branch: no tax_year entity");
    }

    console.log("[akraa-ai.service::classifyIntent] EXIT", {
      intent,
      confidence,
      suggestedFlow,
      entityCount: Object.keys(entities).length,
    });
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

  async generateAnswer(
    question: string
  ): Promise<IntegrationResponse<{ answer: string; citations: string[]; confidence: number }>> {
    console.log("[akraa-ai.service::generateAnswer] ENTER", {
      questionLength: question?.length,
    });
    console.log("[AkraaAI] generateAnswer stub called:", question);

    console.log("[akraa-ai.service::generateAnswer] EXIT", { status: 200 });
    return {
      success: true,
      message: "Answer generated successfully (stub)",
      status_code: 200,
      data: {
        answer:
          "Based on the current Nigerian tax laws, here is the relevant information:\n\n" +
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

  async generateResponse(
    intent: string,
    context: Record<string, unknown>
  ): Promise<IntegrationResponse<NLUClassification>> {
    console.log("[akraa-ai.service::generateResponse] ENTER", {
      intent,
      contextKeys: Object.keys(context ?? {}),
    });
    console.log(
      "[AkraaAI] generateResponse stub called:",
      intent,
      JSON.stringify(context)
    );

    const responseMap: Record<string, string> = {
      tin_registration:
        "I can help you register for a TIN. Let me guide you through the process. Please provide your full name and identification details.",
      tin_retrieval:
        "I'll help you retrieve your TIN. Please provide your registered name, phone number, or NIN so I can look it up.",
      payment_confirmation:
        "I can check your payment status. Please provide the Remita Retrieval Reference (RRR) or payment reference number.",
      filing_support:
        "I can assist with your tax filing. Which tax type would you like to file for -- CIT, VAT, PAYE, or WHT?",
      assessment_query:
        "Let me look up your tax assessment details. Please provide your TIN or assessment reference number.",
      penalty_query:
        "I can check any penalties on your account. Please provide your TIN so I can pull up the details.",
      tax_clearance:
        "I'll help you with your Tax Clearance Certificate application. Please provide your TIN to get started.",
      wht_credit_note:
        "I can help you check your Withholding Tax credit notes. Please provide your TIN or the deducting party's TIN.",
      profile_update:
        "I can help you update your taxpayer profile. What information would you like to change?",
      general_enquiry:
        "Thank you for contacting NRS TaxChat. How can I assist you today? I can help with TIN registration, tax filing, payments, assessments, and more.",
    };

    if (responseMap[intent]) {
      console.log("[akraa-ai.service::generateResponse] branch: mapped intent found");
    } else {
      console.log("[akraa-ai.service::generateResponse] branch: fallback to general_enquiry");
    }

    const responseText =
      responseMap[intent] ?? responseMap["general_enquiry"]!;

    console.log("[akraa-ai.service::generateResponse] EXIT", { intent, status: 200 });
    return {
      success: true,
      message: responseText,
      status_code: 200,
      data: {
        intent,
        confidence: 1.0,
        entities: context as Record<string, string>,
        suggested_flow: intent.toUpperCase(),
        language: "en",
      },
    };
  }

  async extractEntities(
    text: string
  ): Promise<IntegrationResponse<NLUClassification>> {
    console.log("[akraa-ai.service::extractEntities] ENTER", {
      textLength: text?.length,
    });
    console.log("[AkraaAI] extractEntities stub called:", text);

    const entities: Record<string, string> = {};

    // Stub entity extraction patterns
    const tinMatch = text.match(/\b\d{10}\b/);
    if (tinMatch) {
      console.log("[akraa-ai.service::extractEntities] branch: tin match");
      entities["tin"] = tinMatch[0];
    } else {
      console.log("[akraa-ai.service::extractEntities] branch: no tin match");
    }

    const ninMatch = text.match(/\b\d{11}\b/);
    if (ninMatch) {
      console.log("[akraa-ai.service::extractEntities] branch: nin match");
      entities["nin"] = ninMatch[0];
    } else {
      console.log("[akraa-ai.service::extractEntities] branch: no nin match");
    }

    const bvnMatch = text.match(/\b\d{11}\b/);
    if (bvnMatch) {
      console.log("[akraa-ai.service::extractEntities] branch: bvn match");
      entities["bvn"] = bvnMatch[0];
    } else {
      console.log("[akraa-ai.service::extractEntities] branch: no bvn match");
    }

    const phoneMatch = text.match(/\b0[789][01]\d{8}\b/);
    if (phoneMatch) {
      console.log("[akraa-ai.service::extractEntities] branch: phone match");
      entities["phone"] = phoneMatch[0];
    } else {
      console.log("[akraa-ai.service::extractEntities] branch: no phone match");
    }

    const yearMatch = text.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      console.log("[akraa-ai.service::extractEntities] branch: year match");
      entities["tax_year"] = yearMatch[1]!;
    } else {
      console.log("[akraa-ai.service::extractEntities] branch: no year match");
    }

    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      console.log("[akraa-ai.service::extractEntities] branch: email match");
      entities["email"] = emailMatch[0];
    } else {
      console.log("[akraa-ai.service::extractEntities] branch: no email match");
    }

    const rrrMatch = text.match(/RRR[-\s]?\d{12}/i);
    if (rrrMatch) {
      console.log("[akraa-ai.service::extractEntities] branch: rrr match");
      entities["rrr"] = rrrMatch[0];
    } else {
      console.log("[akraa-ai.service::extractEntities] branch: no rrr match");
    }

    console.log("[akraa-ai.service::extractEntities] EXIT", {
      entityCount: Object.keys(entities).length,
    });
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
