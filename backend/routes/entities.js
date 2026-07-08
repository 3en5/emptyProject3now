import express from 'express';
import { runQuery, getOne, getAll } from '../db/helper.js';

const router = express.Router();

// Get all entities
router.get('/', (req, res) => {
  const entities = getAll('SELECT * FROM financial_entities ORDER BY created_at DESC');
  res.json(entities);
});

// Get single entity with related data
router.get('/:id', (req, res) => {
  const entity = getOne('SELECT * FROM financial_entities WHERE id = ?', [parseInt(req.params.id)]);

  if (!entity) {
    return res.status(404).json({ error: 'Entity not found' });
  }

  const accounts = getAll('SELECT * FROM accounts WHERE entity_id = ?', [entity.id]);
  const documents = getAll('SELECT * FROM documents WHERE entity_id = ?', [entity.id]);

  res.json({ ...entity, accounts, documents });
});

// Create new entity
router.post('/', (req, res) => {
  try {
    const { name, type, category, website_url, login_url, account_number, contact_info, status, notes } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }

    const result = runQuery(
      `INSERT INTO financial_entities
       (name, type, category, website_url, login_url, account_number, contact_info, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, type, category, website_url, login_url, account_number, contact_info, status || 'active', notes]
    );

    if (!result.success) {
      console.error('Insert failed:', result.error);
      return res.status(500).json({ error: result.error });
    }

    const newEntity = getOne('SELECT * FROM financial_entities ORDER BY id DESC LIMIT 1');
    res.status(201).json(newEntity || { message: 'Created but could not retrieve' });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update entity
router.put('/:id', (req, res) => {
  const { name, type, category, website_url, login_url, account_number, contact_info, status, notes } = req.body;

  const result = runQuery(
    `UPDATE financial_entities
     SET name = ?, type = ?, category = ?, website_url = ?, login_url = ?, account_number = ?, contact_info = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, type, category, website_url, login_url, account_number, contact_info, status, notes, parseInt(req.params.id)]
  );

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  const updated = getOne('SELECT * FROM financial_entities WHERE id = ?', [parseInt(req.params.id)]);
  res.json(updated);
});

// Delete entity
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);

  // Delete related records
  runQuery('DELETE FROM documents WHERE entity_id = ?', [id]);
  runQuery('DELETE FROM accounts WHERE entity_id = ?', [id]);
  runQuery('DELETE FROM annual_checklist WHERE entity_id = ?', [id]);
  runQuery('DELETE FROM financial_entities WHERE id = ?', [id]);

  res.json({ message: 'Entity deleted successfully' });
});

export default router;
