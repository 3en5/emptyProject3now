// התאמת מסמך שנקלט למשימה שנתית תואמת — כדי לסמן אוטומטית "הושלם".
// פונקציה טהורה (קלה לבדיקה). דוגמה: מסמך "טופס 106" → משימה "איסוף טופס 106".
//
// ניקוד (כל אחד מספיק לבדו — שני האותות ספציפיים ולא כלליים, בניגוד ל-classify.js
// שם מספרי טפסים בודדים גרמו להתאמות-שווא; כאן משווים תמיד ביטוי מלא מול טקסט משימה):
//   +3  סוג/שם המסמך מופיע כביטוי מלא בטקסט המשימה (task_name+task_category)
//   +3  שם הגוף המנפיק את המסמך מופיע כביטוי מלא בטקסט המשימה
// סף התאמה: 3 — כל אחד מהאותות לבדו מספיק, כי שניהם ביטויים ספציפיים ולא מילים כלליות.
const MIN_LEN = 3; // ביטוי קצר מדי (פחות מ-3 תווים) לא נחשב אות אמין

export function matchChecklistTask(doc, tasks) {
  const docType = (doc.document_type || doc.document_name || '').trim().toLowerCase();
  const entityName = (doc.entity_name || '').trim().toLowerCase();

  let best = null;
  let bestScore = 0;
  for (const task of tasks) {
    const text = `${task.task_name || ''} ${task.task_category || ''}`.toLowerCase();
    let score = 0;
    if (docType.length >= MIN_LEN && text.includes(docType)) score += 3;
    if (entityName.length >= MIN_LEN && text.includes(entityName)) score += 3;
    if (score > bestScore) {
      best = task;
      bestScore = score;
    }
  }
  return bestScore >= 3 ? best : null;
}
