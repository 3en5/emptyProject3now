import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { runQuery, getOne, getAll } from '../db/helper.js';
import { upload, UPLOAD_DIR } from '../upload.js';
import { understandDocument } from '../understand.js';
import { gptAvailable } from '../gpt.js';
import { decideFiling, HOLDING_ENTITY_NAME } from '../intake.js';
import { logActivity } from '../activity.js';

const router = express.Router();

// SHA-256 של קובץ — לזיהוי העלאות כפולות
function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

// עמודת amounts נשמרת כ-JSON string ב-DB; הופכים אותה למערך לפני שליחה ל-frontend.
function withParsedAmounts(doc) {
  if (!doc) return doc;
  let amounts = [];
  if (doc.amounts) {
    try { amounts = JSON.parse(doc.amounts); } catch { amounts = []; }
  }
  return { ...doc, amounts };
}
const withParsedAmountsList = (docs) => docs.map(withParsedAmounts);

// Get all documents
router.get('/', (req, res) => {
  const documents = getAll(`
    SELECT d.*, e.name as entity_name FROM documents d
    JOIN financial_entities e ON d.entity_id = e.id
    ORDER BY d.required_by_date
  `);
  res.json(withParsedAmountsList(documents));
});

// Get documents by status
router.get('/status/:status', (req, res) => {
  const documents = getAll(`
    SELECT d.*, e.name as entity_name FROM documents d
    JOIN financial_entities e ON d.entity_id = e.id
    WHERE d.status = ?
    ORDER BY d.required_by_date
  `, [req.params.status]);
  res.json(withParsedAmountsList(documents));
});

// Get pending documents (important for dashboard)
router.get('/pending', (req, res) => {
  const pending = getAll(`
    SELECT d.*, e.name as entity_name FROM documents d
    JOIN financial_entities e ON d.entity_id = e.id
    WHERE d.status IN ('pending', 'overdue')
    ORDER BY d.required_by_date
  `);
  res.json(withParsedAmountsList(pending));
});

// Get documents for entity
router.get('/entity/:entity_id', (req, res) => {
  const documents = getAll('SELECT * FROM documents WHERE entity_id = ? ORDER BY required_by_date', [parseInt(req.params.entity_id)]);
  res.json(withParsedAmountsList(documents));
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
  if (newDoc) logActivity('create', 'document', newDoc.id, `נוסף מסמך "${newDoc.document_name}"`);
  res.status(201).json(withParsedAmounts(newDoc));
});

// Update document
router.put('/:id', (req, res) => {
  const { document_name, document_type, required_frequency, year, required_by_date, status, date_filed, notes, entity_id, auto_filed, doc_date, summary, amounts } = req.body;
  // amounts מגיע מה-frontend כמערך — נשמר ב-DB כ-JSON string. undefined → לא לדרוס (COALESCE).
  const amountsJson = amounts !== undefined ? JSON.stringify(amounts) : undefined;

  const result = runQuery(
    `UPDATE documents
     SET document_name = ?, document_type = ?, required_frequency = ?, year = ?, required_by_date = ?, status = ?, date_filed = ?, notes = ?,
         entity_id = COALESCE(?, entity_id), auto_filed = COALESCE(?, auto_filed),
         doc_date = COALESCE(?, doc_date), summary = COALESCE(?, summary), amounts = COALESCE(?, amounts),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [document_name, document_type, required_frequency, year, required_by_date, status, date_filed, notes, entity_id, auto_filed, doc_date, summary, amountsJson, parseInt(req.params.id)]
  );

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  const updated = getOne(`
    SELECT d.*, e.name as entity_name FROM documents d
    JOIN financial_entities e ON d.entity_id = e.id
    WHERE d.id = ?`, [parseInt(req.params.id)]);
  if (updated) {
    const STATUS_HE = { submitted: 'הוגש', verified: 'אומת', pending: 'ממתין', overdue: 'בעיכוב' };
    const label = STATUS_HE[updated.status] ? `סטטוס "${updated.document_name}" → ${STATUS_HE[updated.status]}` : `עודכן מסמך "${updated.document_name}"`;
    logActivity('update', 'document', updated.id, label);
  }
  res.json(withParsedAmounts(updated));
});

// ─── קליטה חכמה: מעלים קובץ בלי לבחור יעד — המערכת מזהה, מתייקת ומחזירה לפיקוח ───
// הזרימה: חילוץ טקסט → סיווג (גוף/סוג/שנה/מועד) → decideFiling:
//   matched  → הקובץ מצורף לסלוט הממתין המתאים
//   create   → נוצר מסמך חדש תחת הגוף שזוהה
//   unmatched→ נוצר מסמך תחת גוף האחזקה "ממתין לשיוך" (המשתמש משייך במסך הפיקוח)
// כל מסמך שתויק אוטומטית מסומן auto_filed=1 עד שהמשתמש מאשר/מתקן.
router.post('/intake', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'לא נשלח קובץ' });

    try {
      const filePath = path.join(UPLOAD_DIR, req.file.filename);

      // זיהוי כפילות: אותו תוכן קובץ שכבר קיים במערכת → לא מעלים פעמיים
      const hash = sha256(filePath);
      const dup = getOne(`
        SELECT d.*, e.name as entity_name FROM documents d
        JOIN financial_entities e ON d.entity_id = e.id
        WHERE d.file_hash = ? LIMIT 1`, [hash]);
      if (dup) {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ } // הקובץ הכפול נמחק
        return res.status(200).json({
          action: 'duplicate',
          existing: withParsedAmounts(dup),
          note: `הקובץ כבר קיים במערכת כ"${dup.document_name}" (${dup.entity_name})`,
        });
      }

      const entitiesList = getAll('SELECT id, name FROM financial_entities');
      // מנוע היברידי: כללים מקומיים, ונפילה ל-GPT (ראייה) לסרוקים/עברית/פורמט לא מוכר
      const suggestions = await understandDocument(filePath, entitiesList);

      // מועמדים: סלוטים ממתינים ללא קובץ של הגוף שזוהה
      const candidates = suggestions.issuer?.entityId
        ? getAll(
            `SELECT * FROM documents
             WHERE entity_id = ? AND (file_path IS NULL OR file_path = '') AND status IN ('pending', 'overdue')`,
            [suggestions.issuer.entityId]
          )
        : [];
      const decision = decideFiling(suggestions, candidates);

      const amountsJson = JSON.stringify(suggestions.amounts || []);

      let docId;
      if (decision.action === 'matched') {
        // תיוק לסלוט קיים — משלים שדות חסרים בלבד, לא דורס מה שכבר הוגדר
        docId = decision.target.id;
        runQuery(
          `UPDATE documents
           SET file_path = ?, file_hash = ?, year = COALESCE(year, ?), required_by_date = COALESCE(required_by_date, ?),
               doc_date = COALESCE(doc_date, ?), summary = COALESCE(summary, ?), amounts = COALESCE(amounts, ?),
               auto_filed = 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [req.file.filename, hash, suggestions.year, suggestions.renewalDate, suggestions.docDate, suggestions.summary, amountsJson, docId]
        );
        logActivity('update', 'document', docId, `נקלט קובץ ותויק אוטומטית אל "${decision.target.document_name}"`);
      } else {
        // אין סלוט מתאים — יוצרים מסמך חדש (תחת הגוף שזוהה, או גוף האחזקה)
        let entityId = suggestions.issuer?.entityId;
        if (!entityId) {
          let holding = getOne('SELECT * FROM financial_entities WHERE name = ?', [HOLDING_ENTITY_NAME]);
          if (!holding) {
            runQuery(
              `INSERT INTO financial_entities (name, type, category, notes)
               VALUES (?, 'other', 'קליטה', 'נוצר אוטומטית — מסמכים שטרם שויכו לגוף')`,
              [HOLDING_ENTITY_NAME]
            );
            holding = getOne('SELECT * FROM financial_entities WHERE name = ?', [HOLDING_ENTITY_NAME]);
          }
          entityId = holding.id;
        }
        const baseName = suggestions.docType
          || req.file.originalname.replace(/\.[^.]+$/, '')
          || 'מסמך שנקלט';
        runQuery(
          `INSERT INTO documents
           (entity_id, document_name, document_type, year, required_by_date, file_path, file_hash, auto_filed, notes, doc_date, summary, amounts)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
          [entityId, baseName, suggestions.docType, suggestions.year, suggestions.renewalDate, req.file.filename, hash, 'נקלט אוטומטית דרך תיבת הקליטה', suggestions.docDate, suggestions.summary, amountsJson]
        );
        const created = getOne('SELECT id FROM documents ORDER BY id DESC LIMIT 1');
        docId = created.id;
        logActivity('create', 'document', docId, `נקלט מסמך חדש "${baseName}" דרך תיבת הקליטה`);
      }

      const document = getOne(`
        SELECT d.*, e.name as entity_name FROM documents d
        JOIN financial_entities e ON d.entity_id = e.id
        WHERE d.id = ?`, [docId]);

      res.status(201).json({
        document: withParsedAmounts(document),
        action: decision.action,
        suggestions,
        note: suggestions.confidence === 'low'
          ? (gptAvailable()
              ? 'הזיהוי לא ודאי — כדאי לבדוק ולתקן ידנית'
              : 'לא זוהה בוודאות — ייתכן שהקובץ סרוק. להפעלת זיהוי חכם (GPT) הגדירו OPENAI_API_KEY')
          : null,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
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

    const hash = sha256(path.join(UPLOAD_DIR, req.file.filename));
    const result = runQuery('UPDATE documents SET file_path = ?, file_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.file.filename, hash, id]);
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    const updated = getOne('SELECT * FROM documents WHERE id = ?', [id]);
    logActivity('update', 'document', id, `הועלה קובץ למסמך "${updated?.document_name || ''}"`);
    res.json(updated);
  });
});

// Analyze the attached file — hybrid understanding (rules + GPT fallback)
router.post('/:id/analyze', async (req, res) => {
  try {
    const doc = getOne('SELECT * FROM documents WHERE id = ?', [parseInt(req.params.id)]);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!doc.file_path) return res.status(400).json({ error: 'אין קובץ מצורף לניתוח' });

    const filePath = path.join(UPLOAD_DIR, path.basename(doc.file_path));
    const entities = getAll('SELECT id, name FROM financial_entities');
    const suggestions = await understandDocument(filePath, entities);

    res.json({
      suggestions,
      method: suggestions.method,
      note: suggestions.confidence === 'low'
        ? (gptAvailable()
            ? 'הזיהוי לא ודאי — כדאי לבדוק ולתקן ידנית'
            : 'לא זוהה בוודאות — ייתכן שהקובץ סרוק. להפעלת זיהוי חכם (GPT) הגדירו OPENAI_API_KEY')
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  if (doc) logActivity('delete', 'document', id, `נמחק מסמך "${doc.document_name}"`);
  res.json({ message: 'Document deleted successfully' });
});

export default router;
