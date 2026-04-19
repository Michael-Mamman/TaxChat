import axios from "axios";
export async function downloadWhatsappImage(mediaId) {
    const token = process.env.WHATSAPP_TOKEN;
    const metaResp = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } });
    const mediaUrl = metaResp.data.url;
    const imgResp = await axios.get(mediaUrl, {
        responseType: "arraybuffer",
        headers: { Authorization: `Bearer ${token}` },
    });
    return Buffer.from(imgResp.data);
}
