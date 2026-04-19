import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export async function decryptWhatsAppMedia(document) {
    const { cdn_url, file_name, encryption_metadata: { encrypted_hash, plaintext_hash, iv, encryption_key, hmac_key, }, } = document;
    const encryptedResponse = await axios.get(cdn_url, {
        responseType: "arraybuffer",
        transformResponse: [(data) => data],
    });
    const encryptedFile = Buffer.from(encryptedResponse.data);
    // Validate encrypted hash
    const encryptedSHA = crypto
        .createHash("sha256")
        .update(encryptedFile)
        .digest("base64");
    if (encryptedSHA !== encrypted_hash) {
        throw new Error("Encrypted hash mismatch");
    }
    // Split ciphertext + HMAC(10)
    const hmac10 = encryptedFile.subarray(encryptedFile.length - 10);
    const ciphertext = encryptedFile.subarray(0, encryptedFile.length - 10);
    // Validate HMAC
    const hmac = crypto
        .createHmac("sha256", Buffer.from(hmac_key, "base64"))
        .update(Buffer.concat([Buffer.from(iv, "base64"), ciphertext]))
        .digest();
    if (!crypto.timingSafeEqual(hmac10, hmac.subarray(0, 10))) {
        throw new Error("HMAC validation failed");
    }
    // AES-256-CBC Decryption
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(encryption_key, "base64"), Buffer.from(iv, "base64"));
    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);
    // Validate plaintext hash
    const plaintextSHA = crypto
        .createHash("sha256")
        .update(decrypted)
        .digest("base64");
    if (plaintextSHA !== plaintext_hash) {
        throw new Error("Plaintext hash validation failed");
    }
    // Save file
    const uploadDir = path.join(__dirname, "..", "..", "uploads");
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    const savePath = path.join(uploadDir, file_name);
    fs.writeFileSync(savePath, decrypted);
    return {
        filePath: savePath,
        base64: decrypted.toString("base64"),
    };
}
export async function handleFlowDataExchange(payload) {
    try {
        const document = payload.data?.documents?.[0];
        if (!document) {
            throw new Error("No document found in payload.data.documents");
        }
        const { filePath, base64 } = await decryptWhatsAppMedia(document);
        return { success: true, filePath, base64 };
    }
    catch (err) {
        console.error("Media processing failed:", err);
        throw err;
    }
}
