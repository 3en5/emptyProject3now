/**
 * טסטי אינטגרציה ל-API. רצים מול DB בזיכרון (מבודד לחלוטין).
 * הרצה: npm test  (או: node --test backend/test)
 */
import { test, before, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';

// DB בזיכרון + השתקת לוגים — לפני כל import שנוגע ב-DB
process.env.FINANCE_DB_PATH = ':memory:';
process.env.FINANCE_QUIET = '1';

const { init, getDatabase } = await import('../db/init.js');
const { runQuery } = await import('../db/helper.js');
const { createApp } = await import('../app.js');
const request = (await import('supertest')).default;

const app = createApp();

before(async () => {
  await init();
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
