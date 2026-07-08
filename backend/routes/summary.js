import express from 'express';
import { getAll, getOne } from '../db/helper.js';

const router = express.Router();

// דוח סיכום — אגרגציה של נכסים/התחייבויות לפי מטבע + ספירות כלליות.
// נכסים = חשבונות של גופים שאינם 'loan'. התחייבויות = חשבונות של גופי 'loan'.
router.get('/', (req, res) => {
  const rows = getAll(`
    SELECT a.balance, a.currency, e.type
    FROM accounts a
    JOIN financial_entities e ON a.entity_id = e.id
  `);

  const byCurrency = {};
  for (const r of rows) {
    const cur = r.currency || 'ILS';
    if (!byCurrency[cur]) {
      byCurrency[cur] = { currency: cur, assets: 0, liabilities: 0, net: 0, accountCount: 0 };
    }
    const bal = Number(r.balance) || 0;
    if (r.type === 'loan') byCurrency[cur].liabilities += bal;
    else byCurrency[cur].assets += bal;
    byCurrency[cur].accountCount++;
  }
  for (const c of Object.values(byCurrency)) {
    c.net = c.assets - c.liabilities;
  }

  // התפלגות נכסים לפי סוג גוף (למטבע) — לא כולל התחייבויות
  const assetsByType = getAll(`
    SELECT e.type, a.currency, SUM(a.balance) AS total, COUNT(*) AS cnt
    FROM accounts a
    JOIN financial_entities e ON a.entity_id = e.id
    WHERE e.type != 'loan'
    GROUP BY e.type, a.currency
  `);

  const counts = {
    entities: getOne('SELECT COUNT(*) AS c FROM financial_entities')?.c ?? 0,
    accounts: getOne('SELECT COUNT(*) AS c FROM accounts')?.c ?? 0,
    documents: getOne('SELECT COUNT(*) AS c FROM documents')?.c ?? 0,
    tasks: getOne('SELECT COUNT(*) AS c FROM annual_checklist')?.c ?? 0,
  };

  res.json({
    currencies: Object.values(byCurrency),
    assetsByType,
    counts,
  });
});

export default router;
