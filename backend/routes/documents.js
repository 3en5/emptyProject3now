import express from 'express';
import { getDatabase } from '../db/init.js';

const router = express.Router();

// Get all documents
router.get('/', (req, res) => {
  const db = getDatabase();
  const documents = db.prepare(`
    SELECT d.*, e.name as entity_name FROM documents d
    JOIN financial_entities e ON d.entity_id = e.id
    ORDER BY d.required_by_date
  `).all();
  res.json(documents);
});

// Get documents by status
router.get('/status/:status', (req, res) => {
  const db = getDatabase();
  const documents = db.prepare(`
    SELECT d.*, e.name as entity_name FROM documents d
    JOIN financial_entities e ON d.entity_id = e.id
    WHERE d.status = ?
    ORDER BY d.required_by_date
  `).all(req.params.status);
  res.json(documents);
});

// Get pending documents (important for dashboard)
router.get('/status/pending', (req, res) => {
  const db = getDatabase();
  const pending = db.prepare(`
    SELECT d.*, e.name as entity_name FROM documents d
    JOIN financial_entities e ON d.entity_id = e.id
    WHERE d.status IN ('pending', 'overdue')
    ORDER BY d.required_by_date
  `).all();
  res.json(pending);
});

// Get documents for entity
router.get('/entity/:entity_id', (req, res) => {
  const db = getDatabase();
  const documents = db.prepare('SELECT * FROM documents WHERE entity_id = ? ORDER BY required_by_date').all(req.params.entity_id);
  res.json(documents);
});

// Create document
router.post('/', (req, res) => {
  const db = getDatabase();
  const { entity_id, document_name, document_type, required_frequency, required_by_date, notes } = req.body;

  if (!entity_id || !document_name) {
    return res.status(400).json({ error: 'entity_id and document_name are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO documents
      (entity_id, document_name, document_type, required_frequency, required_by_date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(entity_id, document_name, document_type, required_frequency, required_by_date, notes);
    const newDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newDoc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update document
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { document_name, document_type, required_frequency, required_by_date, status, date_filed, notes } = req.body;

  try {
    const stmt = db.prepare(`
      UPDATE documents
      SET document_name = ?, document_type = ?, required_frequency = ?, required_by_date = ?, status = ?, date_filed = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(document_name, document_type, required_frequency, required_by_date, status, date_filed, notes, req.params.id);
    const updated = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete document
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  try {
    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
