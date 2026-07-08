import express from 'express';
import { getDatabase } from '../db/init.js';

const router = express.Router();

// Get all documents
router.get('/', (req, res) => {
  const db = getDatabase();
  db.all(`
    SELECT d.*, e.name as entity_name FROM documents d
    JOIN financial_entities e ON d.entity_id = e.id
    ORDER BY d.required_by_date
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// Get documents by status
router.get('/status/:status', (req, res) => {
  const db = getDatabase();
  db.all(`
    SELECT d.*, e.name as entity_name FROM documents d
    JOIN financial_entities e ON d.entity_id = e.id
    WHERE d.status = ?
    ORDER BY d.required_by_date
  `, [req.params.status], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// Get pending documents (important for dashboard)
router.get('/pending', (req, res) => {
  const db = getDatabase();
  db.all(`
    SELECT d.*, e.name as entity_name FROM documents d
    JOIN financial_entities e ON d.entity_id = e.id
    WHERE d.status IN ('pending', 'overdue')
    ORDER BY d.required_by_date
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// Get documents for entity
router.get('/entity/:entity_id', (req, res) => {
  const db = getDatabase();
  db.all('SELECT * FROM documents WHERE entity_id = ? ORDER BY required_by_date', [req.params.entity_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// Create document
router.post('/', (req, res) => {
  const db = getDatabase();
  const { entity_id, document_name, document_type, required_frequency, required_by_date, notes } = req.body;

  if (!entity_id || !document_name) {
    return res.status(400).json({ error: 'entity_id and document_name are required' });
  }

  db.run(
    `INSERT INTO documents
     (entity_id, document_name, document_type, required_frequency, required_by_date, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entity_id, document_name, document_type, required_frequency, required_by_date, notes],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM documents WHERE id = ?', [this.lastID], (err, newDoc) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(newDoc);
      });
    }
  );
});

// Update document
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { document_name, document_type, required_frequency, required_by_date, status, date_filed, notes } = req.body;

  db.run(
    `UPDATE documents
     SET document_name = ?, document_type = ?, required_frequency = ?, required_by_date = ?, status = ?, date_filed = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [document_name, document_type, required_frequency, required_by_date, status, date_filed, notes, req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM documents WHERE id = ?', [req.params.id], (err, updated) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(updated);
      });
    }
  );
});

// Delete document
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  db.run('DELETE FROM documents WHERE id = ?', [req.params.id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Document deleted successfully' });
  });
});

export default router;
