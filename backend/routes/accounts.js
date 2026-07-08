import express from 'express';
import { getDatabase } from '../db/init.js';

const router = express.Router();

// Get all accounts
router.get('/', (req, res) => {
  const db = getDatabase();
  db.all(`
    SELECT a.*, e.name as entity_name FROM accounts a
    JOIN financial_entities e ON a.entity_id = e.id
    ORDER BY a.created_at DESC
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// Get accounts for entity
router.get('/entity/:entity_id', (req, res) => {
  const db = getDatabase();
  db.all('SELECT * FROM accounts WHERE entity_id = ? ORDER BY account_name', [req.params.entity_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

// Create account
router.post('/', (req, res) => {
  const db = getDatabase();
  const { entity_id, account_name, account_type, balance, currency, account_number } = req.body;

  if (!entity_id || !account_name) {
    return res.status(400).json({ error: 'entity_id and account_name are required' });
  }

  db.run(
    `INSERT INTO accounts
     (entity_id, account_name, account_type, balance, currency, account_number)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entity_id, account_name, account_type, balance, currency || 'ILS', account_number],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM accounts WHERE id = ?', [this.lastID], (err, newAccount) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(newAccount);
      });
    }
  );
});

// Update account
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { account_name, account_type, balance, currency, account_number } = req.body;

  db.run(
    `UPDATE accounts
     SET account_name = ?, account_type = ?, balance = ?, currency = ?, account_number = ?, last_updated = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [account_name, account_type, balance, currency, account_number, req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM accounts WHERE id = ?', [req.params.id], (err, updated) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(updated);
      });
    }
  );
});

// Delete account
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  db.run('DELETE FROM accounts WHERE id = ?', [req.params.id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Account deleted successfully' });
  });
});

export default router;
