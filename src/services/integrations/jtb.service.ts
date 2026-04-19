import { JTB_BASE_URL, JTB_API_KEY } from "../../config.js";
import type {
  IntegrationResponse,
  TINLookupResult,
} from "../../types/integration.types.js";

class JTBService {
  private baseUrl = JTB_BASE_URL;
  private apiKey = JTB_API_KEY;

  async lookupTIN(params: {
    name?: string;
    phone?: string;
    email?: string;
    nin?: string;
    dob?: string;
  }): Promise<IntegrationResponse<TINLookupResult[]>> {
    console.log("[JTB] lookupTIN stub called:", JSON.stringify(params));

    return {
      success: true,
      message: "TIN lookup completed successfully (stub)",
      status_code: 200,
      data: [
        {
          tin: "1234567890",
          taxpayer_name: "Amina Bello Ibrahim",
          first_name: "Amina",
          last_name: "Ibrahim",
          tax_type: "Personal Income Tax",
          tax_office: "Nassarawa Tax Office, Jos",
          registration_date: "2019-04-15",
          status: "active",
          phone: params.phone ?? "08012345678",
          email: params.email ?? "amina.ibrahim@example.com",
        },
        {
          tin: "1234567891",
          taxpayer_name: "Amina Bello",
          first_name: "Amina",
          last_name: "Bello",
          tax_type: "Personal Income Tax",
          tax_office: "Bukuru Tax Office, Jos",
          registration_date: "2021-08-22",
          status: "active",
          phone: "08098765432",
          email: "amina.bello@example.com",
        },
      ],
    };
  }

  async verifyTIN(tin: string): Promise<IntegrationResponse<TINLookupResult>> {
    console.log("[JTB] verifyTIN stub called:", tin);

    return {
      success: true,
      message: "TIN verified successfully (stub)",
      status_code: 200,
      data: {
        tin,
        taxpayer_name: "Chukwuemeka Obi Nwosu",
        first_name: "Chukwuemeka",
        last_name: "Nwosu",
        tax_type: "Company Income Tax",
        tax_office: "Large Tax Office, Abuja",
        registration_date: "2017-01-10",
        status: "active",
        phone: "08034567890",
        email: "c.nwosu@nwosuenterprises.com",
      },
    };
  }

  async registerTIN(payload: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    phone: string;
    email?: string;
    nin?: string;
    bvn?: string;
    date_of_birth: string;
    gender: string;
    address: string;
    lga: string;
    state: string;
    tax_type: string;
    employment_status?: string;
    employer_tin?: string;
  }): Promise<IntegrationResponse<TINLookupResult>> {
    console.log("[JTB] registerTIN stub called:", JSON.stringify(payload));

    return {
      success: true,
      message: "TIN registration submitted successfully (stub)",
      status_code: 201,
      data: {
        tin: `NEW-${Date.now().toString().slice(-10)}`,
        taxpayer_name: `${payload.first_name} ${payload.last_name}`,
        first_name: payload.first_name,
        last_name: payload.last_name,
        tax_type: payload.tax_type,
        tax_office: `${payload.state} State Tax Office`,
        registration_date: new Date().toISOString().split("T")[0]!,
        status: "active",
        phone: payload.phone,
        email: payload.email ?? "",
      },
    };
  }

  async getTINStatus(
    applicationRef: string
  ): Promise<IntegrationResponse<TINLookupResult>> {
    console.log("[JTB] getTINStatus stub called:", applicationRef);

    return {
      success: true,
      message: "TIN application status retrieved (stub)",
      status_code: 200,
      data: {
        tin: "9876543210",
        taxpayer_name: "Fatima Usman Aliyu",
        first_name: "Fatima",
        last_name: "Aliyu",
        tax_type: "Personal Income Tax",
        tax_office: "Wuse Tax Office, Abuja",
        registration_date: new Date().toISOString().split("T")[0]!,
        status: "active",
        phone: "07012345678",
        email: "fatima.aliyu@example.com",
      },
    };
  }
}

export default new JTBService();
