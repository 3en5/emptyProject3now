// הבנת מסמך באמצעות GPT (ראייה) — קורא PDF/תמונה ומחזיר שדות מובנים.
// שכבת ה"נפילה" של המנוע ההיברידי: מופעלת רק כשהכללים המקומיים לא בטוחים,
// ורק אם מוגדר OPENAI_API_KEY. בלי מפתח / בשגיאה — מחזירה null (המערכת ממשיכה עם הכללים).
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// המודל ניתן לעקיפה דרך env. ברירת מחדל: gpt-4o (ראייה + structured outputs + PDF).
const MODEL = process.env.FINANCE_GPT_MODEL || 'gpt-4o';

// סכימת הפלט המובנה — strict דורש שכל השדות חובה ו-additionalProperties:false.
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    issuerName: { type: 'string', description: "שם הגוף/החברה שהנפיקו את המסמך (למשל 'הראל', 'בנק מזרחי', 'AIG'), או '' אם לא ברור" },
    docType: { type: 'string', description: "סוג המסמך בעברית (למשל 'טופס 867', 'פוליסת ביטוח חיים', 'אישור טסט'), או ''" },
    entityType: { type: 'string', enum: ['bank', 'insurance', 'investment', 'realty', 'loan', 'vehicle', 'license', 'donation', 'other', ''], description: 'סוג הגוף הפיננסי (donation = עמותה/מוסד שקיבל תרומה)' },
    year: { type: 'integer', description: 'שנת המס/הדיווח של המסמך, או 0 אם אין' },
    docDate: { type: 'string', description: "התאריך שמופיע על המסמך עצמו (תאריך הפקה/חתימה), בפורמט YYYY-MM-DD, או '' אם אין" },
    renewalDate: { type: 'string', description: "מועד חידוש/תפוגה/הגשה עתידי (שונה מ-docDate), בפורמט YYYY-MM-DD, או '' אם אין" },
    summary: { type: 'string', description: "תקציר קצר בעברית (1-2 משפטים): מה המסמך, מה הגוף, ומה עיקר תוכנו" },
    amounts: {
      type: 'array',
      items: { type: 'string', description: "שורת סכום כפי שמופיעה במסמך, כולל הקשר, למשל 'פרמיה חודשית: 340 ₪' או 'יתרה לתשלום: 12,500 ₪'" },
      description: 'כל הסכומים הכספיים המשמעותיים במסמך (עד 8), עם הקשר קצר לכל אחד. מערך ריק אם אין סכומים',
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'רמת הביטחון בזיהוי' },
  },
  required: ['issuerName', 'docType', 'entityType', 'year', 'docDate', 'renewalDate', 'summary', 'amounts', 'confidence'],
};

const MEDIA_TYPES = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

let client = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) return null; // אין מפתח → לא מפעילים את GPT
  if (!client) client = new OpenAI();
  return client;
}

export function gptAvailable() {
  return !!process.env.OPENAI_API_KEY;
}

// בונה חלק content לפי סוג הקובץ: PDF כקובץ מצורף, תמונה כ-data URL.
function buildFilePart(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mediaType = MEDIA_TYPES[ext];
  if (!mediaType) return null;
  const data = fs.readFileSync(filePath).toString('base64');
  if (mediaType === 'application/pdf') {
    return { type: 'file', file: { filename: 'document.pdf', file_data: `data:application/pdf;base64,${data}` } };
  }
  return { type: 'image_url', image_url: { url: `data:${mediaType};base64,${data}` } };
}

const PROMPT = `אתה עוזר לזהות ולסכם מסמכים פיננסיים ישראליים. קרא את המסמך המצורף (ייתכן שהוא סרוק או בעברית) והחזר את השדות המובנים בלבד.
- issuerName: שם הגוף שהנפיק (בנק, חברת ביטוח, בית השקעות, רשות וכו').
- docType: סוג המסמך בעברית.
- entityType: סוג הגוף מתוך הרשימה.
- year: שנת המס/הדיווח (מספר), או 0.
- docDate: התאריך שמופיע על המסמך עצמו (תאריך הפקה/חתימה) — לא בהכרח מועד חידוש.
- renewalDate: מועד חידוש/תפוגה/הגשה עתידי, אם שונה מ-docDate.
- summary: תקציר קצר וממוקד בעברית (1-2 משפטים) — מה המסמך, מי הגוף, ומה עיקר התוכן (למשל: "פוליסת ביטוח חיים של הראל, מחדשת כיסוי קיים בפרמיה חודשית קבועה").
- amounts: כל הסכומים הכספיים המשמעותיים במסמך כפי שהם מופיעים בו (עד 8), כל אחד עם הקשר קצר. אם אין סכומים — מערך ריק.
- confidence: כמה אתה בטוח בזיהוי.
אם משהו לא ברור — החזר '' (או 0 לשנה, [] לסכומים). אל תמציא נתונים.`;

/**
 * understandWithGPT(filePath) → אובייקט בשמות הכלליים
 * (issuerName/docType/entityType/year/docDate/renewalDate/summary/amounts/confidence)
 * או null אם אין מפתח / הקובץ לא נתמך / שגיאה.
 */
export async function understandWithGPT(filePath) {
  const c = getClient();
  if (!c) return null;
  const filePart = buildFilePart(filePath);
  if (!filePart) return null;

  try {
    const res = await c.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 1500, // מרחב נוסף לתקציר + רשימת סכומים
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'document_fields', strict: true, schema: SCHEMA },
      },
      messages: [{ role: 'user', content: [filePart, { type: 'text', text: PROMPT }] }],
    });
    const msg = res.choices?.[0]?.message;
    if (!msg || msg.refusal || !msg.content) return null;
    return JSON.parse(msg.content);
  } catch (err) {
    if (!process.env.FINANCE_QUIET) console.error('GPT understanding failed:', err.message);
    return null;
  }
}
