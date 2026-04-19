import { NIBSS_BASE_URL, NIBSS_API_KEY } from "../../config.js";
import type {
  IntegrationResponse,
  BVNVerificationResult,
} from "../../types/integration.types.js";

class NIBSSService {
  private baseUrl = NIBSS_BASE_URL;
  private apiKey = NIBSS_API_KEY;

  async verifyBVN(
    bvn: string
  ): Promise<IntegrationResponse<BVNVerificationResult>> {
    console.log("[NIBSS] verifyBVN stub called:", bvn);

    return {
      success: true,
      message: "BVN verified successfully (stub)",
      status_code: 200,
      data: {
        bvn,
        first_name: "Chukwuemeka",
        last_name: "Nwosu",
        date_of_birth: "1985-11-23",
        phone: "08034567890",
        is_valid: true,
      },
    };
  }

  async getBVNDetails(
    bvn: string
  ): Promise<IntegrationResponse<BVNVerificationResult>> {
    console.log("[NIBSS] getBVNDetails stub called:", bvn);

    return {
      success: true,
      message: "BVN details retrieved successfully (stub)",
      status_code: 200,
      data: {
        bvn,
        first_name: "Chukwuemeka",
        last_name: "Nwosu",
        date_of_birth: "1985-11-23",
        phone: "08034567890",
        is_valid: true,
      },
    };
  }
}

export default new NIBSSService();
