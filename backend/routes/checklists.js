import express from 'express';
import { getDatabase } from '../db/init.js';

const router = express.Router();

// Get checklist for year
router.get('/year/:year', (req, res) => {
  const db = getDatabase();
  db.all(`
    SELECT c.*, e.name as entity_name FROM annual_checklist c
    LEFT JOIN financial_entities e ON c.entity_id = e.id
    WHERE c.year = ?
    ORDER BY c.task_category, c.required_date
  `, [req.params.year], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// Get current year checklist
router.get('/current', (req, res) => {
  const db = getDatabase();
  const year = new Date().getFullYear();
  db.all(`
    SELECT c.*, e.name as entity_name FROM annual_checklist c
    LEFT JOIN financial_entities e ON c.entity_id = e.id
    WHERE c.year = ?
    ORDER BY c.required_date
  `, [year], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// Get pending tasks
router.get('/pending', (req, res) => {
  const db = getDatabase();
  const year = new Date().getFullYear();
  db.all(`
    SELECT c.*, e.name as entity_name FROM annual_checklist c
    LEFT JOIN financial_entities e ON c.entity_id = e.id
    WHERE c.year = ? AND c.status IN ('pending', 'in_progress')
    ORDER BY c.required_date
  `, [year], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// Create checklist task
router.post('/', (req, res) => {
  const db = getDatabase();
  const { year, entity_id, task_name, task_category, required_date, status, notes, assignee } = req.body;

  if (!year || !task_name) {
    return res.status(400).json({ error: 'year and task_name are required' });
  }

  db.run(
    `INSERT INTO annual_checklist
     (year, entity_id, task_name, task_category, required_date, status, notes, assignee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [year, entity_id, task_name, task_category, required_date, status || 'pending', notes, assignee],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM annual_checklist WHERE id = ?', [this.lastID], (err, newTask) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(newTask);
      });
    }
  );
});

// Update checklist task
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { task_name, task_category, required_date, completed_date, status, notes, assignee } = req.body;

  db.run(
    `UPDATE annual_checklist
     SET task_name = ?, task_category = ?, required_date = ?, completed_date = ?, status = ?, notes = ?, assignee = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [task_name, task_category, required_date, completed_date, status, notes, assignee, req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM annual_checklist WHERE id = ?', [req.params.id], (err, updated) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(updated);
      });
    }
  );
});

// Delete checklist task
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  db.run('DELETE FROM annual_checklist WHERE id = ?', [req.params.id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Task deleted successfully' });
  });
});

export default router;
