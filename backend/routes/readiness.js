import express from 'express';
import { getAll, runQuery } from '../db/helper.js';
import { logActivity } from '../activity.js';

const router = express.Router();

const yearOf = (dateStr) => (dateStr ? parseInt(String(dateStr).slice(0, 4)) : null);

// גוף פעיל בשנה y? (לפי active_from/active_until) — זהה ללוגיקה ב-comparison.js
function activeIn(entity, y) {
  const from = yearOf(entity.active_from);
  const until = yearOf(entity.active_until);
  if (from && from > y) return false;
  if (until && until < y) return false;
  return true;
}

// GET /api/readiness/:year — "מוכנות לרו״ח": מסמכים מצופים/שהתקבלו, מקובצים לפי גוף
router.get('/:year', (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (!year) return res.status(400).json({ error: 'year לא תקין' });

    const entities = getAll('SELECT id, name, type, category, active_from, active_until FROM financial_entities');
    const docs = getAll('SELECT * FROM documents WHERE year = ?', [year]);

    const docsByEntity = {};
    for (const d of docs) {
      if (!docsByEntity[d.entity_id]) docsByEntity[d.entity_id] = [];
      docsByEntity[d.entity_id].push(d);
    }

    const groups = [];
    for (const e of entities) {
      const entityDocs = docsByEntity[e.id] || [];
      if (entityDocs.length === 0 && !activeIn(e, year)) continue; // לא רלוונטי לשנה זו

      const items = entityDocs
        .map((d) => ({
          id: d.id,
          document_name: d.document_name,
          document_type: d.document_type,
          has_file: !!(d.file_path && d.file_path !== ''),
          file_path: d.file_path,
          status: d.status,
          doc_date: d.doc_date,
          required_by_date: d.required_by_date,
        }))
        .sort((a, b) => Number(a.has_file) - Number(b.has_file)); // מסמכים חסרים קודם

      const have = items.filter((i) => i.has_file).length;
      const total = items.length;

      groups.push({
        entity: { id: e.id, name: e.name, type: e.type, active_until: e.active_until },
        items,
        have,
        total,
      });
    }

    // גופים עם פריטים חסרים קודם (הכי הרבה חסרים ראשון), גופים מלאים אחרונים
    groups.sort((a, b) => (b.total - b.have) - (a.total - a.have));

    const summary = groups.reduce(
      (acc, g) => {
        acc.have += g.have;
        acc.total += g.total;
        return acc;
      },
      { have: 0, total: 0 }
    );
    summary.missing = summary.total - summary.have;
    summary.entities = groups.length;

    res.json({ year, summary, groups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/readiness/:year/carry-forward — בונה רשימת מסמכים מצופים לשנה מהשנה הקודמת
router.post('/:year/carry-forward', (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (!year) return res.status(400).json({ error: 'year לא תקין' });
    const prevYear = year - 1;

    const entities = getAll('SELECT id, name, active_from, active_until FROM financial_entities');
    const entityById = {};
    entities.forEach((e) => { entityById[e.id] = e; });

    const prevDocs = getAll('SELECT * FROM documents WHERE year = ?', [prevYear]);
    const currDocs = getAll('SELECT * FROM documents WHERE year = ?', [year]);
    const currKeys = new Set(currDocs.map((d) => `${d.entity_id}|${d.document_name}`));

    let created = 0;
    for (const d of prevDocs) {
      const e = entityById[d.entity_id];
      if (!e || !activeIn(e, year)) continue; // הגוף לא פעיל בשנה החדשה
      const key = `${d.entity_id}|${d.document_name}`;
      if (currKeys.has(key)) continue; // כבר קיים סלוט לשנה החדשה
      currKeys.add(key); // מונע כפילות בתוך אותה ריצה

      const result = runQuery(
        `INSERT INTO documents (entity_id, document_name, document_type, year, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [d.entity_id, d.document_name, d.document_type, year]
      );
      if (result.success) {
        created += 1;
        logActivity('create', 'document', result.lastID, `נוצר סלוט לשנה ${year} עבור "${d.document_name}" (המשך משנה קודמת)`);
      }
    }

    res.json({ created });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
