import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";

const MAX_PDF_BYTES = 25 * 1024 * 1024;
const MAX_PAGES = 40;
const MAX_CHARS = 60_000; // keeps the prompt well inside the model's context window
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export const isSummarizerConfigured = () => Boolean(env.gemini.apiKey);

const downloadPdf = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw ApiError.unavailable("Couldn't download the PDF from storage", "STORAGE_FETCH_FAILED");
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_PDF_BYTES) throw ApiError.badRequest("This PDF is too large to summarize", undefined, "PDF_TOO_LARGE");
  return new Uint8Array(await response.arrayBuffer());
};

export const extractPdfText = async (data) => {
  const pdf = await getDocument({ data, useSystemFonts: true, isEvalSupported: false, verbosity: 0 }).promise;
  try {
    let text = "";
    const pages = Math.min(pdf.numPages, MAX_PAGES);
    for (let pageNumber = 1; pageNumber <= pages && text.length < MAX_CHARS; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      text += `${content.items.map((item) => item.str).join(" ")}\n`;
    }
    return text.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
  } finally {
    await pdf.destroy();
  }
};

const askGemini = async (prompt) => {
  const response = await fetch(`${GEMINI_URL}/${encodeURIComponent(env.gemini.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.gemini.apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.error({ status: response.status, body: body.slice(0, 500) }, "gemini request failed");
    throw ApiError.unavailable("The summary service is busy right now, please try again shortly", "SUMMARIZER_FAILED");
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("").trim();
  if (!text) throw ApiError.unavailable("The summary service returned an empty response", "SUMMARIZER_FAILED");
  return text;
};

/** Downloads a PDF, pulls out its text and asks Gemini for a summary of about `maxWords` words. */
export const summarizePdf = async (url, maxWords) => {
  if (!isSummarizerConfigured()) {
    throw ApiError.unavailable("PDF summaries aren't configured on this server", "SUMMARIZER_NOT_CONFIGURED");
  }

  let text;
  try {
    text = await extractPdfText(await downloadPdf(url));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.warn({ err: error }, "pdf text extraction failed");
    throw ApiError.badRequest("This file couldn't be read as a PDF", undefined, "PDF_UNREADABLE");
  }
  if (text.length < 50) {
    throw ApiError.badRequest(
      "This PDF has no readable text (it may be a scanned image)",
      undefined,
      "PDF_NO_TEXT"
    );
  }

  const prompt = [
    `Summarize the study material below for a student in about ${maxWords} words.`,
    "Focus on the key ideas, definitions and conclusions. Use short paragraphs or bullet points.",
    "Only use information from the material.",
    "",
    "--- MATERIAL START ---",
    text,
    "--- MATERIAL END ---",
  ].join("\n");

  return askGemini(prompt);
};
