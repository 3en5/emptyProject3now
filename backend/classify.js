// מנוע סיווג מסמכים מבוסס-כללים — פונקציה טהורה (קלה לבדיקה).
// מקבל טקסט (מחולץ מ-PDF) ורשימת גופים, ומחזיר הצעות: גוף מנפיק, סוג מסמך, שנה.

// "טביעות אצבע" של גופים מנפיקים — canonical → מונחים שמזהים אותם בטקסט
const ISSUERS = [
  { canonical: 'בנק מזרחי', terms: ['מזרחי', 'mizrahi'] },
  { canonical: 'וואן זירו', terms: ['וואן זירו', 'one zero', 'onezero', 'wan zero'] },
  { canonical: 'IBKR', terms: ['ibkr', 'interactive brokers', 'אינטראקטיב'] },
  { canonical: 'IBI', terms: ['ibi', 'אי.בי.אי', 'אי בי אי'] },
  { canonical: 'BTB', terms: ['btb'] },
  { canonical: 'מיטב', terms: ['מיטב'] },
  { canonical: 'אלטשולר שחם', terms: ['אלטשולר'] },
  { canonical: 'הראל', terms: ['הראל'] },
  { canonical: 'כלל', terms: ['כלל ביטוח', 'כלל חברה'] },
  { canonical: 'מגדל', terms: ['מגדל'] },
  { canonical: 'הפניקס', terms: ['הפניקס'] },
  { canonical: 'בנק הפועלים', terms: ['הפועלים', 'poalim'] },
  { canonical: 'בנק לאומי', terms: ['לאומי', 'leumi'] },
  { canonical: 'בנק דיסקונט', terms: ['דיסקונט', 'discont'] },
];

// סוגי מסמכים — canonical → מונחים
const DOC_TYPES = [
  { canonical: 'טופס 867', terms: ['867'] },
  { canonical: 'טופס 106', terms: ['106'] },
  { canonical: 'אישור יתרת משכנתא', terms: ['יתרת משכנתא', 'יתרת הלוואה'] },
  { canonical: 'אישור הפקדות', terms: ['אישור הפקדות', 'הפקדות לקופת', 'הפקדות שנתי'] },
  { canonical: 'Annual Activity Statement', terms: ['activity statement', 'annual statement'] },
  { canonical: 'דוח מע"מ', terms: ['מע"מ', 'מעמ', 'מס ערך מוסף'] },
  { canonical: 'דוח שנתי', terms: ['דוח שנתי'] },
  { canonical: 'אישור ניכוי מס במקור', terms: ['ניכוי מס במקור'] },
];

function findMatch(text, dictionary) {
  for (const entry of dictionary) {
    for (const term of entry.terms) {
      if (text.includes(term.toLowerCase())) {
        return { canonical: entry.canonical, term };
      }
    }
  }
  return null;
}

// חילוץ שנה — השנה השכיחה ביותר בטווח סביר (2015..currentYear+1); שובר תיקו לטובת הגבוהה.
function extractYear(text, currentYear) {
  const matches = text.match(/20\d\d/g) || [];
  const counts = {};
  for (const m of matches) {
    const y = parseInt(m);
    if (y >= 2015 && y <= currentYear + 1) counts[y] = (counts[y] || 0) + 1;
  }
  const years = Object.keys(counts).map(Number);
  if (years.length === 0) return null;
  years.sort((a, b) => counts[b] - counts[a] || b - a);
  return years[0];
}

/**
 * classifyText(text, entities, opts?) → {
 *   issuer: { name, entityId } | null,
 *   docType: string | null,
 *   year: number | null,
 *   confidence: 'high' | 'medium' | 'low',
 *   matchedTerms: string[],
 * }
 */
export function classifyText(text, entities = [], opts = {}) {
  const currentYear = opts.currentYear || new Date().getFullYear();
  const norm = (text || '').toLowerCase();
  const matchedTerms = [];

  const issuerMatch = findMatch(norm, ISSUERS);
  const docTypeMatch = findMatch(norm, DOC_TYPES);
  const year = extractYear(norm, currentYear);

  let issuer = null;
  if (issuerMatch) {
    matchedTerms.push(issuerMatch.term);
    // התאמה לגוף קיים במערכת — לפי הכלה של אחד המונחים בשם הגוף
    const entry = ISSUERS.find((i) => i.canonical === issuerMatch.canonical);
    const matchedEntity = entities.find((e) =>
      entry.terms.some((t) => (e.name || '').toLowerCase().includes(t.toLowerCase()))
    );
    issuer = { name: issuerMatch.canonical, entityId: matchedEntity ? matchedEntity.id : null };
  }

  const docType = docTypeMatch ? docTypeMatch.canonical : null;
  if (docTypeMatch) matchedTerms.push(docTypeMatch.term);

  let confidence = 'low';
  if (issuer && docType) confidence = 'high';
  else if (issuer || docType) confidence = 'medium';

  return { issuer, docType, year, confidence, matchedTerms };
}
