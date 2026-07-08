import express from 'express';
import fs from 'fs';
import path from 'path';
import { runQuery, getOne, getAll } from '../db/helper.js';
import { upload, UPLOAD_DIR } from '../upload.js';

const router = express.Router();

// Get all documents
router.get('/', (req, res) => {
  const documents = getAll(`
    SELECT d.*, e.name as entity_name FROM documents d
    JOIN financial_entities e ON d.entity_id = e.id
    ORDER BY d.required_by_date
  `);
  res.json(documents);
});

// Get documents by status
router.get('/status/:status', (req, res) => {
  const documents = getAll(`
    SELECT d.*, e.name as entity_name FROM documents d
    JOIN financial_entities e ON d.entity_id = e.id
    WHERE d.status = ?
    ORDER BY d.required_by_date
  `, [req.params.status]);
  res.json(documents);
});

// Get pending documents (important for dashboard)
router.get('/pending', (req, res) => {
  const pending = getAll(`
    SELECT d.*, e.name as entity_name FROM documents d
    JOIN financial_entities e ON d.entity_id = e.id
    WHERE d.status IN ('pending', 'overdue')
    ORDER BY d.required_by_date
  `);
  res.json(pending);
});

// Get documents for entity
router.get('/entity/:entity_id', (req, res) => {
  const documents = getAll('SELECT * FROM documents WHERE entity_id = ? ORDER BY required_by_date', [parseInt(req.params.entity_id)]);
  res.json(documents);
});

// Create document
router.post('/', (req, res) => {
  const { entity_id, document_name, document_type, required_frequency, required_by_date, notes } = req.body;
  let { year } = req.body;

  if (!entity_id || !document_name) {
    return res.status(400).json({ error: 'entity_id and document_name are required' });
  }

  // ברירת מחדל ל-year: מתוך תאריך ההגשה, אחרת השנה הנוכחית
  if (!year) {
    year = required_by_date ? parseInt(String(required_by_date).slice(0, 4)) : new Date().getFullYear();
  }

  const result = runQuery(
    `INSERT INTO documents
     (entity_id, document_name, document_type, required_frequency, year, required_by_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entity_id, document_name, document_type, required_frequency, year, required_by_date, notes]
  );

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  const newDoc = getOne('SELECT * FROM documents ORDER BY id DESC LIMIT 1');
  res.status(201).json(newDoc);
});

// Update document
router.put('/:id', (req, res) => {
  const { document_name, document_type, required_frequency, year, required_by_date, status, date_filed, notes } = req.body;

  const result = runQuery(
    `UPDATE documents
     SET document_name = ?, document_type = ?, required_frequency = ?, year = ?, required_by_date = ?, status = ?, date_filed = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [document_name, document_type, required_frequency, year, required_by_date, status, date_filed, notes, parseInt(req.params.id)]
  );

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  const updated = getOne('SELECT * FROM documents WHERE id = ?', [parseInt(req.params.id)]);
  res.json(updated);
});

// Upload a file (PDF/image) and attach it to a document
router.post('/:id/upload', (req, res) => {
  const id = parseInt(req.params.id);
  const doc = getOne('SELECT * FROM documents WHERE id = ?', [id]);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'לא נשלח קובץ' });
    }

    // מחיקת הקובץ הישן אם קיים
    if (doc.file_path) {
      const old = path.join(UPLOAD_DIR, path.basename(doc.file_path));
      if (fs.existsSync(old)) {
        try { fs.unlinkSync(old); } catch { /* ignore */ }
      }
    }

    const result = runQuery('UPDATE documents SET file_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.file.filename, id]);
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    const updated = getOne('SELECT * FROM documents WHERE id = ?', [id]);
    res.json(updated);
  });
});

// Serve/download the attached file
router.get('/:id/file', (req, res) => {
  const doc = getOne('SELECT * FROM documents WHERE id = ?', [parseInt(req.params.id)]);
  if (!doc || !doc.file_path) {
    return res.status(404).json({ error: 'אין קובץ מצורף' });
  }
  const filePath = path.join(UPLOAD_DIR, path.basename(doc.file_path));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'הקובץ לא נמצא בשרת' });
  }
  res.sendFile(filePath);
});

// Delete document (+ its file if any)
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const doc = getOne('SELECT * FROM documents WHERE id = ?', [id]);
  if (doc && doc.file_path) {
    const f = path.join(UPLOAD_DIR, path.basename(doc.file_path));
    if (fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
  }
  runQuery('DELETE FROM documents WHERE id = ?', [id]);
  res.json({ message: 'Document deleted successfully' });
});

export default router;
