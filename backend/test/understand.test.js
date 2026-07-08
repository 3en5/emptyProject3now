/**
 * טסטים למנוע ההבנה ההיברידי (understand.js).
 * לא נוגע ברשת — פונקציית ה-AI מוזרקת (opts.aiFn / opts.available).
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.FINANCE_QUIET = '1';

const { understandDocument } = await import('../understand.js');

// PDF מינימלי עם טקסט אנגלי (pdf-parse מחלץ אנגלית מ-makePdf; עברית לא)
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

let dir;
before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'understand-')); });
after(() => { fs.rmSync(dir, { recursive: true, force: true }); });

function write(name, buf) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, buf);
  return p;
}

const ENTITIES = [
  { id: 1, name: 'IBKR' },
  { id: 2, name: 'הראל ביטוח' },
];

describe('understandDocument — היברידי', () => {
  test('GPT זמין → מריצים GPT גם כשהכללים בטוחים (המשתמש הגדיר מפתח בשביל זה)', async () => {
    let called = false;
    const aiFn = async () => {
      called = true;
      return { issuerName: 'IBKR', docType: 'Annual Activity Statement', entityType: 'investment', year: 2025, renewalDate: '', confidence: 'high' };
    };
    const file = write('ibkr.pdf', makePdf('Interactive Brokers Annual Activity Statement 2025'));
    const r = await understandDocument(file, ENTITIES, { aiFn, available: true });
    assert.equal(called, true); // GPT רץ, לא מדולג
    assert.equal(r.method, 'gpt');
    assert.equal(r.issuer.name, 'IBKR');
  });

  test('GPT נכשל → נופל לכללים עם דגל aiError', async () => {
    const aiFn = async () => null;
    const file = write('fail.pdf', makePdf('Interactive Brokers Annual Activity Statement 2025'));
    const r = await understandDocument(file, ENTITIES, { aiFn, available: true });
    assert.equal(r.method, 'rules');
    assert.equal(r.aiError, true);
  });

  test('ביטחון נמוך + GPT זמין → נופל ל-GPT וממפה לגוף קיים', async () => {
    const aiFn = async () => ({
      issuerName: 'הראל', docType: 'פוליסת ביטוח חיים', entityType: 'insurance',
      year: 2025, renewalDate: '2027-12-31', confidence: 'high',
    });
    const file = write('scan.pdf', makePdf('unrecognized scanned content xyz'));
    const r = await understandDocument(file, ENTITIES, { aiFn, available: true });
    assert.equal(r.method, 'gpt');
    assert.equal(r.issuer.name, 'הראל');
    assert.equal(r.issuer.entityId, 2); // הותאם ל"הראל ביטוח"
    assert.equal(r.issuer.suggestedType, 'insurance');
    assert.equal(r.docType, 'פוליסת ביטוח חיים');
    assert.equal(r.year, 2025);
    assert.equal(r.renewalDate, '2027-12-31');
  });

  // רגרסיה: GPT מחזיר שם חופשי (אנגלית/פורמט שונה) שלא תואם מילולית לשם המדויק ב-DB —
  // חייב לעבור דרך אותה טביעת-אצבע (ISSUERS) ששימושה בכללים, לא רק substring גולמי.
  test('GPT מחזיר שם באנגלית ("ONE ZERO Digital Bank LTD") → מותאם לגוף העברי הקיים', async () => {
    const entities = [{ id: 5, name: 'וואן זירו — השקעות' }];
    const aiFn = async () => ({
      issuerName: 'ONE ZERO Digital Bank LTD', docType: 'דוח מקוצר', entityType: 'bank',
      year: 2024, renewalDate: '', confidence: 'high',
    });
    const file = write('onezero.pdf', makePdf('unrecognized scanned content xyz'));
    const r = await understandDocument(file, entities, { aiFn, available: true });
    assert.equal(r.issuer.entityId, 5);
  });

  test('GPT מחזיר שם עם ניסוח שונה ("Mizrahi-Tefahot Bank") → מותאם לגוף הקיים', async () => {
    const entities = [{ id: 6, name: 'בנק מזרחי — משפחתי' }];
    const aiFn = async () => ({
      issuerName: 'Mizrahi-Tefahot Bank', docType: 'דוח שנתי', entityType: 'bank',
      year: 2024, renewalDate: '', confidence: 'high',
    });
    const file = write('mizrahi-en.pdf', makePdf('unrecognized scanned content xyz'));
    const r = await understandDocument(file, entities, { aiFn, available: true });
    assert.equal(r.issuer.entityId, 6);
  });

  test('ביטחון נמוך + אין GPT → נשאר עם הכללים (method=rules)', async () => {
    const file = write('scan2.pdf', makePdf('unrecognized scanned content xyz'));
    const r = await understandDocument(file, ENTITIES, { available: false });
    assert.equal(r.method, 'rules');
    assert.equal(r.confidence, 'low');
  });

  test('ביטחון נמוך + GPT מחזיר null (שגיאה/אין מפתח) → נשאר עם הכללים', async () => {
    const aiFn = async () => null;
    const file = write('scan3.pdf', makePdf('unrecognized scanned content xyz'));
    const r = await understandDocument(file, ENTITIES, { aiFn, available: true });
    assert.equal(r.method, 'rules');
  });

  test('GPT מזהה גוף שלא קיים במערכת → entityId null, שם+סוג נשמרים', async () => {
    const aiFn = async () => ({
      issuerName: 'AIG', docType: 'אישור מס', entityType: 'insurance',
      year: 2025, renewalDate: '', confidence: 'medium',
    });
    const file = write('aig.pdf', makePdf('unrecognized scanned content xyz'));
    const r = await understandDocument(file, ENTITIES, { aiFn, available: true });
    assert.equal(r.method, 'gpt');
    assert.equal(r.issuer.name, 'AIG');
    assert.equal(r.issuer.entityId, null);
    assert.equal(r.issuer.suggestedType, 'insurance');
    assert.equal(r.renewalDate, null); // '' → null
  });

  test('GPT מחזיר תקציר, סכומים ותאריך מסמך → מועברים כמו שהם', async () => {
    const aiFn = async () => ({
      issuerName: 'הראל', docType: 'פוליסת ביטוח חיים', entityType: 'insurance',
      year: 2025, docDate: '2025-03-01', renewalDate: '2027-12-31',
      summary: 'פוליסת ביטוח חיים של הראל, מחדשת כיסוי קיים.',
      amounts: ['פרמיה חודשית: 340 ₪', 'סכום ביטוח: 500,000 ₪'],
      confidence: 'high',
    });
    const file = write('policy.pdf', makePdf('unrecognized scanned content xyz'));
    const r = await understandDocument(file, ENTITIES, { aiFn, available: true });
    assert.equal(r.docDate, '2025-03-01');
    assert.equal(r.summary, 'פוליסת ביטוח חיים של הראל, מחדשת כיסוי קיים.');
    assert.deepEqual(r.amounts, ['פרמיה חודשית: 340 ₪', 'סכום ביטוח: 500,000 ₪']);
  });

  test('כללים מקומיים (בלי GPT) → summary/amounts/docDate ריקים, לא קורסים', async () => {
    const file = write('rules-only.pdf', makePdf('Interactive Brokers Annual Activity Statement 2025'));
    const r = await understandDocument(file, ENTITIES, { available: false });
    assert.equal(r.method, 'rules');
    assert.equal(r.summary, undefined);
    assert.equal(r.amounts, undefined);
  });

  test('GPT מזהה קבלה על תרומה → entityType donation מועבר כ-suggestedType', async () => {
    const aiFn = async () => ({
      issuerName: 'עמותת דוגמה', docType: 'קבלה על תרומה', entityType: 'donation',
      year: 2025, renewalDate: '', confidence: 'medium',
    });
    const file = write('donation.pdf', makePdf('unrecognized scanned content xyz'));
    const r = await understandDocument(file, ENTITIES, { aiFn, available: true });
    assert.equal(r.issuer.name, 'עמותת דוגמה');
    assert.equal(r.issuer.suggestedType, 'donation');
  });

  test('personName מזוהה ומועבר, ומותאם ל-ownerGuess לפי FINANCE_USER_NAME/SPOUSE_NAME', async () => {
    const prevUser = process.env.FINANCE_USER_NAME;
    const prevSpouse = process.env.FINANCE_SPOUSE_NAME;
    process.env.FINANCE_USER_NAME = 'ישראל ישראלי';
    process.env.FINANCE_SPOUSE_NAME = 'דנה כהן';
    try {
      const aiFn = async () => ({
        issuerName: 'המוסד לביטוח לאומי', docType: 'טופס 106', entityType: 'other',
        year: 2025, renewalDate: '', personName: 'דנה כהן', confidence: 'high',
      });
      const file = write('form106.pdf', makePdf('unrecognized scanned content xyz'));
      const r = await understandDocument(file, ENTITIES, { aiFn, available: true });
      assert.equal(r.personName, 'דנה כהן');
      assert.equal(r.ownerGuess, 'spouse');
    } finally {
      process.env.FINANCE_USER_NAME = prevUser;
      process.env.FINANCE_SPOUSE_NAME = prevSpouse;
    }
  });

  test('בלי personName → ownerGuess null, לא קורס', async () => {
    const aiFn = async () => ({
      issuerName: 'IBKR', docType: 'Annual Activity Statement', entityType: 'investment',
      year: 2025, renewalDate: '', confidence: 'high',
    });
    const file = write('no-person.pdf', makePdf('unrecognized scanned content xyz'));
    const r = await understandDocument(file, ENTITIES, { aiFn, available: true });
    assert.equal(r.personName, null);
    assert.equal(r.ownerGuess, null);
  });
});
