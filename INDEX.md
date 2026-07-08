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
| `.env.example` | תבנית להגדרת `OPENAI_API_KEY` (זיהוי חכם). להעתיק ל-`.env` ולמלא. `.env` לא נכנס ל-git |
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
| `backend/routes/documents.js` | CRUD למסמכים + **קליטה חכמה** (`/intake` — הבנה היברידית + תיוק אוטומטי + **זיהוי כפילויות** לפי SHA-256 + **השלמה אוטומטית של משימה שנתית תואמת**) + העלאה/הורדה (`/:id/upload`, `/:id/file`) | `/api/documents` |
| `backend/intake.js` | לוגיקת התיוק החכם (טהורה): `decideFiling` — ניקוד התאמה לסלוטים פנויים → matched/create/unmatched; `HOLDING_ENTITY_NAME` |
| `backend/upload.js` | קונפיג multer: תיקיית `uploads/`, סינון סוגים (PDF/תמונה), הגבלת 10MB. `UPLOAD_DIR` דרך env |
| `backend/extract.js` | חילוץ טקסט מ-PDF (`pdf-parse`), best-effort — מחזיר '' אם נכשל/סרוק |
| `backend/classify.js` | מנוע סיווג מבוסס-כללים (טהור): `classifyText` → גוף/סוג/שנה/מועד/ביטחון + `suggestedType`; תומך בעברית הפוכה |
| `backend/gpt.js` | שכבת GPT (ראייה): `understandWithGPT` שולח PDF/תמונה ל-`gpt-4o` ומחזיר שדות מובנים (structured outputs) כולל תקציר/סכומים/תאריך מסמך. פעיל רק עם `OPENAI_API_KEY` |
| `backend/understand.js` | **מנוע הבנה היברידי**: `understandDocument` — כללים מקומיים תמיד ראשון; **GPT רץ תמיד כשמוגדר מפתח** (לא רק בביטחון נמוך). מחזיר מבנה `classifyText` + `method`/`summary`/`amounts`/`docDate`. `matchEntity` מתאם שם-issuer חופשי מ-GPT לגוף קיים דרך טביעות-האצבע של `classify.js` (לא substring גולמי — ראה LESSONS #7) |
| `backend/routes/checklists.js` | CRUD למשימות שנתיות + סינון לפי שנה/סטטוס. `SELECT_WITH_JOINS` מצרף שם המסמך שהשלים אוטומטית | `/api/checklists` |
| `backend/checklistMatch.js` | התאמת מסמך שהתקבל למשימה שנתית תואמת (טהורה): `matchChecklistTask` — לסימון "V" אוטומטי |
| `backend/routes/summary.js` | דוח סיכום: אגרגציית נכסים/התחייבויות/שווי-נקי לפי מטבע + ספירות | `/api/summary` |
| `backend/routes/comparison.js` | השוואת שנה-לשנה: missing/received/added/ended לפי `documents.year` ו-`active_from/until` | `/api/comparison/:year` |
| `backend/routes/export.js` | ייצוא CSV של רשימת פעולות (מסמכים+משימות ממתינים), עם BOM לעברית | `/api/export/action-list.csv` |
| `backend/routes/activity.js` | שליפת שינויים אחרונים מהיומן | `/api/activity?limit=N` |
| `backend/routes/report.js` | דוח חודשי: שינויים + מסמכים/משימות שמועדם בחודש | `/api/report/monthly?month=YYYY-MM` |
| `backend/routes/system.js` | עדכון תוכנה מול git + סטטוס זיהוי חכם (`ai-status` — האם `OPENAI_API_KEY` מוגדר). `spawn` shell, פקודות קבועות ללא קלט משתמש | `/api/system/version` · `/update/check` · `/update/apply` · `/ai-status` |
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
| `frontend/src/components/IntakeBox.jsx` | **תיבת הקליטה החכמה** — נקודת הכניסה האחת למסמכים: זריקת קבצים (מרובים) → `/api/documents/intake` → שורות "מה הבנתי ולאן תייקתי" עם שדות תיקון + "אשר ושמור"; **יצירת גוף חדש בשורה** (שם+סוג ממולאים מהזיהוי, ניתן לעריכה) דרך `onAddEntity` |
| `frontend/src/constants/entityTypes.js` | `ENTITY_TYPES` — מקור אמת יחיד לסוגי גופים, כולל `donation` 🎗️ (משמש `EntityForm` ו-`IntakeBox`). ⚠️ עדיין יש מפות תווית/אייקון כפולות ב-`EntityList.jsx`, `Dashboard.jsx`, `ReportsPage.jsx`, `EntitiesPage.jsx` — סוג גוף חדש דורש עדכון בכולן |
| `frontend/src/components/DocumentForm.jsx` | טופס הוספה/עריכה ידנית של מסמך (הדרך המשנית — ליצירת סלוט מתוכנן) |
| `frontend/src/components/UpdateChecker.jsx` | כפתור "בדיקת עדכון תוכנה": בודק מול `/api/system/update/check`, מציג שינויים זמינים ומתקין דרך `/update/apply` |
| `frontend/src/components/EntityForm.jsx` | טופס הוספה/עריכה של גוף פיננסי (כולל רשימת הקטגוריות לכל סוג) |
| `frontend/src/components/EntityList.jsx` | תצוגת רשימת הגופים כ-cards **מתקפלים** (ברירת מחדל: מקופל — כותרת שם+קטגוריה בלבד; לחיצה פותחת פרטים+עריכה/מחיקה) |

### Frontend — עמודים (`frontend/src/pages/`)

| קובץ | תפקיד |
|------|-------|
| `frontend/src/pages/EntitiesPage.jsx` | עמוד הגופים הפיננסיים: סינון לפי סוג, חיבור הטופס והרשימה |
| `frontend/src/pages/DocumentPage.jsx` | עמוד המסמכים: תיבת הקליטה למעלה, סינון (כולל "🤖 ממתינים לאישור"), **תצוגת רשימה מתקפלת** (`.documents-list`; כרטיס מקופל כברירת מחדל — שם/סטטוס/גוף/🤖 בכותרת; לחיצה פותחת פרטים+פעולות) — תג "תויק אוטומטית" + אשר/תקן, החלפת קובץ, גרירה ממוקדת לכרטיס |
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
| `backend/test/intake.test.js` | טסטים לקליטה: `decideFiling` + `/intake` מקצה-לקצה (תיוק/יצירה/לא-מזוהה/אישור/כפילות/summary+amounts+doc_date/**השלמת משימה שנתית אוטומטית**) |
| `backend/test/checklistMatch.test.js` | טסטי יחידה ל-`matchChecklistTask` (טהורה) |
| `backend/test/understand.test.js` | טסטים למנוע ההיברידי: כללים→GPT תמיד-כשמוגדר-מפתח, כשל→גיבוי, **summary/amounts/docDate** (פונקציית ה-AI מוזרקת, בלי רשת) |
| `backend/test/classify.test.js` | טסטי מנוע הסיווג: גופים, סוגי מסמכים, שנה, מועד חידוש |
| `backend/test/system.test.js` | טסט route עדכון התוכנה (`/api/system/version`) |
| `frontend/vitest.config.js` | קונפיג Vitest (jsdom, globals, setup) |
| `frontend/src/test/setup.js` | טעינת jest-dom matchers |
| `frontend/src/test/components.test.jsx` | טסטי רכיבי React (RTL): Navigation, Dashboard, EntityList, התראות מועדים |
| `frontend/src/test/intake.test.jsx` | טסטי תיבת הקליטה: הצגת החלטת התיוק, אישור עם תיקונים, שיוך ידני, ריבוי קבצים, תקציר/סכומים/תאריך מסמך, **הודעת השלמת משימה שנתית** |
| `frontend/src/test/checklist.test.jsx` | טסטי `ChecklistPage`: תג פיקוח "הושלם אוטומטית", אישור, "החזר לממתין" מנקה קישור למסמך |
| `frontend/src/test/analyze.test.jsx` | טסטי הזיהוי בכרטיס (החלפת קובץ → ניתוח אוטומטי, מועד חידוש, תג פיקוח, **תקציר/סכומים** בתיבת הניתוח ובכרטיס) |
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
- **הבנה היברידית** (`backend/understand.js`): כללים מקומיים תמיד רצים ראשונים (`extract.js`+`classify.js`, חינם ומיידי). **כשמוגדר `OPENAI_API_KEY` — GPT רץ תמיד** (לא רק בביטחון נמוך; ראה LESSONS #6 — דילוג-על-סמך-ביטחון-כללים חשוף להתאמות-שווא). הכללים משמשים גיבוי אם GPT נכשל (`aiError`)
- כללים: ISSUERS/DOC_TYPES fingerprints (**מונחים ספציפיים בלבד** — לא מילים כלליות) + חילוץ שנה + **מועד חידוש** (מילות עוגן) + **עברית הפוכה** + `suggestedType`
- GPT: `structured outputs` → `{issuerName, docType, entityType, year, docDate, renewalDate, summary, amounts, confidence}` (מודל `gpt-4o`, ניתן לעקיפה ב-`FINANCE_GPT_MODEL`). **summary/amounts/docDate בונוס בלעדי ל-GPT** — הכללים לא מפיקים אותם
- **סטטוס גלוי:** `GET /api/system/ai-status` — האם המפתח מוגדר; באנר בתיבת הקליטה + תג "🤖 GPT / 📋 כללים" לכל מסמך (שקיפות: המשתמש רואה מיד אם GPT באמת רץ)
- החלטת תיוק: `backend/intake.js` (`decideFiling`) — ניקוד מול סלוטים פנויים → תיוק לקיים / יצירת חדש / "ממתין לשיוך"
- **זיהוי כפילויות:** `documents.file_hash` (SHA-256) — קובץ שכבר קיים מוחזר כ-`action: 'duplicate'` ולא מועלה שוב
- **תקציר, סכומים ותאריך המסמך** (בונוס GPT): `documents.summary` (תקציר קצר) · `documents.amounts` (JSON array של שורות סכום) · `documents.doc_date` (תאריך שמופיע על המסמך עצמו, שונה מ-`required_by_date`/מועד חידוש). מוצגים בכרטיס המסמך, בתיבת הניתוח ובשורת הקליטה
- Endpoints: `POST /api/documents/intake` (קליטה+תיוק+דדופ) · `POST /:id/analyze` (ניתוח חוזר)
- Frontend: `components/IntakeBox.jsx` — זריקת קבצים מרובים → שורת תוצאה עם שדות תיקון + "אשר ושמור"; כפתור "🗑️ השלך" (מחיקה+העלאה מחדש); התראת כפול עם קישור לקיים
- **גוף חדש מהשורה:** גוף שזוהה אך לא קיים → "➕ גוף חדש" עם שם+סוג ממולאים מהזיהוי, ניתן לעריכה; יוצר ומשייך מיד
- פיקוח: `documents.auto_filed` — תג "🤖 תויק אוטומטית" + סינון "ממתינים לאישור" + מדור בדשבורד
- ⚙️ הגדרת מפתח: `.env.example` → `.env` עם `OPENAI_API_KEY` (ראה `backend/server.js` טוען `dotenv/config`)

### משימות שנתיות
- Backend: `backend/routes/checklists.js`
- Frontend: `pages/ChecklistPage.jsx`
- קטגוריות משימה: מוגדרות בתוך `ChecklistPage.jsx` (מערך `categories`)

### השלמה אוטומטית של משימה עקב מסמך שהתקבל
**העיקרון: אם המערכת קלטה מסמך שממלא משימה שנתית (למשל "טופס 106"), היא מסמנת V לבד — המשתמש רק מפקח.**
- התאמה: `backend/checklistMatch.js` (`matchChecklistTask`, טהורה) — ניקוד מול משימות פתוחות (`pending`/`in_progress`) של השנה הנוכחית: התאמת ביטוי מלא של סוג/שם המסמך **או** שם הגוף המנפיק בתוך `task_name`/`task_category`
- הפעלה: `routes/documents.js` (`tryAutoCompleteChecklist`) — נקרא אחרי צירוף קובץ, גם ב-`POST /intake` וגם ב-`POST /:id/upload`; מחזיר `matchedTask` בתגובה
- DB: `annual_checklist.auto_completed` + `completed_by_document_id` (מי סימן ולמה) — `routes/checklists.js` מצרף `completed_by_document_name` ב-JOIN
- פיקוח: תג "🤖 הושלם אוטומטית עקב מסמך: X" + "✓ אשר" (`ChecklistPage.jsx`, מדור "הושלמו") — מנקה את הדגל בלי לשנות סטטוס; "↩️ החזר לממתין" מנקה גם את `completed_by_document_id`
- הודעה בתיבת הקליטה: `IntakeBox.jsx` מציג "✔️ גם סומנה כהושלמה משימה שנתית: X" כשיש `matchedTask`

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
