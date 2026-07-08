/**
 * starter.js — התחלה נקייה לשימוש אמיתי.
 * מכניס את מבנה המצאי שלך (גופים + סלוטים של מסמכים מצופים + משימות שנתיות),
 * בלי נתוני דמו: בלי יתרות מזויפות, בלי היסטוריית 2025, בלי גופים "שהסתיימו".
 * אחרי הרצה — פשוט להתחיל להעלות מסמכים אמיתיים לסלוטים המוכנים.
 * הרצה: npm run starter  ⚠️ מוחק את כל הנתונים הקיימים.
 */
import { init } from './init.js';
import { runQuery, getAll } from './helper.js';
import { insertInventory, YEAR } from './inventory.js';

async function starter() {
  await init();

  console.log('🧹 מנקה נתונים קיימים...');
  runQuery('DELETE FROM documents');
  runQuery('DELETE FROM accounts');
  runQuery('DELETE FROM annual_checklist');
  runQuery('DELETE FROM financial_entities');
  runQuery('DELETE FROM activity_log');
  runQuery("DELETE FROM sqlite_sequence WHERE name IN ('documents','accounts','annual_checklist','financial_entities','activity_log')");

  console.log('🏗️  מכין מבנה מצאי נקי...');
  const { docCount } = insertInventory(runQuery, getAll);
  console.log(`   → גופים + ${docCount} סלוטים של מסמכי ${YEAR} + משימות`);

  console.log('\n✅ המערכת מוכנה לשימוש! עכשיו אפשר להתחיל להעלות מסמכים אמיתיים.');
  process.exit(0);
}

starter().catch((err) => {
  console.error('❌ שגיאה:', err);
  process.exit(1);
});
