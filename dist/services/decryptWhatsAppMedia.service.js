import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export async function decryptWhatsAppMedia(document) {
    console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] ENTER', { fileName: document?.file_name, cdnUrlPresent: !!document?.cdn_url });
    const { cdn_url, file_name, encryption_metadata: { encrypted_hash, plaintext_hash, iv, encryption_key, hmac_key, }, } = document;
    const encryptedResponse = await axios.get(cdn_url, {
        responseType: "arraybuffer",
        transformResponse: [(data) => data],
    });
    console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] branch: fetched encrypted media');
    const encryptedFile = Buffer.from(encryptedResponse.data);
    console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] branch: encrypted buffer created', { size: encryptedFile.length });
    // Validate encrypted hash
    const encryptedSHA = crypto
        .createHash("sha256")
        .update(encryptedFile)
        .digest("base64");
    if (encryptedSHA !== encrypted_hash) {
        console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] branch: encrypted hash mismatch');
        console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] EXIT', { error: 'encrypted_hash_mismatch' });
        throw new Error("Encrypted hash mismatch");
    }
    console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] branch: encrypted hash OK');
    // Split ciphertext + HMAC(10)
    const hmac10 = encryptedFile.subarray(encryptedFile.length - 10);
    const ciphertext = encryptedFile.subarray(0, encryptedFile.length - 10);
    // Validate HMAC
    const hmac = crypto
        .createHmac("sha256", Buffer.from(hmac_key, "base64"))
        .update(Buffer.concat([Buffer.from(iv, "base64"), ciphertext]))
        .digest();
    if (!crypto.timingSafeEqual(hmac10, hmac.subarray(0, 10))) {
        console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] branch: HMAC validation failed');
        console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] EXIT', { error: 'hmac_failed' });
        throw new Error("HMAC validation failed");
    }
    console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] branch: HMAC validated');
    // AES-256-CBC Decryption
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(encryption_key, "base64"), Buffer.from(iv, "base64"));
    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);
    console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] branch: decryption complete', { decryptedSize: decrypted.length });
    // Validate plaintext hash
    const plaintextSHA = crypto
        .createHash("sha256")
        .update(decrypted)
        .digest("base64");
    if (plaintextSHA !== plaintext_hash) {
        console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] branch: plaintext hash mismatch');
        console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] EXIT', { error: 'plaintext_hash_failed' });
        throw new Error("Plaintext hash validation failed");
    }
    console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] branch: plaintext hash OK');
    // Save file
    const uploadDir = path.join(__dirname, "..", "..", "uploads");
    if (!fs.existsSync(uploadDir)) {
        console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] branch: upload dir missing, creating');
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    else {
        console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] branch: upload dir exists');
    }
    const savePath = path.join(uploadDir, file_name);
    fs.writeFileSync(savePath, decrypted);
    console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] branch: wrote file', { savePath });
    console.log('[decryptWhatsAppMedia.service::decryptWhatsAppMedia] EXIT', { savePath, mediaSize: decrypted.length });
    return {
        filePath: savePath,
        base64: decrypted.toString("base64"),
    };
}
export async function handleFlowDataExchange(payload) {
    console.log('[decryptWhatsAppMedia.service::handleFlowDataExchange] ENTER', { hasData: !!payload?.data });
    try {
        console.log('[decryptWhatsAppMedia.service::handleFlowDataExchange] branch: try');
        const document = payload.data?.documents?.[0];
        if (!document) {
            console.log('[decryptWhatsAppMedia.service::handleFlowDataExchange] branch: no document');
            throw new Error("No document found in payload.data.documents");
        }
        console.log('[decryptWhatsAppMedia.service::handleFlowDataExchange] branch: document found, decrypting');
        const { filePath, base64 } = await decryptWhatsAppMedia(document);
        console.log('[decryptWhatsAppMedia.service::handleFlowDataExchange] EXIT', { success: true, filePath });
        return { success: true, filePath, base64 };
    }
    catch (err) {
        console.log('[decryptWhatsAppMedia.service::handleFlowDataExchange] branch: catch error');
        console.error("Media processing failed:", err);
        console.log('[decryptWhatsAppMedia.service::handleFlowDataExchange] EXIT', { success: false, error: true });
        throw err;
    }
}
