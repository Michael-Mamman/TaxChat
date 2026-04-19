import type { FlowStepResult } from "../../types/conversation.types.js";
import itsmService from "../integrations/itsm.service.js";
import ConversationContext from "../../models/conversationContext.model.js";

/**
 * TIN Registration Flow (Tier 3 - Requires full KYC)
 *
 * Guides a new taxpayer through the TIN registration process.
 *
 * Steps:
 *   0 - Ask registration category (Individual or Business)
 *   1 - Collect NIN for identity verification
 *   2 - Collect personal details (full name, date of birth, address)
 *   3 - Collect source of income / employer information
 *   4 - Review all collected data and submit -> creates ITSM ticket TIN-REG
 */
class TinRegistrationFlow {
  async start(
    phone: string,
    entities?: Record<string, string>,
  ): Promise<FlowStepResult> {
    // If the NLU already extracted a category, skip step 0
    if (entities?.category) {
      const category = entities.category.toLowerCase();
      if (category === "individual" || category === "business") {
        return {
          message:
            `Great, you'd like to register for a TIN as *${category === "individual" ? "an Individual" : "a Business"}*.\n\n` +
            "To verify your identity, please provide your *National Identification Number (NIN)*.\n\n" +
            "_Your NIN is the 11-digit number on your National ID card._",
          next_step: 1,
          awaiting_input: "nin",
          requires_auth_tier: 3,
        };
      }
    }

    return {
      message:
        "Welcome to TIN Registration! I'll help you obtain your Taxpayer Identification Number.\n\n" +
        "First, please select your registration category:",
      menu_options: [
        {
          id: "individual",
          title: "Individual",
          description: "Personal Income Tax registration",
        },
        {
          id: "business",
          title: "Business",
          description: "Company / Enterprise registration",
        },
      ],
      next_step: 0,
      awaiting_input: "category",
      requires_auth_tier: 3,
    };
  }

  async handleInput(
    phone: string,
    input: string,
    step: number,
    data: Record<string, unknown>,
  ): Promise<FlowStepResult> {
    switch (step) {
      // ------------------------------------------------------------------
      // Step 0: Capture registration category
      // ------------------------------------------------------------------
      case 0: {
        const category = input.trim().toLowerCase();
        if (category !== "individual" && category !== "business") {
          return {
            message:
              "I didn't quite get that. Please select one of the options below:",
            menu_options: [
              {
                id: "individual",
                title: "Individual",
                description: "Personal Income Tax registration",
              },
              {
                id: "business",
                title: "Business",
                description: "Company / Enterprise registration",
              },
            ],
            next_step: 0,
            awaiting_input: "category",
          };
        }

        data.category = category;

        return {
          message:
            `You selected *${category === "individual" ? "Individual" : "Business"}* registration.\n\n` +
            "To verify your identity, please provide your *National Identification Number (NIN)*.\n\n" +
            "_Your NIN is the 11-digit number on your National ID card._",
          next_step: 1,
          awaiting_input: "nin",
        };
      }

      // ------------------------------------------------------------------
      // Step 1: Collect and validate NIN
      // ------------------------------------------------------------------
      case 1: {
        const nin = input.trim().replace(/\s/g, "");

        // Basic NIN format validation (11 digits)
        if (!/^\d{11}$/.test(nin)) {
          return {
            message:
              "That doesn't look like a valid NIN. A NIN is exactly *11 digits* long.\n\n" +
              "Please re-enter your NIN:",
            next_step: 1,
            awaiting_input: "nin",
          };
        }

        data.nin = nin;

        const detailsPrompt =
          data.category === "individual"
            ? "Now I need your personal details. Please reply with the following, each on a new line:\n\n" +
              "1. *Full Name* (First Middle Last)\n" +
              "2. *Date of Birth* (DD/MM/YYYY)\n" +
              "3. *Residential Address* (Street, City, State)\n\n" +
              "_Example:_\n" +
              "Amina Bello Ibrahim\n" +
              "14/05/1990\n" +
              "12 Unity Road, Jos, Plateau State"
            : "Now I need your business details. Please reply with the following, each on a new line:\n\n" +
              "1. *Business Name*\n" +
              "2. *Date of Incorporation* (DD/MM/YYYY)\n" +
              "3. *Registered Address* (Street, City, State)\n\n" +
              "_Example:_\n" +
              "Nwosu Enterprises Ltd\n" +
              "10/01/2017\n" +
              "5 Commerce Avenue, Abuja, FCT";

        return {
          message: detailsPrompt,
          next_step: 2,
          awaiting_input: "personal_details",
        };
      }

      // ------------------------------------------------------------------
      // Step 2: Collect personal / business details
      // ------------------------------------------------------------------
      case 2: {
        const lines = input
          .trim()
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 3) {
          const isIndividual = data.category === "individual";
          return {
            message:
              "I need all three pieces of information. Please provide them on separate lines:\n\n" +
              `1. *${isIndividual ? "Full Name" : "Business Name"}*\n` +
              `2. *${isIndividual ? "Date of Birth" : "Date of Incorporation"}* (DD/MM/YYYY)\n` +
              "3. *Address* (Street, City, State)",
            next_step: 2,
            awaiting_input: "personal_details",
          };
        }

        const [name, dateStr, address] = lines as [string, string, string];

        // Basic date format validation
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          return {
            message:
              "The date format doesn't look right. Please use *DD/MM/YYYY* format.\n\n" +
              "Send all three details again:\n" +
              `1. ${data.category === "individual" ? "Full Name" : "Business Name"}\n` +
              "2. Date (DD/MM/YYYY)\n" +
              "3. Address",
            next_step: 2,
            awaiting_input: "personal_details",
          };
        }

        data.name = name;
        data.date = dateStr;
        data.address = address;

        const incomePrompt =
          data.category === "individual"
            ? "Almost there! Please provide your *source of income* information.\n\n" +
              "Select one:"
            : "Almost there! Please provide the *principal business activity*.\n\n" +
              "Select one:";

        const incomeOptions =
          data.category === "individual"
            ? [
                {
                  id: "employed",
                  title: "Employed",
                  description: "I work for an employer",
                },
                {
                  id: "self_employed",
                  title: "Self-Employed",
                  description: "I run my own business/trade",
                },
                {
                  id: "both",
                  title: "Both",
                  description: "Employed and self-employed",
                },
              ]
            : [
                {
                  id: "trading",
                  title: "Trading / Commerce",
                  description: "Buying and selling goods",
                },
                {
                  id: "services",
                  title: "Professional Services",
                  description: "Consulting, legal, IT, etc.",
                },
                {
                  id: "manufacturing",
                  title: "Manufacturing",
                  description: "Production of goods",
                },
                {
                  id: "other",
                  title: "Other",
                  description: "Other business activity",
                },
              ];

        return {
          message: incomePrompt,
          menu_options: incomeOptions,
          next_step: 3,
          awaiting_input: "income_source",
        };
      }

      // ------------------------------------------------------------------
      // Step 3: Collect income source / employer details
      // ------------------------------------------------------------------
      case 3: {
        const source = input.trim().toLowerCase();
        const isIndividual = data.category === "individual";

        const validIndividual = ["employed", "self_employed", "both"];
        const validBusiness = ["trading", "services", "manufacturing", "other"];
        const validOptions = isIndividual ? validIndividual : validBusiness;

        if (!validOptions.includes(source)) {
          return {
            message: "Please select one of the options provided:",
            menu_options: isIndividual
              ? [
                  { id: "employed", title: "Employed", description: "I work for an employer" },
                  { id: "self_employed", title: "Self-Employed", description: "I run my own business/trade" },
                  { id: "both", title: "Both", description: "Employed and self-employed" },
                ]
              : [
                  { id: "trading", title: "Trading / Commerce", description: "Buying and selling goods" },
                  { id: "services", title: "Professional Services", description: "Consulting, legal, IT, etc." },
                  { id: "manufacturing", title: "Manufacturing", description: "Production of goods" },
                  { id: "other", title: "Other", description: "Other business activity" },
                ],
            next_step: 3,
            awaiting_input: "income_source",
          };
        }

        data.income_source = source;

        // Build the review summary
        const summary = isIndividual
          ? `*Registration Summary*\n\n` +
            `Category: Individual\n` +
            `Full Name: ${data.name as string}\n` +
            `Date of Birth: ${data.date as string}\n` +
            `Address: ${data.address as string}\n` +
            `NIN: ${(data.nin as string).slice(0, 3)}*****${(data.nin as string).slice(-3)}\n` +
            `Income Source: ${source.replace("_", " ")}`
          : `*Registration Summary*\n\n` +
            `Category: Business\n` +
            `Business Name: ${data.name as string}\n` +
            `Date of Incorporation: ${data.date as string}\n` +
            `Registered Address: ${data.address as string}\n` +
            `NIN (Director): ${(data.nin as string).slice(0, 3)}*****${(data.nin as string).slice(-3)}\n` +
            `Business Activity: ${source.replace("_", " ")}`;

        return {
          message:
            summary +
            "\n\nPlease review the information above. Is everything correct?",
          buttons: [
            { id: "confirm", title: "Confirm & Submit" },
            { id: "restart", title: "Start Over" },
          ],
          next_step: 4,
          awaiting_input: "confirmation",
        };
      }

      // ------------------------------------------------------------------
      // Step 4: Submit registration and create ITSM ticket
      // ------------------------------------------------------------------
      case 4: {
        const confirmation = input.trim().toLowerCase();

        if (confirmation === "restart" || confirmation === "start over") {
          // Reset and go back to step 0
          return this.start(phone);
        }

        if (confirmation !== "confirm" && confirmation !== "confirm & submit") {
          return {
            message:
              "Please confirm your registration details or choose to start over:",
            buttons: [
              { id: "confirm", title: "Confirm & Submit" },
              { id: "restart", title: "Start Over" },
            ],
            next_step: 4,
            awaiting_input: "confirmation",
          };
        }

        // Create an ITSM ticket for the registration
        const ticketResult = await itsmService.createTicket({
          type: "TIN-REG",
          subject: `TIN Registration - ${data.category === "individual" ? "Individual" : "Business"} - ${data.name as string}`,
          description:
            `Category: ${data.category as string}\n` +
            `Name: ${data.name as string}\n` +
            `Date: ${data.date as string}\n` +
            `Address: ${data.address as string}\n` +
            `NIN: ${data.nin as string}\n` +
            `Income Source: ${data.income_source as string}`,
          phone,
          priority: "medium",
        });

        // Persist ticket reference in conversation context
        await ConversationContext.findOneAndUpdate(
          { phone },
          {
            $set: {
              "metadata.last_ticket_id": ticketResult.data?.ticket_id,
              "metadata.last_ticket_ref": ticketResult.data?.reference,
            },
          },
        );

        if (!ticketResult.success) {
          return {
            message:
              "I'm sorry, there was an issue submitting your registration. " +
              "Please try again later or visit your nearest FIRS tax office for assistance.\n\n" +
              "If the problem persists, type *help* to speak with an agent.",
            flow_complete: true,
          };
        }

        return {
          message:
            `Your TIN registration has been submitted successfully!\n\n` +
            `*Ticket Reference:* ${ticketResult.data!.reference}\n` +
            `*Estimated Processing Time:* 2-3 business days\n\n` +
            `You will receive an SMS notification once your TIN is generated.\n\n` +
            `You can check your application status anytime by saying:\n` +
            `"_Check status of ${ticketResult.data!.reference}_"`,
          flow_complete: true,
        };
      }

      default:
        return {
          message:
            "Something went wrong. Let's start the TIN registration again.",
          next_step: 0,
          awaiting_input: "category",
        };
    }
  }
}

export default new TinRegistrationFlow();
