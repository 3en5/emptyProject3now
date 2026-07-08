import express from 'express';
import { getAll } from '../db/helper.js';

const router = express.Router();

// GET /api/report/monthly?month=YYYY-MM
// דוח חודשי: מה השתנה החודש (מהיומן) + מה מגיע לפירעון החודש (מסמכים/משימות).
router.get('/monthly', (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '')
    ? req.query.month
    : new Date().toISOString().slice(0, 7);
  const like = `${month}%`;

  const changes = getAll(
    'SELECT * FROM activity_log WHERE created_at LIKE ? ORDER BY created_at DESC, id DESC',
    [like]
  );

  const dueDocuments = getAll(`
    SELECT d.id, d.document_name, d.required_by_date, d.status, e.name AS entity_name
    FROM documents d JOIN financial_entities e ON d.entity_id = e.id
    WHERE d.required_by_date LIKE ?
    ORDER BY d.required_by_date
  `, [like]);

  const dueTasks = getAll(`
    SELECT id, task_name, task_category, required_date, status, assignee
    FROM annual_checklist
    WHERE required_date LIKE ?
    ORDER BY required_date
  `, [like]);

  res.json({
    month,
    changes,
    dueDocuments,
    dueTasks,
    summary: {
      changes: changes.length,
      dueDocuments: dueDocuments.length,
      dueTasks: dueTasks.length,
    },
  });
});

export default router;
