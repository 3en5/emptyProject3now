// התאמת שם אדם שזוהה על מסמך ("דנה כהן") לבן-בית מוגדר ("אני" / "בן-זוג") —
// פונקציה טהורה. ההשוואה היא ברמת חלקי שם (שם פרטי/משפחה, ≥2 תווים) כדי לסבול
// הבדלי ניסוח ("דנה כהן לוי" מול "דנה לוי"), אבל לא להתאים על רסיסים קצרים מדי.
function includesNamePart(personNameLower, fullName) {
  if (!fullName) return false;
  const parts = fullName.trim().toLowerCase().split(/\s+/).filter((p) => p.length >= 2);
  return parts.some((p) => personNameLower.includes(p));
}

/**
 * matchOwner(personName, { userName, spouseName }) → 'user' | 'spouse' | null
 * userName/spouseName מוגדרים ב-.env (FINANCE_USER_NAME / FINANCE_SPOUSE_NAME).
 * בלי הגדרה, או בלי התאמה — מחזיר null (המשתמש בוחר ידנית).
 */
export function matchOwner(personName, { userName, spouseName } = {}) {
  if (!personName) return null;
  const norm = personName.trim().toLowerCase();
  if (includesNamePart(norm, userName)) return 'user';
  if (includesNamePart(norm, spouseName)) return 'spouse';
  return null;
}
