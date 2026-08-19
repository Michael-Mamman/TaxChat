import type { FlowStepResult } from "../../types/conversation.types.js";
import akraaAI from "../integrations/claude.service.js";

/**
 * General Enquiry Flow (Tier 0 - No auth required)
 *
 * Handles general tax questions using AI.
 *
 * Steps:
 *   0 - Ask what the user needs help with (or pass through entities)
 *   1 - Process query via akraa-ai
 *   2 - Display response and offer follow-up
 */
class GeneralEnquiryFlow {
  async start(
    phone: string,
    entities?: Record<string, string>,
  ): Promise<FlowStepResult> {
    console.log('[generalEnquiry.flow::start] ENTER', { phone, entityKeys: entities ? Object.keys(entities) : [] });
    // If a question was already captured from the initial message
    if (entities?.question) {
      console.log('[generalEnquiry.flow::start] branch: entities.question provided');
      console.log('[generalEnquiry.flow::start] EXIT', { dispatched: 'processQuestion' });
      return this.processQuestion(phone, entities.question, {});
    }

    // If NLU extracted a topic or intent, use it as a starting point
    if (entities?.topic) {
      console.log('[generalEnquiry.flow::start] branch: entities.topic provided');
      console.log('[generalEnquiry.flow::start] EXIT', { dispatched: 'processQuestion(topic)' });
      return this.processQuestion(phone, entities.topic, {});
    }

    console.log('[generalEnquiry.flow::start] branch: default - ask open question');
    console.log('[generalEnquiry.flow::start] EXIT', { next_step: 0, awaiting_input: 'question' });
    return {
      message:
        "I'm here to help with your tax questions.\n\n" +
        "You can ask me about:\n" +
        "- Tax rates and thresholds\n" +
        "- Filing deadlines and requirements\n" +
        "- Tax reliefs and exemptions\n" +
        "- Penalties and interest\n" +
        "- Registration requirements\n" +
        "- Payment procedures\n" +
        "- Any other tax-related topic\n\n" +
        "What would you like to know?",
      next_step: 0,
      awaiting_input: "question",
    };
  }

  async handleInput(
    phone: string,
    input: string,
    step: number,
    data: Record<string, unknown>,
  ): Promise<FlowStepResult> {
    console.log('[generalEnquiry.flow::handleInput] ENTER', { phone, step, inputLen: input.length });
    switch (step) {
      // ------------------------------------------------------------------
      // Step 0: Receive and process the question
      // ------------------------------------------------------------------
      case 0: {
        console.log('[generalEnquiry.flow::handleInput] branch: case 0 - receive question');
        const question = input.trim();

        if (question.length < 5) {
          console.log('[generalEnquiry.flow::handleInput] branch: question too short');
          console.log('[generalEnquiry.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'question' });
          return {
            message:
              "Could you provide more detail about your question? " +
              "The more specific you are, the better I can help.\n\n" +
              "_Example: \"What is the VAT rate in Nigeria?\" or \"When is the deadline for CIT filing?\"_",
            next_step: 0,
            awaiting_input: "question",
          };
        }

        console.log('[generalEnquiry.flow::handleInput] EXIT', { dispatched: 'processQuestion' });
        return this.processQuestion(phone, question, data);
      }

      // ------------------------------------------------------------------
      // Step 1: Display AI response and handle follow-up
      // ------------------------------------------------------------------
      case 1: {
        console.log('[generalEnquiry.flow::handleInput] branch: case 1 - AI response follow-up');
        const choice = input.trim().toLowerCase();

        if (choice === "yes" || choice === "helpful" || choice === "thanks" || choice === "done") {
          console.log('[generalEnquiry.flow::handleInput] branch: positive feedback');
          console.log('[generalEnquiry.flow::handleInput] EXIT', { flow_complete: true });
          return {
            message:
              "Glad I could help! If you have another question, just ask.\n\n" +
              "Type *menu* to see other services.",
            flow_complete: true,
          };
        }

        if (choice === "no" || choice === "not helpful" || choice === "wrong") {
          console.log('[generalEnquiry.flow::handleInput] branch: negative feedback');
          console.log('[generalEnquiry.flow::handleInput] EXIT', { next_step: 1, awaiting_input: 'dissatisfied_action' });
          return {
            message:
              "I'm sorry the answer wasn't helpful. Would you like me to:\n\n" +
              "1. *Rephrase* - Try answering differently\n" +
              "2. *Escalate* - Connect you with a tax officer\n" +
              "3. *New Question* - Ask something else",
            buttons: [
              { id: "rephrase", title: "Rephrase Answer" },
              { id: "escalate", title: "Speak to Officer" },
              { id: "new_question", title: "Ask Another Question" },
            ],
            next_step: 1,
            awaiting_input: "dissatisfied_action",
          };
        }

        if (choice === "rephrase" || choice === "rephrase answer") {
          console.log('[generalEnquiry.flow::handleInput] branch: rephrase requested');
          const lastQuestion = data.last_question as string;
          if (lastQuestion) {
            data.rephrase_attempt = ((data.rephrase_attempt as number) ?? 0) + 1;
            console.log('[generalEnquiry.flow::handleInput] EXIT', { dispatched: 'processQuestion(rephrase)' });
            return this.processQuestion(phone, lastQuestion, data);
          }
          console.log('[generalEnquiry.flow::handleInput] branch: rephrase without last question');
          console.log('[generalEnquiry.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'question' });
          return {
            message: "Please ask your question again and I'll try a different approach:",
            next_step: 0,
            awaiting_input: "question",
          };
        }

        if (choice === "escalate" || choice === "speak to officer") {
          console.log('[generalEnquiry.flow::handleInput] branch: escalate to officer');
          console.log('[generalEnquiry.flow::handleInput] EXIT', { escalate: true, flow_complete: true });
          return {
            message:
              "I'll connect you with a tax officer who can provide more detailed guidance.\n\n" +
              "Your question has been forwarded for review. An officer will respond shortly.\n\n" +
              "Thank you for your patience.",
            escalate: true,
            escalation_reason: `General enquiry escalation: ${(data.last_question as string) ?? "No question recorded"}`,
            flow_complete: true,
          };
        }

        if (choice === "new_question" || choice === "ask another question" || choice === "another question") {
          console.log('[generalEnquiry.flow::handleInput] branch: new question');
          console.log('[generalEnquiry.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'question' });
          return {
            message: "Sure! What else would you like to know?",
            next_step: 0,
            awaiting_input: "question",
          };
        }

        // Treat any other sufficiently long input as a follow-up question
        if (input.trim().length > 5) {
          console.log('[generalEnquiry.flow::handleInput] branch: treating input as follow-up question');
          data.conversation_history = [
            ...((data.conversation_history as string[]) ?? []),
            data.last_question as string,
          ];
          console.log('[generalEnquiry.flow::handleInput] EXIT', { dispatched: 'processQuestion(followup)' });
          return this.processQuestion(phone, input.trim(), data);
        }

        console.log('[generalEnquiry.flow::handleInput] branch: case 1 default feedback re-prompt');
        console.log('[generalEnquiry.flow::handleInput] EXIT', { next_step: 1, awaiting_input: 'feedback' });
        return {
          message: "Was this answer helpful?",
          buttons: [
            { id: "yes", title: "Yes, helpful" },
            { id: "no", title: "Not helpful" },
            { id: "new_question", title: "Another Question" },
          ],
          next_step: 1,
          awaiting_input: "feedback",
        };
      }

      // ------------------------------------------------------------------
      // Step 2: Handle low-confidence responses and offer escalation
      // ------------------------------------------------------------------
      case 2: {
        console.log('[generalEnquiry.flow::handleInput] branch: case 2 - low-confidence/escalation choice');
        const choice = input.trim().toLowerCase();

        if (choice === "escalate" || choice === "yes" || choice === "speak to officer") {
          console.log('[generalEnquiry.flow::handleInput] branch: escalate (low confidence)');
          console.log('[generalEnquiry.flow::handleInput] EXIT', { escalate: true, flow_complete: true });
          return {
            message:
              "I'll connect you with a tax officer for a more detailed response.\n\n" +
              "Your question has been queued for review. An officer will respond shortly.\n\n" +
              "Thank you for your patience.",
            escalate: true,
            escalation_reason: `Low confidence enquiry (GEN-ENQ): ${(data.last_question as string) ?? "No question recorded"}`,
            flow_complete: true,
          };
        }

        if (choice === "no" || choice === "done" || choice === "accept" || choice === "this is enough") {
          console.log('[generalEnquiry.flow::handleInput] branch: user accepts / done');
          console.log('[generalEnquiry.flow::handleInput] EXIT', { flow_complete: true });
          return {
            message:
              "Alright! If you need more help later, just ask.\n\n" +
              "Type *menu* to see other services.",
            flow_complete: true,
          };
        }

        if (choice === "rephrase" || choice === "try again") {
          console.log('[generalEnquiry.flow::handleInput] branch: rephrase/try again');
          console.log('[generalEnquiry.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'question' });
          return {
            message:
              "Let me try to answer your question differently. Could you provide more context or rephrase your question?",
            next_step: 0,
            awaiting_input: "question",
          };
        }

        if (choice === "new_question" || choice === "ask another question") {
          console.log('[generalEnquiry.flow::handleInput] branch: new question requested');
          console.log('[generalEnquiry.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'question' });
          return {
            message: "Sure! What else would you like to know?",
            next_step: 0,
            awaiting_input: "question",
          };
        }

        // Treat as a new question if long enough
        if (input.trim().length > 5) {
          console.log('[generalEnquiry.flow::handleInput] branch: treating input as new question');
          console.log('[generalEnquiry.flow::handleInput] EXIT', { dispatched: 'processQuestion(new)' });
          return this.processQuestion(phone, input.trim(), data);
        }

        console.log('[generalEnquiry.flow::handleInput] branch: case 2 default re-prompt');
        console.log('[generalEnquiry.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'escalation_choice' });
        return {
          message:
            "Would you like to speak with a tax officer for a more detailed answer?",
          buttons: [
            { id: "escalate", title: "Speak to Officer" },
            { id: "rephrase", title: "Try Again" },
            { id: "done", title: "I'm Fine" },
          ],
          next_step: 2,
          awaiting_input: "escalation_choice",
        };
      }

      default:
        console.log('[generalEnquiry.flow::handleInput] branch: default case - unknown step');
        console.log('[generalEnquiry.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'question' });
        return {
          message: "Something went wrong. Please ask your question again:",
          next_step: 0,
          awaiting_input: "question",
        };
    }
  }

  /** Process a question through Akraa AI and return a response */
  private async processQuestion(
    phone: string,
    question: string,
    data: Record<string, unknown>,
  ): Promise<FlowStepResult> {
    console.log('[generalEnquiry.flow::processQuestion] ENTER', { phone, questionLen: question.length, rephrase_attempt: data.rephrase_attempt });
    data.last_question = question;

    try {
      // First classify the intent to understand context
      console.log('[generalEnquiry.flow::processQuestion] branch: classifying intent');
      const classifyResult = await akraaAI.classifyIntent(question, {
        phone,
        conversation_history: data.conversation_history ?? [],
        rephrase_attempt: data.rephrase_attempt ?? 0,
      });

      if (!classifyResult.success || !classifyResult.data) {
        console.log('[generalEnquiry.flow::processQuestion] branch: classification failed');
        console.log('[generalEnquiry.flow::processQuestion] EXIT', { next_step: 2, awaiting_input: 'error_action' });
        return {
          message:
            "I'm having trouble understanding your question right now.\n\n" +
            "Would you like to try again or speak with a tax officer?",
          buttons: [
            { id: "rephrase", title: "Try Again" },
            { id: "escalate", title: "Speak to Officer" },
          ],
          next_step: 2,
          awaiting_input: "error_action",
        };
      }

      const classification = classifyResult.data;
      const confidence = classification.confidence;
      console.log('[generalEnquiry.flow::processQuestion] branch: classified', { intent: classification.intent, confidence });

      // If the AI classified this as a specific flow, suggest redirecting
      const specificFlows = [
        "tin_registration",
        "tin_retrieval",
        "payment_confirmation",
        "filing_support",
        "assessment_query",
        "penalty_query",
        "tax_clearance",
        "wht_credit_note",
        "profile_update",
      ];

      if (specificFlows.includes(classification.intent) && confidence > 0.85) {
        console.log('[generalEnquiry.flow::processQuestion] branch: suggest redirect to specific flow');
        const flowLabels: Record<string, string> = {
          tin_registration: "TIN Registration",
          tin_retrieval: "TIN Retrieval",
          payment_confirmation: "Payment Confirmation",
          filing_support: "Filing Support",
          assessment_query: "Assessment Query",
          penalty_query: "Penalty Query",
          tax_clearance: "Tax Clearance Certificate",
          wht_credit_note: "WHT Credit Note",
          profile_update: "Profile Update",
        };

        console.log('[generalEnquiry.flow::processQuestion] EXIT', { next_step: 1, awaiting_input: 'redirect_or_answer' });
        return {
          message:
            `It sounds like you need help with *${flowLabels[classification.intent] ?? classification.intent}*.\n\n` +
            "I have a dedicated service for this that can provide step-by-step assistance.\n\n" +
            "Would you like me to take you there, or would you prefer a quick answer here?",
          buttons: [
            { id: "redirect", title: `Go to ${flowLabels[classification.intent] ?? "Service"}` },
            { id: "answer_here", title: "Quick Answer Here" },
          ],
          next_step: 1,
          awaiting_input: "redirect_or_answer",
        };
      }

      // Generate a response using AI
      console.log('[generalEnquiry.flow::processQuestion] branch: generating response');
      const responseResult = await akraaAI.generateResponse(
        classification.intent,
        {
          question,
          entities: classification.entities,
          phone,
          rephrase: (data.rephrase_attempt as number) ?? 0 > 0,
        },
      );

      if (!responseResult.success) {
        console.log('[generalEnquiry.flow::processQuestion] branch: response generation failed');
        console.log('[generalEnquiry.flow::processQuestion] EXIT', { next_step: 2, awaiting_input: 'escalation_choice' });
        return {
          message:
            "I understand your question is about " +
            `*${classification.intent.replace(/_/g, " ")}*, ` +
            "but I'm unable to generate a detailed answer right now.\n\n" +
            "Would you like me to connect you with a tax officer?",
          buttons: [
            { id: "escalate", title: "Speak to Officer" },
            { id: "new_question", title: "Ask Something Else" },
            { id: "done", title: "No, thanks" },
          ],
          next_step: 2,
          awaiting_input: "escalation_choice",
        };
      }

      const answerText = responseResult.message;

      // Low confidence -- provide answer but suggest escalation
      if (confidence < 0.6) {
        console.log('[generalEnquiry.flow::processQuestion] branch: low confidence', { confidence });
        console.log('[generalEnquiry.flow::processQuestion] EXIT', { next_step: 2, awaiting_input: 'low_confidence_action' });
        return {
          message:
            `Here's what I found, though I'm not fully confident in this answer:\n\n` +
            `${answerText}\n\n` +
            `_Confidence: ${Math.round(confidence * 100)}%_\n\n` +
            "I'd recommend speaking with a tax officer for a more authoritative answer.\n\n" +
            "Would you like me to connect you with an officer?",
          buttons: [
            { id: "escalate", title: "Speak to Officer" },
            { id: "accept", title: "This is enough" },
            { id: "new_question", title: "Ask Another Question" },
          ],
          next_step: 2,
          awaiting_input: "low_confidence_action",
        };
      }

      console.log('[generalEnquiry.flow::processQuestion] branch: high confidence answer', { confidence });
      console.log('[generalEnquiry.flow::processQuestion] EXIT', { next_step: 1, awaiting_input: 'feedback' });
      // High confidence -- provide answer directly
      return {
        message:
          `${answerText}\n\n` +
          "Was this helpful?",
        buttons: [
          { id: "yes", title: "Yes, helpful" },
          { id: "no", title: "Not helpful" },
          { id: "new_question", title: "Another Question" },
        ],
        next_step: 1,
        awaiting_input: "feedback",
      };
    } catch {
      console.log('[generalEnquiry.flow::processQuestion] branch: catch block - error occurred');
      console.log('[generalEnquiry.flow::processQuestion] EXIT', { next_step: 2, awaiting_input: 'error_action', error: 'exception thrown' });
      return {
        message:
          "I'm sorry, I encountered an error processing your question.\n\n" +
          "Would you like to try again or speak with a tax officer?",
        buttons: [
          { id: "rephrase", title: "Try Again" },
          { id: "escalate", title: "Speak to Officer" },
        ],
        next_step: 2,
        awaiting_input: "error_action",
      };
    }
  }
}

export default new GeneralEnquiryFlow();
