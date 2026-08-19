/**
 * Deterministic stand-in for Claude intent classification.
 *
 * A scenario sets the flow it expects the classifier to pick, so transcripts
 * are reproducible and run offline. Anything not explicitly queued falls back
 * to a low-confidence general_enquiry, which is what the conversation service
 * treats as "no match" - the same shape a real low-confidence result has.
 */
import type { FlowName } from "../../src/types/conversation.types.js";

let queued: Array<{ flow: FlowName; entities: Record<string, string> }> = [];

export function queueClassification(flow: FlowName, entities: Record<string, string> = {}): void {
  queued.push({ flow, entities });
}

export function resetAI(): void {
  queued = [];
}

export function classifyStub(text: string) {
  const next = queued.shift();
  if (!next) {
    return {
      success: true,
      message: "ok",
      status_code: 200,
      data: {
        intent: "unclassified",
        confidence: 0.2,
        entities: {},
        suggested_flow: "general_enquiry",
        language: "en",
      },
    };
  }
  return {
    success: true,
    message: "ok",
    status_code: 200,
    data: {
      intent: next.flow,
      confidence: 0.95,
      entities: next.entities,
      suggested_flow: next.flow,
      language: "en",
    },
  };
}
