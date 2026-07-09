import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import entitiesRouter from './routes/entities.js';
import accountsRouter from './routes/accounts.js';
import documentsRouter from './routes/documents.js';
import checklistRouter from './routes/checklists.js';
import summaryRouter from './routes/summary.js';
import comparisonRouter from './routes/comparison.js';
import exportRouter from './routes/export.js';
import activityRouter from './routes/activity.js';
import reportRouter from './routes/report.js';
import systemRouter from './routes/system.js';
import readinessRouter from './routes/readiness.js';

// יוצר את אפליקציית Express (בלי להאזין לפורט ובלי אתחול DB).
// מיוצא בנפרד כדי שטסטים יוכלו לייבא אותו ולהריץ בקשות ישירות.
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/entities', entitiesRouter);
  app.use('/api/accounts', accountsRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/checklists', checklistRouter);
  app.use('/api/summary', summaryRouter);
  app.use('/api/comparison', comparisonRouter);
  app.use('/api/export', exportRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/report', reportRouter);
  app.use('/api/system', systemRouter);
  app.use('/api/readiness', readinessRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  // הגשת ה-frontend הבנוי (production) — אם קיים build.
  // ככה השרת מגיש גם את ה-API וגם את האפליקציה על אותו פורט (כתובת אחת).
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next(); // API לא נתפס ע"י ה-SPA fallback
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
  });

  return app;
}
