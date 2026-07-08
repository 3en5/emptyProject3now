// הבנת מסמך באמצעות Claude (ראייה + טקסט) — קורא PDF/תמונה ומחזיר שדות מובנים.
// שכבת ה"נפילה" של המנוע ההיברידי: מופעלת רק כשהכללים המקומיים לא בטוחים,
// ורק אם מוגדר ANTHROPIC_API_KEY. בלי מפתח / בשגיאה — מחזירה null (המערכת ממשיכה עם הכללים).
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

// מודל וברירות — ניתנים לעקיפה דרך env. ברירת המחדל: Opus 4.8 במאמץ נמוך (חסכוני, מדויק לחילוץ).
const MODEL = process.env.FINANCE_CLAUDE_MODEL || 'claude-opus-4-8';
const EFFORT = process.env.FINANCE_CLAUDE_EFFORT || 'low';

// סכימת הפלט המובנה — כל השדות חובה; ריק/0 כשלא ידוע (בלי nullable, לתאימות structured outputs).
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    issuerName: { type: 'string', description: "שם הגוף/החברה שהנפיקו את המסמך (למשל 'הראל', 'בנק מזרחי', 'AIG'), או '' אם לא ברור" },
    docType: { type: 'string', description: "סוג המסמך בעברית (למשל 'טופס 867', 'פוליסת ביטוח חיים', 'אישור טסט'), או ''" },
    entityType: { type: 'string', enum: ['bank', 'insurance', 'investment', 'realty', 'loan', 'vehicle', 'license', 'other', ''], description: 'סוג הגוף הפיננסי' },
    year: { type: 'integer', description: 'שנת המס/הדיווח של המסמך, או 0 אם אין' },
    renewalDate: { type: 'string', description: "מועד חידוש/תפוגה/הגשה בפורמט YYYY-MM-DD, או '' אם אין" },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'רמת הביטחון בזיהוי' },
  },
  required: ['issuerName', 'docType', 'entityType', 'year', 'renewalDate', 'confidence'],
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
  if (!process.env.ANTHROPIC_API_KEY) return null; // אין מפתח → לא מפעילים את Claude
  if (!client) client = new Anthropic();
  return client;
}

export function claudeAvailable() {
  return !!process.env.ANTHROPIC_API_KEY;
}

// בונה את בלוק ה-content לפי סוג הקובץ (מסמך PDF או תמונה).
function buildFileBlock(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mediaType = MEDIA_TYPES[ext];
  if (!mediaType) return null;
  const data = fs.readFileSync(filePath).toString('base64');
  if (mediaType === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: mediaType, data } };
  }
  return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
}

const PROMPT = `אתה עוזר לזהות מסמכים פיננסיים ישראליים. קרא את המסמך המצורף (ייתכן שהוא סרוק או בעברית) והחזר את השדות המובנים בלבד.
- issuerName: שם הגוף שהנפיק (בנק, חברת ביטוח, בית השקעות, רשות וכו').
- docType: סוג המסמך בעברית.
- entityType: סוג הגוף מתוך הרשימה.
- year: שנת המס/הדיווח (מספר), או 0.
- renewalDate: מועד חידוש/תפוגה אם קיים, בפורמט YYYY-MM-DD.
- confidence: כמה אתה בטוח בזיהוי.
אם משהו לא ברור — החזר '' (או 0 לשנה). אל תמציא.`;

/**
 * understandWithClaude(filePath) → אובייקט בשמות הכלליים (issuerName/docType/entityType/year/renewalDate/confidence)
 * או null אם אין מפתח / הקובץ לא נתמך / שגיאה.
 */
export async function understandWithClaude(filePath) {
  const c = getClient();
  if (!c) return null;
  const fileBlock = buildFileBlock(filePath);
  if (!fileBlock) return null;

  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { format: { type: 'json_schema', schema: SCHEMA }, effort: EFFORT },
      messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: PROMPT }] }],
    });
    if (res.stop_reason === 'refusal') return null;
    const textBlock = res.content.find((b) => b.type === 'text');
    if (!textBlock) return null;
    return JSON.parse(textBlock.text);
  } catch (err) {
    if (!process.env.FINANCE_QUIET) console.error('Claude understanding failed:', err.message);
    return null;
  }
}
