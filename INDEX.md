# INDEX.md — מפת קבצים של הפרויקט

קובץ זה מתעד כל קובץ במערכת ואת תפקידו, כדי שיהיה קל לאתר את הקבצים הרלוונטיים לכל שינוי.

> **חשוב:** כשמוסיפים, מוחקים או משנים תפקיד של קובץ — יש לעדכן גם את הקובץ הזה.

---

## 📂 כל הקבצים לפי מיקום

### שורש הפרויקט

| קובץ | תפקיד |
|------|-------|
| `package.json` | הגדרות ה-backend: תלויות (express, sql.js, cors), סקריפטים (`start`, `dev`, `setup`) |
| `vite.config.js` | הגדרות Vite ל-frontend: port 5173, proxy מ-`/api` ל-`localhost:3001` |
| `README.md` | תיעוד כללי למשתמש: מה המערכת, איך מתקינים ומריצים, רשימת API endpoints |
| `CLAUDE.md` | כללי העבודה של Claude על הפרויקט (מוסכמות קוד, Git, מבנה) |
| `INDEX.md` | הקובץ הזה — מפת הקבצים |
| `PROGRESS.md` | יומן התקדמות: מה הושלם, מה בעבודה, מה מתוכנן, בעיות ידועות |
| `WISHLIST.md` | קובץ משאלות: רעיונות עתידיים שלא מתעסקים בהם כרגע (לא backlog) |
| `LESSONS.md` | קובץ לקחים: תקלות ופתרונות מורכבים ומה ללמוד מהם לעתיד |
| `REPORTS.md` | קטלוג דוחות: הדוחות הפיננסיים הסטנדרטיים בישראל, מועדים, ומיפוי למודל |
| `.gitignore` | קבצים שלא נכנסים ל-git (node_modules, `*.db`, `.env`) |

### Backend — בסיס נתונים (`backend/db/`)

| קובץ | תפקיד |
|------|-------|
| `backend/db/schema.sql` | הגדרת כל הטבלאות והאינדקסים. **כאן משנים מבנה נתונים** (עמודות, טבלאות) |
| `backend/db/init.js` | אתחול ה-DB: טעינת/יצירת הקובץ, הרצת הסכימה, שמירה לדיסק (`saveDatabase`) |
| `backend/db/helper.js` | פונקציות גישה ל-DB: `runQuery`, `getOne`, `getAll`. **כל שאילתה עוברת דרך כאן** |

### Backend — API Routes (`backend/routes/`)

| קובץ | תפקיד | Endpoint |
|------|-------|----------|
| `backend/routes/entities.js` | CRUD לגופים פיננסיים (בנקים, ביטוחים, השקעות) | `/api/entities` |
| `backend/routes/accounts.js` | CRUD לחשבונות פרטניים בתוך גוף | `/api/accounts` |
| `backend/routes/documents.js` | CRUD למסמכים + סינון לפי סטטוס | `/api/documents` |
| `backend/routes/checklists.js` | CRUD למשימות תב"ר שנתי + סינון לפי שנה/סטטוס | `/api/checklists` |
| `backend/server.js` | נקודת הכניסה של ה-backend: Express, middleware, חיבור ה-routes, הפעלת השרת |

### Frontend — שורש (`frontend/`)

| קובץ | תפקיד |
|------|-------|
| `frontend/index.html` | דף ה-HTML הראשי, `dir="rtl"`, טוען את `main.jsx` |
| `frontend/package.json` | תלויות ה-frontend: react, react-dom, axios, vite |
| `frontend/src/main.jsx` | נקודת הכניסה של React — מרנדר את `App` ל-DOM |
| `frontend/src/App.jsx` | הרכיב הראשי: ניהול state גלובלי, כל קריאות ה-API, ניתוב בין עמודים |
| `frontend/src/index.css` | **כל העיצוב של האפליקציה** — כאן משנים סגנון, צבעים, layout, RTL |
| `frontend/src/App.css` | ריק (כל הסגנון ב-`index.css`) |

### Frontend — רכיבים (`frontend/src/components/`)

| קובץ | תפקיד |
|------|-------|
| `frontend/src/components/Navigation.jsx` | סרגל הניווט העליון — מעבר בין העמודים |
| `frontend/src/components/Dashboard.jsx` | עמוד הבית: סטטיסטיקות, גופים לפי סוג, מסמכים ומשימות ממתינים |
| `frontend/src/components/EntityForm.jsx` | טופס הוספה/עריכה של גוף פיננסי (כולל רשימת הקטגוריות לכל סוג) |
| `frontend/src/components/EntityList.jsx` | תצוגת רשימת הגופים כ-cards עם כפתורי עריכה/מחיקה |

### Frontend — עמודים (`frontend/src/pages/`)

| קובץ | תפקיד |
|------|-------|
| `frontend/src/pages/EntitiesPage.jsx` | עמוד הגופים הפיננסיים: סינון לפי סוג, חיבור הטופס והרשימה |
| `frontend/src/pages/DocumentPage.jsx` | עמוד המסמכים: טופס הוספה, סינון לפי סטטוס, תצוגת cards צבעונית |
| `frontend/src/pages/ChecklistPage.jsx` | עמוד תב"ר שנתי: טופס משימה, הפרדה בין ממתינות להושלמו |

---

## 🎯 לפי נושא — "אני רוצה לשנות את X, אילו קבצים?"

### מבנה נתונים (הוספת שדה/טבלה)
1. `backend/db/schema.sql` — הגדרת העמודה/טבלה
2. `backend/routes/<relevant>.js` — INSERT/UPDATE/SELECT עם השדה החדש
3. הרכיב/עמוד הרלוונטי ב-frontend — הצגה/עריכה של השדה
> ⚠️ שינוי סכימה לא משפיע על DB קיים (`IF NOT EXISTS`). למחוק את `backend/db/finance.db` או להריץ migration.

### גופים פיננסיים (בנקים, ביטוחים, השקעות)
- Backend: `backend/routes/entities.js`
- Frontend: `pages/EntitiesPage.jsx`, `components/EntityForm.jsx`, `components/EntityList.jsx`
- קטגוריות/סוגים: מוגדרים בתוך `EntityForm.jsx` (קבועים `ENTITY_TYPES`, `CATEGORIES`)

### מסמכים ודוחות
- Backend: `backend/routes/documents.js`
- Frontend: `pages/DocumentPage.jsx`
- סטטוסים/צבעים: מוגדרים בתוך `DocumentPage.jsx` (`getStatusBadge`, `getStatusColor`)

### תב"ר שנתי (משימות)
- Backend: `backend/routes/checklists.js`
- Frontend: `pages/ChecklistPage.jsx`
- קטגוריות משימה: מוגדרות בתוך `ChecklistPage.jsx` (מערך `categories`)

### חשבונות פרטניים
- Backend: `backend/routes/accounts.js`
- Frontend: כרגע אין עמוד ייעודי — מוצגים דרך `/api/entities/:id`

### עמוד הבית / דאשבורד
- `components/Dashboard.jsx` — כל הלוגיקה של הסטטיסטיקות והתצוגה

### עיצוב, צבעים, layout, RTL
- `frontend/src/index.css` — הכל במקום אחד (משתני CSS ב-`:root`)

### ניווט / הוספת עמוד חדש
1. `components/Navigation.jsx` — כפתור חדש
2. `App.jsx` — הוספת ה-state וה-routing לעמוד
3. `pages/` — יצירת קובץ העמוד

### קריאות API מה-frontend
- `frontend/src/App.jsx` — כל ה-`axios` calls והפונקציות (`handleAdd*`, `handleUpdate*`, `handleDelete*`)

### הגדרות שרת / ports / CORS
- Backend: `backend/server.js`
- Proxy של frontend: `vite.config.js`
