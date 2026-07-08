/**
 * reset.js — איפוס מלא: מוחק את קובץ ה-DB כך שהמערכת מתחילה ריקה לגמרי.
 * הרצה: npm run reset  ⚠️ מוחק את כל הנתונים ללא אפשרות שחזור.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.FINANCE_DB_PATH || path.join(__dirname, 'finance.db');

if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
  fs.rmSync(dbPath);
  console.log('🗑️  ה-DB נמחק — המערכת תתחיל ריקה בהפעלה הבאה.');
} else {
  console.log('ℹ️  אין DB למחיקה — המערכת כבר ריקה.');
}
