// מנוע הבנת מסמכים היברידי: כללים מקומיים קודם, נפילה ל-GPT כשצריך.
//   1. חילוץ טקסט (pdf-parse) + סיווג כללים  — חינם, מיידי, טוב ל-PDF דיגיטלי מוכר.
//   2. אם הביטחון לא גבוה (סרוק/עברית משובשת/פורמט לא מוכר) ו-GPT זמין —
//      שולחים את הקובץ ל-GPT (ראייה) ומעדיפים את תוצאתו.
// מחזיר תמיד את אותה מבנה כמו classifyText, בתוספת שדה method ('rules' | 'gpt').
import { extractText } from './extract.js';
import { classifyText, ISSUERS } from './classify.js';
import { understandWithGPT, gptAvailable } from './gpt.js';

// התאמה ישירה: הכלה הדדית בין שם הגוף שזוהה לשם הגוף ב-DB (case-insensitive).
function directMatch(nameLower, entities) {
  const found = entities.find((e) => {
    const name = (e.name || '').toLowerCase();
    return name && (name.includes(nameLower) || nameLower.includes(name));
  });
  return found ? found.id : null;
}

// התאמת שם גוף שזוהה (ע"י GPT) לגוף קיים במערכת.
// GPT מחזיר טקסט חופשי (למשל "ONE ZERO Digital Bank LTD" או "Mizrahi-Tefahot Bank") שלרוב
// אינו תואם מילולית לשם המדויק שהוזן במערכת ("וואן זירו — השקעות"). לכן קודם מנסים לתרגם
// את השם דרך אותה טביעת-אצבע (ISSUERS) ששימושה ברמת הכללים, ורק אם זה לא מניב תוצאה —
// נופלים להתאמת substring גולמית (מכסה שמות גוף ייחודיים שהמשתמש הזין ידנית).
function matchEntity(issuerName, entities) {
  if (!issuerName) return null;
  const norm = issuerName.toLowerCase();

  const issuerEntry = ISSUERS.find((entry) =>
    entry.terms.some((t) => norm.includes(t.toLowerCase()) || t.toLowerCase().includes(norm))
  );
  if (issuerEntry) {
    const viaFingerprint = entities.find((e) => {
      const name = (e.name || '').toLowerCase();
      return name && issuerEntry.terms.some((t) => name.includes(t.toLowerCase()));
    });
    if (viaFingerprint) return viaFingerprint.id;
  }

  return directMatch(norm, entities);
}

// ממיר את פלט GPT (issuerName/docType/entityType/...) למבנה ההצעות של classifyText.
// summary/amounts/docDate — בונוס שרק ל-GPT יש (הכללים לא מנתחים תוכן חופשי).
function aiToSuggestions(c, entities) {
  return {
    issuer: c.issuerName
      ? { name: c.issuerName, entityId: matchEntity(c.issuerName, entities), suggestedType: c.entityType || null }
      : null,
    docType: c.docType || null,
    year: c.year || null,
    docDate: c.docDate || null,
    renewalDate: c.renewalDate || null,
    summary: c.summary || null,
    amounts: Array.isArray(c.amounts) ? c.amounts : [],
    confidence: c.confidence || 'low',
    matchedTerms: [],
  };
}

/**
 * understandDocument(filePath, entities, opts?) → { ...suggestions, method }
 * opts.aiFn / opts.available מוזרקים בטסטים (ברירת מחדל: המימוש האמיתי).
 */
export async function understandDocument(filePath, entities = [], opts = {}) {
  const aiFn = opts.aiFn || understandWithGPT;
  const available = opts.available !== undefined ? opts.available : gptAvailable();

  // שלב 1 — כללים מקומיים (חינם, מיידי)
  const text = await extractText(filePath);
  const rules = classifyText(text, entities);

  // אין מפתח GPT → עובדים עם הכללים בלבד
  if (!available) return { ...rules, method: 'rules' };

  // שלב 2 — GPT (ראייה). כשמוגדר מפתח מריצים אותו תמיד — המשתמש הגדיר אותו
  // כדי לקבל ניתוח אמיתי, וזה מונע התאמות-שווא של הכללים מלהשתלט בשקט.
  // הכללים משמשים כגיבוי אם GPT נכשל.
  const ai = await aiFn(filePath);
  if (!ai) return { ...rules, method: 'rules', aiError: true };
  return { ...aiToSuggestions(ai, entities), method: 'gpt' };
}
