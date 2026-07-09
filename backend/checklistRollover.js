// מחזור משימות שנתי ("rollover") — כשמסמך מתקבל בפועל, המשימה השנתית התואמת לא
// אמורה "להיעלם" אחרי השנה שבה הושלמה: יוצרים אוטומטית עותק למחזור השנה הבאה,
// וגם מגלגלים אחורה השלמה אם המשימה נמצאה רק בשנה הקודמת (למשל דוח שהתקבל באיחור).
// כל הפונקציות כאן טהורות (בלי DB) — ההתאמה עצמה נשארת ב-checklistMatch.js.

/**
 * מזיז תאריך בפורמט 'YYYY-...' (למשל 'YYYY-MM-DD') שנה קדימה, על סמך 4 הספרות הראשונות.
 * null/'' נשארים null (אין תאריך יעד קבוע).
 * @param {string|null|undefined} dateStr
 * @returns {string|null}
 */
export function shiftYear(dateStr) {
  if (!dateStr) return null;
  const match = /^(\d{4})(.*)$/.exec(String(dateStr));
  if (!match) return null;
  const year = parseInt(match[1], 10) + 1;
  return `${year}${match[2]}`;
}

/**
 * בונה את שורת המשימה המגולגלת (מהשנה הקודמת) — עותק שמסומן כבר כהושלם עבור השנה
 * הנוכחית, בעקבות מסמך שהתקבל בפועל ותאם למשימה מהמחזור הקודם.
 * @param {object} doc - המסמך שהתקבל (חייב id)
 * @param {object} prevTask - המשימה התואמת מהשנה הקודמת (annual_checklist row)
 * @param {number} year - השנה הנוכחית שאליה משייכים את העותק
 * @param {string} today - תאריך ההשלמה, 'YYYY-MM-DD'
 * @returns {object} ערכי עמודות ל-INSERT בטבלת annual_checklist
 */
export function buildRolledTask(doc, prevTask, year, today) {
  return {
    year,
    entity_id: prevTask.entity_id ?? null,
    task_name: prevTask.task_name,
    task_category: prevTask.task_category ?? null,
    required_date: shiftYear(prevTask.required_date),
    completed_date: today,
    status: 'completed',
    assignee: prevTask.assignee ?? null,
    auto_completed: 1,
    auto_created: 1,
    completed_by_document_id: doc.id,
  };
}

// גזירת שם המשימה והאחראי ישירות מפרטי המסמך — כשאין שום היסטוריית משימות
// להתבסס עליה (לא ב-Y-1 ולא seriesTask). משותף בין buildNextYearTask ל-buildCompletedFromDoc.
function deriveFromDoc(doc) {
  const assignee = doc.owner === 'spouse' ? 'spouse' : (doc.owner === 'user' ? 'user' : null);
  const taskName = `איסוף ${doc.document_type || doc.document_name}${doc.entity_name ? ` — ${doc.entity_name}` : ''}`;
  return { taskName, assignee };
}

/**
 * בונה את שורת משימת השנה הבאה — ממשיכה את הסדרה (מהמשימה שהותאמה/גולגלה), או
 * נגזרת מפרטי המסמך עצמו כשאין כלל היסטוריית משימות.
 * @param {object} doc - המסמך שהתקבל
 * @param {object|null} seriesTask - המשימה שהותאמה בשנה הנוכחית (matchedTask או rolledTask), אם יש
 * @param {number} nextYear - שנת המחזור הבאה
 * @returns {object} ערכי עמודות ל-INSERT בטבלת annual_checklist
 */
export function buildNextYearTask(doc, seriesTask, nextYear) {
  if (seriesTask) {
    return {
      year: nextYear,
      entity_id: seriesTask.entity_id ?? null,
      task_name: seriesTask.task_name,
      task_category: seriesTask.task_category ?? null,
      required_date: shiftYear(seriesTask.required_date),
      status: 'pending',
      assignee: seriesTask.assignee ?? null,
      auto_completed: 0,
      auto_created: 1,
    };
  }

  const { taskName, assignee } = deriveFromDoc(doc);
  return {
    year: nextYear,
    entity_id: doc.entity_id ?? null,
    task_name: taskName,
    task_category: 'אחר',
    required_date: null,
    status: 'pending',
    assignee,
    auto_completed: 0,
    auto_created: 1,
  };
}

/**
 * בונה שורת משימה שכבר "הושלמה" עבור שנת המסמך (year) — כשאין שום משימה תואמת
 * בשנה עצמה וגם אין תבנית משנה קודמת (Y-1) להעתיק ממנה. נגזרת ישירות מפרטי המסמך,
 * כמו הענף חסר-ה-seriesTask של buildNextYearTask, אבל מסומנת completed מייד.
 * @param {object} doc - המסמך שהתקבל (חייב id)
 * @param {number} year - שנת המסמך (doc.year, או השנה הנוכחית אם אין)
 * @param {string} today - תאריך ההשלמה, 'YYYY-MM-DD'
 * @returns {object} ערכי עמודות ל-INSERT בטבלת annual_checklist
 */
export function buildCompletedFromDoc(doc, year, today) {
  const { taskName, assignee } = deriveFromDoc(doc);
  return {
    year,
    entity_id: doc.entity_id ?? null,
    task_name: taskName,
    task_category: 'אחר',
    required_date: null,
    completed_date: today,
    status: 'completed',
    assignee,
    auto_completed: 1,
    auto_created: 1,
    completed_by_document_id: doc.id,
  };
}
