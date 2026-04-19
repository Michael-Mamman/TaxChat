import axios, { AxiosError } from "axios";
import type { EmailPayload, EmailResponse } from "../types/email.types.js";
import { EMAIL_SERVICE_URL } from "../config.js";

export async function sendEmail(payload: EmailPayload): Promise<EmailResponse> {
  const url = `${EMAIL_SERVICE_URL}/email/send`;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(payload.token
          ? { Authorization: `Bearer ${payload.token}` }
          : {}),
      },
      maxBodyLength: Infinity,
    });

    return {
      success: true,
      data: response.data,
      message: "Email sent successfully",
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<Record<string, unknown>>;
      console.error(
        "Failed to send email:",
        axiosError.response?.data || axiosError.message,
      );
      return {
        success: false,
        error: axiosError.message,
        message:
          (axiosError.response?.data?.message as string) ||
          "Failed to send email",
      };
    }

    console.error("Unknown error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "An unexpected error occurred while sending email",
    };
  }
}
