// מנוע סיווג מסמכים מבוסס-כללים — פונקציה טהורה (קלה לבדיקה).
// מקבל טקסט (מחולץ מ-PDF) ורשימת גופים, ומחזיר הצעות: גוף מנפיק, סוג מסמך, שנה.

// "טביעות אצבע" של גופים מנפיקים — canonical → מונחים שמזהים אותם בטקסט.
// type = סוג הגוף המשוער (bank/insurance/investment) — משמש להצעת סוג ביצירת גוף חדש.
const ISSUERS = [
  { canonical: 'בנק מזרחי', type: 'bank', terms: ['מזרחי', 'mizrahi'] },
  { canonical: 'וואן זירו', type: 'bank', terms: ['וואן זירו', 'one zero', 'onezero', 'wan zero'] },
  { canonical: 'IBKR', type: 'investment', terms: ['ibkr', 'interactive brokers', 'אינטראקטיב'] },
  { canonical: 'IBI', type: 'investment', terms: ['ibi', 'אי.בי.אי', 'אי בי אי'] },
  { canonical: 'BTB', type: 'investment', terms: ['btb'] },
  { canonical: 'מיטב', type: 'investment', terms: ['מיטב'] },
  { canonical: 'אלטשולר שחם', type: 'investment', terms: ['אלטשולר'] },
  { canonical: 'הראל', type: 'insurance', terms: ['הראל'] },
  { canonical: 'כלל', type: 'insurance', terms: ['כלל ביטוח', 'כלל חברה'] },
  { canonical: 'מגדל', type: 'insurance', terms: ['מגדל'] },
  { canonical: 'הפניקס', type: 'insurance', terms: ['הפניקס'] },
  { canonical: 'בנק הפועלים', type: 'bank', terms: ['הפועלים', 'poalim'] },
  { canonical: 'בנק לאומי', type: 'bank', terms: ['לאומי', 'leumi'] },
  { canonical: 'בנק דיסקונט', type: 'bank', terms: ['דיסקונט', 'discont'] },
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

// מילות-עוגן למועד חידוש/תוקף (פוליסות, טסט, רישיונות)
const RENEWAL_KEYWORDS = [
  'בתוקף עד', 'תוקף עד', 'בתוקף ל', 'מועד חידוש', 'תאריך חידוש',
  'תוקף הרישיון', 'תפוגה', 'עד תאריך', 'תאריך סיום', 'valid until', 'expiry', 'תוקף',
];
const DATE_RE = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})|(\d{4})-(\d{2})-(\d{2})/;
const pad = (n) => String(n).padStart(2, '0');

// מנרמל תאריך שנתפס ל-YYYY-MM-DD (מניח פורמט ישראלי DD/MM/YYYY)
function normalizeDate(m) {
  if (m[1]) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  return `${m[4]}-${m[5]}-${m[6]}`;
}

// חילוץ מועד חידוש — תאריך שמופיע סמוך למילת-עוגן של תוקף.
function extractRenewalDate(text) {
  for (const kw of RENEWAL_KEYWORDS) {
    let idx = text.indexOf(kw);
    while (idx !== -1) {
      const window = text.slice(idx, idx + 45);
      const m = window.match(DATE_RE);
      if (m) {
        const iso = normalizeDate(m);
        if (!isNaN(new Date(iso).getTime())) return iso;
      }
      idx = text.indexOf(kw, idx + 1);
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
 *   issuer: { name, entityId, suggestedType } | null,
 *   docType: string | null,
 *   year: number | null,
 *   renewalDate: 'YYYY-MM-DD' | null,   // מועד חידוש/תוקף שזוהה
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
  const renewalDate = extractRenewalDate(norm);

  let issuer = null;
  if (issuerMatch) {
    matchedTerms.push(issuerMatch.term);
    // התאמה לגוף קיים במערכת — לפי הכלה של אחד המונחים בשם הגוף
    const entry = ISSUERS.find((i) => i.canonical === issuerMatch.canonical);
    const matchedEntity = entities.find((e) =>
      entry.terms.some((t) => (e.name || '').toLowerCase().includes(t.toLowerCase()))
    );
    // suggestedType — סוג הגוף המשוער, להצעת יצירת גוף חדש כשאין התאמה קיימת
    issuer = {
      name: issuerMatch.canonical,
      entityId: matchedEntity ? matchedEntity.id : null,
      suggestedType: entry.type || null,
    };
  }

  const docType = docTypeMatch ? docTypeMatch.canonical : null;
  if (docTypeMatch) matchedTerms.push(docTypeMatch.term);

  let confidence = 'low';
  if (issuer && docType) confidence = 'high';
  else if (issuer || docType) confidence = 'medium';

  return { issuer, docType, year, renewalDate, confidence, matchedTerms };
}
