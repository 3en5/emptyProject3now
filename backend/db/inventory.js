/**
 * inventory.js — המצאי האמיתי המשותף (גופים, מסמכים מצופים, משימות שנתיות).
 * משמש גם את `seed.js` (דמו) וגם את `starter.js` (התחלה נקייה לשימוש אמיתי).
 * ⚠️ אין כאן נתונים רגישים (מספרי חשבון/סכומים) — רק מבנה ומועדים.
 */

export const YEAR = 2026;

// גופים פיננסיים לפי המצאי של המשתמש (כולם פעילים)
export const ENTITIES = [
  // בנקים
  { name: 'חשבון עסקי', type: 'bank', category: 'חשבון עסקי' },
  { name: 'בנק מזרחי — משפחתי', type: 'bank', category: 'חשבון משפחתי' },
  { name: 'וואן זירו — השקעות', type: 'bank', category: 'חשבון השקעות' },
  // השקעות
  { name: 'IBKR', type: 'investment', category: 'ניירות ערך', notes: 'ברוקר זר — לא מנפיק 867 ישראלי' },
  { name: 'IBI השקעות', type: 'investment', category: 'ניירות ערך' },
  { name: 'BTB', type: 'investment', category: 'קרן השקעות' },
  { name: 'מיטב ד"ש', type: 'investment', category: 'ניירות ערך' },
  { name: 'קרן השתלמות', type: 'investment', category: 'קרן השתלמות' },
  { name: 'קופת גמל', type: 'investment', category: 'גמל' },
  // ביטוחים / פנסיה
  { name: 'ביטוח חיים', type: 'insurance', category: 'ביטוח חיים' },
  { name: 'ביטוח בריאות', type: 'insurance', category: 'ביטוח בריאות' },
  { name: 'קרן פנסיה', type: 'investment', category: 'קרן פנסיה' },
  { name: 'ביטוח מנהלים', type: 'insurance', category: 'ביטוח מנהלים' },
  { name: 'פוליסת חיסכון', type: 'insurance', category: 'פוליסת חיסכון' },
  // נדל"ן
  { name: 'דירת מגורים', type: 'realty', category: 'דירת מגורים' },
  { name: 'דירה להשקעה', type: 'realty', category: 'נכס השקעה' },
  // משכנתאות
  { name: 'משכנתא — דירת מגורים', type: 'loan', category: 'משכנתא' },
  { name: 'משכנתא — דירה להשקעה', type: 'loan', category: 'משכנתא' },
  // רכבים
  { name: 'רכב פרטי', type: 'vehicle', category: 'רכב פרטי' },
  // רישיונות
  { name: 'רישיון כלי יריה', type: 'license', category: 'רישיון כלי יריה' },
  { name: 'תעודת מתווך נדל"ן', type: 'license', category: 'תעודת מתווך נדל"ן' },
];

// מסמכים מצופים לכל גוף (לפי REPORTS.md) — עם מועדי הגשה/חידוש משוערים
export const EXPECTED_DOCS = {
  'בנק מזרחי — משפחתי': [{ name: 'טופס 867', freq: 'yearly', due: '2026-04-30' }],
  'וואן זירו — השקעות': [{ name: 'טופס 867', freq: 'yearly', due: '2026-04-30' }],
  'IBKR': [{ name: 'Annual Activity Statement', freq: 'yearly', due: '2026-04-30' }],
  'IBI השקעות': [{ name: 'טופס 867', freq: 'yearly', due: '2026-07-15' }],
  'מיטב ד"ש': [{ name: 'טופס 867', freq: 'yearly', due: '2026-07-18' }],
  'קרן השתלמות': [{ name: 'אישור הפקדות שנתי', freq: 'yearly', due: '2026-07-12' }],
  'קופת גמל': [{ name: 'דוח שנתי קופת גמל', freq: 'yearly', due: '2026-12-31' }],
  'קרן פנסיה': [{ name: 'אישור הפקדות לפנסיה', freq: 'yearly', due: '2026-11-30' }],
  'ביטוח מנהלים': [{ name: 'אישור הפקדות (סעיף 45א/47)', freq: 'yearly', due: '2026-09-30' }],
  'משכנתא — דירת מגורים': [{ name: 'אישור יתרת משכנתא', freq: 'yearly', due: '2026-07-10' }],
  'משכנתא — דירה להשקעה': [{ name: 'אישור יתרת משכנתא', freq: 'yearly', due: '2026-08-31' }],
  'רכב פרטי': [
    { name: 'ביטוח חובה', freq: 'yearly', due: '2026-08-01' },
    { name: 'ביטוח מקיף', freq: 'yearly', due: '2026-08-01' },
    { name: 'טסט שנתי', freq: 'yearly', due: '2026-07-20' },
  ],
  'רישיון כלי יריה': [{ name: 'חידוש רישיון כלי יריה', freq: 'yearly', due: '2026-09-15' }],
  'תעודת מתווך נדל"ן': [{ name: 'חידוש תעודת מתווך', freq: 'yearly', due: '2026-10-01' }],
};

// משימות שנתיות (Outbound — לרשויות) עם מועדי הגשה
export const CHECKLIST = [
  { task: 'הגשת דוח שנתי למס הכנסה', cat: 'דוח מס הכנסה', assignee: 'user', due: '2026-05-31' },
  { task: 'דוח מע"מ', cat: 'דוח מע"מ', assignee: 'user', due: '2026-07-15' },
  { task: 'מקדמות מס הכנסה', cat: 'מקדמות', assignee: 'user', due: '2026-07-16' },
  { task: 'ביטוח לאומי — עצמאי', cat: 'ביטוח לאומי', assignee: 'user', due: '2026-08-15' },
  { task: 'דיווח רווח הון — ניירות ערך זרים (IBKR)', cat: 'רווח הון זר', assignee: 'user', due: '2026-04-30' },
  { task: 'דיווח הכנסה משכר דירה', cat: 'שכר דירה', assignee: 'user', due: '2026-05-31' },
  { task: 'איסוף טופס 106', cat: 'דוח שכיר', assignee: 'spouse', due: '2026-03-31' },
];

// פונקציית עזר משותפת: מכניסה גופים, מסמכים ומשימות. מחזירה מיפוי שם→id.
export function insertInventory(runQuery, getAll, { endedEntities = {} } = {}) {
  for (const e of ENTITIES) {
    const activeUntil = endedEntities[e.name] || null;
    runQuery(
      'INSERT INTO financial_entities (name, type, category, notes, status, active_until) VALUES (?, ?, ?, ?, ?, ?)',
      [e.name, e.type, e.category, e.notes || null, activeUntil ? 'inactive' : 'active', activeUntil]
    );
  }
  const idByName = {};
  for (const row of getAll('SELECT id, name FROM financial_entities')) idByName[row.name] = row.id;

  let docCount = 0;
  for (const [entityName, docs] of Object.entries(EXPECTED_DOCS)) {
    const entityId = idByName[entityName];
    if (!entityId) continue;
    for (const d of docs) {
      runQuery(
        'INSERT INTO documents (entity_id, document_name, required_frequency, year, required_by_date, status) VALUES (?, ?, ?, ?, ?, ?)',
        [entityId, d.name, d.freq, YEAR, d.due || null, 'pending']
      );
      docCount++;
    }
  }

  for (const t of CHECKLIST) {
    runQuery(
      'INSERT INTO annual_checklist (year, task_name, task_category, assignee, required_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      [YEAR, t.task, t.cat, t.assignee, t.due || null, 'pending']
    );
  }

  return { idByName, docCount };
}
