export interface EmailPayload {
  to_email: string;
  to_name: string;
  subject: string;
  body: string;
  token?: string;
}

export interface EmailResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}
