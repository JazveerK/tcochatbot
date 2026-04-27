// pdf-parse works as a default export
// @ts-ignore - pdf-parse types are complex
import pdfParse from "pdf-parse";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdf = await pdfParse(buffer);
    return pdf.text;
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function extractTextFromText(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8");
}

export async function parseUploadedFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    return extractTextFromPdf(buffer);
  } else if (ext === "txt") {
    return extractTextFromText(buffer);
  } else {
    throw new Error(`Unsupported file type: .${ext}`);
  }
}
