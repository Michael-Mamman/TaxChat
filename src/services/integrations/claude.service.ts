import { z } from "zod";
import { anthropic } from "../../config.js";
import type {
  IntegrationResponse,
  NLUClassification,
} from "../../types/integration.types.js";

const MODEL = "claude-opus-4-7";

const FLOW_DESCRIPTIONS = `Available flows (pick the single best match):
- tin_registration: user wants a new TIN (Tax Identification Number)
- tin_retrieval: user forgot or wants to look up an existing TIN
- tax_clearance: request a Tax Clearance Certificate (TCC)
- payment_confirmation: confirm/look up a tax payment by RRR
- profile_update: change contact info or taxpayer details
- filing_support: help filing a tax return (CIT, VAT, PAYE, WHT)
- assessment_query: question about a tax assessment or bill
- penalty_query: question about tax penalties
- wht_credit_note: withholding tax credit note lookup
- general_enquiry: generic question — fallback when nothing else fits`;

const CLASSIFICATION_SYSTEM_PROMPT = `You are the intent classifier for NRS TaxChat, the WhatsApp assistant for the Nigeria Revenue Service.
Your job: classify a user's message into exactly one flow, extract any entities present, and give a confidence score.

${FLOW_DESCRIPTIONS}

Entity extraction rules:
- tin: 10-digit Nigerian Tax ID
- nin: 11-digit National Identity Number
- bvn: 11-digit Bank Verification Number
- rrr: 12-digit Remita Retrieval Reference (may be prefixed with "RRR")
- tax_year: 4-digit year like 2024

Confidence guidance:
- 0.9+ when the user's intent is explicit and unambiguous
- 0.7-0.9 when reasonably clear but some interpretation needed
- below 0.7 for ambiguous messages — prefer general_enquiry with low confidence rather than guessing

Respond with a JSON object matching the required schema. Do not include prose outside the JSON.`;

const ANSWER_SYSTEM_PROMPT = `You are NRS TaxChat, a helpful assistant for Nigerian tax questions backed by the Nigeria Revenue Service.
Be concise — keep answers under 500 characters when possible (this runs on WhatsApp).
Cite specific NRS policy, law, or Finance Act sections when relevant.
If the user's question would be better served by a dedicated flow (TIN registration, payment lookup, etc.), mention the flow name at the end.
Never invent rates, deadlines, or sections — if unsure, say so and recommend escalation to a tax officer.`;

const GENERATE_RESPONSE_SYSTEM_PROMPT = `You are NRS TaxChat, the WhatsApp assistant for the Nigeria Revenue Service.
The user's intent has already been classified. Your job: write the next message back to them to kick off that flow or answer their question.
Keep replies under 400 characters. Be conversational but professional. Ask for exactly what's needed to proceed.
If relevant entities were already extracted from the user, acknowledge them so the user doesn't have to re-enter.`;

const ClassificationSchema = z.object({
  intent: z.string(),
  suggested_flow: z.enum([
    "tin_registration",
    "tin_retrieval",
    "tax_clearance",
    "payment_confirmation",
    "profile_update",
    "filing_support",
    "assessment_query",
    "penalty_query",
    "wht_credit_note",
    "general_enquiry",
  ]),
  confidence: z.number().min(0).max(1),
  entities: z
    .object({
      tin: z.string().optional(),
      nin: z.string().optional(),
      bvn: z.string().optional(),
      rrr: z.string().optional(),
      tax_year: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    })
    .passthrough(),
});

type ClassificationResult = z.infer<typeof ClassificationSchema>;

class ClaudeAIService {
  async classifyIntent(
    text: string,
    context?: Record<string, unknown>,
  ): Promise<IntegrationResponse<NLUClassification>> {
    console.log("[claude.service::classifyIntent] ENTER", {
      textLength: text?.length,
      hasContext: !!context,
      model: MODEL,
    });
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        cache_control: { type: "ephemeral" },
        system: CLASSIFICATION_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `User message: "${text}"\nConversation context: ${JSON.stringify(context ?? {})}`,
          },
        ],
      });

      console.log("[claude.service::classifyIntent] usage", {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cacheRead: response.usage.cache_read_input_tokens,
        cacheWrite: response.usage.cache_creation_input_tokens,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        console.log("[claude.service::classifyIntent] branch: no text block in response");
        console.log("[claude.service::classifyIntent] EXIT", { ok: false, reason: "no-text-block" });
        return {
          success: false,
          error: "No text block returned",
          message: "classification failed",
          status_code: 500,
        };
      }

      const jsonText = extractJson(textBlock.text);
      const parsed: ClassificationResult = ClassificationSchema.parse(JSON.parse(jsonText));

      const data: NLUClassification = {
        intent: parsed.intent,
        confidence: parsed.confidence,
        suggested_flow: parsed.suggested_flow,
        entities: parsed.entities as Record<string, string>,
        language: "en",
      };

      console.log("[claude.service::classifyIntent] EXIT", {
        ok: true,
        intent: data.intent,
        suggestedFlow: data.suggested_flow,
        confidence: data.confidence,
        entityCount: Object.keys(data.entities).length,
      });
      return { success: true, data, message: "ok", status_code: 200 };
    } catch (err: unknown) {
      console.log("[claude.service::classifyIntent] branch: caught error");
      const message = err instanceof Error ? err.message : String(err);
      console.error("[claude.service::classifyIntent] error:", message);
      console.log("[claude.service::classifyIntent] EXIT", { ok: false });
      return {
        success: false,
        error: message,
        message: "classification failed",
        status_code: 500,
      };
    }
  }

  async generateAnswer(
    question: string,
  ): Promise<IntegrationResponse<{ answer: string; citations: string[]; confidence: number }>> {
    console.log("[claude.service::generateAnswer] ENTER", {
      questionLength: question?.length,
      model: MODEL,
    });
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        cache_control: { type: "ephemeral" },
        system: ANSWER_SYSTEM_PROMPT,
        messages: [{ role: "user", content: question }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const answer = textBlock && textBlock.type === "text" ? textBlock.text : "";

      console.log("[claude.service::generateAnswer] usage", {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cacheRead: response.usage.cache_read_input_tokens,
      });
      console.log("[claude.service::generateAnswer] EXIT", { ok: true, answerLength: answer.length });
      return {
        success: true,
        message: "ok",
        status_code: 200,
        data: { answer, citations: [], confidence: 0.9 },
      };
    } catch (err: unknown) {
      console.log("[claude.service::generateAnswer] branch: caught error");
      const message = err instanceof Error ? err.message : String(err);
      console.error("[claude.service::generateAnswer] error:", message);
      console.log("[claude.service::generateAnswer] EXIT", { ok: false });
      return {
        success: false,
        error: message,
        message: "answer generation failed",
        status_code: 500,
      };
    }
  }

  async generateResponse(
    intent: string,
    context: Record<string, unknown>,
  ): Promise<IntegrationResponse<NLUClassification>> {
    console.log("[claude.service::generateResponse] ENTER", {
      intent,
      contextKeys: Object.keys(context ?? {}),
      model: MODEL,
    });
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 512,
        cache_control: { type: "ephemeral" },
        system: GENERATE_RESPONSE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Classified intent: ${intent}\nContext: ${JSON.stringify(context ?? {})}\n\nWrite the next reply to the user.`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const replyText = textBlock && textBlock.type === "text" ? textBlock.text : "";

      console.log("[claude.service::generateResponse] usage", {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cacheRead: response.usage.cache_read_input_tokens,
      });
      console.log("[claude.service::generateResponse] EXIT", { ok: true, intent, replyLength: replyText.length });
      return {
        success: true,
        message: replyText,
        status_code: 200,
        data: {
          intent,
          confidence: 1.0,
          entities: context as Record<string, string>,
          suggested_flow: intent.toUpperCase(),
          language: "en",
        },
      };
    } catch (err: unknown) {
      console.log("[claude.service::generateResponse] branch: caught error");
      const message = err instanceof Error ? err.message : String(err);
      console.error("[claude.service::generateResponse] error:", message);
      console.log("[claude.service::generateResponse] EXIT", { ok: false });
      return {
        success: false,
        error: message,
        message: "response generation failed",
        status_code: 500,
      };
    }
  }

  async extractEntities(text: string): Promise<IntegrationResponse<NLUClassification>> {
    console.log("[claude.service::extractEntities] ENTER", { textLength: text?.length });
    const classification = await this.classifyIntent(text);
    if (!classification.success || !classification.data) {
      console.log("[claude.service::extractEntities] branch: classification failed");
      console.log("[claude.service::extractEntities] EXIT", { ok: false });
      return classification;
    }
    console.log("[claude.service::extractEntities] branch: reusing classifyIntent entities");
    console.log("[claude.service::extractEntities] EXIT", {
      ok: true,
      entityCount: Object.keys(classification.data.entities).length,
    });
    return {
      success: true,
      message: `Extracted ${Object.keys(classification.data.entities).length} entities`,
      status_code: 200,
      data: {
        intent: "entity_extraction",
        confidence: classification.data.confidence,
        entities: classification.data.entities,
        language: "en",
      },
    };
  }
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced && fenced[1]) return fenced[1].trim();
  const braceStart = trimmed.indexOf("{");
  const braceEnd = trimmed.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return trimmed.slice(braceStart, braceEnd + 1);
  }
  return trimmed;
}

export default new ClaudeAIService();
