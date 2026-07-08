import { runQuery, getAll } from './db/helper.js';

// רישום שינוי ליומן הפעילות (audit log). נקרא מכל route שמבצע mutation.
// action: 'create' | 'update' | 'delete' · targetType: 'entity'|'account'|'document'|'task'
export function logActivity(action, targetType, targetId, description) {
  try {
    runQuery(
      'INSERT INTO activity_log (action, target_type, target_id, description) VALUES (?, ?, ?, ?)',
      [action, targetType, targetId ?? null, description || null]
    );
  } catch {
    // רישום כושל לא אמור להפיל את הבקשה הראשית
  }
}

export function getRecentActivity(limit = 30) {
  return getAll('SELECT * FROM activity_log ORDER BY created_at DESC, id DESC LIMIT ?', [limit]);
}
