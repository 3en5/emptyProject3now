/**
 * טסטים ל-ownerMatch.js — התאמת שם אדם שזוהה על מסמך לבן-בית מוגדר.
 * פונקציה טהורה, בלי DB.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { matchOwner } from '../ownerMatch.js';

const NAMES = { userName: 'ישראל ישראלי', spouseName: 'דנה כהן' };

describe('matchOwner', () => {
  test('שם זהה למשתמש → user', () => {
    assert.equal(matchOwner('ישראל ישראלי', NAMES), 'user');
  });

  test('שם זהה לבן/בת הזוג → spouse', () => {
    assert.equal(matchOwner('דנה כהן', NAMES), 'spouse');
  });

  test('חלק מהשם בלבד (שם פרטי) עדיין מתאים', () => {
    assert.equal(matchOwner('דנה', NAMES), 'spouse');
  });

  test('ניסוח שונה עם שם משפחה נוסף — עדיין מתאים לפי חלק חופף', () => {
    assert.equal(matchOwner('דנה כהן לוי', NAMES), 'spouse');
  });

  test('שם שלא תואם לאף אחד → null', () => {
    assert.equal(matchOwner('אבי לוי', NAMES), null);
  });

  test('בלי personName → null', () => {
    assert.equal(matchOwner(null, NAMES), null);
    assert.equal(matchOwner('', NAMES), null);
  });

  test('בלי הגדרת userName/spouseName ב-.env → null (לא מנחשים)', () => {
    assert.equal(matchOwner('דנה ישראלי', {}), null);
  });

  test('רסיס קצר מדי (פחות מ-2 תווים) לא נחשב אות אמין', () => {
    assert.equal(matchOwner('א', { userName: 'א', spouseName: 'ב' }), null);
  });
});
