import Tesseract from "tesseract.js";
export async function runOCR(imageBuffer) {
    try {
        const { data: { text }, } = await Tesseract.recognize(imageBuffer, "eng", {
            logger: (m) => console.log("OCR:", m.status),
        });
        return text;
    }
    catch (err) {
        console.error("OCR failed:", err);
        throw new Error("OCR_PROCESSING_FAILED");
    }
}
