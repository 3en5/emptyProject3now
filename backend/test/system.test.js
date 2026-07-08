/**
 * טסטים ל-route של עדכון תוכנה (/api/system).
 * בודק את endpoint הגרסה בלבד — לא מריץ fetch/pull רשתי או build (יקר ותלוי-סביבה).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

process.env.FINANCE_DB_PATH = ':memory:';
process.env.FINANCE_QUIET = '1';

const { createApp } = await import('../app.js');
const request = (await import('supertest')).default;

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
