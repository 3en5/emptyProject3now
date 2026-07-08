/**
 * seed.js — זריעת נתוני המצאי האמיתי (מבנה בלבד, ללא נתונים רגישים).
 * הרצה: npm run seed
 * ⚠️ מוחק את כל הנתונים הקיימים ומכניס מצאי טרי.
 */
import { init } from './init.js';
import { runQuery, getAll } from './helper.js';

const YEAR = 2026;

// גופים פיננסיים — לפי המצאי של המשתמש (בלי מספרי חשבון/סכומים)
const ENTITIES = [
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
];

// מסמכים מצופים לכל גוף (לפי REPORTS.md) — name → [{doc, freq}]
const EXPECTED_DOCS = {
  'בנק מזרחי — משפחתי': [{ name: 'טופס 867', freq: 'yearly' }],
  'וואן זירו — השקעות': [{ name: 'טופס 867', freq: 'yearly' }],
  'IBKR': [{ name: 'Annual Activity Statement', freq: 'yearly' }],
  'IBI השקעות': [{ name: 'טופס 867', freq: 'yearly' }],
  'מיטב ד"ש': [{ name: 'טופס 867', freq: 'yearly' }],
  'קרן השתלמות': [{ name: 'אישור הפקדות שנתי', freq: 'yearly' }],
  'קופת גמל': [{ name: 'דוח שנתי קופת גמל', freq: 'yearly' }],
  'קרן פנסיה': [{ name: 'אישור הפקדות לפנסיה', freq: 'yearly' }],
  'ביטוח מנהלים': [{ name: 'אישור הפקדות (סעיף 45א/47)', freq: 'yearly' }],
  'משכנתא — דירת מגורים': [{ name: 'אישור יתרת משכנתא', freq: 'yearly' }],
  'משכנתא — דירה להשקעה': [{ name: 'אישור יתרת משכנתא', freq: 'yearly' }],
};

// משימות שנתיות (Outbound — לרשויות)
const CHECKLIST = [
  { task: 'הגשת דוח שנתי למס הכנסה', cat: 'דוח מס הכנסה', assignee: 'user' },
  { task: 'דוח מע"מ', cat: 'דוח מע"מ', assignee: 'user' },
  { task: 'מקדמות מס הכנסה', cat: 'מקדמות', assignee: 'user' },
  { task: 'ביטוח לאומי — עצמאי', cat: 'ביטוח לאומי', assignee: 'user' },
  { task: 'דיווח רווח הון — ניירות ערך זרים (IBKR)', cat: 'רווח הון זר', assignee: 'user' },
  { task: 'דיווח הכנסה משכר דירה', cat: 'שכר דירה', assignee: 'user' },
  { task: 'איסוף טופס 106', cat: 'דוח שכיר', assignee: 'spouse' },
];

async function seed() {
  await init();

  console.log('🧹 מנקה נתונים קיימים...');
  runQuery('DELETE FROM documents');
  runQuery('DELETE FROM accounts');
  runQuery('DELETE FROM annual_checklist');
  runQuery('DELETE FROM financial_entities');
  runQuery("DELETE FROM sqlite_sequence WHERE name IN ('documents','accounts','annual_checklist','financial_entities')");

  console.log('🏦 מכניס גופים פיננסיים...');
  for (const e of ENTITIES) {
    runQuery(
      'INSERT INTO financial_entities (name, type, category, notes, status) VALUES (?, ?, ?, ?, ?)',
      [e.name, e.type, e.category, e.notes || null, 'active']
    );
  }
  // שליפת ה-ids מה-DB לפי שם (אמין יותר מ-lastID אחרי DELETE)
  const idByName = {};
  for (const row of getAll('SELECT id, name FROM financial_entities')) {
    idByName[row.name] = row.id;
  }
  console.log(`   → ${ENTITIES.length} גופים`);

  console.log('📄 מכניס מסמכים מצופים...');
  let docCount = 0;
  for (const [entityName, docs] of Object.entries(EXPECTED_DOCS)) {
    const entityId = idByName[entityName];
    if (!entityId) continue;
    for (const d of docs) {
      runQuery(
        'INSERT INTO documents (entity_id, document_name, required_frequency, status) VALUES (?, ?, ?, ?)',
        [entityId, d.name, d.freq, 'pending']
      );
      docCount++;
    }
  }
  console.log(`   → ${docCount} מסמכים`);

  console.log('✅ מכניס משימות שנתיות...');
  for (const t of CHECKLIST) {
    runQuery(
      'INSERT INTO annual_checklist (year, task_name, task_category, assignee, status) VALUES (?, ?, ?, ?, ?)',
      [YEAR, t.task, t.cat, t.assignee, 'pending']
    );
  }
  console.log(`   → ${CHECKLIST.length} משימות`);

  console.log('\n🌱 הזריעה הושלמה בהצלחה!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ שגיאה בזריעה:', err);
  process.exit(1);
});
