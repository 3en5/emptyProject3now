/**
 * טסטים ל-route של עדכון תוכנה (/api/system).
 * בודק את endpoint הגרסה בלבד — לא מריץ fetch/pull רשתי או build (יקר ותלוי-סביבה).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

process.env.FINANCE_DB_PATH = ':memory:';
process.env.FINANCE_QUIET = '1';

const { init } = await import('../db/init.js');
const { runQuery, getOne } = await import('../db/helper.js');
const { createApp } = await import('../app.js');
const request = (await import('supertest')).default;

await init();
const app = createApp();

describe('GET /api/system/version', () => {
  test('מחזיר את הגרסה המותקנת (commit נוכחי) בסביבת git', async () => {
    const res = await request(app).get('/api/system/version');
    assert.equal(res.status, 200);
    assert.equal(res.body.gitAvailable, true);
    // hash קצר של הקומיט הנוכחי + שם ענף
    assert.match(res.body.current.hash, /^[0-9a-f]{7,}$/);
    assert.ok(typeof res.body.current.branch === 'string' && res.body.current.branch.length > 0);
  });
});

describe('GET /api/system/ai-status', () => {
  test('מדווח אם הזיהוי החכם (GPT) מוגדר', async () => {
    const res = await request(app).get('/api/system/ai-status');
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.configured, 'boolean'); // תלוי אם OPENAI_API_KEY מוגדר בסביבה
    assert.ok(res.body.model); // תמיד יש מודל ברירת מחדל
  });
});

describe('GET /api/system/years', () => {
  test('DB ריק — מחזיר לפחות את חלון ברירת המחדל, ממוין יורד, כולם מספרים', async () => {
    const res = await request(app).get('/api/system/years');
    const current = new Date().getFullYear();
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.years));
    res.body.years.forEach((y) => assert.equal(typeof y, 'number'));
    assert.ok(res.body.years.includes(current - 1));
    assert.ok(res.body.years.includes(current));
    assert.ok(res.body.years.includes(current + 1));
    for (let i = 1; i < res.body.years.length; i++) {
      assert.ok(res.body.years[i - 1] > res.body.years[i], 'צריך להיות ממוין יורד וללא כפילויות');
    }
  });

  test('שנה ישנה (2015) שקיימת רק במסמך — מופיעה ברשימה', async () => {
    const entity = getOne('SELECT id FROM financial_entities LIMIT 1') ||
      (() => {
        runQuery(
          `INSERT INTO financial_entities (name, type, status) VALUES (?, ?, ?)`,
          ['גוף לבדיקה', 'bank', 'active']
        );
        return getOne('SELECT * FROM financial_entities ORDER BY id DESC LIMIT 1');
      })();

    runQuery(
      `INSERT INTO documents (entity_id, document_name, year) VALUES (?, ?, ?)`,
      [entity.id, 'מסמך ישן', 2015]
    );

    const res = await request(app).get('/api/system/years');
    assert.equal(res.status, 200);
    assert.ok(res.body.years.includes(2015));

    // ללא כפילויות וממוין יורד גם אחרי הוספת הנתון
    const unique = new Set(res.body.years);
    assert.equal(unique.size, res.body.years.length);
    for (let i = 1; i < res.body.years.length; i++) {
      assert.ok(res.body.years[i - 1] > res.body.years[i]);
    }
  });
});
