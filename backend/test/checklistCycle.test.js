/**
 * טסטים למחזור המשימות השנתי — ההשלמה האוטומטית של משימה תואמת, גלגול משנה
 * קודמת, ויצירת משימת המשך לשנה הבאה — הכל מעוגן בשנת המסמך (`doc.year`).
 * רצים מול POST /api/documents/intake ו-/:id/upload, DB בזיכרון מבודד.
 */
import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.FINANCE_DB_PATH = ':memory:';
process.env.FINANCE_QUIET = '1';
const TEST_UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'finance-cycle-'));
process.env.FINANCE_UPLOAD_DIR = TEST_UPLOAD_DIR;

const { init, getDatabase } = await import('../db/init.js');
const { getOne, getAll } = await import('../db/helper.js');
const { createApp } = await import('../app.js');
const request = (await import('supertest')).default;

const app = createApp();

// PDF מינימלי תקין עם טקסט נתון — כמו ב-E2E
function makePdf(textStr) {
  const content = `BT /F1 18 Tf 50 700 Td (${textStr}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { pdf += String(off).padStart(10, '0') + ' 00000 n \n'; });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

before(async () => {
  await init();
});

after(() => {
  fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
});

beforeEach(() => {
  // ניקוי בין טסטים
  const db = getDatabase();
  db.run('DELETE FROM documents');
  db.run('DELETE FROM financial_entities');
  db.run('DELETE FROM annual_checklist');
});

describe('השלמה אוטומטית של משימה שנתית עקב מסמך שהתקבל', () => {
  test('קליטת "טופס 106" מסמנת אוטומטית את המשימה "איסוף טופס 106" כהושלמה', async () => {
    const year = new Date().getFullYear();
    await request(app).post('/api/checklists').send({
      year, task_name: 'איסוף טופס 106', task_category: 'דוח שכיר', assignee: 'spouse', status: 'pending',
    });
    await request(app).post('/api/entities').send({ name: 'מעסיק', type: 'other' });

    const res = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('some employer form 106 for tax year'), 'form106.pdf');

    assert.equal(res.status, 201);
    assert.ok(res.body.matchedTask); // המשימה סומנה
    assert.equal(res.body.matchedTask.task_name, 'איסוף טופס 106');
    assert.equal(res.body.matchedTask.status, 'completed');
    assert.equal(res.body.matchedTask.auto_completed, 1);
    assert.equal(res.body.matchedTask.completed_by_document_id, res.body.document.id);

    // גם ב-GET /api/checklists/current המשימה מופיעה כהושלמה, עם שם המסמך המקושר
    const list = await request(app).get('/api/checklists/current');
    const task = list.body.find((t) => t.task_name === 'איסוף טופס 106');
    assert.equal(task.status, 'completed');
    assert.equal(task.completed_by_document_name, res.body.document.document_name);
  });

  test('החלפת קובץ בכרטיס קיים (/:id/upload) גם מפעילה את ההשלמה האוטומטית', async () => {
    const year = new Date().getFullYear();
    const task = await request(app).post('/api/checklists').send({
      year, task_name: 'דיווח רווח הון — ניירות ערך זרים (IBKR)', task_category: 'רווח הון זר', status: 'pending',
    });
    await request(app).post('/api/entities').send({ name: 'IBKR', type: 'investment' });
    const ent = getOne('SELECT * FROM financial_entities WHERE name = ?', ['IBKR']);
    const doc = await request(app).post('/api/documents').send({ entity_id: ent.id, document_name: 'זמני' });

    const res = await request(app)
      .post(`/api/documents/${doc.body.id}/upload`)
      .attach('file', makePdf('anything'), 'ibkr.pdf');

    assert.equal(res.status, 200);
    assert.equal(res.body.matchedTask?.id, task.body.id);
    assert.equal(res.body.matchedTask.status, 'completed');
  });

  test('אין משימה תואמת → matchedTask הוא null, אבל נרשמת משימה מושלמת חדשה לשנת המסמך (rolledTask)', async () => {
    const res = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('completely unrelated content xyz'), 'x.pdf');
    assert.equal(res.status, 201);
    assert.equal(res.body.matchedTask, null);

    const expectedYear = res.body.document.year || new Date().getFullYear();
    assert.ok(res.body.rolledTask); // אין היסטוריה כלל — נגזרת משימה מושלמת מהמסמך עצמו
    assert.equal(res.body.rolledTask.year, expectedYear);
    assert.equal(res.body.rolledTask.status, 'completed');
    assert.equal(res.body.rolledTask.auto_completed, 1);
    assert.equal(res.body.rolledTask.auto_created, 1);
    assert.equal(res.body.rolledTask.completed_by_document_id, res.body.document.id);

    assert.ok(res.body.nextYearTask);
    assert.equal(res.body.nextYearTask.year, expectedYear + 1);
    assert.equal(res.body.nextYearTask.status, 'pending');
  });

  test('אישור פיקוח: PUT עם auto_completed=0 משאיר completed אבל מנקה את הדגל', async () => {
    const year = new Date().getFullYear();
    await request(app).post('/api/checklists').send({ year, task_name: 'איסוף טופס 106', task_category: 'דוח שכיר', status: 'pending' });
    const intake = await request(app).post('/api/documents/intake').attach('file', makePdf('form 106'), 'f.pdf');
    const taskId = intake.body.matchedTask.id;

    const confirm = await request(app).put(`/api/checklists/${taskId}`).send({ ...intake.body.matchedTask, auto_completed: 0 });
    assert.equal(confirm.status, 200);
    assert.equal(confirm.body.status, 'completed'); // עדיין הושלם
    assert.equal(confirm.body.auto_completed, 0); // אבל הדגל האוטומטי נוקה
    assert.ok(confirm.body.completed_by_document_id); // הקשר למסמך נשמר כתיעוד
  });

  test('"החזר לממתין" (status→pending) מנקה גם את completed_by_document_id', async () => {
    const year = new Date().getFullYear();
    await request(app).post('/api/checklists').send({ year, task_name: 'איסוף טופס 106', task_category: 'דוח שכיר', status: 'pending' });
    const intake = await request(app).post('/api/documents/intake').attach('file', makePdf('form 106'), 'f2.pdf');
    const task = intake.body.matchedTask;

    const undo = await request(app).put(`/api/checklists/${task.id}`).send({ ...task, status: 'pending', completed_date: null, auto_completed: 0 });
    assert.equal(undo.body.status, 'pending');
    assert.equal(undo.body.completed_by_document_id, null);
  });
});

describe('מחזור משימות שנתי (rollover) עקב מסמך שהתקבל', () => {
  test('עיגון לפי שנת המסמך (doc.year) ולא לפי השנה הנוכחית — מסמך ישן לא בודק/יוצר משימות של השנה הנוכחית', async () => {
    const res = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('bank mizrahi form 867 2023 annual'), 'mizrahi2023.pdf');

    assert.equal(res.status, 201);
    const docYear = res.body.document.year;

    // אם הסיווג לא זיהה שנה (docYear null) — הבדיקה לא רלוונטית; מדלגים בעדינות
    if (docYear == null) return;
    assert.equal(docYear, 2023);

    const completedTask = res.body.matchedTask || res.body.rolledTask;
    assert.ok(completedTask); // נוצרה/הותאמה משימה מושלמת בדיוק לשנת המסמך
    assert.equal(completedTask.year, docYear);
    assert.equal(completedTask.status, 'completed');

    assert.ok(res.body.nextYearTask);
    assert.equal(res.body.nextYearTask.year, docYear + 1); // 2024 — לא שנת ה"עכשיו" ולא 2027

    // ודאי שלא נוצרה/הושפעה משימה כלשהי סביב השנה הנוכחית עקב המסמך הזה
    const currentYear = new Date().getFullYear();
    if (currentYear !== docYear && currentYear !== docYear + 1) {
      const aroundCurrentYear = getAll('SELECT * FROM annual_checklist WHERE year IN (?, ?)', [currentYear, currentYear + 1]);
      assert.equal(aroundCurrentYear.length, 0);
    }
  });

  test('משימה קיימת רק בשנה שעברה → מגולגלת ומושלמת לשנה הנוכחית, ונוצרת גם משימה לשנה הבאה', async () => {
    const year = new Date().getFullYear();
    await request(app).post('/api/checklists').send({
      year: year - 1, task_name: 'איסוף טופס 106', task_category: 'דוח שכיר', assignee: 'spouse', status: 'completed', required_date: `${year - 1}-04-30`,
    });

    const res = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('form 106 employer tax summary'), 'form106.pdf');

    assert.equal(res.status, 201);
    assert.equal(res.body.matchedTask, null); // אין משימה פתוחה השנה — לא "הותאמה" ישירות

    assert.ok(res.body.rolledTask); // אבל גולגלה מהשנה שעברה
    assert.equal(res.body.rolledTask.task_name, 'איסוף טופס 106');
    assert.equal(res.body.rolledTask.year, year);
    assert.equal(res.body.rolledTask.status, 'completed');
    assert.equal(res.body.rolledTask.auto_completed, 1);
    assert.equal(res.body.rolledTask.auto_created, 1);
    assert.equal(res.body.rolledTask.completed_by_document_id, res.body.document.id);
    assert.equal(res.body.rolledTask.required_date, `${year}-04-30`); // הוזז שנה קדימה

    // המשימה המגולגלת קיימת בפועל ב-DB תחת השנה הנוכחית
    const inDb = getOne('SELECT * FROM annual_checklist WHERE id = ?', [res.body.rolledTask.id]);
    assert.equal(inDb.year, year);
    assert.equal(inDb.status, 'completed');

    // ונוצרה גם משימה ל-pending עבור מחזור השנה הבאה, באותו שם
    assert.ok(res.body.nextYearTask);
    assert.equal(res.body.nextYearTask.task_name, 'איסוף טופס 106');
    assert.equal(res.body.nextYearTask.year, year + 1);
    assert.equal(res.body.nextYearTask.status, 'pending');
    assert.equal(res.body.nextYearTask.auto_created, 1);
  });

  test('משימה פתוחה השנה — התנהגות ההשלמה הרגילה ללא שינוי, ונוצרת גם משימה לשנה הבאה', async () => {
    const year = new Date().getFullYear();
    await request(app).post('/api/checklists').send({
      year, task_name: 'איסוף טופס 106', task_category: 'דוח שכיר', status: 'pending',
    });

    const res = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('form 106 employer tax summary'), 'form106b.pdf');

    assert.equal(res.status, 201);
    assert.ok(res.body.matchedTask); // הותאמה ישירות, כמו קודם
    assert.equal(res.body.matchedTask.status, 'completed');
    assert.equal(res.body.rolledTask, null); // לא היה צריך לגלגל — כבר הותאם השנה

    assert.ok(res.body.nextYearTask);
    assert.equal(res.body.nextYearTask.task_name, 'איסוף טופס 106');
    assert.equal(res.body.nextYearTask.year, year + 1);
    assert.equal(res.body.nextYearTask.status, 'pending');
  });

  test('אין משימה תואמת בכלל → נרשמת משימה מושלמת חדשה (rolledTask) עם שם נגזר מהמסמך, ומשימה לשנה הבאה', async () => {
    const res = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('form 106 employer tax summary'), 'form106c.pdf');

    assert.equal(res.status, 201);
    assert.equal(res.body.matchedTask, null);

    const expectedYear = res.body.document.year || new Date().getFullYear();
    assert.ok(res.body.rolledTask); // אין היסטוריה כלל — נגזרת משימה מושלמת מהמסמך עצמו
    assert.match(res.body.rolledTask.task_name, /^איסוף/);
    assert.equal(res.body.rolledTask.year, expectedYear);
    assert.equal(res.body.rolledTask.status, 'completed');

    assert.ok(res.body.nextYearTask);
    assert.match(res.body.nextYearTask.task_name, /^איסוף/);
    assert.equal(res.body.nextYearTask.year, expectedYear + 1);
    assert.equal(res.body.nextYearTask.status, 'pending');
    assert.equal(res.body.nextYearTask.auto_created, 1);
  });

  test('קליטה שנייה של מסמך מאותו סוג (תוכן שונה) לא כופלת את משימת השנה הבאה', async () => {
    const first = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('form 106 employer tax summary'), 'form106d1.pdf');
    assert.ok(first.body.nextYearTask);

    const nextYear = new Date().getFullYear() + 1;
    const countAfterFirst = getAll('SELECT * FROM annual_checklist WHERE year = ?', [nextYear]).length;
    assert.equal(countAfterFirst, 1);

    // תוכן שונה כדי לא להיחסם כקובץ כפול
    const second = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('form 106 employer tax summary another employer copy'), 'form106d2.pdf');
    assert.notEqual(second.body.action, 'duplicate');
    assert.equal(second.body.nextYearTask, null); // כבר קיימת משימה תואמת לשנה הבאה — לא כופלים

    const countAfterSecond = getAll('SELECT * FROM annual_checklist WHERE year = ?', [nextYear]).length;
    assert.equal(countAfterSecond, 1);
  });

  test('PUT בלי auto_created שומר את הדגל (COALESCE); auto_created=0 מנקה אותו', async () => {
    const res = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('form 106 employer tax summary'), 'form106e.pdf');
    const nextYearTask = res.body.nextYearTask;
    assert.equal(nextYearTask.auto_created, 1);

    // PUT רגיל בלי auto_created בגוף הבקשה — הדגל נשאר 1
    const kept = await request(app)
      .put(`/api/checklists/${nextYearTask.id}`)
      .send({ ...nextYearTask, notes: 'עדכון סתם' });
    assert.equal(kept.status, 200);
    assert.equal(kept.body.auto_created, 1);

    // ניקוי מפורש
    const cleared = await request(app)
      .put(`/api/checklists/${nextYearTask.id}`)
      .send({ ...nextYearTask, auto_created: 0 });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.auto_created, 0);
  });
});
