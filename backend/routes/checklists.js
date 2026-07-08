import express from 'express';
import { runQuery, getOne, getAll } from '../db/helper.js';

const router = express.Router();

// Get checklist for year
router.get('/year/:year', (req, res) => {
  const checklist = getAll(`
    SELECT c.*, e.name as entity_name FROM annual_checklist c
    LEFT JOIN financial_entities e ON c.entity_id = e.id
    WHERE c.year = ?
    ORDER BY c.task_category, c.required_date
  `, [parseInt(req.params.year)]);
  res.json(checklist);
});

// Get current year checklist
router.get('/current', (req, res) => {
  const year = new Date().getFullYear();
  const checklist = getAll(`
    SELECT c.*, e.name as entity_name FROM annual_checklist c
    LEFT JOIN financial_entities e ON c.entity_id = e.id
    WHERE c.year = ?
    ORDER BY c.required_date
  `, [year]);
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
  res.status(201).json(newTask);
});

// Update checklist task
router.put('/:id', (req, res) => {
  const { task_name, task_category, required_date, completed_date, status, notes, assignee } = req.body;

  const result = runQuery(
    `UPDATE annual_checklist
     SET task_name = ?, task_category = ?, required_date = ?, completed_date = ?, status = ?, notes = ?, assignee = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [task_name, task_category, required_date, completed_date, status, notes, assignee, parseInt(req.params.id)]
  );

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  const updated = getOne('SELECT * FROM annual_checklist WHERE id = ?', [parseInt(req.params.id)]);
  res.json(updated);
});

// Delete checklist task
router.delete('/:id', (req, res) => {
  runQuery('DELETE FROM annual_checklist WHERE id = ?', [parseInt(req.params.id)]);
  res.json({ message: 'Task deleted successfully' });
});

export default router;
