/**
 * טסטים ל-checklistMatch.js — התאמת מסמך שהתקבל למשימה שנתית תואמת.
 * פונקציה טהורה, בלי DB.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { matchChecklistTask } from '../checklistMatch.js';

describe('matchChecklistTask', () => {
  const tasks = [
    { id: 1, task_name: 'איסוף טופס 106', task_category: 'דוח שכיר' },
    { id: 2, task_name: 'דיווח רווח הון — ניירות ערך זרים (IBKR)', task_category: 'רווח הון זר' },
    { id: 3, task_name: 'הגשת דוח שנתי למס הכנסה', task_category: 'דוח מס הכנסה' },
  ];

  test('סוג המסמך מופיע כביטוי מלא בשם המשימה → matched', () => {
    const doc = { document_type: 'טופס 106', document_name: 'טופס 106', entity_name: 'מעסיק' };
    const match = matchChecklistTask(doc, tasks);
    assert.equal(match?.id, 1);
  });

  test('שם הגוף מופיע בטקסט המשימה (בלי התאמת סוג) → matched', () => {
    const doc = { document_type: 'Annual Activity Statement', document_name: 'Annual Activity Statement', entity_name: 'IBKR' };
    const match = matchChecklistTask(doc, tasks);
    assert.equal(match?.id, 2);
  });

  test('בלי document_type — נופל ל-document_name', () => {
    const doc = { document_name: 'טופס 106', entity_name: 'מעסיק' };
    const match = matchChecklistTask(doc, tasks);
    assert.equal(match?.id, 1);
  });

  test('אין התאמה חזקה מספיק → null (לא מנחשים)', () => {
    const doc = { document_type: 'אישור כלשהו', document_name: 'אישור כלשהו', entity_name: 'גוף לא ידוע' };
    const match = matchChecklistTask(doc, tasks);
    assert.equal(match, null);
  });

  test('ביטוי קצר מדי (פחות מ-3 תווים) לא נחשב אות אמין', () => {
    const doc = { document_type: 'עד', document_name: 'עד', entity_name: '' };
    const match = matchChecklistTask(doc, tasks);
    assert.equal(match, null);
  });

  test('רשימת משימות ריקה → null', () => {
    const doc = { document_type: 'טופס 106', document_name: 'טופס 106', entity_name: 'מעסיק' };
    assert.equal(matchChecklistTask(doc, []), null);
  });

  test('בוחר את התוצאה עם הניקוד הגבוה ביותר', () => {
    const doc = { document_type: 'איסוף טופס 106', document_name: 'איסוף טופס 106', entity_name: '' };
    // כאן ה-docType עצמו מכיל את כל שם המשימה — score גבוה למשימה 1 בלבד
    const match = matchChecklistTask(doc, tasks);
    assert.equal(match?.id, 1);
  });
});
