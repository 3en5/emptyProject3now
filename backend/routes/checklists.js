import express from 'express';
import { runQuery, getOne, getAll } from '../db/helper.js';
import { logActivity } from '../activity.js';

const router = express.Router();

// כל שאילתת רשימה מצרפת גם את שם המסמך שגרם להשלמה אוטומטית (completed_by_document_id),
// כדי שה-frontend יוכל להציג "🤖 הושלם אוטומטית עקב מסמך X" בלי שאילתה נוספת.
const SELECT_WITH_JOINS = `
  SELECT c.*, e.name as entity_name, d.document_name as completed_by_document_name
  FROM annual_checklist c
  LEFT JOIN financial_entities e ON c.entity_id = e.id
  LEFT JOIN documents d ON c.completed_by_document_id = d.id
`;

// Get checklist for year
router.get('/year/:year', (req, res) => {
  const checklist = getAll(`${SELECT_WITH_JOINS} WHERE c.year = ? ORDER BY c.task_category, c.required_date`, [parseInt(req.params.year)]);
  res.json(checklist);
});

// Get current year checklist
router.get('/current', (req, res) => {
  const year = new Date().getFullYear();
  const checklist = getAll(`${SELECT_WITH_JOINS} WHERE c.year = ? ORDER BY c.required_date`, [year]);
  res.json(checklist);
});

// Get pending tasks
router.get('/pending', (req, res) => {
  const year = new Date().getFullYear();
  const pending = getAll(`
    SELECT c.*, e.name as entity_name FROM annual_checklist c
    LEFT JOIN financial_entities e ON c.entity_id = e.id
    WHERE c.year = ? AND c.status IN ('pending', 'in_progress')
    ORDER BY c.required_date
  `, [year]);
  res.json(pending);
});

// Create checklist task
router.post('/', (req, res) => {
  const { year, entity_id, task_name, task_category, required_date, status, notes, assignee } = req.body;

  if (!year || !task_name) {
    return res.status(400).json({ error: 'year and task_name are required' });
  }

  const result = runQuery(
    `INSERT INTO annual_checklist
     (year, entity_id, task_name, task_category, required_date, status, notes, assignee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [year, entity_id, task_name, task_category, required_date, status || 'pending', notes, assignee]
  );

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  const newTask = getOne('SELECT * FROM annual_checklist ORDER BY id DESC LIMIT 1');
  if (newTask) logActivity('create', 'task', newTask.id, `נוספה משימה "${newTask.task_name}"`);
  res.status(201).json(newTask);
});

// Update checklist task
// auto_completed: כמו documents.auto_filed — נשלח מפורשות (0) רק כשהמשתמש מאשר/מבטל
// ידנית תיוק אוטומטי; אחרת COALESCE משאיר את הדגל כפי שהוא (לא נדרס בעדכונים רגילים).
router.put('/:id', (req, res) => {
  const { task_name, task_category, required_date, completed_date, status, notes, assignee, auto_completed } = req.body;

  const result = runQuery(
    `UPDATE annual_checklist
     SET task_name = ?, task_category = ?, required_date = ?, completed_date = ?, status = ?, notes = ?, assignee = ?,
         auto_completed = COALESCE(?, auto_completed),
         completed_by_document_id = CASE WHEN ? = 'completed' THEN completed_by_document_id ELSE NULL END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [task_name, task_category, required_date, completed_date, status, notes, assignee, auto_completed, status, parseInt(req.params.id)]
  );

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  const updated = getOne(`${SELECT_WITH_JOINS} WHERE c.id = ?`, [parseInt(req.params.id)]);
  if (updated) {
    const label = updated.status === 'completed' ? 'הושלמה משימה' : 'עודכנה משימה';
    logActivity('update', 'task', updated.id, `${label} "${updated.task_name}"`);
  }
  res.json(updated);
});

// Delete checklist task
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = getOne('SELECT task_name FROM annual_checklist WHERE id = ?', [id]);
  runQuery('DELETE FROM annual_checklist WHERE id = ?', [id]);
  if (existing) logActivity('delete', 'task', id, `נמחקה משימה "${existing.task_name}"`);
  res.json({ message: 'Task deleted successfully' });
});

export default router;
