import express from 'express';
import { getAll } from '../db/helper.js';

const router = express.Router();

// עוטף שדה ל-CSV (מטפל בפסיקים/מרכאות/שורות חדשות)
function csvField(v) {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  return rows.map((r) => r.map(csvField).join(',')).join('\r\n');
}

// GET /api/export/action-list.csv?year=YYYY
// רשימת פעולות לשנה: מסמכים ממתינים (להשיג) + משימות ממתינות (להגיש).
router.get('/action-list.csv', (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();

  const docs = getAll(`
    SELECT d.document_name, e.name AS entity_name, d.required_by_date, d.status
    FROM documents d JOIN financial_entities e ON d.entity_id = e.id
    WHERE d.year = ? AND d.status = 'pending'
    ORDER BY d.required_by_date
  `, [year]);

  const tasks = getAll(`
    SELECT task_name, task_category, required_date, status, assignee
    FROM annual_checklist
    WHERE year = ? AND status IN ('pending', 'in_progress')
    ORDER BY required_date
  `, [year]);

  const rows = [['סוג', 'פריט', 'גוף/קטגוריה', 'מועד', 'אחראי', 'סטטוס']];
  for (const d of docs) {
    rows.push(['מסמך להשגה', d.document_name, d.entity_name, d.required_by_date, '', 'ממתין']);
  }
  for (const t of tasks) {
    rows.push(['משימה להגשה', t.task_name, t.task_category, t.required_date, t.assignee === 'spouse' ? 'בן/בת זוג' : 'אני', 'ממתין']);
  }

  const csv = '﻿' + toCsv(rows); // BOM ל-UTF-8 (תצוגת עברית תקינה ב-Excel)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="action-list-${year}.csv"`);
  res.send(csv);
});

export default router;
