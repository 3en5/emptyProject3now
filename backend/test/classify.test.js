import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { classifyText } from '../classify.js';

const ENTITIES = [
  { id: 1, name: 'בנק מזרחי — משפחתי' },
  { id: 2, name: 'IBKR' },
  { id: 3, name: 'מיטב ד"ש' },
];

describe('classifyText', () => {
  test('מזהה גוף, סוג מסמך ושנה → confidence high', () => {
    const r = classifyText('בנק מזרחי טפחות — טופס 867 לשנת המס 2025', ENTITIES, { currentYear: 2026 });
    assert.equal(r.issuer.name, 'בנק מזרחי');
    assert.equal(r.issuer.entityId, 1); // הותאם לגוף הקיים
    assert.equal(r.docType, 'טופס 867');
    assert.equal(r.year, 2025);
    assert.equal(r.confidence, 'high');
  });

  test('מזהה IBKR ו-Annual Activity Statement', () => {
    const r = classifyText('Interactive Brokers - Annual Activity Statement 2025', ENTITIES, { currentYear: 2026 });
    assert.equal(r.issuer.name, 'IBKR');
    assert.equal(r.issuer.entityId, 2);
    assert.equal(r.issuer.suggestedType, 'investment'); // סוג גוף משוער ליצירת גוף חדש
    assert.equal(r.docType, 'Annual Activity Statement');
  });

  test('גוף שזוהה אך לא קיים במערכת → suggestedType לפי טביעת האצבע', () => {
    const r = classifyText('הפניקס חברה לביטוח — פוליסה', ENTITIES, { currentYear: 2026 });
    assert.equal(r.issuer.name, 'הפניקס');
    assert.equal(r.issuer.entityId, null); // אין גוף כזה ברשימה
    assert.equal(r.issuer.suggestedType, 'insurance'); // אבל יודעים שזו חברת ביטוח
  });

  test('רק סוג מסמך בלי גוף → confidence medium', () => {
    const r = classifyText('טופס 106 סיכום שכר', ENTITIES, { currentYear: 2026 });
    assert.equal(r.issuer, null);
    assert.equal(r.docType, 'טופס 106');
    assert.equal(r.confidence, 'medium');
  });

  test('טקסט לא רלוונטי → confidence low, הכל null', () => {
    const r = classifyText('שלום עולם, זה סתם טקסט', ENTITIES, { currentYear: 2026 });
    assert.equal(r.issuer, null);
    assert.equal(r.docType, null);
    assert.equal(r.confidence, 'low');
  });

  test('גוף שאין לו התאמה במערכת → entityId null אבל שם מזוהה', () => {
    const r = classifyText('הראל ביטוח — אישור הפקדות 2025', ENTITIES, { currentYear: 2026 });
    assert.equal(r.issuer.name, 'הראל');
    assert.equal(r.issuer.entityId, null);
    assert.equal(r.docType, 'אישור הפקדות');
  });

  test('חילוץ שנה — בוחר את השכיחה, מתעלם משנים לא סבירות', () => {
    const r = classifyText('הופק ב-2026 עבור שנת 2025 2025 (השווה ל-1999)', ENTITIES, { currentYear: 2026 });
    assert.equal(r.year, 2025); // מופיע פעמיים
  });

  test('טקסט ריק → low', () => {
    const r = classifyText('', ENTITIES, { currentYear: 2026 });
    assert.equal(r.confidence, 'low');
    assert.equal(r.year, null);
  });

  test('עברית הפוכה (כמו שחילוץ PDF מחזיר לעיתים) עדיין מזוהה', () => {
    // "מזרחי טפחות 867" עם המילים העבריות הפוכות תו-תו
    const reversed = 'יחרזמ תוחפט 867';
    const r = classifyText(reversed, ENTITIES, { currentYear: 2026 });
    assert.equal(r.issuer.name, 'בנק מזרחי'); // זוהה למרות ההיפוך
    assert.equal(r.docType, 'טופס 867');
  });
});

describe('חילוץ מועד חידוש (renewalDate)', () => {
  test('פוליסת ביטוח: "בתוקף עד 31/12/2027" → 2027-12-31', () => {
    const r = classifyText('פוליסת ביטוח מקיף — בתוקף עד 31/12/2027', ENTITIES, { currentYear: 2026 });
    assert.equal(r.renewalDate, '2027-12-31');
  });

  test('טסט רכב: "תוקף עד 15.08.2026" → 2026-08-15', () => {
    const r = classifyText('אישור מבחן רכב (טסט) תוקף עד 15.08.2026', ENTITIES, { currentYear: 2026 });
    assert.equal(r.renewalDate, '2026-08-15');
  });

  test('פורמט ISO אחרי מילת עוגן: "מועד חידוש 2027-03-01"', () => {
    const r = classifyText('רישיון כלי יריה — מועד חידוש 2027-03-01', ENTITIES, { currentYear: 2026 });
    assert.equal(r.renewalDate, '2027-03-01');
  });

  test('בלי מילת עוגן → null (לא מנחש תאריך אקראי)', () => {
    const r = classifyText('הופק בתאריך 03/02/2025 עבור לקוח', ENTITIES, { currentYear: 2026 });
    assert.equal(r.renewalDate, null);
  });
});
