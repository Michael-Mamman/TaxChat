import { CIN_BASE_URL, CIN_API_KEY } from "../../config.js";
import type { IntegrationResponse } from "../../types/integration.types.js";

class CINService {
  private baseUrl = CIN_BASE_URL;
  private apiKey = CIN_API_KEY;

  async logEvent(
    eventType: string,
    data: Record<string, unknown>
  ): Promise<IntegrationResponse> {
    console.log(
      "[CIN] logEvent stub called:",
      eventType,
      JSON.stringify(data)
    );

    return {
      success: true,
      message: `Event '${eventType}' logged successfully (stub)`,
      status_code: 201,
    };
  }

  async getAnalytics(
    phone?: string,
    dateRange?: { from: string; to: string }
  ): Promise<IntegrationResponse> {
    console.log(
      "[CIN] getAnalytics stub called:",
      phone ?? "(all users)",
      dateRange ? JSON.stringify(dateRange) : "(all time)"
    );

    return {
      success: true,
      message: "Analytics retrieved successfully (stub)",
      status_code: 200,
      data: {
        total_sessions: 1247,
        total_messages: 8934,
        unique_users: 482,
        avg_session_duration_seconds: 342,
        top_intents: [
          { intent: "tin_retrieval", count: 312, percentage: 25.1 },
          { intent: "payment_confirmation", count: 287, percentage: 23.0 },
          { intent: "filing_support", count: 198, percentage: 15.9 },
          { intent: "assessment_query", count: 156, percentage: 12.5 },
          { intent: "general_enquiry", count: 134, percentage: 10.8 },
          { intent: "tin_registration", count: 98, percentage: 7.9 },
          { intent: "penalty_query", count: 62, percentage: 5.0 },
        ],
        resolution_rate: 0.78,
        escalation_rate: 0.12,
        avg_satisfaction_score: 4.2,
        period: {
          from: dateRange?.from ?? "2024-01-01",
          to: dateRange?.to ?? new Date().toISOString().split("T")[0],
        },
        ...(phone
          ? {
              user_metrics: {
                phone,
                sessions: 14,
                messages: 87,
                first_seen: "2024-02-15",
                last_seen: new Date().toISOString().split("T")[0],
                primary_intent: "payment_confirmation",
                satisfaction_score: 4.5,
              },
            }
          : {}),
      },
    };
  }
}

export default new CINService();
