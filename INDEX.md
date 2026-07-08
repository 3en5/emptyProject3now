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
| `ecosystem.config.cjs` | הגדרת שירות pm2 (`finance-docs`, port 3018, autorestart). ראה `npm run service:*` |
| `run-local.bat` | 🪟 Windows — הרצה מקומית בפקודה/דאבל-קליק אחד: בדיקת Node, התקנה, בנייה, נתונים ראשוניים, הרצת השרת |
| `start-server.bat` | 🪟 Windows — הרצה יומיומית מהירה של השרת (בלי בנייה מחדש) |
| `install-boot.bat` | 🪟 Windows — רישום עלייה אוטומטית עם כניסה למחשב (Task Scheduler, רקע ללא חלון) |
| `update.bat` | 🪟 Windows — עדכון לגרסה חדשה: `git pull` + התקנה + בנייה מחדש (הנתונים לא נוגעים; דורש Git clone) |
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
| `backend/db/inventory.js` | **מצאי אמיתי משותף** (גופים/מסמכים/משימות) + `insertInventory()`. משמש את seed ו-starter (DRY) |
| `backend/db/seed.js` | זריעת **דמו** מלאה (מצאי + היסטוריית 2025 + יתרות + BTB שהסתיים). `npm run seed`. ⚠️ מוחק נתונים |
| `backend/db/starter.js` | **התחלה נקייה** לשימוש אמיתי (מצאי + סלוטים, בלי דמו). `npm run starter`. ⚠️ מוחק נתונים |
| `backend/db/reset.js` | מחיקת ה-DB → התחלה ריקה. `npm run reset` |
| `backend/activity.js` | יומן שינויים: `logActivity()` (נקרא מכל mutation) + `getRecentActivity()` |

### Backend — API Routes (`backend/routes/`)

| קובץ | תפקיד | Endpoint |
|------|-------|----------|
| `backend/routes/entities.js` | CRUD לגופים פיננסיים (בנקים, ביטוחים, השקעות) | `/api/entities` |
| `backend/routes/accounts.js` | CRUD לחשבונות פרטניים בתוך גוף | `/api/accounts` |
| `backend/routes/documents.js` | CRUD למסמכים + **קליטה חכמה** (`/intake` — העלאה בלי בחירת יעד, תיוק אוטומטי) + העלאת/הורדת קובץ (`/:id/upload`, `/:id/file`) | `/api/documents` |
| `backend/intake.js` | לוגיקת התיוק החכם (טהורה): `decideFiling` — ניקוד התאמה לסלוטים פנויים → matched/create/unmatched; `HOLDING_ENTITY_NAME` |
| `backend/upload.js` | קונפיג multer: תיקיית `uploads/`, סינון סוגים (PDF/תמונה), הגבלת 10MB. `UPLOAD_DIR` דרך env |
| `backend/extract.js` | חילוץ טקסט מ-PDF (`pdf-parse`), best-effort — מחזיר '' אם נכשל/סרוק |
| `backend/classify.js` | מנוע סיווג מסמכים מבוסס-כללים (טהור): `classifyText` → גוף/סוג/שנה/ביטחון |
| `backend/routes/checklists.js` | CRUD למשימות שנתיות + סינון לפי שנה/סטטוס | `/api/checklists` |
| `backend/routes/summary.js` | דוח סיכום: אגרגציית נכסים/התחייבויות/שווי-נקי לפי מטבע + ספירות | `/api/summary` |
| `backend/routes/comparison.js` | השוואת שנה-לשנה: missing/received/added/ended לפי `documents.year` ו-`active_from/until` | `/api/comparison/:year` |
| `backend/routes/export.js` | ייצוא CSV של רשימת פעולות (מסמכים+משימות ממתינים), עם BOM לעברית | `/api/export/action-list.csv` |
| `backend/routes/activity.js` | שליפת שינויים אחרונים מהיומן | `/api/activity?limit=N` |
| `backend/routes/report.js` | דוח חודשי: שינויים + מסמכים/משימות שמועדם בחודש | `/api/report/monthly?month=YYYY-MM` |
| `backend/routes/system.js` | עדכון תוכנה מול git: גרסה נוכחית, בדיקת עדכון (`fetch`+השוואה), החלה (`pull`+build). `spawn` shell, פקודות קבועות ללא קלט משתמש | `/api/system/version` · `/update/check` · `/update/apply` |
| `backend/app.js` | יצירת אפליקציית Express (`createApp`) — middleware + routes + **הגשת frontend/dist** (production). מיוצא לטסטים |
| `backend/server.js` | נקודת הכניסה: מייבא `createApp`, מריץ `init()` ומאזין לפורט |

### Frontend — שורש (`frontend/`)

| קובץ | תפקיד |
|------|-------|
| `frontend/index.html` | דף ה-HTML הראשי, `dir="rtl"`, טוען את `main.jsx` |
| `frontend/package.json` | תלויות ה-frontend: react, react-dom, axios, vite |
| `frontend/vite.config.js` | הגדרות Vite: port 5173, proxy מ-`/api` ל-`localhost:3018`. **חייב להיות ב-`frontend/`** (Vite רץ משם) |
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
| `frontend/src/components/Dashboard.jsx` | עמוד הבית: תיבת הקליטה, מדור "תויקו אוטומטית — לאישור", סטטיסטיקות, גופים לפי סוג, ממתינים, ועדכון תוכנה |
| `frontend/src/components/IntakeBox.jsx` | **תיבת הקליטה החכמה** — נקודת הכניסה האחת למסמכים: זריקת קבצים (מרובים) → `/api/documents/intake` → שורות "מה הבנתי ולאן תייקתי" עם שדות תיקון + "אשר ושמור" |
| `frontend/src/components/DocumentForm.jsx` | טופס הוספה/עריכה ידנית של מסמך (הדרך המשנית — ליצירת סלוט מתוכנן) |
| `frontend/src/components/UpdateChecker.jsx` | כפתור "בדיקת עדכון תוכנה": בודק מול `/api/system/update/check`, מציג שינויים זמינים ומתקין דרך `/update/apply` |
| `frontend/src/components/EntityForm.jsx` | טופס הוספה/עריכה של גוף פיננסי (כולל רשימת הקטגוריות לכל סוג) |
| `frontend/src/components/EntityList.jsx` | תצוגת רשימת הגופים כ-cards עם כפתורי עריכה/מחיקה |

### Frontend — עמודים (`frontend/src/pages/`)

| קובץ | תפקיד |
|------|-------|
| `frontend/src/pages/EntitiesPage.jsx` | עמוד הגופים הפיננסיים: סינון לפי סוג, חיבור הטופס והרשימה |
| `frontend/src/pages/DocumentPage.jsx` | עמוד המסמכים: תיבת הקליטה למעלה, סינון (כולל "🤖 ממתינים לאישור"), כרטיסי פיקוח וניהול — תג "תויק אוטומטית" + אשר/תקן, החלפת קובץ, גרירה ממוקדת לכרטיס |
| `frontend/src/pages/ChecklistPage.jsx` | עמוד משימות שנתיות: טופס (יצירה+עריכה), הפרדה בין ממתינות להושלמו |
| `frontend/src/pages/AccountsPage.jsx` | עמוד חשבונות: טופס (יצירה+עריכה), כרטיסי חשבונות עם יתרה/מטבע |
| `frontend/src/pages/ReportsPage.jsx` | עמוד דוחות: שווי נקי לפי מטבע, התפלגות נכסים, ספירות. שולף `/api/summary` בעצמו |
| `frontend/src/pages/ComparisonPage.jsx` | עמוד השוואת שנים: 4 מונים + סעיפים (חסר/חוזר/חדש/הסתיים) + בורר שנה. שולף `/api/comparison/:year` |
| `frontend/src/pages/MonthlyPage.jsx` | עמוד דוח חודשי: בורר חודש + מסמכים/משימות שמועדם החודש + שינויים. שולף `/api/report/monthly` |

### Frontend — עזרים (`frontend/src/utils/`)

| קובץ | תפקיד |
|------|-------|
| `utils/deadlines.js` | חישוב דחיפות לפי מועד+סטטוס (`getUrgency`, `urgencyMeta`, `isAlerting`). פונקציות טהורות — משמשות את הדשבורד והעמודים לרמזור ההתראות |

### טסטים (פירמידה מלאה)

| קובץ | תפקיד |
|------|-------|
| `backend/test/api.test.js` | טסטי אינטגרציה ל-API (`node --test` + supertest, DB בזיכרון) |
| `backend/test/intake.test.js` | טסטים לקליטה החכמה: `decideFiling` (טהור) + `/intake` מקצה-לקצה (תיוק/יצירה/לא-מזוהה/אישור פיקוח) |
| `backend/test/classify.test.js` | טסטי מנוע הסיווג: גופים, סוגי מסמכים, שנה, מועד חידוש |
| `backend/test/system.test.js` | טסט route עדכון התוכנה (`/api/system/version`) |
| `frontend/vitest.config.js` | קונפיג Vitest (jsdom, globals, setup) |
| `frontend/src/test/setup.js` | טעינת jest-dom matchers |
| `frontend/src/test/components.test.jsx` | טסטי רכיבי React (RTL): Navigation, Dashboard, EntityList, התראות מועדים |
| `frontend/src/test/intake.test.jsx` | טסטי תיבת הקליטה: הצגת החלטת התיוק, אישור עם תיקונים, שיוך ידני, ריבוי קבצים |
| `frontend/src/test/analyze.test.jsx` | טסטי הזיהוי בכרטיס (החלפת קובץ → ניתוח אוטומטי, מועד חידוש, תג פיקוח) |
| `frontend/src/test/deadlines.test.js` | טסטי יחידה לפונקציית הדחיפות (`getUrgency` וכו') |
| `playwright.config.js` | קונפיג E2E: מפעיל backend (DB זרוע) + frontend, chromium מקומי |
| `e2e/smoke.spec.js` | טסטי E2E בדפדפן אמיתי — זרימות מלאות, כולל קליטה חכמה ופיקוח |

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
- **הדרך הראשית: תיבת הקליטה** (ראו "קליטה חכמה" למטה). לכרטיס ספציפי: "🔄 החלף קובץ" (רק בכרטיס שכבר יש בו קובץ) או גרירה ממוקדת לכרטיס
- Backend: `backend/upload.js` (multer) + endpoints `/intake`, `/:id/upload` ו-`/:id/file` ב-`routes/documents.js`
- Frontend: `IntakeBox.jsx` + `DocumentPage.jsx`; handler `handleUploadDocument` ב-`App.jsx`
- אחסון: `backend/uploads/` (ב-`.gitignore`). שם קובץ: `doc_<id>_<timestamp>.<ext>` (קליטה: `doc_x_<timestamp>`)

### קליטה חכמה ותיוק אוטומטי (משאלה #1 — מומש במלואו)
**העיקרון: מקום אחד לזרוק אליו מסמך. המערכת מבינה, מתייקת, והמשתמש רק מפקח.**
- חילוץ טקסט: `backend/extract.js` (`pdf-parse`)
- סיווג: `backend/classify.js` (ISSUERS/DOC_TYPES fingerprints + חילוץ שנה + **חילוץ מועד חידוש** לפי מילות עוגן "בתוקף עד"/"מועד חידוש"...) — **טהור, קל להרחיב**
- החלטת תיוק: `backend/intake.js` (`decideFiling`) — ניקוד מול סלוטים פנויים → תיוק לקיים / יצירת חדש / "ממתין לשיוך"
- Endpoints: `POST /api/documents/intake` (קליטה ותיוק) · `POST /:id/analyze` (ניתוח חוזר לכרטיס)
- Frontend: `components/IntakeBox.jsx` (בדשבורד ובעמוד המסמכים) — זריקת קבצים מרובים → שורת תוצאה לכל קובץ עם שדות תיקון + "אשר ושמור"
- פיקוח: עמודת `documents.auto_filed` — 1 עד שהמשתמש מאשר; תג "🤖 תויק אוטומטית" + סינון "ממתינים לאישור" ב-`DocumentPage.jsx`; מדור התראה בדשבורד
- גרירה ממוקדת לכרטיס ספציפי ("שים את זה כאן") עדיין נתמכת ב-`DocumentPage.jsx`
- ⚠️ מסמך סרוק (תמונה) → אין טקסט → נקלט כ"לא מזוהה" לשיוך ידני (OCR עתידי)

### משימות שנתיות
- Backend: `backend/routes/checklists.js`
- Frontend: `pages/ChecklistPage.jsx`
- קטגוריות משימה: מוגדרות בתוך `ChecklistPage.jsx` (מערך `categories`)

### ייצוא CSV (רשימת פעולות לרו"ח/הדפסה)
- Backend: `backend/routes/export.js` (`/api/export/action-list.csv?year=YYYY`) — BOM ל-UTF-8, escaping
- Frontend: כפתור "📥 ייצוא רשימת פעולות" ב-`ChecklistPage.jsx` (קישור `download`)

### התראות מועדים / רמזור דחיפות
- לוגיקה: `utils/deadlines.js` (`getUrgency` — סף "מתקרב" ב-`SOON_DAYS`)
- תצוגה: סעיף התראות ב-`Dashboard.jsx`, ותגי דחיפות ב-`DocumentPage.jsx`/`ChecklistPage.jsx`
- עיצוב: `.alerts-section` / `.urgency-badge` ב-`styles/dashboard.css`

### חשבונות פרטניים
- Backend: `backend/routes/accounts.js`
- Frontend: `pages/AccountsPage.jsx` (מחובר ב-`App.jsx`, כפתור ב-`Navigation.jsx`)

### דוחות / סיכום כספי
- Backend: `backend/routes/summary.js` (`/api/summary` — נכסים=חשבונות שאינם 'loan', התחייבויות=חשבונות 'loan')
- Frontend: `pages/ReportsPage.jsx` (שולף summary + activity); עיצוב `.networth-*` ב-`styles/dashboard.css`
- ⚠️ מטבעות לא מעורבבים — סיכום נפרד לכל מטבע

### יומן שינויים (audit log)
- טבלה: `activity_log` (schema); helper: `backend/activity.js` (`logActivity`)
- **כל route של mutation** (entities/accounts/documents/checklists) קורא ל-`logActivity` — לשמור על זה בכל route חדש
- תצוגה: סעיף "🕒 שינויים אחרונים" ב-`ReportsPage.jsx` (שולף `/api/activity`)

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
