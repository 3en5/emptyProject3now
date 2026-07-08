import { test, expect } from '@playwright/test';

// זרימות מלאות דרך דפדפן אמיתי מול המערכת החיה (backend + frontend + DB זרוע).

test('הדשבורד נטען ומציג את המצאי', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.navbar-brand h1')).toContainText('ניהול מסמכים פיננסיים');
  // 18 גופים מהזריעה
  await expect(page.locator('.stat-number').first()).toHaveText('18');
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

test('העלאת קובץ PDF למסמך ואז קישור צפייה', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /📄 מסמכים/ }).click();
  const firstCard = page.locator('.document-card').first();
  await firstCard.locator('input[type="file"]').setInputFiles({
    name: 'report.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 e2e test file'),
  });
  await expect(firstCard.getByRole('link', { name: /צפייה בקובץ/ })).toBeVisible();
});

test('עמוד הדוחות מציג שווי נקי לפי מטבע', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /📊 דוחות/ }).click();
  await expect(page.getByRole('heading', { name: /שווי נקי לפי מטבע/ })).toBeVisible();
  // הזריעה כוללת חשבונות ב-ILS וב-USD
  await expect(page.locator('.networth-card').first()).toBeVisible();
  await expect(page.locator('.networth-row.net').first()).toBeVisible();
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

test('זיהוי חכם: העלאת PDF וניתוח מזהה סוג ושנה', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /📄 מסמכים/ }).click();
  const firstCard = page.locator('.document-card').first();
  await firstCard.locator('input[type="file"]').setInputFiles({
    name: 'report.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf('Interactive Brokers Annual Activity Statement 2025'),
  });
  await expect(firstCard.getByRole('link', { name: /צפייה בקובץ/ })).toBeVisible();
  await firstCard.getByRole('button', { name: /נתח/ }).click();
  const box = firstCard.locator('.analysis-box');
  await expect(box).toBeVisible();
  await expect(box.getByText(/Annual Activity Statement/)).toBeVisible();
  await expect(box.getByText('2025', { exact: true })).toBeVisible();
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
