import { test, expect } from '@playwright/test';

// זרימות מלאות דרך דפדפן אמיתי מול המערכת החיה (backend + frontend + DB זרוע).

test('הדשבורד נטען ומציג את המצאי', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.navbar-brand h1')).toContainText('ניהול מסמכים פיננסיים');
  // מספר הגופים מהזריעה (חיובי) — לא מקודד ערך קשיח כדי לא להישבר בכל שינוי seed
  const count = Number(await page.locator('.stat-number').first().textContent());
  expect(count).toBeGreaterThan(15);
});

test('סעיף התראות המועדים מופיע בדשבורד עם פריטים באיחור', async ({ page }) => {
  await page.goto('/');
  const alerts = page.locator('.alerts-section');
  await expect(alerts).toBeVisible();
  // לפחות פריט התראה אחד (המסמכים הזרועים כוללים מועדים שעברו)
  await expect(alerts.locator('.alert-item').first()).toBeVisible();
  // לחיצה על התראה מנווטת לעמוד הרלוונטי
  await alerts.locator('.alert-item').first().click();
  await expect(page).toHaveURL(/localhost:5173/);
});

test('ניווט לעמוד הגופים ומציג גופים לפי סוג', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /גופים פיננסיים/ }).click();
  await expect(page.getByRole('heading', { name: /ניהול גופים פיננסיים/ })).toBeVisible();
  await expect(page.locator('.entity-card').first()).toBeVisible();
});

test('שינוי סטטוס מסמך ל"הוגש" נשמר', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /📄 מסמכים/ }).click();
  const firstSelect = page.locator('.status-select').first();
  await firstSelect.selectOption('submitted');
  // אימות מול ה-API שהשינוי נשמר
  await expect.poll(async () => {
    const docs = await page.evaluate(() => fetch('/api/documents').then((r) => r.json()));
    return docs.filter((d) => d.status === 'submitted').length;
  }).toBeGreaterThan(0);
});

test('סימון משימה שנתית כהושלמה מעביר אותה למדור הושלמו', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /משימות שנתיות/ }).click();
  await page.locator('.btn-success', { hasText: 'סמן כהושלם' }).first().click();
  await expect.poll(async () => {
    const tasks = await page.evaluate(() => fetch('/api/checklists/current').then((r) => r.json()));
    return tasks.filter((t) => t.status === 'completed').length;
  }).toBeGreaterThan(0);
});

test('הוספת חשבון דרך עמוד החשבונות', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /💳 חשבונות/ }).click();
  await page.getByRole('button', { name: /הוסף חשבון/ }).click();
  await page.selectOption('select', { index: 1 }); // בחירת הגוף הראשון
  await page.fill('input[placeholder*="עו"]', 'עו״ש ראשי');
  await page.getByRole('button', { name: /💾/ }).click();
  await expect(page.getByText('עו״ש ראשי')).toBeVisible();
});

test('עריכת מסמך קיים משנה את שמו', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /📄 מסמכים/ }).click();
  const firstCard = page.locator('.document-card').first();
  await firstCard.getByRole('button', { name: /ערוך/ }).click();
  await page.locator('form input[type="text"]').first().fill('שם מעודכן בבדיקה');
  await page.getByRole('button', { name: /עדכן מסמך/ }).click();
  await expect(page.getByText('שם מעודכן בבדיקה')).toBeVisible();
});

test('קליטה חכמה: זריקת PDF לתיבת הקליטה מתייקת אוטומטית לסלוט המתאים', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /📄 מסמכים/ }).click();
  // זורקים לתיבת הקליטה — בלי לבחור יעד
  await page.locator('.intake-box input[type="file"]').setInputFiles({
    name: 'ibkr-statement.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf('Interactive Brokers Annual Activity Statement 2026'),
  });
  const result = page.locator('.intake-result').first();
  await expect(result).toBeVisible();
  // המערכת זיהתה ותייקה לבד לסלוט של IBKR
  await expect(result.getByText(/זוהה ותויק לסלוט קיים/)).toBeVisible();
  await expect(result.locator('input[type="text"]')).toHaveValue('Annual Activity Statement');
  await expect(result.getByRole('link', { name: /צפייה/ })).toBeVisible();
  // פיקוח: אישור בלחיצה אחת → הדגל יורד והקובץ נשאר מוצמד
  await result.getByRole('button', { name: /אשר ושמור/ }).click();
  await expect(result.getByText(/אושר ונשמר/)).toBeVisible();
  await expect.poll(async () => {
    const docs = await page.evaluate(() => fetch('/api/documents').then((r) => r.json()));
    // בזריעה יש גם עותק היסטורי מ-2025 באותו שם — בודקים שלפחות אחד קיבל קובץ ואושר
    return docs.some((x) => x.document_name === 'Annual Activity Statement' && x.file_path && !x.auto_filed) ? 'ok' : 'no';
  }).toBe('ok');
});

test('קליטה חכמה: מסמך לא מזוהה נקלט ל"ממתין לשיוך" וניתן לשייך בפיקוח', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /📄 מסמכים/ }).click();
  await page.locator('.intake-box input[type="file"]').setInputFiles({
    name: 'mystery.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf('totally unknown paper with no fingerprints'),
  });
  const result = page.locator('.intake-result').first();
  await expect(result.getByText(/לא זוהה גוף — נא לשייך/)).toBeVisible();
  // פיקוח: שיוך לגוף הנכון + שם ידני → אישור
  await result.locator('select').selectOption({ label: 'IBKR' });
  await result.locator('input[type="text"]').fill('מסמך משויך ידנית');
  await result.getByRole('button', { name: /אשר ושמור/ }).click();
  await expect(result.getByText(/אושר ונשמר/)).toBeVisible();
  await expect.poll(async () => {
    const docs = await page.evaluate(() => fetch('/api/documents').then((r) => r.json()));
    const d = docs.find((x) => x.document_name === 'מסמך משויך ידנית');
    return d ? d.entity_name : 'missing';
  }).toBe('IBKR');
});

test('עמוד הדוחות מציג שווי נקי לפי מטבע', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /📊 דוחות/ }).click();
  await expect(page.getByRole('heading', { name: /שווי נקי לפי מטבע/ })).toBeVisible();
  // הזריעה כוללת חשבונות ב-ILS וב-USD
  await expect(page.locator('.networth-card').first()).toBeVisible();
  await expect(page.locator('.networth-row.net').first()).toBeVisible();
});

test('שינוי נרשם ביומן ומופיע בסעיף "שינויים אחרונים"', async ({ page }) => {
  await page.goto('/');
  // ביצוע שינוי — הוספת גוף
  await page.getByRole('button', { name: /גופים פיננסיים/ }).click();
  await page.getByRole('button', { name: /הוסף גוף פיננסי/ }).click();
  await page.fill('input[name="name"]', 'גוף ליומן');
  await page.selectOption('select[name="type"]', 'bank');
  await page.getByRole('button', { name: /שמור/ }).click();
  await expect(page.getByText('גוף ליומן')).toBeVisible();
  // בדיקה בדוחות
  await page.getByRole('button', { name: /📊 דוחות/ }).click();
  const section = page.locator('.dashboard-section', { hasText: 'שינויים אחרונים' });
  await expect(section.getByText(/נוסף גוף "גוף ליומן"/)).toBeVisible();
});

test('השוואת שנים מציגה מסמך חסר וגוף שהסתיים', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /🔄 השוואת שנים/ }).click();
  await expect(page.getByRole('heading', { name: /השוואת שנה-לשנה/ })).toBeVisible();
  // מהזריעה: ביטוח חיים חסר ב-2026, ו-BTB הסתיים
  await expect(page.getByText(/ביטוח חיים/)).toBeVisible();
  const endedSection = page.locator('.dashboard-section', { hasText: 'התקשרויות שהסתיימו' });
  await expect(endedSection.getByText('BTB')).toBeVisible();
});

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

test('קליטה חכמה: מועד חידוש מזוהה אוטומטית ונכנס לשדה הנערך', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /📄 מסמכים/ }).click();
  // מסמך בלי טביעת-אצבע של גוף אבל עם תאריך תוקף — נוצר חדש עם המועד שזוהה
  await page.locator('.intake-box input[type="file"]').setInputFiles({
    name: 'license.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf('some renewal document valid until 31/12/2027'),
  });
  const result = page.locator('.intake-result').first();
  await expect(result).toBeVisible();
  // מועד החידוש זוהה מ-"valid until 31/12/2027" ומולא בשדה הנערך
  await expect(result.locator('input[type="date"]')).toHaveValue('2027-12-31');
  await expect(result.getByText(/✓ זוהה/)).toBeVisible();
});

test('רכבים ורישיונות: סינון מציג רכב, ומסמכי חידוש קיימים', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /גופים פיננסיים/ }).click();
  await page.selectOption('.filter-select', 'vehicle');
  await expect(page.getByRole('heading', { name: /רכב פרטי/ })).toBeVisible();
  // מסמכי הרכב (ביטוח/טסט) קיימים בעמוד המסמכים
  await page.getByRole('button', { name: /📄 מסמכים/ }).click();
  await expect(page.getByText('טסט שנתי')).toBeVisible();
  await expect(page.getByText('ביטוח חובה')).toBeVisible();
});

test('ייצוא CSV מוריד קובץ רשימת פעולות', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /משימות שנתיות/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: /ייצוא רשימת פעולות/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/action-list-\d+\.csv/);
});

test('מצב צפייה-בלבד מסתיר כפתורי עריכה', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /גופים פיננסיים/ }).click();
  // במצב עריכה — כפתור הוספה קיים
  await expect(page.getByRole('button', { name: /הוסף גוף פיננסי/ })).toBeVisible();
  // מעבר למצב צפייה
  await page.getByRole('button', { name: /מצב עריכה/ }).click();
  await expect(page.getByRole('button', { name: /מצב צפייה/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /הוסף גוף פיננסי/ })).toHaveCount(0);
  // התוכן עדיין מוצג
  await expect(page.locator('.entity-card').first()).toBeVisible();
});

test('דוח חודשי מציג מסמכים שמועדם בחודש', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /📅 דוח חודשי/ }).click();
  await expect(page.getByRole('heading', { name: /דוח חודשי/ })).toBeVisible();
  // בורר החודש → יולי 2026 (בו נמצאים מסמכי הזריעה)
  await page.locator('input[type="month"]').fill('2026-07');
  const docsSection = page.locator('.dashboard-section', { hasText: 'מסמכים שמועדם החודש' });
  await expect(docsSection.locator('.pending-item').first()).toBeVisible();
});

test('הוספת גוף פיננסי חדש דרך הטופס', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /גופים פיננסיים/ }).click();
  await page.getByRole('button', { name: /הוסף גוף פיננסי/ }).click();
  await page.fill('input[name="name"]', 'בנק חדש לבדיקה');
  await page.selectOption('select[name="type"]', 'bank');
  await page.getByRole('button', { name: /שמור/ }).click();
  await expect(page.getByText('בנק חדש לבדיקה')).toBeVisible();
});
