import { JTB_BASE_URL, JTB_API_KEY } from "../../config.js";
class JTBService {
    baseUrl = JTB_BASE_URL;
    apiKey = JTB_API_KEY;
    async lookupTIN(params) {
        console.log("[jtb.service::lookupTIN] ENTER", {
            hasName: !!params.name,
            hasPhone: !!params.phone,
            hasEmail: !!params.email,
            hasNin: !!params.nin,
            hasDob: !!params.dob,
            baseUrl: this.baseUrl,
        });
        console.log("[JTB] lookupTIN stub called:", JSON.stringify(params));
        console.log("[jtb.service::lookupTIN] EXIT", { status: 200, resultCount: 2 });
        // Reflect the name that was searched for. Returning a fixed name means a
        // taxpayer searching for themselves is shown somebody else's record, which
        // reads as a data leak even though the data is synthetic.
        const searchedName = (params.name ?? "").trim() || "Amina Bello Ibrahim";
        const parts = searchedName.split(/\s+/);
        const firstName = parts[0] ?? searchedName;
        const lastName = parts.length > 1 ? parts[parts.length - 1] : firstName;
        return {
            success: true,
            message: "TIN lookup completed successfully (stub)",
            status_code: 200,
            data: [
                {
                    tin: "1234567890",
                    taxpayer_name: searchedName,
                    first_name: firstName,
                    last_name: lastName,
                    tax_type: "Personal Income Tax",
                    tax_office: "Nassarawa Tax Office, Jos",
                    registration_date: "2019-04-15",
                    status: "active",
                    phone: params.phone ?? "08012345678",
                    email: params.email ?? "amina.ibrahim@example.com",
                },
                {
                    tin: "1234567891",
                    taxpayer_name: `${firstName} ${lastName}`,
                    first_name: firstName,
                    last_name: lastName,
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
    async verifyTIN(tin) {
        console.log("[jtb.service::verifyTIN] ENTER", {
            tinLength: tin?.length,
            baseUrl: this.baseUrl,
        });
        console.log("[JTB] verifyTIN stub called:", tin);
        console.log("[jtb.service::verifyTIN] EXIT", { status: 200 });
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
    async registerTIN(payload) {
        console.log("[jtb.service::registerTIN] ENTER", {
            tax_type: payload.tax_type,
            state: payload.state,
            lga: payload.lga,
            gender: payload.gender,
            hasMiddleName: !!payload.middle_name,
            hasEmail: !!payload.email,
            hasNin: !!payload.nin,
            hasBvn: !!payload.bvn,
            employment_status: payload.employment_status,
        });
        console.log("[JTB] registerTIN stub called:", JSON.stringify(payload));
        console.log("[jtb.service::registerTIN] EXIT", {
            status: 201,
            state: payload.state,
        });
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
                registration_date: new Date().toISOString().split("T")[0],
                status: "active",
                phone: payload.phone,
                email: payload.email ?? "",
            },
        };
    }
    async getTINStatus(applicationRef) {
        console.log("[jtb.service::getTINStatus] ENTER", { applicationRef });
        console.log("[JTB] getTINStatus stub called:", applicationRef);
        console.log("[jtb.service::getTINStatus] EXIT", {
            applicationRef,
            status: 200,
        });
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
                registration_date: new Date().toISOString().split("T")[0],
                status: "active",
                phone: "07012345678",
                email: "fatima.aliyu@example.com",
            },
        };
    }
}
export default new JTBService();
