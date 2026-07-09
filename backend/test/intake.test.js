/**
 * טסטים לקליטה החכמה — POST /api/documents/intake + לוגיקת decideFiling.
 * רצים מול DB בזיכרון ותיקיית העלאות זמנית (מבודד לחלוטין).
 */
import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.FINANCE_DB_PATH = ':memory:';
process.env.FINANCE_QUIET = '1';
const TEST_UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'finance-intake-'));
process.env.FINANCE_UPLOAD_DIR = TEST_UPLOAD_DIR;

const { init, getDatabase } = await import('../db/init.js');
const { getOne } = await import('../db/helper.js');
const { createApp } = await import('../app.js');
const { decideFiling } = await import('../intake.js');
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

describe('decideFiling — לוגיקת ההחלטה (טהורה)', () => {
  const S = (over = {}) => ({
    issuer: { name: 'IBKR', entityId: 7 },
    docType: 'Annual Activity Statement',
    year: 2025,
    ...over,
  });

  test('סוג מסמך תואם לסלוט → matched', () => {
    const d = decideFiling(S(), [
      { id: 1, document_name: 'Annual Activity Statement', year: 2025 },
      { id: 2, document_name: 'אחר לגמרי', year: 2023 },
    ]);
    assert.equal(d.action, 'matched');
    assert.equal(d.target.id, 1);
  });

  test('אין התאמת סוג ויש כמה מועמדים → create (לא מנחשים)', () => {
    const d = decideFiling(S({ docType: null }), [
      { id: 1, document_name: 'טופס 867', year: 2024 },
      { id: 2, document_name: 'דוח שנתי', year: 2024 },
    ]);
    assert.equal(d.action, 'create');
  });

  test('מועמד יחיד עם שנה תואמת → matched גם בלי התאמת סוג', () => {
    const d = decideFiling(S({ docType: null }), [
      { id: 3, document_name: 'משהו', year: 2025 },
    ]);
    assert.equal(d.action, 'matched');
    assert.equal(d.target.id, 3);
  });

  test('לא זוהה גוף → unmatched', () => {
    const d = decideFiling({ issuer: null, docType: 'טופס 867', year: 2025 }, []);
    assert.equal(d.action, 'unmatched');
  });
});

describe('POST /api/documents/intake — קליטה ותיוק מקצה-לקצה', () => {
  test('מסמך של גוף מוכר מתויק לסלוט הממתין המתאים', async () => {
    await request(app).post('/api/entities').send({ name: 'IBKR', type: 'investment' });
    const ent = getOne('SELECT * FROM financial_entities WHERE name = ?', ['IBKR']);
    await request(app).post('/api/documents').send({
      entity_id: ent.id, document_name: 'Annual Activity Statement', year: 2025,
    });
    const slot = getOne('SELECT * FROM documents ORDER BY id DESC LIMIT 1');

    const res = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('Interactive Brokers Annual Activity Statement 2025'), 'ibkr.pdf');

    assert.equal(res.status, 201);
    assert.equal(res.body.action, 'matched');
    assert.equal(res.body.document.id, slot.id); // תויק לסלוט הקיים — לא נוצר כפול
    assert.ok(res.body.document.file_path); // הקובץ הוצמד
    assert.equal(res.body.document.auto_filed, 1); // ממתין לפיקוח
    assert.equal(res.body.document.status, 'submitted'); // קובץ הוצמד בפועל → כבר לא "ממתין"
    assert.equal(res.body.suggestions.issuer.name, 'IBKR');
  });

  test('גוף מוכר בלי סלוט מתאים → נוצר מסמך חדש תחת הגוף', async () => {
    await request(app).post('/api/entities').send({ name: 'בנק מזרחי — משפחתי', type: 'bank' });
    const ent = getOne('SELECT * FROM financial_entities ORDER BY id DESC LIMIT 1');

    const res = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('bank mizrahi form 867 2025 valid until 31/12/2027'), 'mizrahi.pdf');

    assert.equal(res.status, 201);
    assert.equal(res.body.action, 'create');
    assert.equal(res.body.document.entity_id, ent.id);
    assert.equal(res.body.document.document_name, 'טופס 867');
    assert.equal(res.body.document.auto_filed, 1);
    assert.equal(res.body.document.status, 'submitted'); // מסמך חדש נוצר עם קובץ מצורף — לא "ממתין"
    assert.equal(res.body.document.required_by_date, '2027-12-31'); // מועד החידוש שזוהה נשמר
  });

  test('טקסט לא מזוהה → נוצר תחת גוף האחזקה "ממתין לשיוך"', async () => {
    const res = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('hello unknown world nothing here'), 'unknown.pdf');

    assert.equal(res.status, 201);
    assert.equal(res.body.action, 'unmatched');
    assert.match(res.body.document.entity_name, /ממתין לשיוך/);
    assert.equal(res.body.document.auto_filed, 1);
    assert.equal(res.body.document.status, 'submitted'); // קובץ קיים גם כשהגוף לא זוהה
  });

  test('אישור פיקוח: PUT עם auto_filed=0 מנקה את הדגל, ו-PUT בלי הדגל לא נוגע בו', async () => {
    await request(app).post('/api/entities').send({ name: 'IBKR', type: 'investment' });
    const intake = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('Interactive Brokers Annual Activity Statement 2025'), 'ibkr.pdf');
    const doc = intake.body.document;

    // PUT רגיל (בלי auto_filed) — הדגל נשאר 1
    await request(app).put(`/api/documents/${doc.id}`).send({ ...doc, notes: 'עדכון סתם' });
    let fresh = getOne('SELECT * FROM documents WHERE id = ?', [doc.id]);
    assert.equal(fresh.auto_filed, 1);

    // אישור המשתמש — auto_filed=0 + תיקון שם
    const confirm = await request(app)
      .put(`/api/documents/${doc.id}`)
      .send({ ...doc, document_name: 'שם מתוקן', auto_filed: 0 });
    assert.equal(confirm.status, 200);
    assert.equal(confirm.body.auto_filed, 0);
    assert.equal(confirm.body.document_name, 'שם מתוקן');
    assert.ok(confirm.body.entity_name); // PUT מחזיר גם את שם הגוף
  });

  test('שיוך מחדש לגוף אחר דרך PUT (entity_id) עובד', async () => {
    const unknown = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('some totally unknown doc'), 'x.pdf');
    await request(app).post('/api/entities').send({ name: 'הראל ביטוח', type: 'insurance' });
    const harel = getOne('SELECT * FROM financial_entities ORDER BY id DESC LIMIT 1');

    const res = await request(app)
      .put(`/api/documents/${unknown.body.document.id}`)
      .send({ ...unknown.body.document, entity_id: harel.id, auto_filed: 0 });
    assert.equal(res.body.entity_id, harel.id);
    assert.equal(res.body.entity_name, 'הראל ביטוח');
  });

  test('בלי קובץ → 400', async () => {
    const res = await request(app).post('/api/documents/intake');
    assert.equal(res.status, 400);
  });

  test('קובץ כפול (אותו תוכן) → action=duplicate, לא נוצר מסמך שני', async () => {
    await request(app).post('/api/entities').send({ name: 'IBKR', type: 'investment' });
    const pdf = makePdf('Interactive Brokers Annual Activity Statement 2025');

    const first = await request(app).post('/api/documents/intake').attach('file', pdf, 'a.pdf');
    assert.notEqual(first.body.action, 'duplicate');
    const countAfterFirst = getOne('SELECT COUNT(*) as c FROM documents').c;

    // אותו קובץ בדיוק — צריך להיחסם ככפול
    const second = await request(app).post('/api/documents/intake').attach('file', pdf, 'a-copy.pdf');
    assert.equal(second.status, 200);
    assert.equal(second.body.action, 'duplicate');
    assert.ok(second.body.existing.id);
    assert.match(second.body.note, /כבר קיים/);

    const countAfterSecond = getOne('SELECT COUNT(*) as c FROM documents').c;
    assert.equal(countAfterSecond, countAfterFirst); // לא נוסף מסמך
  });

  test('קליטה בלי GPT (כללים בלבד) → amounts מוחזר כמערך ריק, לא קורס', async () => {
    const res = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('Interactive Brokers Annual Activity Statement 2025'), 'ibkr2.pdf');
    assert.equal(res.status, 201);
    assert.deepEqual(res.body.document.amounts, []); // parsed מ-JSON, לא string גולמי
  });
});

describe('סטטוס אוטומטי כשמצטרף קובץ בפועל', () => {
  test('PUT בלי status (כמו "אשר ושמור" בתיבת הקליטה) לא מאפס את הסטטוס ל-NULL', async () => {
    await request(app).post('/api/entities').send({ name: 'מגדל ביטוח', type: 'insurance' });
    const ent = getOne('SELECT * FROM financial_entities ORDER BY id DESC LIMIT 1');
    const intake = await request(app)
      .post('/api/documents/intake')
      .attach('file', makePdf('מגדל ביטוח דוח שנתי'), 'migdal.pdf');
    assert.equal(intake.body.document.status, 'submitted');

    // "אשר ושמור" ב-IntakeBox שולח PUT בלי שדה status בכלל
    const confirm = await request(app)
      .put(`/api/documents/${intake.body.document.id}`)
      .send({ document_name: 'דוח שנתי מגדל', entity_id: intake.body.document.entity_id, auto_filed: 0 });
    assert.equal(confirm.status, 200);
    assert.equal(confirm.body.status, 'submitted'); // לא נדרס ל-NULL
  });
});

describe('תקציר, סכומים ותאריך מסמך (summary/amounts/doc_date)', () => {
  test('PUT שומר summary/amounts/doc_date, ו-GET מחזיר amounts כמערך מפוענח', async () => {
    await request(app).post('/api/entities').send({ name: 'הראל ביטוח', type: 'insurance' });
    const ent = getOne('SELECT * FROM financial_entities ORDER BY id DESC LIMIT 1');
    const created = await request(app).post('/api/documents').send({
      entity_id: ent.id, document_name: 'פוליסת ביטוח חיים', year: 2025,
    });

    const res = await request(app).put(`/api/documents/${created.body.id}`).send({
      ...created.body,
      doc_date: '2025-03-01',
      summary: 'פוליסת ביטוח חיים של הראל, מחדשת כיסוי קיים.',
      amounts: ['פרמיה חודשית: 340 ₪', 'סכום ביטוח: 500,000 ₪'],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.doc_date, '2025-03-01');
    assert.equal(res.body.summary, 'פוליסת ביטוח חיים של הראל, מחדשת כיסוי קיים.');
    assert.deepEqual(res.body.amounts, ['פרמיה חודשית: 340 ₪', 'סכום ביטוח: 500,000 ₪']);

    // גם ב-GET /api/documents הרשימה חוזרת עם amounts כמערך (לא JSON string גולמי)
    const list = await request(app).get('/api/documents');
    const found = list.body.find((d) => d.id === created.body.id);
    assert.deepEqual(found.amounts, ['פרמיה חודשית: 340 ₪', 'סכום ביטוח: 500,000 ₪']);
  });

  test('PUT בלי summary/amounts לא דורס ערכים קיימים (COALESCE)', async () => {
    await request(app).post('/api/entities').send({ name: 'מגדל ביטוח', type: 'insurance' });
    const ent = getOne('SELECT * FROM financial_entities ORDER BY id DESC LIMIT 1');
    const created = await request(app).post('/api/documents').send({ entity_id: ent.id, document_name: 'מסמך', year: 2025 });
    await request(app).put(`/api/documents/${created.body.id}`).send({ ...created.body, summary: 'תקציר מקורי', amounts: ['100 ₪'] });

    // עדכון סטטוס בלבד — בלי summary/amounts בגוף הבקשה
    const res = await request(app).put(`/api/documents/${created.body.id}`).send({ document_name: 'מסמך', status: 'submitted' });
    assert.equal(res.body.summary, 'תקציר מקורי'); // לא נדרס
    assert.deepEqual(res.body.amounts, ['100 ₪']); // לא נדרס
  });
});

describe('עבור מי המסמך (owner)', () => {
  test('PUT שומר owner, ו-GET מחזיר אותו', async () => {
    await request(app).post('/api/entities').send({ name: 'המוסד לביטוח לאומי', type: 'other' });
    const ent = getOne('SELECT * FROM financial_entities ORDER BY id DESC LIMIT 1');
    const created = await request(app).post('/api/documents').send({ entity_id: ent.id, document_name: 'טופס 106', year: 2025 });

    const res = await request(app).put(`/api/documents/${created.body.id}`).send({ ...created.body, owner: 'spouse' });
    assert.equal(res.status, 200);
    assert.equal(res.body.owner, 'spouse');

    const list = await request(app).get('/api/documents');
    const found = list.body.find((d) => d.id === created.body.id);
    assert.equal(found.owner, 'spouse');
  });

  test('PUT בלי owner לא דורס ערך קיים (COALESCE)', async () => {
    await request(app).post('/api/entities').send({ name: 'הראל ביטוח 2', type: 'insurance' });
    const ent = getOne('SELECT * FROM financial_entities ORDER BY id DESC LIMIT 1');
    const created = await request(app).post('/api/documents').send({ entity_id: ent.id, document_name: 'פוליסה', year: 2025 });
    await request(app).put(`/api/documents/${created.body.id}`).send({ ...created.body, owner: 'user' });

    const res = await request(app).put(`/api/documents/${created.body.id}`).send({ document_name: 'פוליסה', status: 'submitted' });
    assert.equal(res.body.owner, 'user'); // לא נדרס
  });
});
