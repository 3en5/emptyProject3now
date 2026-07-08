import express from 'express';
import cors from 'cors';
import entitiesRouter from './routes/entities.js';
import accountsRouter from './routes/accounts.js';
import documentsRouter from './routes/documents.js';
import checklistRouter from './routes/checklists.js';
import summaryRouter from './routes/summary.js';

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

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
  });

  return app;
}
