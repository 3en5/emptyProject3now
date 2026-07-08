import express from 'express';
import { getDatabase } from '../db/init.js';

const router = express.Router();

// Get all accounts
router.get('/', (req, res) => {
  const db = getDatabase();
  const accounts = db.prepare(`
    SELECT a.*, e.name as entity_name FROM accounts a
    JOIN financial_entities e ON a.entity_id = e.id
    ORDER BY a.created_at DESC
  `).all();
  res.json(accounts);
});

// Get accounts for entity
router.get('/entity/:entity_id', (req, res) => {
  const db = getDatabase();
  const accounts = db.prepare('SELECT * FROM accounts WHERE entity_id = ? ORDER BY account_name').all(req.params.entity_id);
  res.json(accounts);
});

// Create account
router.post('/', (req, res) => {
  const db = getDatabase();
  const { entity_id, account_name, account_type, balance, currency, account_number } = req.body;

  if (!entity_id || !account_name) {
    return res.status(400).json({ error: 'entity_id and account_name are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO accounts
      (entity_id, account_name, account_type, balance, currency, account_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(entity_id, account_name, account_type, balance, currency || 'ILS', account_number);
    const newAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newAccount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update account
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { account_name, account_type, balance, currency, account_number } = req.body;

  try {
    const stmt = db.prepare(`
      UPDATE accounts
      SET account_name = ?, account_type = ?, balance = ?, currency = ?, account_number = ?, last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(account_name, account_type, balance, currency, account_number, req.params.id);
    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete account
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  try {
    db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
