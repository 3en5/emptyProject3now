// הגדרת השירות עבור pm2 — הרצת המערכת כשירות רקע שמתחיל אוטומטית ומתאושש מקריסות.
// שימוש: npm run service:start  (ראה README → "הרצה כשירות")
module.exports = {
  apps: [
    {
      name: 'finance-docs',
      script: 'backend/server.js',
      cwd: __dirname,
      env: {
        PORT: 3018,
        NODE_ENV: 'production',
        FINANCE_QUIET: '1',
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      time: true, // חותמות זמן בלוגים
    },
  ],
};
