import axios, { AxiosError } from "axios";
import { EMAIL_SERVICE_URL } from "../config.js";
export async function sendEmail(payload) {
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
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error;
            console.error("Failed to send email:", axiosError.response?.data || axiosError.message);
            return {
                success: false,
                error: axiosError.message,
                message: axiosError.response?.data?.message ||
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
