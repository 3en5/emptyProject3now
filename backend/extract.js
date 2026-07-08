import fs from 'fs';
import { PDFParse } from 'pdf-parse';

// חילוץ טקסט מקובץ PDF. best-effort — מחזיר '' אם נכשל או אם זה לא PDF (למשל תמונה סרוקה).
export async function extractText(filePath) {
  try {
    if (!/\.pdf$/i.test(filePath) || !fs.existsSync(filePath)) return '';
    const buf = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    const data = await parser.getText();
    // ניקוי כותרות עמוד שמוסיף pdf-parse (למשל "-- 1 of 2 --")
    return (data.text || '').replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '').trim();
  } catch {
    return '';
  }
}
