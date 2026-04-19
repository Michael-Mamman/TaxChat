import axios, { AxiosError } from "axios";
import { EMAIL_SERVICE_URL } from "../config.js";
export async function sendEmail(payload) {
    console.log('[email.service::sendEmail] ENTER', { tokenPresent: !!payload.token, toPresent: !!payload.to });
    const url = `${EMAIL_SERVICE_URL}/email/send`;
    try {
        console.log('[email.service::sendEmail] branch: try send');
        const response = await axios.post(url, payload, {
            headers: {
                "Content-Type": "application/json",
                ...(payload.token
                    ? { Authorization: `Bearer ${payload.token}` }
                    : {}),
            },
            maxBodyLength: Infinity,
        });
        console.log('[email.service::sendEmail] branch: success');
        console.log('[email.service::sendEmail] EXIT', { success: true });
        return {
            success: true,
            data: response.data,
            message: "Email sent successfully",
        };
    }
    catch (error) {
        console.log('[email.service::sendEmail] branch: catch');
        if (axios.isAxiosError(error)) {
            console.log('[email.service::sendEmail] branch: axios error');
            const axiosError = error;
            console.error("Failed to send email:", axiosError.response?.data || axiosError.message);
            console.log('[email.service::sendEmail] EXIT', { success: false, kind: 'axios' });
            return {
                success: false,
                error: axiosError.message,
                message: axiosError.response?.data?.message ||
                    "Failed to send email",
            };
        }
        console.log('[email.service::sendEmail] branch: unknown error');
        console.error("Unknown error sending email:", error);
        console.log('[email.service::sendEmail] EXIT', { success: false, kind: 'unknown' });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            message: "An unexpected error occurred while sending email",
        };
    }
}
