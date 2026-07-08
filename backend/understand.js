// מנוע הבנת מסמכים היברידי: כללים מקומיים קודם, נפילה ל-Claude כשצריך.
//   1. חילוץ טקסט (pdf-parse) + סיווג כללים  — חינם, מיידי, טוב ל-PDF דיגיטלי מוכר.
//   2. אם הביטחון לא גבוה (סרוק/עברית משובשת/פורמט לא מוכר) ו-Claude זמין —
//      שולחים את הקובץ ל-Claude (ראייה) ומעדיפים את תוצאתו.
// מחזיר תמיד את אותה מבנה כמו classifyText, בתוספת שדה method ('rules' | 'claude').
import { extractText } from './extract.js';
import { classifyText } from './classify.js';
import { understandWithClaude, claudeAvailable } from './claude.js';

// התאמת שם גוף שזוהה (ע"י Claude) לגוף קיים במערכת — לפי הכלה הדדית של השמות.
function matchEntity(issuerName, entities) {
  if (!issuerName) return null;
  const norm = issuerName.toLowerCase();
  const found = entities.find((e) => {
    const name = (e.name || '').toLowerCase();
    return name && (name.includes(norm) || norm.includes(name));
  });
  return found ? found.id : null;
}

// ממיר את פלט Claude (issuerName/docType/entityType/...) למבנה ההצעות של classifyText.
function claudeToSuggestions(c, entities) {
  return {
    issuer: c.issuerName
      ? { name: c.issuerName, entityId: matchEntity(c.issuerName, entities), suggestedType: c.entityType || null }
      : null,
    docType: c.docType || null,
    year: c.year || null,
    renewalDate: c.renewalDate || null,
    confidence: c.confidence || 'low',
    matchedTerms: [],
  };
}

/**
 * understandDocument(filePath, entities, opts?) → { ...suggestions, method }
 * opts.claudeFn / opts.available מוזרקים בטסטים (ברירת מחדל: המימוש האמיתי).
 */
export async function understandDocument(filePath, entities = [], opts = {}) {
  const claudeFn = opts.claudeFn || understandWithClaude;
  const available = opts.available !== undefined ? opts.available : claudeAvailable();

  // שלב 1 — כללים מקומיים
  const text = await extractText(filePath);
  const rules = classifyText(text, entities);

  // ביטחון גבוה → מספיק, בלי לקרוא ל-Claude (חוסך עלות)
  if (rules.confidence === 'high' || !available) {
    return { ...rules, method: 'rules' };
  }

  // שלב 2 — נפילה ל-Claude
  const claude = await claudeFn(filePath);
  if (!claude) return { ...rules, method: 'rules' }; // נכשל/אין מפתח → נשארים עם הכללים
  return { ...claudeToSuggestions(claude, entities), method: 'claude' };
}
