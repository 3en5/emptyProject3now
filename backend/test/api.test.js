/**
 * טסטי אינטגרציה ל-API. רצים מול DB בזיכרון (מבודד לחלוטין).
 * הרצה: npm test  (או: node --test backend/test)
 */
import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DB בזיכרון + תיקיית העלאות זמנית + השתקת לוגים — לפני כל import שנוגע ב-DB
process.env.FINANCE_DB_PATH = ':memory:';
process.env.FINANCE_QUIET = '1';
const TEST_UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'finance-uploads-'));
process.env.FINANCE_UPLOAD_DIR = TEST_UPLOAD_DIR;

const { init, getDatabase } = await import('../db/init.js');
const { runQuery } = await import('../db/helper.js');
const { createApp } = await import('../app.js');
const request = (await import('supertest')).default;

const app = createApp();

before(async () => {
  await init();
});

after(() => {
  fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
});

// ניקוי כל הטבלאות לפני כל טסט — כדי שיהיו בלתי-תלויים בסדר
beforeEach(() => {
  runQuery('DELETE FROM documents');
  runQuery('DELETE FROM accounts');
  runQuery('DELETE FROM annual_checklist');
  runQuery('DELETE FROM financial_entities');
});

describe('health', () => {
  test('GET /api/health מחזיר ok', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });
});

describe('entities CRUD', () => {
  test('POST יוצר ישות ומחזיר אותה עם id', async () => {
    const res = await request(app)
      .post('/api/entities')
      .send({ name: 'בנק מזרחי', type: 'bank', category: 'משפחתי' });
    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.body.name, 'בנק מזרחי');
    assert.equal(res.body.status, 'active');
  });

  test('POST עם שדות חלקיים לא נכשל (באג undefined→null)', async () => {
    // רק name+type; שאר השדות undefined — חייב לעבור
    const res = await request(app)
      .post('/api/entities')
      .send({ name: 'IBKR', type: 'investment' });
    assert.equal(res.status, 201);
    assert.equal(res.body.login_url, null);
    assert.equal(res.body.notes, null);
  });

  test('POST בלי שדות חובה מחזיר 400', async () => {
    const res = await request(app).post('/api/entities').send({ name: 'X' });
    assert.equal(res.status, 400);
  });

  test('GET מחזיר את כל הישויות', async () => {
    await request(app).post('/api/entities').send({ name: 'A', type: 'bank' });
    await request(app).post('/api/entities').send({ name: 'B', type: 'loan' });
    const res = await request(app).get('/api/entities');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
  });

  test('PUT מעדכן ישות', async () => {
    const created = await request(app).post('/api/entities').send({ name: 'A', type: 'bank' });
    const res = await request(app)
      .put(`/api/entities/${created.body.id}`)
      .send({ name: 'A מעודכן', type: 'bank', status: 'inactive' });
    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'A מעודכן');
    assert.equal(res.body.status, 'inactive');
  });

  test('DELETE מוחק ישות + מסמכים קשורים', async () => {
    const e = await request(app).post('/api/entities').send({ name: 'A', type: 'bank' });
    await request(app).post('/api/documents').send({ entity_id: e.body.id, document_name: '867' });
    const del = await request(app).delete(`/api/entities/${e.body.id}`);
    assert.equal(del.status, 200);
    const list = await request(app).get('/api/entities');
    assert.equal(list.body.length, 0);
    const docs = await request(app).get('/api/documents');
    assert.equal(docs.body.length, 0);
  });
});

describe('documents', () => {
  let entityId;
  beforeEach(async () => {
    const e = await request(app).post('/api/entities').send({ name: 'גוף', type: 'investment' });
    entityId = e.body.id;
  });

  test('POST יוצר מסמך בסטטוס pending', async () => {
    const res = await request(app)
      .post('/api/documents')
      .send({ entity_id: entityId, document_name: 'טופס 867', required_frequency: 'yearly' });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'pending');
  });

  test('PUT מעדכן סטטוס ל-submitted', async () => {
    const d = await request(app)
      .post('/api/documents')
      .send({ entity_id: entityId, document_name: '867' });
    const res = await request(app)
      .put(`/api/documents/${d.body.id}`)
      .send({ document_name: '867', status: 'submitted', date_filed: '2026-03-01' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'submitted');
    assert.equal(res.body.date_filed, '2026-03-01');
  });

  test('GET /status/:status מסנן נכון', async () => {
    const d = await request(app).post('/api/documents').send({ entity_id: entityId, document_name: 'a' });
    await request(app).put(`/api/documents/${d.body.id}`).send({ document_name: 'a', status: 'submitted' });
    await request(app).post('/api/documents').send({ entity_id: entityId, document_name: 'b' });
    const pending = await request(app).get('/api/documents/status/pending');
    assert.equal(pending.body.length, 1);
    assert.equal(pending.body[0].document_name, 'b');
  });

  test('GET כולל entity_name (JOIN)', async () => {
    await request(app).post('/api/documents').send({ entity_id: entityId, document_name: 'x' });
    const res = await request(app).get('/api/documents');
    assert.equal(res.body[0].entity_name, 'גוף');
  });
});

describe('accounts', () => {
  let entityId;
  beforeEach(async () => {
    const e = await request(app).post('/api/entities').send({ name: 'בנק', type: 'bank' });
    entityId = e.body.id;
  });

  test('POST יוצר חשבון', async () => {
    const res = await request(app)
      .post('/api/accounts')
      .send({ entity_id: entityId, account_name: 'עו״ש', balance: 1000, currency: 'ILS' });
    assert.equal(res.status, 201);
    assert.equal(res.body.account_name, 'עו״ש');
    assert.equal(res.body.balance, 1000);
  });

  test('POST בלי שדות חובה מחזיר 400', async () => {
    const res = await request(app).post('/api/accounts').send({ balance: 5 });
    assert.equal(res.status, 400);
  });

  test('GET מחזיר חשבונות עם entity_name (JOIN)', async () => {
    await request(app).post('/api/accounts').send({ entity_id: entityId, account_name: 'עו״ש' });
    const res = await request(app).get('/api/accounts');
    assert.equal(res.status, 200);
    assert.equal(res.body[0].entity_name, 'בנק');
  });

  test('GET /entity/:id מסנן לפי גוף', async () => {
    await request(app).post('/api/accounts').send({ entity_id: entityId, account_name: 'a' });
    const res = await request(app).get(`/api/accounts/entity/${entityId}`);
    assert.equal(res.body.length, 1);
  });

  test('PUT מעדכן חשבון', async () => {
    const a = await request(app).post('/api/accounts').send({ entity_id: entityId, account_name: 'a' });
    const res = await request(app)
      .put(`/api/accounts/${a.body.id}`)
      .send({ account_name: 'עודכן', balance: 250, currency: 'USD' });
    assert.equal(res.status, 200);
    assert.equal(res.body.account_name, 'עודכן');
    assert.equal(res.body.balance, 250);
  });

  test('DELETE מוחק חשבון', async () => {
    const a = await request(app).post('/api/accounts').send({ entity_id: entityId, account_name: 'a' });
    await request(app).delete(`/api/accounts/${a.body.id}`);
    const list = await request(app).get('/api/accounts');
    assert.equal(list.body.length, 0);
  });
});

describe('document file upload', () => {
  let entityId;
  let docId;
  beforeEach(async () => {
    const e = await request(app).post('/api/entities').send({ name: 'גוף', type: 'investment' });
    entityId = e.body.id;
    const d = await request(app).post('/api/documents').send({ entity_id: entityId, document_name: '867' });
    docId = d.body.id;
  });

  test('POST /:id/upload מצרף קובץ ומעדכן file_path', async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/upload`)
      .attach('file', Buffer.from('%PDF-1.4 hello'), 'test.pdf');
    assert.equal(res.status, 200);
    assert.ok(res.body.file_path);
    assert.match(res.body.file_path, /\.pdf$/);
  });

  test('GET /:id/file מחזיר את הקובץ שהועלה', async () => {
    await request(app).post(`/api/documents/${docId}/upload`).attach('file', Buffer.from('%PDF-1.4 hello'), 'test.pdf');
    const res = await request(app).get(`/api/documents/${docId}/file`).buffer(true);
    assert.equal(res.status, 200);
    const body = res.text || (Buffer.isBuffer(res.body) ? res.body.toString() : '');
    assert.match(body, /hello/);
  });

  test('GET /:id/file בלי קובץ מחזיר 404', async () => {
    const res = await request(app).get(`/api/documents/${docId}/file`);
    assert.equal(res.status, 404);
  });

  test('סוג קובץ לא נתמך נדחה (400)', async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/upload`)
      .attach('file', Buffer.from('bad'), 'virus.exe');
    assert.equal(res.status, 400);
  });

  test('העלאה למסמך לא קיים מחזירה 404', async () => {
    const res = await request(app)
      .post('/api/documents/99999/upload')
      .attach('file', Buffer.from('%PDF'), 'x.pdf');
    assert.equal(res.status, 404);
  });
});

// בונה PDF מינימלי תקין עם טקסט Latin לחילוץ
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

describe('document analyze (smart detection)', () => {
  test('מנתח PDF ומחזיר הצעות (גוף/סוג/שנה)', async () => {
    const e = await request(app).post('/api/entities').send({ name: 'IBKR', type: 'investment' });
    const d = await request(app).post('/api/documents').send({ entity_id: e.body.id, document_name: 'זמני' });
    await request(app)
      .post(`/api/documents/${d.body.id}/upload`)
      .attach('file', makePdf('Interactive Brokers Annual Activity Statement 2025'), 'report.pdf');

    const res = await request(app).post(`/api/documents/${d.body.id}/analyze`);
    assert.equal(res.status, 200);
    assert.equal(res.body.suggestions.issuer.name, 'IBKR');
    assert.equal(res.body.suggestions.issuer.entityId, e.body.id);
    assert.equal(res.body.suggestions.docType, 'Annual Activity Statement');
    assert.equal(res.body.suggestions.year, 2025);
    assert.equal(res.body.suggestions.confidence, 'high');
  });

  test('ניתוח מסמך בלי קובץ מחזיר 400', async () => {
    const e = await request(app).post('/api/entities').send({ name: 'גוף', type: 'bank' });
    const d = await request(app).post('/api/documents').send({ entity_id: e.body.id, document_name: 'x' });
    const res = await request(app).post(`/api/documents/${d.body.id}/analyze`);
    assert.equal(res.status, 400);
  });
});

describe('comparison (year-over-year)', () => {
  async function makeEntity(name, type = 'bank', extra = {}) {
    const e = await request(app).post('/api/entities').send({ name, type, ...extra });
    return e.body.id;
  }
  async function makeDoc(entityId, name, year, status = 'pending') {
    const d = await request(app).post('/api/documents').send({ entity_id: entityId, document_name: name, year });
    if (status !== 'pending') {
      await request(app).put(`/api/documents/${d.body.id}`).send({ document_name: name, year, status });
    }
    return d.body.id;
  }

  test('מסמך שהיה אשתקד ולא השנה → missing', async () => {
    const e = await makeEntity('בנק');
    await makeDoc(e, '867', 2025, 'submitted');
    const res = await request(app).get('/api/comparison/2026');
    assert.equal(res.status, 200);
    assert.equal(res.body.summary.missing, 1);
    assert.equal(res.body.missing[0].document_name, '867');
  });

  test('מסמך שקיים בשתי השנים → received', async () => {
    const e = await makeEntity('בנק');
    await makeDoc(e, '867', 2025, 'submitted');
    await makeDoc(e, '867', 2026);
    const res = await request(app).get('/api/comparison/2026');
    assert.equal(res.body.summary.missing, 0);
    assert.equal(res.body.summary.received, 1);
  });

  test('מסמך חדש רק השנה → added', async () => {
    const e = await makeEntity('בנק');
    await makeDoc(e, 'חדש', 2026);
    const res = await request(app).get('/api/comparison/2026');
    assert.equal(res.body.summary.added, 1);
    assert.equal(res.body.summary.missing, 0);
  });

  test('גוף שהסתיים (active_until קודם) → ended, לא נספר כחסר', async () => {
    const e = await makeEntity('בנק שהסתיים', 'bank', { active_until: '2025-12-31' });
    await makeDoc(e, '867', 2025, 'submitted');
    const res = await request(app).get('/api/comparison/2026');
    assert.equal(res.body.summary.missing, 0); // לא מצופה — הסתיים
    assert.equal(res.body.summary.ended, 1);
    assert.equal(res.body.endedEntities[0].name, 'בנק שהסתיים');
  });

  test('year לא תקין מחזיר 400', async () => {
    const res = await request(app).get('/api/comparison/abc');
    assert.equal(res.status, 400);
  });
});

describe('activity log', () => {
  test('יצירת/עדכון/מחיקה נרשמים ביומן', async () => {
    const e = await request(app).post('/api/entities').send({ name: 'גוף לבדיקה', type: 'bank' });
    await request(app).put(`/api/entities/${e.body.id}`).send({ name: 'גוף מעודכן', type: 'bank' });
    await request(app).delete(`/api/entities/${e.body.id}`);

    const res = await request(app).get('/api/activity?limit=10');
    assert.equal(res.status, 200);
    const actions = res.body.map((a) => a.action);
    assert.ok(actions.includes('create'));
    assert.ok(actions.includes('update'));
    assert.ok(actions.includes('delete'));
    // הכי חדש קודם — המחיקה בראש
    assert.equal(res.body[0].action, 'delete');
    assert.match(res.body[0].description, /נמחק גוף/);
  });

  test('שינוי סטטוס מסמך נרשם עם תיאור מתאים', async () => {
    const e = await request(app).post('/api/entities').send({ name: 'בנק', type: 'bank' });
    const d = await request(app).post('/api/documents').send({ entity_id: e.body.id, document_name: '867' });
    await request(app).put(`/api/documents/${d.body.id}`).send({ document_name: '867', status: 'submitted' });
    const res = await request(app).get('/api/activity?limit=5');
    assert.match(res.body[0].description, /הוגש/);
  });
});

describe('export CSV', () => {
  test('מייצא רשימת פעולות עם מסמכים ומשימות ממתינים', async () => {
    const e = await request(app).post('/api/entities').send({ name: 'בנק מזרחי', type: 'bank' });
    await request(app).post('/api/documents').send({ entity_id: e.body.id, document_name: 'טופס 867', year: 2026, required_by_date: '2026-04-30' });
    await request(app).post('/api/checklists').send({ year: 2026, task_name: 'דוח שנתי', task_category: 'מס' });

    const res = await request(app).get('/api/export/action-list.csv?year=2026');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/csv/);
    assert.match(res.headers['content-disposition'], /action-list-2026\.csv/);
    assert.match(res.text, /טופס 867/);
    assert.match(res.text, /בנק מזרחי/);
    assert.match(res.text, /דוח שנתי/);
    // כותרת CSV
    assert.match(res.text, /סוג,פריט/);
  });

  test('שדות עם פסיק עטופים במרכאות', async () => {
    const e = await request(app).post('/api/entities').send({ name: 'גוף, עם פסיק', type: 'bank' });
    await request(app).post('/api/documents').send({ entity_id: e.body.id, document_name: 'מסמך', year: 2026 });
    const res = await request(app).get('/api/export/action-list.csv?year=2026');
    assert.match(res.text, /"גוף, עם פסיק"/);
  });
});

describe('summary', () => {
  test('מחשב נכסים/התחייבויות/שווי-נקי לפי מטבע', async () => {
    // בנק (נכס) עם 1000 ILS
    const bank = await request(app).post('/api/entities').send({ name: 'בנק', type: 'bank' });
    await request(app).post('/api/accounts').send({ entity_id: bank.body.id, account_name: 'עו״ש', balance: 1000, currency: 'ILS' });
    // משכנתא (התחייבות) עם 800 ILS
    const loan = await request(app).post('/api/entities').send({ name: 'משכנתא', type: 'loan' });
    await request(app).post('/api/accounts').send({ entity_id: loan.body.id, account_name: 'יתרה', balance: 800, currency: 'ILS' });
    // השקעה בדולר (נכס) 500 USD
    const inv = await request(app).post('/api/entities').send({ name: 'IBKR', type: 'investment' });
    await request(app).post('/api/accounts').send({ entity_id: inv.body.id, account_name: 'תיק', balance: 500, currency: 'USD' });

    const res = await request(app).get('/api/summary');
    assert.equal(res.status, 200);

    const ils = res.body.currencies.find((c) => c.currency === 'ILS');
    assert.equal(ils.assets, 1000);
    assert.equal(ils.liabilities, 800);
    assert.equal(ils.net, 200);

    const usd = res.body.currencies.find((c) => c.currency === 'USD');
    assert.equal(usd.assets, 500);
    assert.equal(usd.net, 500);
  });

  test('מחזיר ספירות כלליות', async () => {
    await request(app).post('/api/entities').send({ name: 'גוף', type: 'bank' });
    const res = await request(app).get('/api/summary');
    assert.ok(res.body.counts.entities >= 1);
    assert.equal(typeof res.body.counts.documents, 'number');
  });

  test('התפלגות נכסים לא כוללת התחייבויות', async () => {
    const loan = await request(app).post('/api/entities').send({ name: 'משכנתא', type: 'loan' });
    await request(app).post('/api/accounts').send({ entity_id: loan.body.id, account_name: 'יתרה', balance: 500, currency: 'ILS' });
    const res = await request(app).get('/api/summary');
    assert.ok(!res.body.assetsByType.some((r) => r.type === 'loan'));
  });
});

describe('checklists', () => {
  test('POST יוצר משימה, GET /current מחזיר אותה', async () => {
    const year = new Date().getFullYear();
    const res = await request(app)
      .post('/api/checklists')
      .send({ year, task_name: 'דוח שנתי', task_category: 'מס', assignee: 'user' });
    assert.equal(res.status, 201);
    const current = await request(app).get('/api/checklists/current');
    assert.equal(current.body.length, 1);
    assert.equal(current.body[0].task_name, 'דוח שנתי');
  });

  test('POST בלי year/task_name מחזיר 400', async () => {
    const res = await request(app).post('/api/checklists').send({ task_name: 'x' });
    assert.equal(res.status, 400);
  });

  test('PUT מסמן כהושלם', async () => {
    const year = new Date().getFullYear();
    const t = await request(app).post('/api/checklists').send({ year, task_name: 'משימה' });
    const res = await request(app)
      .put(`/api/checklists/${t.body.id}`)
      .send({ task_name: 'משימה', status: 'completed', completed_date: '2026-07-08' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'completed');
  });
});
