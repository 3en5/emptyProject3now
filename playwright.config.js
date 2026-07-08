import { defineConfig } from '@playwright/test';

// נתיב ה-DB לטסטי E2E — קובץ נפרד שנזרע מראש, לא נוגע בנתונים האמיתיים.
const E2E_DB = './backend/db/e2e.db';
const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    launchOptions: { executablePath: CHROMIUM, args: ['--no-sandbox'] },
  },
  // Playwright מפעיל את שני השרתים ומחכה להם, ומכבה בסוף.
  webServer: [
    {
      // זריעה ל-DB נקי ואז הפעלת ה-backend על אותו DB
      command: `FINANCE_DB_PATH=${E2E_DB} node backend/db/seed.js && FINANCE_DB_PATH=${E2E_DB} FINANCE_QUIET=1 PORT=3018 node backend/server.js`,
      port: 3018,
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'npm run dev',
      cwd: './frontend',
      port: 5173,
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
