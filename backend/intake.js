// לוגיקת התיוק החכם — פונקציה טהורה (קלה לבדיקה, בלי DB).
// מקבלת את תוצאת הסיווג (classifyText) ואת רשימת ה"סלוטים" הפנויים של הגוף
// (מסמכים ממתינים ללא קובץ), ומחליטה: לתייק לסלוט קיים / ליצור מסמך חדש / לא זוהה גוף.

export const HOLDING_ENTITY_NAME = '📥 ממתין לשיוך';

/**
 * decideFiling(suggestions, candidates) → {
 *   action: 'matched' | 'create' | 'unmatched',
 *   target?: document,   // הסלוט שנבחר (רק ב-matched)
 *   score?: number,
 * }
 *
 * ניקוד ההתאמה לכל מועמד:
 *   +1 אותו גוף (כל המועמדים) · +3 התאמת סוג מסמך לשם · +2 התאמת שנה
 * מתייקים לסלוט רק בהתאמה חזקה:
 *   סוג המסמך תואם (score ≥ 4), או שנה תואמת כשיש מועמד יחיד (score ≥ 3).
 * אחרת עדיף ליצור מסמך חדש מאשר לתייק למקום שגוי.
 */
export function decideFiling(suggestions, candidates) {
  if (!suggestions.issuer?.entityId) return { action: 'unmatched' };

  let best = null;
  let bestScore = 0;
  const docType = (suggestions.docType || '').toLowerCase();

  for (const c of candidates) {
    let score = 1; // אותו גוף
    const name = (c.document_name || '').toLowerCase();
    if (docType && name && (name.includes(docType) || docType.includes(name))) score += 3;
    if (suggestions.year && c.year === suggestions.year) score += 2;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }

  if (best && (bestScore >= 4 || (bestScore >= 3 && candidates.length === 1))) {
    return { action: 'matched', target: best, score: bestScore };
  }
  return { action: 'create' };
}
