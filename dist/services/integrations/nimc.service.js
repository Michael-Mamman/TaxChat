import { NIMC_BASE_URL, NIMC_API_KEY } from "../../config.js";
class NIMCService {
    baseUrl = NIMC_BASE_URL;
    apiKey = NIMC_API_KEY;
    async verifyNIN(nin) {
        console.log("[NIMC] verifyNIN stub called:", nin);
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
    async getNINDetails(nin) {
        console.log("[NIMC] getNINDetails stub called:", nin);
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
    async verifyNINWithBiometric(nin, photoBase64) {
        console.log("[NIMC] verifyNINWithBiometric stub called:", nin, `photo_length=${photoBase64.length}`);
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
