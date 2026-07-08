// חישוב דחיפות של מסמך/משימה לפי מועד ההגשה והסטטוס.
// פונקציה טהורה — מקבלת "היום" כפרמטר כדי שתהיה ניתנת לבדיקה דטרמיניסטית.

const DONE_STATUSES = ['submitted', 'verified', 'completed'];
const MS_PER_DAY = 1000 * 60 * 60 * 24;
export const SOON_DAYS = 14; // "מתקרב" = עד שבועיים קדימה

function atMidnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * מחזיר { level, daysLeft }
 * level: 'done' | 'none' | 'overdue' | 'soon' | 'ok'
 * daysLeft: מספר ימים עד המועד (שלילי = עבר), או null.
 */
export function getUrgency(dueDate, status, today = new Date()) {
  if (DONE_STATUSES.includes(status)) return { level: 'done', daysLeft: null };
  if (!dueDate) return { level: 'none', daysLeft: null };

  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return { level: 'none', daysLeft: null };

  const daysLeft = Math.round((atMidnight(due) - atMidnight(today)) / MS_PER_DAY);
  if (daysLeft < 0) return { level: 'overdue', daysLeft };
  if (daysLeft <= SOON_DAYS) return { level: 'soon', daysLeft };
  return { level: 'ok', daysLeft };
}

// מטא-דאטה לתצוגה לכל רמת דחיפות (צבע + תווית).
export function urgencyMeta(level, daysLeft) {
  switch (level) {
    case 'overdue': {
      const d = Math.abs(daysLeft);
      return { color: '#e74c3c', label: `🔴 באיחור ${d} ימים` };
    }
    case 'soon': {
      const label = daysLeft === 0 ? '🟠 היום!' : `🟠 בעוד ${daysLeft} ימים`;
      return { color: '#f39c12', label };
    }
    case 'ok':
      return { color: '#27ae60', label: '🟢 בזמן' };
    default:
      return { color: '#999', label: '' };
  }
}

// האם פריט דורש התראה (באיחור או מתקרב)?
export function isAlerting(level) {
  return level === 'overdue' || level === 'soon';
}
