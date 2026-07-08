import express from 'express';
import { runQuery, getOne, getAll } from '../db/helper.js';
import { logActivity } from '../activity.js';

const router = express.Router();

// Get all accounts
router.get('/', (req, res) => {
  const accounts = getAll(`
    SELECT a.*, e.name as entity_name FROM accounts a
    JOIN financial_entities e ON a.entity_id = e.id
    ORDER BY a.created_at DESC
  `);
  res.json(accounts);
});

// Get accounts for entity
router.get('/entity/:entity_id', (req, res) => {
  const accounts = getAll('SELECT * FROM accounts WHERE entity_id = ? ORDER BY account_name', [parseInt(req.params.entity_id)]);
  res.json(accounts);
});

// Create account
router.post('/', (req, res) => {
  const { entity_id, account_name, account_type, balance, currency, account_number } = req.body;

  if (!entity_id || !account_name) {
    return res.status(400).json({ error: 'entity_id and account_name are required' });
  }

  const result = runQuery(
    `INSERT INTO accounts
     (entity_id, account_name, account_type, balance, currency, account_number)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entity_id, account_name, account_type, balance, currency || 'ILS', account_number]
  );

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  const newAccount = getOne('SELECT * FROM accounts ORDER BY id DESC LIMIT 1');
  if (newAccount) logActivity('create', 'account', newAccount.id, `נוסף חשבון "${newAccount.account_name}"`);
  res.status(201).json(newAccount);
});

// Update account
router.put('/:id', (req, res) => {
  const { account_name, account_type, balance, currency, account_number } = req.body;

  const result = runQuery(
    `UPDATE accounts
     SET account_name = ?, account_type = ?, balance = ?, currency = ?, account_number = ?, last_updated = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [account_name, account_type, balance, currency, account_number, parseInt(req.params.id)]
  );

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  const updated = getOne('SELECT * FROM accounts WHERE id = ?', [parseInt(req.params.id)]);
  if (updated) logActivity('update', 'account', updated.id, `עודכן חשבון "${updated.account_name}"`);
  res.json(updated);
});

// Delete account
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = getOne('SELECT account_name FROM accounts WHERE id = ?', [id]);
  runQuery('DELETE FROM accounts WHERE id = ?', [id]);
  if (existing) logActivity('delete', 'account', id, `נמחק חשבון "${existing.account_name}"`);
  res.json({ message: 'Account deleted successfully' });
});

export default router;
