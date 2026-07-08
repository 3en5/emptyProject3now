import express from 'express';
import { getAll } from '../db/helper.js';

const router = express.Router();

const yearOf = (dateStr) => (dateStr ? parseInt(String(dateStr).slice(0, 4)) : null);

// גוף פעיל בשנה y? (לפי active_from/active_until)
function activeIn(entity, y) {
  const from = yearOf(entity.active_from);
  const until = yearOf(entity.active_until);
  if (from && from > y) return false;
  if (until && until < y) return false;
  return true;
}

// GET /api/comparison/:year — משווה את :year לשנה הקודמת.
// מחזיר: missing (היה אשתקד וחסר השנה), received (חוזר), added (חדש), endedEntities (הסתיימו).
router.get('/:year', (req, res) => {
  const year = parseInt(req.params.year);
  if (!year) return res.status(400).json({ error: 'year לא תקין' });
  const prevYear = year - 1;

  const entities = getAll('SELECT id, name, type, active_from, active_until FROM financial_entities');
  const entityById = {};
  entities.forEach((e) => { entityById[e.id] = e; });

  const prevDocs = getAll('SELECT * FROM documents WHERE year = ?', [prevYear]);
  const currDocs = getAll('SELECT * FROM documents WHERE year = ?', [year]);

  const key = (d) => `${d.entity_id}|${d.document_name}`;
  const currKeys = new Set(currDocs.map(key));
  const prevKeys = new Set(prevDocs.map(key));

  // מה שהיה אשתקד — האם התקבל השנה? (רק לגופים שעדיין פעילים השנה)
  const missing = [];
  for (const d of prevDocs) {
    const e = entityById[d.entity_id];
    if (e && !activeIn(e, year)) continue; // הגוף הסתיים → לא מצופה
    if (!currKeys.has(key(d))) {
      missing.push({ entity_id: d.entity_id, entity_name: e?.name || '', document_name: d.document_name });
    }
  }

  // מסמכי השנה — חוזרים (היו אשתקד) או חדשים
  const received = [];
  const added = [];
  for (const d of currDocs) {
    const item = { ...d, entity_name: entityById[d.entity_id]?.name || '' };
    if (prevKeys.has(key(d))) received.push(item);
    else added.push(item);
  }

  // גופים שהסתיימו והיו להם מסמכים אשתקד
  const endedEntities = entities
    .filter((e) => {
      const until = yearOf(e.active_until);
      return until && until < year && prevDocs.some((d) => d.entity_id === e.id);
    })
    .map((e) => ({ id: e.id, name: e.name, active_until: e.active_until }));

  res.json({
    year,
    prevYear,
    missing,
    received,
    added,
    endedEntities,
    summary: {
      missing: missing.length,
      received: received.length,
      added: added.length,
      ended: endedEntities.length,
    },
  });
});

export default router;
