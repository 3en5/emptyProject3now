import express from 'express';
import { getDatabase } from '../db/init.js';

const router = express.Router();

// Get checklist for year
router.get('/year/:year', (req, res) => {
  const db = getDatabase();
  const checklist = db.prepare(`
    SELECT c.*, e.name as entity_name FROM annual_checklist c
    LEFT JOIN financial_entities e ON c.entity_id = e.id
    WHERE c.year = ?
    ORDER BY c.task_category, c.required_date
  `).all(req.params.year);
  res.json(checklist);
});

// Get current year checklist
router.get('/current', (req, res) => {
  const db = getDatabase();
  const year = new Date().getFullYear();
  const checklist = db.prepare(`
    SELECT c.*, e.name as entity_name FROM annual_checklist c
    LEFT JOIN financial_entities e ON c.entity_id = e.id
    WHERE c.year = ?
    ORDER BY c.required_date
  `).all(year);
  res.json(checklist);
});

// Get pending tasks
router.get('/pending', (req, res) => {
  const db = getDatabase();
  const year = new Date().getFullYear();
  const pending = db.prepare(`
    SELECT c.*, e.name as entity_name FROM annual_checklist c
    LEFT JOIN financial_entities e ON c.entity_id = e.id
    WHERE c.year = ? AND c.status IN ('pending', 'in_progress')
    ORDER BY c.required_date
  `).all(year);
  res.json(pending);
});

// Create checklist task
router.post('/', (req, res) => {
  const db = getDatabase();
  const { year, entity_id, task_name, task_category, required_date, status, notes, assignee } = req.body;

  if (!year || !task_name) {
    return res.status(400).json({ error: 'year and task_name are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO annual_checklist
      (year, entity_id, task_name, task_category, required_date, status, notes, assignee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(year, entity_id, task_name, task_category, required_date, status || 'pending', notes, assignee);
    const newTask = db.prepare('SELECT * FROM annual_checklist WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update checklist task
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { task_name, task_category, required_date, completed_date, status, notes, assignee } = req.body;

  try {
    const stmt = db.prepare(`
      UPDATE annual_checklist
      SET task_name = ?, task_category = ?, required_date = ?, completed_date = ?, status = ?, notes = ?, assignee = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(task_name, task_category, required_date, completed_date, status, notes, assignee, req.params.id);
    const updated = db.prepare('SELECT * FROM annual_checklist WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete checklist task
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  try {
    db.prepare('DELETE FROM annual_checklist WHERE id = ?').run(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
