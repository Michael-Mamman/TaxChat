import Tesseract from "tesseract.js";

export async function runOCR(imageBuffer: Buffer): Promise<string> {
  console.log('[ocr.service::runOCR] ENTER', { bufferSize: imageBuffer?.length });
  try {
    console.log('[ocr.service::runOCR] branch: try recognize');
    const {
      data: { text },
    } = await Tesseract.recognize(imageBuffer, "eng", {
      logger: (m) => console.log("OCR:", m.status),
    });

    console.log('[ocr.service::runOCR] EXIT', { success: true, textLength: text?.length });
    return text;
  } catch (err) {
    console.log('[ocr.service::runOCR] branch: catch error');
    console.error("OCR failed:", err);
    console.log('[ocr.service::runOCR] EXIT', { success: false });
    throw new Error("OCR_PROCESSING_FAILED");
  }
}
