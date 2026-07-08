/**
 * seed.js — זריעת נתוני דמו מלאים (להדגמת כל הפיצ'רים / E2E).
 * כולל: מצאי אמיתי + היסטוריית 2025 + יתרות לדוגמה + גוף שהסתיים (BTB).
 * הרצה: npm run seed  ⚠️ מוחק את כל הנתונים הקיימים.
 * לשימוש אמיתי (בלי נתוני דמו) — השתמש ב-`npm run starter`.
 */
import { init } from './init.js';
import { runQuery, getAll } from './helper.js';
import { insertInventory, YEAR } from './inventory.js';

const PREV_YEAR = 2025;

// דמו בלבד: BTB מסומן כהתקשרות שהסתיימה (להדגמת "הסתיים" בהשוואת שנים)
const ENDED_ENTITIES = { 'BTB': '2025-12-31' };

// דמו בלבד: מסמכי היסטוריה 2025 (בסיס להשוואת שנה-לשנה)
const PREV_DOCS = {
  'בנק מזרחי — משפחתי': ['טופס 867'],
  'וואן זירו — השקעות': ['טופס 867'],
  'IBKR': ['Annual Activity Statement'],
  'IBI השקעות': ['טופס 867'],
  'מיטב ד"ש': ['טופס 867'],
  'קרן השתלמות': ['אישור הפקדות שנתי'],
  'קופת גמל': ['דוח שנתי קופת גמל'],
  'קרן פנסיה': ['אישור הפקדות לפנסיה'],
  'ביטוח חיים': ['אישור מס שנתי'],
  'BTB': ['טופס 867'],
};

// דמו בלבד: יתרות לדוגמה (להדגמת דוח הסיכום)
const ACCOUNTS = [
  { entity: 'בנק מזרחי — משפחתי', name: 'עו״ש משפחתי', type: 'עובר ושב', balance: 45000, currency: 'ILS' },
  { entity: 'וואן זירו — השקעות', name: 'תיק השקעות', type: 'ניירות ערך', balance: 120000, currency: 'ILS' },
  { entity: 'IBKR', name: 'תיק ניירות ערך זר', type: 'ברוקראז׳', balance: 320000, currency: 'USD' },
  { entity: 'מיטב ד"ש', name: 'קרן השתלמות', type: 'חיסכון', balance: 85000, currency: 'ILS' },
  { entity: 'קרן פנסיה', name: 'צבירה פנסיונית', type: 'פנסיה', balance: 410000, currency: 'ILS' },
  { entity: 'משכנתא — דירת מגורים', name: 'יתרת משכנתא', type: 'הלוואה', balance: 780000, currency: 'ILS' },
  { entity: 'משכנתא — דירה להשקעה', name: 'יתרת משכנתא', type: 'הלוואה', balance: 620000, currency: 'ILS' },
];

async function seed() {
  await init();

  console.log('🧹 מנקה נתונים קיימים...');
  runQuery('DELETE FROM documents');
  runQuery('DELETE FROM accounts');
  runQuery('DELETE FROM annual_checklist');
  runQuery('DELETE FROM financial_entities');
  runQuery('DELETE FROM activity_log');
  runQuery("DELETE FROM sqlite_sequence WHERE name IN ('documents','accounts','annual_checklist','financial_entities','activity_log')");

  console.log('🏦 מכניס מצאי (גופים + מסמכי 2026 + משימות)...');
  const { idByName, docCount } = insertInventory(runQuery, getAll, { endedEntities: ENDED_ENTITIES });
  console.log(`   → גופים + ${docCount} מסמכי ${YEAR} + משימות`);

  console.log(`📚 מכניס היסטוריית ${PREV_YEAR} (הוגשו)...`);
  let prevCount = 0;
  for (const [entityName, names] of Object.entries(PREV_DOCS)) {
    const entityId = idByName[entityName];
    if (!entityId) continue;
    for (const name of names) {
      runQuery(
        'INSERT INTO documents (entity_id, document_name, required_frequency, year, required_by_date, date_filed, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [entityId, name, 'yearly', PREV_YEAR, `${PREV_YEAR}-04-30`, `${PREV_YEAR}-03-15`, 'submitted']
      );
      prevCount++;
    }
  }
  console.log(`   → ${prevCount} מסמכי ${PREV_YEAR}`);

  console.log('💳 מכניס חשבונות (יתרות לדוגמה)...');
  for (const a of ACCOUNTS) {
    const entityId = idByName[a.entity];
    if (!entityId) continue;
    runQuery(
      'INSERT INTO accounts (entity_id, account_name, account_type, balance, currency) VALUES (?, ?, ?, ?, ?)',
      [entityId, a.name, a.type || null, a.balance, a.currency]
    );
  }
  console.log(`   → ${ACCOUNTS.length} חשבונות`);

  console.log('\n🌱 הזריעה (דמו) הושלמה בהצלחה!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ שגיאה בזריעה:', err);
  process.exit(1);
});
