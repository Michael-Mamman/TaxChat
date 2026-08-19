/**
 * Global test setup.
 *
 * Two things are stubbed for every test:
 *
 *  - **axios** - the only route to the outside world. Stubbing it here means
 *    whatsapp.service runs for real (so the interactive-type selection and the
 *    WhatsApp field limits are genuinely exercised) while the Graph API request
 *    is captured instead of sent.
 *  - **claude.service** - free-text intent classification stays live in the
 *    product, but tests must be deterministic and offline, so scenarios declare
 *    the classification they want.
 */
import { vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.MONGO_URI_LOCAL = process.env.MONGO_URI_LOCAL_TEST ?? "mongodb://127.0.0.1:27017/taxchat_test";
process.env.PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID ?? "TEST_PHONE_NUMBER_ID";
process.env.WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN ?? "test-token";
process.env.VERIFY_TOKEN = process.env.VERIFY_TOKEN ?? "test-verify-token";
// Keep the Anthropic SDK from being constructed with a real key during tests.
process.env.AKRAA_AI_API_KEY = "test-key-not-used";

vi.mock("axios", async () => {
  const { recordOutbound } = await import("./helpers/outbound.js");
  const post = vi.fn(async (url: string, body: unknown) => {
    recordOutbound(url, body);
    return { data: { messages: [{ id: `wamid.stub.${Date.now()}` }] }, status: 200 };
  });
  const get = vi.fn(async () => ({ data: {}, status: 200 }));
  const api = { post, get, isAxiosError: () => false };
  return { default: api, ...api };
});

vi.mock("../src/services/integrations/claude.service.js", async () => {
  const { classifyStub } = await import("./helpers/ai.js");
  return {
    default: {
      classifyIntent: vi.fn(async (text: string) => classifyStub(text)),
      generateAnswer: vi.fn(async () => ({
        success: true,
        message: "ok",
        status_code: 200,
        data: {
          answer: "The VAT rate in Nigeria is 7.5%.",
          citations: [],
          confidence: 0.95,
        },
      })),
      generateResponse: vi.fn(async () => ({
        success: true,
        message: "ok",
        status_code: 200,
        data: { intent: "stub", confidence: 1, entities: {}, language: "en" },
      })),
      extractEntities: vi.fn(async (text: string) => classifyStub(text)),
    },
  };
});
