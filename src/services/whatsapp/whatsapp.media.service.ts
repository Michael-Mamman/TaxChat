import axios from "axios";

export async function downloadWhatsappImage(mediaId: string): Promise<Buffer> {
  console.log("[whatsapp.media.service::downloadWhatsappImage] ENTER", { hasMediaId: !!mediaId });
  const token = process.env.WHATSAPP_TOKEN;

  console.log("[whatsapp.media.service::downloadWhatsappImage] fetching media metadata");
  const metaResp = await axios.get(
    `https://graph.facebook.com/v19.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const mediaUrl = metaResp.data.url;
  console.log("[whatsapp.media.service::downloadWhatsappImage] got media URL, downloading bytes");

  const imgResp = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    headers: { Authorization: `Bearer ${token}` },
  });

  const buffer = Buffer.from(imgResp.data);
  console.log("[whatsapp.media.service::downloadWhatsappImage] EXIT", { sizeBytes: buffer.length });
  return buffer;
}
