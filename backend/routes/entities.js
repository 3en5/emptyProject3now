import express from 'express';
import { getDatabase } from '../db/init.js';

const router = express.Router();

// Get all entities
router.get('/', (req, res) => {
  const db = getDatabase();
  const entities = db.prepare('SELECT * FROM financial_entities ORDER BY created_at DESC').all();
  res.json(entities);
});

// Get single entity with related data
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const entity = db.prepare('SELECT * FROM financial_entities WHERE id = ?').get(req.params.id);

  if (!entity) {
    return res.status(404).json({ error: 'Entity not found' });
  }

  const accounts = db.prepare('SELECT * FROM accounts WHERE entity_id = ?').all(entity.id);
  const documents = db.prepare('SELECT * FROM documents WHERE entity_id = ?').all(entity.id);

  res.json({ ...entity, accounts, documents });
});

// Get entities by type
router.get('/type/:type', (req, res) => {
  const db = getDatabase();
  const entities = db.prepare('SELECT * FROM financial_entities WHERE type = ? ORDER BY name').all(req.params.type);
  res.json(entities);
});

// Get entities by category
router.get('/category/:category', (req, res) => {
  const db = getDatabase();
  const entities = db.prepare('SELECT * FROM financial_entities WHERE category = ? ORDER BY name').all(req.params.category);
  res.json(entities);
});

// Create new entity
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name, type, category, website_url, login_url, account_number, contact_info, status, notes } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO financial_entities
      (name, type, category, website_url, login_url, account_number, contact_info, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(name, type, category, website_url, login_url, account_number, contact_info, status || 'active', notes);

    const newEntity = db.prepare('SELECT * FROM financial_entities WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newEntity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update entity
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { name, type, category, website_url, login_url, account_number, contact_info, status, notes } = req.body;

  try {
    const stmt = db.prepare(`
      UPDATE financial_entities
      SET name = ?, type = ?, category = ?, website_url = ?, login_url = ?, account_number = ?, contact_info = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(name, type, category, website_url, login_url, account_number, contact_info, status, notes, req.params.id);

    const updated = db.prepare('SELECT * FROM financial_entities WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete entity
router.delete('/:id', (req, res) => {
  const db = getDatabase();

  try {
    // Delete related records
    db.prepare('DELETE FROM documents WHERE entity_id = ?').run(req.params.id);
    db.prepare('DELETE FROM accounts WHERE entity_id = ?').run(req.params.id);
    db.prepare('DELETE FROM annual_checklist WHERE entity_id = ?').run(req.params.id);

    // Delete entity
    db.prepare('DELETE FROM financial_entities WHERE id = ?').run(req.params.id);

    res.json({ message: 'Entity deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
