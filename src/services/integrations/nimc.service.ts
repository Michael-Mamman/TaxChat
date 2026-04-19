import { NIMC_BASE_URL, NIMC_API_KEY } from "../../config.js";
import type {
  IntegrationResponse,
  NINVerificationResult,
} from "../../types/integration.types.js";

class NIMCService {
  private baseUrl = NIMC_BASE_URL;
  private apiKey = NIMC_API_KEY;

  async verifyNIN(
    nin: string
  ): Promise<IntegrationResponse<NINVerificationResult>> {
    console.log("[nimc.service::verifyNIN] ENTER", {
      ninLength: nin?.length,
      baseUrl: this.baseUrl,
    });
    console.log("[NIMC] verifyNIN stub called:", nin);

    console.log("[nimc.service::verifyNIN] EXIT", { status: 200, is_valid: true });
    return {
      success: true,
      message: "NIN verified successfully (stub)",
      status_code: 200,
      data: {
        nin,
        first_name: "Amina",
        last_name: "Ibrahim",
        middle_name: "Bello",
        date_of_birth: "1990-05-14",
        gender: "Female",
        phone: "08012345678",
        is_valid: true,
      },
    };
  }

  async getNINDetails(
    nin: string
  ): Promise<IntegrationResponse<NINVerificationResult>> {
    console.log("[nimc.service::getNINDetails] ENTER", {
      ninLength: nin?.length,
      baseUrl: this.baseUrl,
    });
    console.log("[NIMC] getNINDetails stub called:", nin);

    console.log("[nimc.service::getNINDetails] EXIT", { status: 200 });
    return {
      success: true,
      message: "NIN details retrieved successfully (stub)",
      status_code: 200,
      data: {
        nin,
        first_name: "Amina",
        last_name: "Ibrahim",
        middle_name: "Bello",
        date_of_birth: "1990-05-14",
        gender: "Female",
        phone: "08012345678",
        photo_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB",
        is_valid: true,
      },
    };
  }

  async verifyNINWithBiometric(
    nin: string,
    photoBase64: string
  ): Promise<IntegrationResponse<NINVerificationResult>> {
    console.log("[nimc.service::verifyNINWithBiometric] ENTER", {
      ninLength: nin?.length,
      photoLength: photoBase64?.length,
      baseUrl: this.baseUrl,
    });
    console.log(
      "[NIMC] verifyNINWithBiometric stub called:",
      nin,
      `photo_length=${photoBase64.length}`
    );

    console.log("[nimc.service::verifyNINWithBiometric] EXIT", {
      status: 200,
      is_valid: true,
    });
    return {
      success: true,
      message: "NIN biometric verification successful (stub)",
      status_code: 200,
      data: {
        nin,
        first_name: "Amina",
        last_name: "Ibrahim",
        middle_name: "Bello",
        date_of_birth: "1990-05-14",
        gender: "Female",
        phone: "08012345678",
        is_valid: true,
      },
    };
  }
}

export default new NIMCService();
