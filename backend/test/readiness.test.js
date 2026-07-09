/**
 * טסטים ל"מוכנות לרו״ח" — GET /api/readiness/:year + POST /api/readiness/:year/carry-forward.
 * רצים מול DB בזיכרון (מבודד לחלוטין).
 */
import { test, before, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';

process.env.FINANCE_DB_PATH = ':memory:';
process.env.FINANCE_QUIET = '1';

const { init, getDatabase } = await import('../db/init.js');
const { getOne } = await import('../db/helper.js');
const { createApp } = await import('../app.js');
const request = (await import('supertest')).default;

const app = createApp();

before(async () => {
  await init();
});

beforeEach(() => {
  const db = getDatabase();
  db.run('DELETE FROM documents');
  db.run('DELETE FROM financial_entities');
  db.run('DELETE FROM annual_checklist');
});

async function makeEntity(name, over = {}) {
  const res = await request(app).post('/api/entities').send({ name, type: 'bank', ...over });
  return res.body;
}

async function makeDoc(entityId, documentName, year, over = {}) {
  const res = await request(app).post('/api/documents').send({
    entity_id: entityId, document_name: documentName, year, ...over,
  });
  return res.body;
}

// PUT הרגיל לא מעדכן file_path (מוצמד רק דרך אפלוד/intake) — לטסטים מגדירים ישירות ב-DB.
function setFilePath(docId, filePath) {
  const db = getDatabase();
  db.run('UPDATE documents SET file_path = ? WHERE id = ?', [filePath, docId]);
}

describe('GET /api/readiness/:year', () => {
  test('מקבץ לפי גוף: יש קובץ + סלוט חסר → have=1,total=2, חסר קודם ברשימה', async () => {
    const ent = await makeEntity('בנק מזרחי');
    const filed = await makeDoc(ent.id, 'תנועות בנק', 2025);
    setFilePath(filed.id, '/uploads/x.pdf');
    await makeDoc(ent.id, 'טופס 867', 2025);

    const res = await request(app).get('/api/readiness/2025');
    assert.equal(res.status, 200);
    const group = res.body.groups.find((g) => g.entity.id === ent.id);
    assert.ok(group);
    assert.equal(group.have, 1);
    assert.equal(group.total, 2);
    assert.equal(group.items[0].has_file, false); // חסר קודם
    assert.equal(group.items[1].has_file, true);
  });

  test('סיכום (summary) מצטבר נכון על פני כמה גופים', async () => {
    const e1 = await makeEntity('גוף א');
    const e2 = await makeEntity('גוף ב');
    const d1 = await makeDoc(e1.id, 'מסמך 1', 2025);
    setFilePath(d1.id, '/uploads/a.pdf');
    await makeDoc(e1.id, 'מסמך 2', 2025);
    await makeDoc(e2.id, 'מסמך 3', 2025);

    const res = await request(app).get('/api/readiness/2025');
    assert.equal(res.body.summary.total, 3);
    assert.equal(res.body.summary.have, 1);
    assert.equal(res.body.summary.missing, 2);
    assert.equal(res.body.summary.entities, 2);
  });

  test('גוף פעיל בשנה בלי שום מסמך עדיין מופיע (items ריק, have=0,total=0)', async () => {
    const ent = await makeEntity('גוף פעיל בלי מסמכים', { active_from: '2024-01-01' });

    const res = await request(app).get('/api/readiness/2025');
    const group = res.body.groups.find((g) => g.entity.id === ent.id);
    assert.ok(group);
    assert.deepEqual(group.items, []);
    assert.equal(group.have, 0);
    assert.equal(group.total, 0);
  });

  test('גוף שהסתיים לפני השנה ובלי מסמכים בשנה זו — לא מופיע', async () => {
    const ent = await makeEntity('גוף שהסתיים', { active_until: '2023-12-31' });

    const res = await request(app).get('/api/readiness/2025');
    const group = res.body.groups.find((g) => g.entity.id === ent.id);
    assert.equal(group, undefined);
  });

  test('סדר: גוף עם חוסרים לפני גוף מלא לגמרי', async () => {
    const full = await makeEntity('גוף מלא');
    const fullDoc = await makeDoc(full.id, 'מסמך', 2025);
    setFilePath(fullDoc.id, '/uploads/f.pdf');

    const partial = await makeEntity('גוף חסר');
    await makeDoc(partial.id, 'מסמך חסר', 2025);

    const res = await request(app).get('/api/readiness/2025');
    const fullIdx = res.body.groups.findIndex((g) => g.entity.id === full.id);
    const partialIdx = res.body.groups.findIndex((g) => g.entity.id === partial.id);
    assert.ok(partialIdx < fullIdx);
  });

  test('year לא תקין → 400', async () => {
    const res = await request(app).get('/api/readiness/abc');
    assert.equal(res.status, 400);
  });
});

describe('POST /api/readiness/:year/carry-forward', () => {
  test('יוצר סלוטים בשנה החדשה מכל מסמכי השנה הקודמת של גופים פעילים', async () => {
    const ent = await makeEntity('גוף נמשך');
    await makeDoc(ent.id, 'דוח שנתי', 2024);
    await makeDoc(ent.id, 'טופס 867', 2024);

    const res = await request(app).post('/api/readiness/2025/carry-forward');
    assert.equal(res.status, 200);
    assert.equal(res.body.created, 2);

    const slot = getOne('SELECT * FROM documents WHERE entity_id = ? AND document_name = ? AND year = ?', [ent.id, 'דוח שנתי', 2025]);
    assert.ok(slot);
    assert.equal(slot.status, 'pending');
    assert.equal(slot.file_path, null);
  });

  test('אידמפוטנטי — הרצה שנייה יוצרת 0', async () => {
    const ent = await makeEntity('גוף נמשך 2');
    await makeDoc(ent.id, 'דוח שנתי', 2024);

    await request(app).post('/api/readiness/2025/carry-forward');
    const second = await request(app).post('/api/readiness/2025/carry-forward');
    assert.equal(second.body.created, 0);

    const count = getOne('SELECT COUNT(*) as c FROM documents WHERE year = 2025').c;
    assert.equal(count, 1);
  });

  test('לא ממשיך מסמכי גוף שהסתיים לפני השנה החדשה', async () => {
    const ent = await makeEntity('גוף מסתיים', { active_until: '2024-06-01' });
    await makeDoc(ent.id, 'מסמך ישן', 2024);

    const res = await request(app).post('/api/readiness/2025/carry-forward');
    assert.equal(res.body.created, 0);

    const slot = getOne('SELECT * FROM documents WHERE entity_id = ? AND year = 2025', [ent.id]);
    assert.equal(slot, null);
  });

  test('לא נוגע במסמך קיים שכבר יש לו סלוט בשנה החדשה', async () => {
    const ent = await makeEntity('גוף עם סלוט קיים');
    await makeDoc(ent.id, 'מסמך', 2024);
    const existing = await makeDoc(ent.id, 'מסמך', 2025);
    await request(app).put(`/api/documents/${existing.id}`).send({ ...existing, status: 'submitted' });

    await request(app).post('/api/readiness/2025/carry-forward');

    const fresh = getOne('SELECT * FROM documents WHERE id = ?', [existing.id]);
    assert.equal(fresh.status, 'submitted'); // לא נדרס

    const count = getOne('SELECT COUNT(*) as c FROM documents WHERE year = 2025 AND entity_id = ?', [ent.id]).c;
    assert.equal(count, 1); // לא נוצר כפול
  });

  test('year לא תקין → 400', async () => {
    const res = await request(app).post('/api/readiness/abc/carry-forward');
    assert.equal(res.status, 400);
  });
});
