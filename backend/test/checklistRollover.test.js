/**
 * טסטים ל-checklistRollover.js — מחזור משימות שנתי (rollover) עקב מסמך שהתקבל.
 * פונקציות טהורות, בלי DB.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { shiftYear, buildRolledTask, buildNextYearTask, buildCompletedFromDoc } from '../checklistRollover.js';

describe('shiftYear', () => {
  test('מזיז תאריך מלא שנה קדימה', () => {
    assert.equal(shiftYear('2025-03-01'), '2026-03-01');
  });

  test('null נשאר null', () => {
    assert.equal(shiftYear(null), null);
  });

  test('מחרוזת ריקה נשארת null', () => {
    assert.equal(shiftYear(''), null);
  });

  test('undefined נשאר null', () => {
    assert.equal(shiftYear(undefined), null);
  });
});

describe('buildRolledTask', () => {
  test('בונה עותק מושלם עבור השנה הנוכחית מתוך משימת שנה שעברה', () => {
    const doc = { id: 42, document_name: 'טופס 106' };
    const prevTask = {
      id: 1, year: 2024, task_name: 'איסוף טופס 106', task_category: 'דוח שכיר',
      entity_id: 7, assignee: 'spouse', required_date: '2024-04-30', status: 'pending',
    };
    const rolled = buildRolledTask(doc, prevTask, 2025, '2025-06-01');

    assert.equal(rolled.year, 2025);
    assert.equal(rolled.task_name, 'איסוף טופס 106');
    assert.equal(rolled.task_category, 'דוח שכיר');
    assert.equal(rolled.entity_id, 7);
    assert.equal(rolled.assignee, 'spouse');
    assert.equal(rolled.status, 'completed');
    assert.equal(rolled.completed_date, '2025-06-01');
    assert.equal(rolled.auto_completed, 1);
    assert.equal(rolled.auto_created, 1);
    assert.equal(rolled.completed_by_document_id, 42);
    assert.equal(rolled.required_date, '2025-04-30'); // הוזז שנה קדימה
  });

  test('required_date חסר בשנה הקודמת → נשאר null', () => {
    const doc = { id: 1 };
    const prevTask = { task_name: 'משימה', required_date: null };
    const rolled = buildRolledTask(doc, prevTask, 2025, '2025-01-01');
    assert.equal(rolled.required_date, null);
  });
});

describe('buildNextYearTask', () => {
  test('כשיש seriesTask — מעתיק שם/קטגוריה/גוף/אחראי, ומזיז את required_date שנה קדימה', () => {
    const doc = { id: 1, document_name: 'טופס 106' };
    const seriesTask = {
      task_name: 'איסוף טופס 106', task_category: 'דוח שכיר',
      entity_id: 7, assignee: 'user', required_date: '2025-04-30',
    };
    const next = buildNextYearTask(doc, seriesTask, 2026);

    assert.equal(next.year, 2026);
    assert.equal(next.task_name, 'איסוף טופס 106');
    assert.equal(next.task_category, 'דוח שכיר');
    assert.equal(next.entity_id, 7);
    assert.equal(next.assignee, 'user');
    assert.equal(next.required_date, '2026-04-30');
    assert.equal(next.status, 'pending');
    assert.equal(next.auto_completed, 0);
    assert.equal(next.auto_created, 1);
  });

  test('כשאין seriesTask — נגזר משם/סוג/גוף/בעלים של המסמך, עם קטגוריה "אחר"', () => {
    const doc = { id: 5, document_type: 'אישור ניכוי מס במקור', entity_id: 9, entity_name: 'בנק מזרחי', owner: 'spouse' };
    const next = buildNextYearTask(doc, null, 2026);

    assert.equal(next.task_name, 'איסוף אישור ניכוי מס במקור — בנק מזרחי');
    assert.equal(next.task_category, 'אחר');
    assert.equal(next.entity_id, 9);
    assert.equal(next.assignee, 'spouse');
    assert.equal(next.required_date, null);
    assert.equal(next.status, 'pending');
    assert.equal(next.auto_created, 1);
  });

  test('בלי seriesTask ובלי document_type — נופל ל-document_name; בלי entity_name — בלי סיומת', () => {
    const doc = { id: 6, document_name: 'מסמך כלשהו', entity_id: 3, owner: 'user' };
    const next = buildNextYearTask(doc, null, 2026);
    assert.equal(next.task_name, 'איסוף מסמך כלשהו');
    assert.equal(next.assignee, 'user');
  });

  test('owner לא ידוע → assignee null', () => {
    const doc = { id: 7, document_name: 'מסמך', entity_id: 3, owner: null };
    const next = buildNextYearTask(doc, null, 2026);
    assert.equal(next.assignee, null);
  });
});

describe('buildCompletedFromDoc', () => {
  test('בונה משימה מושלמת עבור שנת המסמך, עם שם הכולל את שם הגוף', () => {
    const doc = { id: 42, document_type: 'טופס 867', entity_id: 9, entity_name: 'בנק מזרחי', owner: 'spouse' };
    const done = buildCompletedFromDoc(doc, 2023, '2023-05-01');

    assert.equal(done.year, 2023);
    assert.equal(done.task_name, 'איסוף טופס 867 — בנק מזרחי');
    assert.equal(done.task_category, 'אחר');
    assert.equal(done.entity_id, 9);
    assert.equal(done.assignee, 'spouse');
    assert.equal(done.required_date, null);
    assert.equal(done.completed_date, '2023-05-01');
    assert.equal(done.status, 'completed');
    assert.equal(done.auto_completed, 1);
    assert.equal(done.auto_created, 1);
    assert.equal(done.completed_by_document_id, 42);
  });

  test('בלי entity_name — בלי סיומת בשם המשימה', () => {
    const doc = { id: 5, document_name: 'מסמך כלשהו', entity_id: 3, owner: 'user' };
    const done = buildCompletedFromDoc(doc, 2024, '2024-01-01');
    assert.equal(done.task_name, 'איסוף מסמך כלשהו');
    assert.equal(done.assignee, 'user');
  });

  test('owner לא ידוע → assignee null', () => {
    const doc = { id: 6, document_name: 'מסמך', entity_id: 3, owner: null };
    const done = buildCompletedFromDoc(doc, 2024, '2024-01-01');
    assert.equal(done.assignee, null);
  });

  test('נופל ל-document_name כשאין document_type', () => {
    const doc = { id: 8, document_name: 'אישור ניכוי מס', entity_id: 1, entity_name: 'בנק לאומי', owner: null };
    const done = buildCompletedFromDoc(doc, 2022, '2022-12-31');
    assert.equal(done.task_name, 'איסוף אישור ניכוי מס — בנק לאומי');
  });
});
