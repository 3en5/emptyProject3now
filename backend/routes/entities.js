import express from 'express';
import { getDatabase } from '../db/init.js';

const router = express.Router();

// Get all entities
router.get('/', (req, res) => {
  const db = getDatabase();
  db.all('SELECT * FROM financial_entities ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// Get single entity with related data
router.get('/:id', (req, res) => {
  const db = getDatabase();
  db.get('SELECT * FROM financial_entities WHERE id = ?', [req.params.id], (err, entity) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    db.all('SELECT * FROM accounts WHERE entity_id = ?', [entity.id], (err, accounts) => {
      if (err) accounts = [];
      db.all('SELECT * FROM documents WHERE entity_id = ?', [entity.id], (err, documents) => {
        if (err) documents = [];
        res.json({ ...entity, accounts: accounts || [], documents: documents || [] });
      });
    });
  });
});

// Create new entity
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name, type, category, website_url, login_url, account_number, contact_info, status, notes } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }

  db.run(
    `INSERT INTO financial_entities
     (name, type, category, website_url, login_url, account_number, contact_info, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, type, category, website_url, login_url, account_number, contact_info, status || 'active', notes],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM financial_entities WHERE id = ?', [this.lastID], (err, newEntity) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(newEntity);
      });
    }
  );
});

// Update entity
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { name, type, category, website_url, login_url, account_number, contact_info, status, notes } = req.body;

  db.run(
    `UPDATE financial_entities
     SET name = ?, type = ?, category = ?, website_url = ?, login_url = ?, account_number = ?, contact_info = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, type, category, website_url, login_url, account_number, contact_info, status, notes, req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM financial_entities WHERE id = ?', [req.params.id], (err, updated) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(updated);
      });
    }
  );
});

// Delete entity
router.delete('/:id', (req, res) => {
  const db = getDatabase();

  db.run('DELETE FROM documents WHERE entity_id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    db.run('DELETE FROM accounts WHERE entity_id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.run('DELETE FROM annual_checklist WHERE entity_id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        db.run('DELETE FROM financial_entities WHERE id = ?', [req.params.id], (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ message: 'Entity deleted successfully' });
        });
      });
    });
  });
});

export default router;
