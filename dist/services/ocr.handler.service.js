import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "canvas";
import { pathToFileURL } from "url";
const workerFile = path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerFile).toString();
export async function extractTextFromFile(filePath) {
    console.log('[ocr.handler.service::extractTextFromFile] ENTER', { filePath });
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".pdf") {
        console.log('[ocr.handler.service::extractTextFromFile] branch: pdf');
        const result = await extractFromPDF(filePath);
        console.log('[ocr.handler.service::extractTextFromFile] EXIT', { kind: 'pdf', textLength: result.length });
        return result;
    }
    console.log('[ocr.handler.service::extractTextFromFile] branch: image');
    const result = await extractFromImage(filePath);
    console.log('[ocr.handler.service::extractTextFromFile] EXIT', { kind: 'image', textLength: result.length });
    return result;
}
async function extractFromImage(imagePath) {
    console.log('[ocr.handler.service::extractFromImage] ENTER', { imagePath });
    const buffer = await fs.readFile(imagePath);
    console.log('[ocr.handler.service::extractFromImage] branch: buffer loaded', { size: buffer.length });
    const { data } = await Tesseract.recognize(buffer, "eng");
    const text = data.text.trim();
    console.log('[ocr.handler.service::extractFromImage] EXIT', { textLength: text.length });
    return text;
}
async function extractFromPDF(pdfPath) {
    console.log('[ocr.handler.service::extractFromPDF] ENTER', { pdfPath });
    const buffer = await fs.readFile(pdfPath);
    const uint8Array = new Uint8Array(buffer);
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    console.log('[ocr.handler.service::extractFromPDF] branch: pdf loaded', { numPages: pdf.numPages });
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        console.log('[ocr.handler.service::extractFromPDF] branch: processing page', { pageNum: i });
        const page = await pdf.getPage(i);
        // Try selectable text first
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(" ");
        if (pageText.trim().length > 50) {
            console.log('[ocr.handler.service::extractFromPDF] branch: selectable text used', { pageNum: i, length: pageText.length });
            fullText += pageText + "\n";
            continue;
        }
        console.log('[ocr.handler.service::extractFromPDF] branch: falling back to OCR', { pageNum: i });
        // Fallback: OCR the rendered page
        const imageBuffer = await renderPdfPageToImage(page);
        const { data } = await Tesseract.recognize(imageBuffer, "eng");
        fullText += data.text + "\n";
    }
    const trimmed = fullText.trim();
    console.log('[ocr.handler.service::extractFromPDF] EXIT', { totalLength: trimmed.length });
    return trimmed;
}
async function renderPdfPageToImage(page) {
    console.log('[ocr.handler.service::renderPdfPageToImage] ENTER');
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");
    await page.render({
        canvasContext: context,
        viewport,
    }).promise;
    console.log('[ocr.handler.service::renderPdfPageToImage] branch: render complete');
    const buf = canvas.toBuffer("image/png");
    console.log('[ocr.handler.service::renderPdfPageToImage] EXIT', { size: buf.length });
    return buf;
}
