import jtbService from "../integrations/jtb.service.js";
/**
 * TIN Retrieval Flow (Tier 1 - Self-service)
 *
 * Helps taxpayers retrieve their TIN using identifying information.
 *
 * Steps:
 *   0 - Ask for the taxpayer's full name
 *   1 - Ask for an identifier (NIN, phone number, email, or date of birth)
 *   2 - Lookup TIN and display masked result
 *   3 - Offer to send TIN certificate via email or WhatsApp
 */
class TinRetrievalFlow {
    async start(phone, entities) {
        // If entities already include a name from NLU, skip to step 1
        if (entities?.name) {
            return {
                message: `I'll look up the TIN for *${entities.name}*.\n\n` +
                    "To narrow the search, please provide one of the following:\n\n" +
                    "- Your *NIN* (11 digits)\n" +
                    "- Your *phone number*\n" +
                    "- Your *email address*\n" +
                    "- Your *date of birth* (DD/MM/YYYY)",
                next_step: 1,
                awaiting_input: "identifier",
            };
        }
        return {
            message: "I can help you retrieve your TIN.\n\n" +
                "Please provide the *full name* used during registration.\n\n" +
                "_Example: Amina Bello Ibrahim_",
            next_step: 0,
            awaiting_input: "full_name",
        };
    }
    async handleInput(phone, input, step, data) {
        switch (step) {
            // ------------------------------------------------------------------
            // Step 0: Capture taxpayer full name
            // ------------------------------------------------------------------
            case 0: {
                const name = input.trim();
                if (name.length < 3) {
                    return {
                        message: "The name seems too short. Please provide your *full name* as registered with FIRS.\n\n" +
                            "_Example: Amina Bello Ibrahim_",
                        next_step: 0,
                        awaiting_input: "full_name",
                    };
                }
                data.name = name;
                return {
                    message: `Thank you, *${name}*.\n\n` +
                        "To narrow the search, please provide one of the following:",
                    menu_options: [
                        { id: "nin", title: "NIN", description: "National Identification Number" },
                        { id: "phone", title: "Phone Number", description: "Registered phone number" },
                        { id: "email", title: "Email Address", description: "Registered email" },
                        { id: "dob", title: "Date of Birth", description: "DD/MM/YYYY format" },
                    ],
                    next_step: 1,
                    awaiting_input: "identifier_type",
                };
            }
            // ------------------------------------------------------------------
            // Step 1: Collect the identifier value
            // ------------------------------------------------------------------
            case 1: {
                const trimmed = input.trim().toLowerCase();
                // If this is a menu selection (identifier type), ask for the value
                const identifierTypes = ["nin", "phone", "email", "dob"];
                if (identifierTypes.includes(trimmed) && !data.identifier_type) {
                    data.identifier_type = trimmed;
                    const prompts = {
                        nin: "Please enter your *11-digit NIN*:",
                        phone: "Please enter your *registered phone number*:\n\n_Example: 08012345678_",
                        email: "Please enter your *registered email address*:",
                        dob: "Please enter your *date of birth* in DD/MM/YYYY format:",
                    };
                    return {
                        message: prompts[trimmed],
                        next_step: 1,
                        awaiting_input: "identifier_value",
                    };
                }
                // Validate the identifier value based on type
                const idType = data.identifier_type ?? this.detectIdentifierType(trimmed);
                const value = trimmed;
                if (idType === "nin" && !/^\d{11}$/.test(value)) {
                    return {
                        message: "A NIN must be exactly *11 digits*. Please try again:",
                        next_step: 1,
                        awaiting_input: "identifier_value",
                    };
                }
                if (idType === "phone" && !/^0[7-9]\d{9}$/.test(value.replace(/[\s-]/g, ""))) {
                    return {
                        message: "That doesn't look like a valid Nigerian phone number.\n" +
                            "Please enter it in the format: *08012345678*",
                        next_step: 1,
                        awaiting_input: "identifier_value",
                    };
                }
                if (idType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return {
                        message: "That doesn't look like a valid email address. Please try again:",
                        next_step: 1,
                        awaiting_input: "identifier_value",
                    };
                }
                data.identifier_type = idType;
                data.identifier_value = value;
                // Perform the lookup
                const lookupParams = {
                    name: data.name,
                };
                if (idType === "nin")
                    lookupParams.nin = value;
                if (idType === "phone")
                    lookupParams.phone = value;
                if (idType === "email")
                    lookupParams.email = value;
                if (idType === "dob")
                    lookupParams.dob = value;
                const result = await jtbService.lookupTIN(lookupParams);
                if (!result.success || !result.data || result.data.length === 0) {
                    return {
                        message: "I couldn't find a TIN matching the information provided.\n\n" +
                            "This could mean:\n" +
                            "- The details don't match our records\n" +
                            "- You may not have registered for a TIN yet\n\n" +
                            "Would you like to:",
                        buttons: [
                            { id: "retry", title: "Try Again" },
                            { id: "register", title: "Register for TIN" },
                        ],
                        next_step: 2,
                        awaiting_input: "not_found_action",
                    };
                }
                // Mask the TIN for security: show first 3 and last 2 digits
                const matches = result.data;
                data.tin_results = matches;
                if (matches.length === 1) {
                    const match = matches[0];
                    const maskedTin = match.tin.slice(0, 3) + "****" + match.tin.slice(-2);
                    data.selected_tin = match.tin;
                    data.taxpayer_name = match.taxpayer_name;
                    return {
                        message: `I found your TIN!\n\n` +
                            `*Name:* ${match.taxpayer_name}\n` +
                            `*TIN:* ${maskedTin}\n` +
                            `*Tax Office:* ${match.tax_office}\n` +
                            `*Status:* ${match.status}\n\n` +
                            "Would you like me to send your TIN certificate?",
                        buttons: [
                            { id: "send_whatsapp", title: "Send on WhatsApp" },
                            { id: "send_email", title: "Send via Email" },
                            { id: "done", title: "No, I'm done" },
                        ],
                        next_step: 3,
                        awaiting_input: "certificate_delivery",
                    };
                }
                // Multiple matches found
                const listing = matches.map((m, i) => {
                    const masked = m.tin.slice(0, 3) + "****" + m.tin.slice(-2);
                    return `${i + 1}. *${m.taxpayer_name}* - TIN: ${masked} (${m.tax_office})`;
                }).join("\n");
                return {
                    message: `I found *${matches.length} possible matches*:\n\n` +
                        listing +
                        "\n\nPlease reply with the number of the correct record:",
                    next_step: 2,
                    awaiting_input: "tin_selection",
                };
            }
            // ------------------------------------------------------------------
            // Step 2: Handle TIN selection (multiple matches) or not-found actions
            // ------------------------------------------------------------------
            case 2: {
                const trimmed = input.trim().toLowerCase();
                // Handle not-found actions
                if (trimmed === "retry" || trimmed === "try again") {
                    return this.start(phone);
                }
                if (trimmed === "register" || trimmed === "register for tin") {
                    return {
                        message: "I'll redirect you to our TIN Registration service. One moment...",
                        flow_complete: true,
                    };
                }
                // Handle multiple-match selection
                const results = data.tin_results;
                if (!results || results.length === 0) {
                    return this.start(phone);
                }
                const selection = parseInt(trimmed, 10);
                if (isNaN(selection) || selection < 1 || selection > results.length) {
                    return {
                        message: `Please reply with a number between *1* and *${results.length}*:`,
                        next_step: 2,
                        awaiting_input: "tin_selection",
                    };
                }
                const selected = results[selection - 1];
                const maskedTin = selected.tin.slice(0, 3) + "****" + selected.tin.slice(-2);
                data.selected_tin = selected.tin;
                data.taxpayer_name = selected.taxpayer_name;
                return {
                    message: `You selected:\n\n` +
                        `*Name:* ${selected.taxpayer_name}\n` +
                        `*TIN:* ${maskedTin}\n` +
                        `*Tax Office:* ${selected.tax_office}\n` +
                        `*Status:* ${selected.status}\n\n` +
                        "Would you like me to send your TIN certificate?",
                    buttons: [
                        { id: "send_whatsapp", title: "Send on WhatsApp" },
                        { id: "send_email", title: "Send via Email" },
                        { id: "done", title: "No, I'm done" },
                    ],
                    next_step: 3,
                    awaiting_input: "certificate_delivery",
                };
            }
            // ------------------------------------------------------------------
            // Step 3: Send TIN certificate or wrap up
            // ------------------------------------------------------------------
            case 3: {
                const choice = input.trim().toLowerCase();
                if (choice === "done" || choice === "no" || choice === "no, i'm done") {
                    return {
                        message: "No problem! Your TIN has been confirmed.\n\n" +
                            "If you need anything else, just type *menu* or ask me a question.",
                        flow_complete: true,
                    };
                }
                if (choice === "send_whatsapp" || choice === "send on whatsapp" || choice === "whatsapp") {
                    return {
                        message: `Your TIN certificate for *${data.taxpayer_name}* is being generated.\n\n` +
                            "You will receive the document in this chat shortly.\n\n" +
                            "_Please note: This is an unmasked document. Keep it secure._\n\n" +
                            "Is there anything else I can help you with?",
                        flow_complete: true,
                    };
                }
                if (choice === "send_email" || choice === "send via email" || choice === "email") {
                    return {
                        message: `Your TIN certificate for *${data.taxpayer_name}* will be sent to your registered email address.\n\n` +
                            "Please check your inbox (and spam folder) within the next few minutes.\n\n" +
                            "Is there anything else I can help you with?",
                        flow_complete: true,
                    };
                }
                return {
                    message: "Please select one of the options:",
                    buttons: [
                        { id: "send_whatsapp", title: "Send on WhatsApp" },
                        { id: "send_email", title: "Send via Email" },
                        { id: "done", title: "No, I'm done" },
                    ],
                    next_step: 3,
                    awaiting_input: "certificate_delivery",
                };
            }
            default:
                return {
                    message: "Something went wrong. Let's start the TIN retrieval again.",
                    next_step: 0,
                    awaiting_input: "full_name",
                };
        }
    }
    /** Auto-detect identifier type from input format */
    detectIdentifierType(value) {
        if (/^\d{11}$/.test(value))
            return "nin";
        if (/^0[7-9]\d{9}$/.test(value.replace(/[\s-]/g, "")))
            return "phone";
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            return "email";
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(value))
            return "dob";
        return "unknown";
    }
}
export default new TinRetrievalFlow();
