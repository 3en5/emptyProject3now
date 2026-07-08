# INDEX.md — מפת קבצים של הפרויקט

קובץ זה מתעד כל קובץ במערכת ואת תפקידו, כדי שיהיה קל לאתר את הקבצים הרלוונטיים לכל שינוי.

> **חשוב:** כשמוסיפים, מוחקים או משנים תפקיד של קובץ — יש לעדכן גם את הקובץ הזה.

---

## 📂 כל הקבצים לפי מיקום

### שורש הפרויקט

| קובץ | תפקיד |
|------|-------|
| `package.json` | הגדרות ה-backend: תלויות (express, sql.js, cors), סקריפטים (`start`, `dev`, `seed`, `setup`) |
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
| `backend/db/helper.js` | פונקציות גישה ל-DB: `runQuery`, `getOne`, `getAll` + `sanitize` (undefined→null). **כל שאילתה עוברת דרך כאן** |
| `backend/db/seed.js` | זריעת מצאי אמיתי (18 גופים, מסמכים מצופים, משימות שנתיות). הרצה: `npm run seed`. ⚠️ מוחק נתונים קיימים |

### Backend — API Routes (`backend/routes/`)

| קובץ | תפקיד | Endpoint |
|------|-------|----------|
| `backend/routes/entities.js` | CRUD לגופים פיננסיים (בנקים, ביטוחים, השקעות) | `/api/entities` |
| `backend/routes/accounts.js` | CRUD לחשבונות פרטניים בתוך גוף | `/api/accounts` |
| `backend/routes/documents.js` | CRUD למסמכים + סינון לפי סטטוס + העלאת/הורדת קובץ (`/:id/upload`, `/:id/file`) | `/api/documents` |
| `backend/upload.js` | קונפיג multer: תיקיית `uploads/`, סינון סוגים (PDF/תמונה), הגבלת 10MB. `UPLOAD_DIR` דרך env |
| `backend/extract.js` | חילוץ טקסט מ-PDF (`pdf-parse`), best-effort — מחזיר '' אם נכשל/סרוק |
| `backend/classify.js` | מנוע סיווג מסמכים מבוסס-כללים (טהור): `classifyText` → גוף/סוג/שנה/ביטחון |
| `backend/routes/checklists.js` | CRUD למשימות שנתיות + סינון לפי שנה/סטטוס | `/api/checklists` |
| `backend/routes/summary.js` | דוח סיכום: אגרגציית נכסים/התחייבויות/שווי-נקי לפי מטבע + ספירות | `/api/summary` |
| `backend/routes/comparison.js` | השוואת שנה-לשנה: missing/received/added/ended לפי `documents.year` ו-`active_from/until` | `/api/comparison/:year` |
| `backend/app.js` | יצירת אפליקציית Express (`createApp`) — middleware + routes, בלי listen/init. מיוצא לטסטים |
| `backend/server.js` | נקודת הכניסה: מייבא `createApp`, מריץ `init()` ומאזין לפורט |

### Frontend — שורש (`frontend/`)

| קובץ | תפקיד |
|------|-------|
| `frontend/index.html` | דף ה-HTML הראשי, `dir="rtl"`, טוען את `main.jsx` |
| `frontend/package.json` | תלויות ה-frontend: react, react-dom, axios, vite |
| `frontend/vite.config.js` | הגדרות Vite: port 5173, proxy מ-`/api` ל-`localhost:3001`. **חייב להיות ב-`frontend/`** (Vite רץ משם) |
| `frontend/src/main.jsx` | נקודת הכניסה של React — מרנדר את `App` ל-DOM |
| `frontend/src/App.jsx` | הרכיב הראשי: ניהול state גלובלי, כל קריאות ה-API, ניתוב בין עמודים, ספק `ReadOnlyContext` |
| `frontend/src/ReadOnlyContext.js` | Context למצב צפייה-בלבד + hook `useReadOnly()` — מסתיר כפתורי עריכה |
| `frontend/src/index.css` | נקודת כניסה לעיצוב — מייבא (`@import`) את כל ה-partials מ-`styles/` |
| `frontend/src/App.css` | ריק (כל הסגנון ב-`styles/`) |

### Frontend — עיצוב (`frontend/src/styles/`)

> העיצוב פוצל לקבצים לפי אזור כדי לעמוד בכלל 500 השורות. לשנות סגנון — לערוך את הקובץ הרלוונטי כאן.

| קובץ | תפקיד |
|------|-------|
| `styles/base.css` | reset, משתני צבע (`:root`), body, layout כללי, אנימציות |
| `styles/navbar.css` | סרגל הניווט העליון |
| `styles/dashboard.css` | עמוד הבית: סטטיסטיקות, גופים לפי סוג, רשימות ממתינים |
| `styles/forms.css` | טפסים, כפתורים, פקדי סינון |
| `styles/cards.css` | כרטיסי גופים ומסמכים |
| `styles/checklist.css` | משימות שנתיות: מכולה, סקשנים, משימות |
| `styles/misc.css` | הודעות שגיאה, מצב ריק, ורספונסיביות (media query) |

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
| `frontend/src/pages/ChecklistPage.jsx` | עמוד משימות שנתיות: טופס (יצירה+עריכה), הפרדה בין ממתינות להושלמו |
| `frontend/src/pages/AccountsPage.jsx` | עמוד חשבונות: טופס (יצירה+עריכה), כרטיסי חשבונות עם יתרה/מטבע |
| `frontend/src/pages/ReportsPage.jsx` | עמוד דוחות: שווי נקי לפי מטבע, התפלגות נכסים, ספירות. שולף `/api/summary` בעצמו |
| `frontend/src/pages/ComparisonPage.jsx` | עמוד השוואת שנים: 4 מונים + סעיפים (חסר/חוזר/חדש/הסתיים) + בורר שנה. שולף `/api/comparison/:year` |

### Frontend — עזרים (`frontend/src/utils/`)

| קובץ | תפקיד |
|------|-------|
| `utils/deadlines.js` | חישוב דחיפות לפי מועד+סטטוס (`getUrgency`, `urgencyMeta`, `isAlerting`). פונקציות טהורות — משמשות את הדשבורד והעמודים לרמזור ההתראות |

### טסטים (פירמידה מלאה)

| קובץ | תפקיד |
|------|-------|
| `backend/test/api.test.js` | טסטי אינטגרציה ל-API (`node --test` + supertest, DB בזיכרון). 14 טסטים |
| `frontend/vitest.config.js` | קונפיג Vitest (jsdom, globals, setup) |
| `frontend/src/test/setup.js` | טעינת jest-dom matchers |
| `frontend/src/test/components.test.jsx` | טסטי רכיבי React (RTL): Navigation, Dashboard, EntityList, התראות מועדים |
| `frontend/src/test/deadlines.test.js` | טסטי יחידה לפונקציית הדחיפות (`getUrgency` וכו') |
| `playwright.config.js` | קונפיג E2E: מפעיל backend (DB זרוע) + frontend, chromium מקומי |
| `e2e/smoke.spec.js` | טסטי E2E בדפדפן אמיתי — זרימות מלאות. 5 טסטים |

**הרצה:** `npm run test:all` (הכל) · `npm run test:api` · `npm run test:components` · `npm run test:e2e`

---

## 🎯 לפי נושא — "אני רוצה לשנות את X, אילו קבצים?"

### מבנה נתונים (הוספת שדה/טבלה)
1. `backend/db/schema.sql` — הגדרת העמודה/טבלה
2. `backend/routes/<relevant>.js` — INSERT/UPDATE/SELECT עם השדה החדש
3. הרכיב/עמוד הרלוונטי ב-frontend — הצגה/עריכה של השדה
> ⚠️ שינוי סכימה לא משפיע על DB קיים (`IF NOT EXISTS`). למחוק את `backend/db/finance.db` או להריץ migration.

### גופים (בנקים, ביטוחים, השקעות, רכבים, רישיונות)
- Backend: `backend/routes/entities.js`
- Frontend: `pages/EntitiesPage.jsx`, `components/EntityForm.jsx`, `components/EntityList.jsx`
- **סוגים** (`type`): bank / insurance / investment / realty / loan / **vehicle** / **license**
- קטגוריות/סוגים/אייקונים: `EntityForm.jsx` (`ENTITY_TYPES`, `CATEGORIES`), `EntityList.jsx` (אייקונים), `Dashboard.jsx` (`entityTypes`), `EntitiesPage.jsx` (סינון)
- רכב/רישיון: החידושים (ביטוח חובה/מקיף, טסט, כלי יריה, מתווך) נשמרים כ-`documents` עם `required_by_date` → נכנסים אוטומטית לרמזור המועדים

### מסמכים ודוחות
- Backend: `backend/routes/documents.js`
- Frontend: `pages/DocumentPage.jsx`
- סטטוסים/צבעים: מוגדרים בתוך `DocumentPage.jsx` (`getStatusBadge`, `getStatusColor`)

### העלאת קבצים למסמכים
- Backend: `backend/upload.js` (multer) + endpoints `/:id/upload` ו-`/:id/file` ב-`routes/documents.js`
- Frontend: כפתור העלאה + קישור צפייה ב-`DocumentPage.jsx`; handler `handleUploadDocument` ב-`App.jsx`
- אחסון: `backend/uploads/` (ב-`.gitignore`). שם קובץ: `doc_<id>_<timestamp>.<ext>`

### זיהוי חכם של מסמכים (משאלה #1, MVP כללים)
- חילוץ טקסט: `backend/extract.js` (`pdf-parse`)
- סיווג: `backend/classify.js` (ISSUERS/DOC_TYPES fingerprints + חילוץ שנה) — **טהור, קל להרחיב**
- Endpoint: `POST /api/documents/:id/analyze` ב-`routes/documents.js`
- Frontend: כפתור "🔍 נתח" + תיבת הצעות + "החל הצעה" ב-`DocumentPage.jsx`
- ⚠️ מסמך סרוק (תמונה) → אין טקסט → ביטחון נמוך (OCR עתידי)

### משימות שנתיות
- Backend: `backend/routes/checklists.js`
- Frontend: `pages/ChecklistPage.jsx`
- קטגוריות משימה: מוגדרות בתוך `ChecklistPage.jsx` (מערך `categories`)

### התראות מועדים / רמזור דחיפות
- לוגיקה: `utils/deadlines.js` (`getUrgency` — סף "מתקרב" ב-`SOON_DAYS`)
- תצוגה: סעיף התראות ב-`Dashboard.jsx`, ותגי דחיפות ב-`DocumentPage.jsx`/`ChecklistPage.jsx`
- עיצוב: `.alerts-section` / `.urgency-badge` ב-`styles/dashboard.css`

### חשבונות פרטניים
- Backend: `backend/routes/accounts.js`
- Frontend: `pages/AccountsPage.jsx` (מחובר ב-`App.jsx`, כפתור ב-`Navigation.jsx`)

### דוחות / סיכום כספי
- Backend: `backend/routes/summary.js` (`/api/summary` — נכסים=חשבונות שאינם 'loan', התחייבויות=חשבונות 'loan')
- Frontend: `pages/ReportsPage.jsx` (שולף בעצמו); עיצוב `.networth-*` ב-`styles/dashboard.css`
- ⚠️ מטבעות לא מעורבבים — סיכום נפרד לכל מטבע

### השוואת שנה-לשנה (מסמכים חסרים)
- Backend: `backend/routes/comparison.js` (`/api/comparison/:year` — משווה מול `:year-1`)
- תלוי ב-`documents.year` וב-`financial_entities.active_from/active_until` (נוספו במיגרציה ב-`init.js`)
- Frontend: `pages/ComparisonPage.jsx`
- לוגיקה: missing=היה אשתקד+גוף פעיל+חסר השנה · received=בשתי השנים · added=חדש · ended=גוף עם `active_until` קודם

### עמוד הבית / דאשבורד
- `components/Dashboard.jsx` — כל הלוגיקה של הסטטיסטיקות והתצוגה

### עיצוב, צבעים, layout, RTL
- `frontend/src/index.css` — הכל במקום אחד (משתני CSS ב-`:root`)

### מצב צפייה-בלבד (read-only)
- מקור: `ReadOnlyContext.js` (+`useReadOnly()`); toggle ב-`App.jsx` (נשמר ב-localStorage), כפתור ב-`Navigation.jsx`
- כל עמוד/רכיב שמאפשר עריכה קורא `useReadOnly()` ומסתיר את כפתורי היצירה/עריכה/מחיקה כש-true
- ⚠️ מצב **תצוגה** בלבד — לא אבטחה. הרשאות אמיתיות (login) = שלב עתידי

### ניווט / הוספת עמוד חדש
1. `components/Navigation.jsx` — כפתור חדש
2. `App.jsx` — הוספת ה-state וה-routing לעמוד
3. `pages/` — יצירת קובץ העמוד

### קריאות API מה-frontend
- `frontend/src/App.jsx` — כל ה-`axios` calls והפונקציות (`handleAdd*`, `handleUpdate*`, `handleDelete*`)

### הגדרות שרת / ports / CORS
- Backend: `backend/server.js`
- Proxy של frontend: `vite.config.js`
