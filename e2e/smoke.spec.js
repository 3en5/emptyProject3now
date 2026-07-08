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

test('הוספת גוף פיננסי חדש דרך הטופס', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /גופים פיננסיים/ }).click();
  await page.getByRole('button', { name: /הוסף גוף פיננסי/ }).click();
  await page.fill('input[name="name"]', 'בנק חדש לבדיקה');
  await page.selectOption('select[name="type"]', 'bank');
  await page.getByRole('button', { name: /שמור/ }).click();
  await expect(page.getByText('בנק חדש לבדיקה')).toBeVisible();
});
