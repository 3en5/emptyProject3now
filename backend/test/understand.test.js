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
  test('ביטחון גבוה מהכללים → method=rules, GPT לא נקרא', async () => {
    const aiFn = () => { throw new Error('לא אמור להיקרא'); };
    const file = write('ibkr.pdf', makePdf('Interactive Brokers Annual Activity Statement 2025'));
    const r = await understandDocument(file, ENTITIES, { aiFn, available: true });
    assert.equal(r.method, 'rules');
    assert.equal(r.issuer.name, 'IBKR');
    assert.equal(r.confidence, 'high');
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
});
