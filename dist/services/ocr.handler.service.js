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
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".pdf") {
        return extractFromPDF(filePath);
    }
    return extractFromImage(filePath);
}
async function extractFromImage(imagePath) {
    const buffer = await fs.readFile(imagePath);
    const { data } = await Tesseract.recognize(buffer, "eng");
    return data.text.trim();
}
async function extractFromPDF(pdfPath) {
    const buffer = await fs.readFile(pdfPath);
    const uint8Array = new Uint8Array(buffer);
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        // Try selectable text first
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(" ");
        if (pageText.trim().length > 50) {
            fullText += pageText + "\n";
            continue;
        }
        // Fallback: OCR the rendered page
        const imageBuffer = await renderPdfPageToImage(page);
        const { data } = await Tesseract.recognize(imageBuffer, "eng");
        fullText += data.text + "\n";
    }
    return fullText.trim();
}
async function renderPdfPageToImage(page) {
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");
    await page.render({
        canvasContext: context,
        viewport,
    }).promise;
    return canvas.toBuffer("image/png");
}
