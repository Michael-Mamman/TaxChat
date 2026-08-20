import type { FlowStepResult } from "../../types/conversation.types.js";
import itsmService from "../integrations/itsm.service.js";

/**
 * Profile Update Flow (Tier 2 - Requires authentication)
 *
 * Allows taxpayers to update their profile information including
 * email, phone, address, and company directors.
 *
 * Steps:
 *   0 - Show menu of updatable fields
 *   1 - Collect the new value for the selected field
 *   2 - Verify via OTP for sensitive fields (email, phone)
 *   3 - Confirm and submit the update
 */
class ProfileUpdateFlow {
  async start(
    phone: string,
    entities?: Record<string, string>,
  ): Promise<FlowStepResult> {
    console.log('[profileUpdate.flow::start] ENTER', { phone, entityKeys: entities ? Object.keys(entities) : [] });
    // If NLU already identified the field to update
    if (entities?.field) {
      console.log('[profileUpdate.flow::start] branch: entities.field provided');
      const field = entities.field.toLowerCase();
      const validFields = ["email", "phone", "address", "directors"];
      if (validFields.includes(field)) {
        console.log('[profileUpdate.flow::start] branch: valid field - skip to step 1', { field });
        console.log('[profileUpdate.flow::start] EXIT', { next_step: 1, awaiting_input: 'new_value' });
        return {
          message: this.getFieldPrompt(field),
          next_step: 1,
          awaiting_input: "new_value",
          requires_auth_tier: 2,
        };
      }
    }

    console.log('[profileUpdate.flow::start] branch: default - field selection menu');
    console.log('[profileUpdate.flow::start] EXIT', { next_step: 0, awaiting_input: 'field_selection' });
    return {
      message:
        "I can help you update your taxpayer profile.\n\n" +
        "Which information would you like to update?",
      menu_options: [
        {
          id: "email",
          title: "Email Address",
          description: "Update your registered email",
        },
        {
          id: "phone",
          title: "Phone Number",
          description: "Change your contact number",
        },
        {
          id: "address",
          title: "Residential/Business Address",
          description: "Update your address on file",
        },
        {
          id: "directors",
          title: "Company Directors",
          description: "Add or remove directors (Business only)",
        },
      ],
      next_step: 0,
      awaiting_input: "field_selection",
      requires_auth_tier: 2,
    };
  }

  async handleInput(
    phone: string,
    input: string,
    step: number,
    data: Record<string, unknown>,
  ): Promise<FlowStepResult> {
    console.log('[profileUpdate.flow::handleInput] ENTER', { phone, step, inputLen: input.length });
    switch (step) {
      // ------------------------------------------------------------------
      // Step 0: Capture the field to update
      // ------------------------------------------------------------------
      case 0: {
        console.log('[profileUpdate.flow::handleInput] branch: case 0 - field selection');
        const field = input.trim().toLowerCase();
        const validFields = ["email", "phone", "address", "directors"];

        if (!validFields.includes(field)) {
          console.log('[profileUpdate.flow::handleInput] branch: invalid field');
          console.log('[profileUpdate.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'field_selection' });
          return {
            message:
              "Please select one of the available options:",
            menu_options: [
              { id: "email", title: "Email Address", description: "Update your registered email" },
              { id: "phone", title: "Phone Number", description: "Change your contact number" },
              { id: "address", title: "Residential/Business Address", description: "Update your address on file" },
              { id: "directors", title: "Company Directors", description: "Add or remove directors" },
            ],
            next_step: 0,
            awaiting_input: "field_selection",
          };
        }

        data.field = field;
        console.log('[profileUpdate.flow::handleInput] branch: valid field selected', { field });
        console.log('[profileUpdate.flow::handleInput] EXIT', { next_step: 1, awaiting_input: 'new_value' });
        return {
          message: this.getFieldPrompt(field),
          next_step: 1,
          awaiting_input: "new_value",
        };
      }

      // ------------------------------------------------------------------
      // Step 1: Collect and validate the new value
      // ------------------------------------------------------------------
      case 1: {
        console.log('[profileUpdate.flow::handleInput] branch: case 1 - validate new value');
        const field = data.field as string;
        const value = input.trim();

        // Validate based on field type
        const validationResult = this.validateFieldValue(field, value);
        if (!validationResult.valid) {
          console.log('[profileUpdate.flow::handleInput] branch: validation failed');
          console.log('[profileUpdate.flow::handleInput] EXIT', { next_step: 1, awaiting_input: 'new_value' });
          return {
            message: validationResult.message!,
            next_step: 1,
            awaiting_input: "new_value",
          };
        }

        data.new_value = value;
        console.log('[profileUpdate.flow::handleInput] branch: value valid', { field });

        // For email and phone, require OTP verification
        if (field === "email" || field === "phone") {
          console.log('[profileUpdate.flow::handleInput] branch: OTP required for sensitive field');
          const destination =
            field === "email"
              ? `the email address *${value}*`
              : `the phone number *${value}*`;

          data.otp_sent = true;
          data.expected_otp = "123456"; // Stub OTP for development

          console.log('[profileUpdate.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'otp' });
          return {
            message:
              `For security, I've sent a *6-digit verification code* to ${destination}.\n\n` +
              "Please enter the code to confirm this change:\n\n" +
              "_The code expires in 5 minutes._",
            next_step: 2,
            awaiting_input: "otp",
          };
        }

        // For directors, create an ITSM ticket (complex update)
        if (field === "directors") {
          console.log('[profileUpdate.flow::handleInput] branch: directors update');
          console.log('[profileUpdate.flow::handleInput] EXIT', { dispatched: 'submitDirectorUpdate' });
          return this.submitDirectorUpdate(phone, value, data);
        }

        // For address, skip OTP and go to confirmation
        console.log('[profileUpdate.flow::handleInput] branch: address confirmation');
        console.log('[profileUpdate.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'confirmation' });
        return {
          message:
            `You want to update your *address* to:\n\n` +
            `*${value}*\n\n` +
            "Is this correct?",
          buttons: [
            { id: "confirm", title: "Confirm Update" },
            { id: "edit", title: "Edit" },
            { id: "cancel", title: "Cancel" },
          ],
          next_step: 3,
          awaiting_input: "confirmation",
        };
      }

      // ------------------------------------------------------------------
      // Step 2: Verify OTP for email/phone updates
      // ------------------------------------------------------------------
      case 2: {
        console.log('[profileUpdate.flow::handleInput] branch: case 2 - OTP verification');
        const otp = input.trim().replace(/\s/g, "");

        // The taxpayer may tap a row from the earlier "which information would
        // you like to update" list instead of typing a code. Treat that as
        // switching field: answering every tap with "enter a valid 6-digit
        // code" leaves them with no way forward at all.
        const FIELD_IDS = ["email", "phone", "address", "business_address", "directors", "business_name"];
        if (FIELD_IDS.includes(otp.toLowerCase())) {
          console.log('[profileUpdate.flow::handleInput] branch: field re-selected during OTP step', { field: otp.toLowerCase() });
          return this.handleInput(phone, otp.toLowerCase(), 0, data);
        }

        if (/^resend$/i.test(otp)) {
          console.log('[profileUpdate.flow::handleInput] branch: OTP resend requested');
          return {
            message: "I've sent a new verification code. Please enter the 6-digit code:",
            next_step: 2,
            awaiting_input: "otp",
          };
        }

        if (!/^\d{6}$/.test(otp)) {
          console.log('[profileUpdate.flow::handleInput] branch: invalid OTP format');
          console.log('[profileUpdate.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'otp' });
          return {
            message:
              "I'm waiting for the *6-digit verification code* I sent you.\n\n" +
              "Reply *RESEND* for a new code, *MENU* to start over, or *AGENT* to speak with an officer.",
            next_step: 2,
            awaiting_input: "otp",
          };
        }

        // In production, this would verify against the OTP service
        const attempts = ((data.otp_attempts as number) ?? 0) + 1;
        data.otp_attempts = attempts;

        // Stub: accept any 6-digit code for development
        const isValid = otp === (data.expected_otp as string) || attempts <= 3;

        if (!isValid) {
          console.log('[profileUpdate.flow::handleInput] branch: OTP invalid', { attempts });
          if (attempts >= 3) {
            console.log('[profileUpdate.flow::handleInput] branch: OTP max attempts exceeded');
            console.log('[profileUpdate.flow::handleInput] EXIT', { flow_complete: true, error: 'max attempts' });
            return {
              message:
                "You've exceeded the maximum number of OTP attempts.\n\n" +
                "For your security, this update has been cancelled. " +
                "Please try again later or visit your nearest FIRS office.\n\n" +
                "Type *menu* to see other services.",
              flow_complete: true,
            };
          }

          console.log('[profileUpdate.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'otp', attempts });
          return {
            message:
              `That code is incorrect. You have *${3 - attempts} attempt(s)* remaining.\n\n` +
              "Please re-enter the verification code:",
            next_step: 2,
            awaiting_input: "otp",
          };
        }

        console.log('[profileUpdate.flow::handleInput] branch: OTP verified');
        data.otp_verified = true;
        const field = data.field as string;
        const newValue = data.new_value as string;

        console.log('[profileUpdate.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'confirmation' });
        return {
          message:
            `Verification successful!\n\n` +
            `You want to update your *${field}* to:\n\n` +
            `*${newValue}*\n\n` +
            "Shall I proceed with the update?",
          buttons: [
            { id: "confirm", title: "Confirm Update" },
            { id: "cancel", title: "Cancel" },
          ],
          next_step: 3,
          awaiting_input: "confirmation",
        };
      }

      // ------------------------------------------------------------------
      // Step 3: Final confirmation and submission
      // ------------------------------------------------------------------
      case 3: {
        console.log('[profileUpdate.flow::handleInput] branch: case 3 - confirmation');
        const choice = input.trim().toLowerCase();

        if (choice === "cancel" || choice === "no") {
          console.log('[profileUpdate.flow::handleInput] branch: cancel');
          console.log('[profileUpdate.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'update_another' });
          return {
            message:
              "The update has been cancelled. No changes were made to your profile.\n\n" +
              "Would you like to update something else?",
            buttons: [
              { id: "yes", title: "Update Another Field" },
              { id: "no", title: "No, I'm Done" },
            ],
            next_step: 3,
            awaiting_input: "update_another",
          };
        }

        if (choice === "yes" || choice === "update another field") {
          console.log('[profileUpdate.flow::handleInput] branch: update another field');
          console.log('[profileUpdate.flow::handleInput] EXIT', { dispatched: 'start' });
          return this.start(phone);
        }

        if (choice === "no" || choice === "no, i'm done" || choice === "done") {
          console.log('[profileUpdate.flow::handleInput] branch: done');
          console.log('[profileUpdate.flow::handleInput] EXIT', { flow_complete: true });
          return {
            message:
              "Thank you! Your profile is up to date.\n\n" +
              "Type *menu* to see other services.",
            flow_complete: true,
          };
        }

        if (choice === "edit") {
          console.log('[profileUpdate.flow::handleInput] branch: edit');
          const field = data.field as string;
          console.log('[profileUpdate.flow::handleInput] EXIT', { next_step: 1, awaiting_input: 'new_value' });
          return {
            message: this.getFieldPrompt(field),
            next_step: 1,
            awaiting_input: "new_value",
          };
        }

        if (choice === "confirm" || choice === "confirm update") {
          console.log('[profileUpdate.flow::handleInput] branch: confirm update');
          const field = data.field as string;
          const newValue = data.new_value as string;

          console.log('[profileUpdate.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'update_another' });
          // For simple fields, update directly (stub)
          return {
            message:
              `Your *${this.getFieldLabel(field)}* has been updated successfully!\n\n` +
              `*New Value:* ${field === "phone" ? this.maskPhone(newValue) : newValue}\n\n` +
              "The change will be reflected in your TaxProMax profile within 24 hours.\n\n" +
              "Would you like to update anything else?",
            buttons: [
              { id: "yes", title: "Update Another Field" },
              { id: "done", title: "No, I'm Done" },
            ],
            next_step: 3,
            awaiting_input: "update_another",
          };
        }

        console.log('[profileUpdate.flow::handleInput] branch: case 3 default re-prompt');
        console.log('[profileUpdate.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'confirmation' });
        return {
          message: "Please select an option:",
          buttons: [
            { id: "confirm", title: "Confirm Update" },
            { id: "edit", title: "Edit" },
            { id: "cancel", title: "Cancel" },
          ],
          next_step: 3,
          awaiting_input: "confirmation",
        };
      }

      default:
        console.log('[profileUpdate.flow::handleInput] branch: default case - unknown step');
        console.log('[profileUpdate.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'field_selection' });
        return {
          message: "Something went wrong. Let's start the profile update again.",
          next_step: 0,
          awaiting_input: "field_selection",
        };
    }
  }

  /** Get the prompt text for collecting a field value */
  private getFieldPrompt(field: string): string {
    console.log('[profileUpdate.flow::getFieldPrompt] ENTER', { field });
    switch (field) {
      case "email":
        console.log('[profileUpdate.flow::getFieldPrompt] branch: email');
        console.log('[profileUpdate.flow::getFieldPrompt] EXIT', { field: 'email' });
        return (
          "Please enter your *new email address*:\n\n" +
          "_A verification code will be sent to this address._"
        );
      case "phone":
        console.log('[profileUpdate.flow::getFieldPrompt] branch: phone');
        console.log('[profileUpdate.flow::getFieldPrompt] EXIT', { field: 'phone' });
        return (
          "Please enter your *new phone number*:\n\n" +
          "_Format: 08012345678. A verification code will be sent to this number._"
        );
      case "address":
        console.log('[profileUpdate.flow::getFieldPrompt] branch: address');
        console.log('[profileUpdate.flow::getFieldPrompt] EXIT', { field: 'address' });
        return (
          "Please enter your *new address* in the following format:\n\n" +
          "Street Address, City, State\n\n" +
          "_Example: 15 Ahmadu Bello Way, Garki, Abuja FCT_"
        );
      case "directors":
        console.log('[profileUpdate.flow::getFieldPrompt] branch: directors');
        console.log('[profileUpdate.flow::getFieldPrompt] EXIT', { field: 'directors' });
        return (
          "Please describe the director change you'd like to make:\n\n" +
          "- To *add* a director, provide their full name and NIN\n" +
          "- To *remove* a director, provide their full name\n\n" +
          "_Example: Add John Okafor, NIN 12345678901_\n" +
          "_Example: Remove Mary Adewale_"
        );
      default:
        console.log('[profileUpdate.flow::getFieldPrompt] branch: default');
        console.log('[profileUpdate.flow::getFieldPrompt] EXIT', { field: 'default' });
        return "Please enter the new value:";
    }
  }

  /** Get human-readable field label */
  private getFieldLabel(field: string): string {
    console.log('[profileUpdate.flow::getFieldLabel] ENTER', { field });
    const labels: Record<string, string> = {
      email: "email address",
      phone: "phone number",
      address: "address",
      directors: "company directors",
    };
    const label = labels[field] ?? field;
    console.log('[profileUpdate.flow::getFieldLabel] EXIT', { label });
    return label;
  }

  /** Validate the new value based on field type */
  private validateFieldValue(
    field: string,
    value: string,
  ): { valid: boolean; message?: string } {
    console.log('[profileUpdate.flow::validateFieldValue] ENTER', { field, valueLen: value.length });
    switch (field) {
      case "email":
        console.log('[profileUpdate.flow::validateFieldValue] branch: email');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          console.log('[profileUpdate.flow::validateFieldValue] EXIT', { valid: false, reason: 'email format' });
          return {
            valid: false,
            message:
              "That doesn't look like a valid email address.\n\n" +
              "Please enter a valid email (e.g., *name@example.com*):",
          };
        }
        console.log('[profileUpdate.flow::validateFieldValue] EXIT', { valid: true });
        return { valid: true };

      case "phone":
        console.log('[profileUpdate.flow::validateFieldValue] branch: phone');
        if (!/^0[7-9]\d{9}$/.test(value.replace(/[\s-]/g, ""))) {
          console.log('[profileUpdate.flow::validateFieldValue] EXIT', { valid: false, reason: 'phone format' });
          return {
            valid: false,
            message:
              "That doesn't look like a valid Nigerian phone number.\n\n" +
              "Please enter it in the format: *08012345678*",
          };
        }
        console.log('[profileUpdate.flow::validateFieldValue] EXIT', { valid: true });
        return { valid: true };

      case "address":
        console.log('[profileUpdate.flow::validateFieldValue] branch: address');
        if (value.length < 10) {
          console.log('[profileUpdate.flow::validateFieldValue] EXIT', { valid: false, reason: 'address too short' });
          return {
            valid: false,
            message:
              "The address seems too short. Please provide a complete address including street, city, and state.",
          };
        }
        console.log('[profileUpdate.flow::validateFieldValue] EXIT', { valid: true });
        return { valid: true };

      case "directors":
        console.log('[profileUpdate.flow::validateFieldValue] branch: directors');
        if (value.length < 5) {
          console.log('[profileUpdate.flow::validateFieldValue] EXIT', { valid: false, reason: 'directors too short' });
          return {
            valid: false,
            message:
              "Please provide more details about the director change.\n\n" +
              "_Example: Add John Okafor, NIN 12345678901_",
          };
        }
        console.log('[profileUpdate.flow::validateFieldValue] EXIT', { valid: true });
        return { valid: true };

      default:
        console.log('[profileUpdate.flow::validateFieldValue] branch: default');
        console.log('[profileUpdate.flow::validateFieldValue] EXIT', { valid: true });
        return { valid: true };
    }
  }

  /** Submit a director update via ITSM (complex change) */
  private async submitDirectorUpdate(
    phone: string,
    details: string,
    data: Record<string, unknown>,
  ): Promise<FlowStepResult> {
    console.log('[profileUpdate.flow::submitDirectorUpdate] ENTER', { phone, detailsLen: details.length });
    const ticketResult = await itsmService.createTicket({
      type: "PROFILE-UPDATE",
      subject: "Company Director Update Request",
      description:
        `Director change request:\n${details}\n\n` +
        `Requested by phone: ${phone}`,
      phone,
      priority: "medium",
    });

    if (!ticketResult.success) {
      console.log('[profileUpdate.flow::submitDirectorUpdate] branch: ticket creation failed');
      console.log('[profileUpdate.flow::submitDirectorUpdate] EXIT', { flow_complete: true, error: 'ticket creation failed' });
      return {
        message:
          "I'm sorry, there was an issue submitting the director update request.\n\n" +
          "Please try again later or visit your FIRS office with the required CAC documents.",
        flow_complete: true,
      };
    }

    console.log('[profileUpdate.flow::submitDirectorUpdate] branch: ticket created', { reference: ticketResult.data!.reference });
    console.log('[profileUpdate.flow::submitDirectorUpdate] EXIT', { flow_complete: true });
    return {
      message:
        `Your director update request has been submitted.\n\n` +
        `*Ticket Reference:* ${ticketResult.data!.reference}\n` +
        `*SLA:* 3-5 business days\n\n` +
        "A tax officer will review the request. You may be asked to provide supporting documents " +
        "(CAC Form 7, Board Resolution, etc.).\n\n" +
        "You'll be notified via WhatsApp once the update is processed.\n\n" +
        "Is there anything else I can help you with?",
      flow_complete: true,
    };
  }

  /** Mask a phone number for display */
  private maskPhone(phone: string): string {
    console.log('[profileUpdate.flow::maskPhone] ENTER', { phoneLen: phone.length });
    if (phone.length < 6) {
      console.log('[profileUpdate.flow::maskPhone] branch: short phone - no mask');
      console.log('[profileUpdate.flow::maskPhone] EXIT');
      return phone;
    }
    console.log('[profileUpdate.flow::maskPhone] EXIT');
    return phone.slice(0, 4) + "***" + phone.slice(-3);
  }
}

export default new ProfileUpdateFlow();
