# PROGRESS.md — יומן התקדמות הפרויקט

מקור האמת למצב הפרויקט: מה הושלם, מה בעבודה, ומה מתוכנן.
המטרה — למנוע עבודה כפולה והתנגשויות בין מטרות.

> **חשוב:** לעדכן קובץ זה בסוף כל יחידת עבודה. להעביר פריטים בין הסעיפים לפי המצב האמיתי.

**עדכון אחרון:** 2026-07-08

---

## 🟢 הושלם (Done)

| # | מה נעשה | קבצים עיקריים | תאריך |
|---|---------|----------------|-------|
| 1 | **תשתית הפרויקט** — מבנה תיקיות, package.json, .gitignore | `package.json`, `.gitignore` | 2026-07-08 |
| 2 | **סכימת DB** — 5 טבלאות (users, financial_entities, accounts, documents, annual_checklist) + אינדקסים | `backend/db/schema.sql` | 2026-07-08 |
| 3 | **שכבת DB** — אתחול sql.js, שמירה לדיסק, פונקציות helper | `backend/db/init.js`, `backend/db/helper.js` | 2026-07-08 |
| 4 | **REST API** — CRUD מלא ל-entities, accounts, documents, checklists | `backend/routes/*.js`, `backend/server.js` | 2026-07-08 |
| 5 | **Frontend בסיסי** — App, ניווט, ניהול state, קריאות API | `frontend/src/App.jsx`, `main.jsx`, `Navigation.jsx` | 2026-07-08 |
| 6 | **Dashboard** — סטטיסטיקות, גופים לפי סוג, ממתינים | `frontend/src/components/Dashboard.jsx` | 2026-07-08 |
| 7 | **ניהול גופים פיננסיים** — טופס + רשימה + סינון | `EntitiesPage.jsx`, `EntityForm.jsx`, `EntityList.jsx` | 2026-07-08 |
| 8 | **ניהול מסמכים** — טופס, סינון סטטוס, cards צבעוניים | `frontend/src/pages/DocumentPage.jsx` | 2026-07-08 |
| 9 | **משימות שנתיות** — טופס משימות, הפרדת ממתין/הושלם | `frontend/src/pages/ChecklistPage.jsx` | 2026-07-08 |
| 10 | **עיצוב RTL** — כל ה-CSS בעברית | `frontend/src/index.css` | 2026-07-08 |
| 11 | **קבצי תיעוד** — README, CLAUDE.md, INDEX.md | `README.md`, `CLAUDE.md`, `INDEX.md` | 2026-07-08 |
| 12 | **קבצי-על נוספים** — PROGRESS, WISHLIST, LESSONS, REPORTS | `PROGRESS.md`, `WISHLIST.md`, `LESSONS.md`, `REPORTS.md` | 2026-07-08 |
| 13 | **פיצול index.css** — יישום כלל 500 השורות: 627 שורות → 7 partials תחת `styles/` | `frontend/src/styles/*.css`, `index.css` | 2026-07-08 |
| 14 | **אימות API מקצה-לקצה + תיקון sql.js** — כל ה-CRUD עובד ושורד restart | `backend/db/helper.js` | 2026-07-08 |
| 15 | **Seed מצאי אמיתי** — 18 גופים, 11 מסמכים, 7 משימות | `backend/db/seed.js` | 2026-07-08 |
| 16 | **תיקון מיקום vite.config** — הועבר לשורש→`frontend/`; פרוקסי `/api` עובד | `frontend/vite.config.js` | 2026-07-08 |
| 17 | **אימות ויזואלי (screenshot)** — הדשבורד מרנדר את המצאי בעברית RTL, אין שגיאות | — | 2026-07-08 |
| 18 | **החלפת מונח "תב"ר" → "משימות שנתיות"** — בכל ה-UI והתיעוד (מונח שגוי; תב"ר = תקציב בלתי רגיל) | 12 קבצים | 2026-07-08 |
| 19 | **עדכון/מחיקה מה-UI** — בורר סטטוס+מחיקה למסמכים; סמן-הושלם/החזר+מחיקה למשימות. אומת בדפדפן | `DocumentPage.jsx`, `ChecklistPage.jsx`, `App.jsx` | 2026-07-08 |
| 20 | **פירמידת טסטים מלאה** — 14 API + 10 רכיבים + 5 E2E = 29 טסטים ירוקים. refactor: `createApp` + DB בזיכרון | `backend/app.js`, `backend/test/`, `frontend/src/test/`, `e2e/` | 2026-07-08 |
| 21 | **רמזור התראות מועדים** — דחיפות צבעונית (באיחור/מתקרב) בדשבורד ובכרטיסים; seed עם מועדים; 42 טסטים ירוקים | `utils/deadlines.js`, `Dashboard.jsx`, `DocumentPage.jsx`, `ChecklistPage.jsx`, `seed.js` | 2026-07-08 |
| 22 | **עמוד חשבונות** — CRUD מלא ב-UI (יתרה/מטבע/מספר) + ניווט | `pages/AccountsPage.jsx`, `App.jsx`, `Navigation.jsx` | 2026-07-08 |
| 23 | **עריכה מלאה למסמך/משימה** — טופס עריכה (שם/תאריך/גוף/קטגוריה), לא רק סטטוס | `DocumentPage.jsx`, `ChecklistPage.jsx` | 2026-07-08 |
| 24 | **הרחבת טסטים** — accounts API + AccountsPage + E2E (חשבון/עריכה) = 54 טסטים | `backend/test/`, `frontend/src/test/`, `e2e/` | 2026-07-08 |
| 25 | **העלאת קבצי PDF/תמונה למסמכים** — multer, endpoints upload/file, כפתור+קישור ב-UI; 60 טסטים ירוקים | `backend/upload.js`, `routes/documents.js`, `DocumentPage.jsx`, `App.jsx` | 2026-07-08 |
| 26 | **דוח סיכום נכסים/התחייבויות** — `/api/summary`, שווי נקי לפי מטבע, התפלגות נכסים; seed עם יתרות; 67 טסטים | `routes/summary.js`, `pages/ReportsPage.jsx`, `seed.js`, `Navigation.jsx` | 2026-07-08 |
| 27 | **השוואת שנה-לשנה (משאלה #2)** — `documents.year` + `active_from/until` (מיגרציה), `/api/comparison/:year`, עמוד עם missing/received/added/ended; seed עם היסטוריית 2025; 77 טסטים | `routes/comparison.js`, `pages/ComparisonPage.jsx`, `init.js`, `schema.sql`, `seed.js` | 2026-07-08 |
| 28 | **זיהוי חכם של מסמכים (משאלה #1, MVP)** — חילוץ טקסט PDF + מנוע סיווג (גוף/סוג/שנה), `/analyze`, כפתור "נתח"+"החל הצעה"; 90 טסטים ירוקים | `classify.js`, `extract.js`, `routes/documents.js`, `DocumentPage.jsx` | 2026-07-08 |
| 29 | **רכבים ורישיונות** — סוגי גופים חדשים (vehicle/license) + קטגוריות; seed עם ביטוח חובה/מקיף/טסט, כלי יריה, מתווך נדל"ן. משתלב ברמזור המועדים; 92 טסטים | `EntityForm.jsx`, `Dashboard.jsx`, `EntityList.jsx`, `EntitiesPage.jsx`, `seed.js` | 2026-07-08 |
| 30 | **מצב צפייה-בלבד** — toggle בניווט שמסתיר כל כפתורי העריכה (React Context + localStorage); 96 טסטים | `ReadOnlyContext.js`, `App.jsx`, `Navigation.jsx`, כל העמודים | 2026-07-08 |
| 31 | **ייצוא רשימת פעולות CSV** — endpoint עם BOM+escaping, כפתור הורדה; לרו"ח/הדפסה; 99 טסטים | `routes/export.js`, `ChecklistPage.jsx` | 2026-07-08 |
| 32 | **יומן שינויים (audit log)** — טבלת `activity_log`, `logActivity` בכל mutation, `/api/activity`, סעיף "שינויים אחרונים" בדוחות; 103 טסטים | `activity.js`, `routes/activity.js`, כל ה-routes, `ReportsPage.jsx`, `schema.sql` | 2026-07-08 |
| 33 | **עדכון README** — מדריך שימוש מלא ועדכני | `README.md` | 2026-07-08 |
| 34 | **דוח חודשי** — `/api/report/monthly`, עמוד עם בורר חודש (מסמכים/משימות שמועדם החודש + שינויים); 109 טסטים | `routes/report.js`, `pages/MonthlyPage.jsx`, `Navigation.jsx` | 2026-07-08 |
| 35 | **כלל Definition of Done** — עדכון תיעוד/טסטים חלק מחובת סיום כל שלב קוד | `CLAUDE.md` | 2026-07-08 |
| 36 | **סיום הקמה לשימוש** — הגשת frontend מהשרת (פקודה+כתובת אחת, `npm run app`), `inventory.js` משותף, `starter`/`reset`; 111 טסטים | `app.js`, `db/inventory.js`, `db/starter.js`, `db/reset.js`, `package.json`, `README.md` | 2026-07-08 |
| 37 | **פורט 3018 + הרצה כשירות** — שינוי הפורט מ-3001 ל-3018 בכל המקומות; שירות pm2 (autorestart + boot), סקריפטי `service:*` | `server.js`, `vite.config.js`, `playwright.config.js`, `ecosystem.config.cjs`, `package.json` | 2026-07-08 |
| 38 | **זיהוי אוטומטי + drag&drop** — ניתוח רץ לבד מיד עם ההעלאה; גרירת קובץ לכרטיס; 112 טסטים | `DocumentPage.jsx`, `styles/cards.css` | 2026-07-08 |
| 39 | **זיהוי אוטומטי של מועד חידוש + תיקון נשמר** — חילוץ תאריך תוקף מטקסט המסמך (מילות עוגן: "בתוקף עד", "תוקף עד", "מועד חידוש"...), שדה תאריך נערך בתיבת הזיהוי, "החל ושמור" שומר את המועד (כולל תיקון ידני) ל-`required_by_date`; 116 טסטים | `classify.js`, `DocumentPage.jsx`, `styles/cards.css`, `classify.test.js`, `analyze.test.jsx`, `smoke.spec.js` | 2026-07-08 |
| 40 | **הרצה מקומית על Windows** — סקריפטי `.bat` להרצה בדאבל-קליק: `run-local.bat` (התקנה+בנייה+נתונים+הרצה), `start-server.bat` (הרצה מהירה), `install-boot.bat` (עלייה אוטומטית עם המחשב דרך Task Scheduler); הודעות באנגלית ASCII (עברית ב-.bat נשברת); README+INDEX עודכנו | `run-local.bat`, `start-server.bat`, `install-boot.bat`, `README.md`, `INDEX.md`, `.gitignore` | 2026-07-08 |
| 41 | **עדכון גרסה בדאבל-קליק (Windows)** — `update.bat`: `git pull` + התקנה + בנייה מחדש, בלי לגעת בנתונים (`finance.db` מחוץ ל-git) | `update.bat`, `README.md`, `INDEX.md` | 2026-07-08 |
| 42 | **כפתור "בדיקת עדכון תוכנה" בתוך האפליקציה** — route `/api/system` (גרסה/בדיקה/החלה מול git), רכיב `UpdateChecker` בעמוד הבית שמציג שינויים זמינים ומתקין בלחיצה; 55 API + 49 רכיבים טסטים | `backend/routes/system.js`, `backend/app.js`, `components/UpdateChecker.jsx`, `components/Dashboard.jsx`, `styles/dashboard.css`, `system.test.js`, `updateChecker.test.jsx`, `README.md`, `INDEX.md` | 2026-07-08 |
| 51 | **תיקון: שיוך שגוי לגוף כשGPT מזהה נכון** — GPT ניתח נכון (תקציר/סכומים מדויקים) אבל השיוך לגוף הקיים נכשל: `matchEntity` בדק substring גולמי בין שם ה-issuer החופשי מ-GPT ("ONE ZERO Digital Bank LTD") לשם המדויק ב-DB ("וואן זירו — השקעות") — לא תואמים מילולית. תוקן: מתרגמים קודם דרך `ISSUERS` fingerprints (מיוצא מ-`classify.js`), substring גולמי כ-fallback בלבד. לקח #7. 163 טסטים | `classify.js` (export ISSUERS), `understand.js` (matchEntity), `understand.test.js`, `LESSONS.md`, `INDEX.md` | 2026-07-08 |
| 50 | **תקציר, סכומים ותאריך המסמך (בונוס GPT)** — כל מסמך שעובד ע"י GPT מקבל: תקציר קצר (`summary`), רשימת סכומים עם הקשר (`amounts`, JSON), ותאריך המסמך עצמו (`doc_date`, שונה ממועד חידוש). מוצג בתיבת הקליטה, בתיבת הניתוח החוזר ובכרטיס המסמך הקבוע. הכללים המקומיים לא מפיקים את זה (רק ניתוח-תוכן אמיתי יכול) — שדות ריקים כשאין GPT. 161 טסטים | `gpt.js`, `understand.js`, `routes/documents.js`, `db/schema.sql`, `db/init.js`, `IntakeBox.jsx`, `DocumentPage.jsx`, `styles/intake.css`, `styles/cards.css`, `understand.test.js`, `intake.test.js`, `intake.test.jsx`, `analyze.test.jsx` | 2026-07-08 |
| 49 | **תיקון קריטי — זיהוי-שווא "מגדל+867" ו-GPT שלא רץ** — מונחי סיווג כלליים ("מגדל"=בניין, "867"=כל סכום) גרמו להתאמת-שווא בביטחון גבוה, שגרמה לדילוג שקט על GPT. תוקן: מונחים ספציפיים בלבד (צירופים, "טופס 867" ולא "867"); **כשמוגדר מפתח — GPT רץ תמיד**; חיווי גלוי "🤖 GPT / 📋 כללים" לכל מסמך + באנר סטטוס (`/api/system/ai-status`). לקח #6. 156 טסטים | `classify.js`, `understand.js`, `routes/system.js`, `IntakeBox.jsx`, `styles/intake.css`, `classify.test.js`, `understand.test.js`, `intake.test.js`, `system.test.js`, `intake.test.jsx`, `LESSONS.md` | 2026-07-08 |
| 48 | **החלפת ספק הזיהוי: Claude → GPT (OpenAI)** — למשתמש יש מפתח OpenAI; `gpt.js` (`gpt-4o`, ראייה + structured outputs, PDF כקובץ/תמונה כ-data URL) החליף את `claude.js`; אותו ממשק (`understandWithGPT`), אותה נפילה חכמה. מפתח: `OPENAI_API_KEY` ב-`.env` | `gpt.js` (חדש), `claude.js` (נמחק), `understand.js`, `routes/documents.js`, `.env.example`, `understand.test.js`, `package.json`, `README.md`, `INDEX.md` | 2026-07-08 |
| 47 | **זיהוי מסמכים אמיתי — מנוע היברידי (כללים + Claude)** — הזיהוי הקודם (התאמת מילים בטקסט) נכשל על סרוקים ועברית משובשת. נוסף `understand.js`: כללים מקומיים קודם (חינם), ונפילה ל-Claude ראייה (`claude.js`, `claude-opus-4-8`, structured output) לסרוקים/עברית/פורמט לא מוכר — רק כשהביטחון נמוך ורק עם `ANTHROPIC_API_KEY`. תמיכה בעברית הפוכה בכללים. `.env` דרך dotenv. 148 טסטים | `understand.js`, `claude.js`, `classify.js`, `routes/documents.js`, `server.js`, `.env.example`, `understand.test.js`, `classify.test.js`, `package.json` | 2026-07-08 |
| 46 | **זיהוי מסמכים כפולים** — `documents.file_hash` (SHA-256); קובץ שכבר קיים מוחזר כ-`action:'duplicate'` ולא מועלה שוב. התראה + קישור לקיים בתיבת הקליטה; כפתור "השלך" למחיקה+העלאה מחדש | `routes/documents.js`, `db/schema.sql`, `db/init.js`, `IntakeBox.jsx`, `intake.test.js`, `intake.test.jsx` | 2026-07-08 |
| 45 | **ניקוי UI — אייקונים לעריכה/מחיקה** — כפתורי "ערוך"/"מחק" הפכו לאייקונים בלבד (עם tooltip+aria-label) בכל העמודים; סגנון `btn-icon` | `EntityList.jsx`, `AccountsPage.jsx`, `ChecklistPage.jsx`, `DocumentPage.jsx`, `styles/forms.css`, `components.test.jsx`, `readonly.test.jsx` | 2026-07-08 |
| 44 | **יצירת גוף חדש מתוך שורת הקליטה** — מסמך של חברה שלא ברשימה: כפתור "➕ גוף חדש" עם שם+סוג ממולאים מהזיהוי (`suggestedType` ב-`classify.js`) וניתנים לעריכה; יוצר גוף ומשייך מיד. `ENTITY_TYPES` הוצא לקובץ משותף (DRY). 138 טסטים | `classify.js`, `IntakeBox.jsx`, `constants/entityTypes.js`, `EntityForm.jsx`, `Dashboard.jsx`, `DocumentPage.jsx`, `App.jsx`, `styles/intake.css`, `classify.test.js`, `intake.test.jsx` | 2026-07-08 |
| 43 | **שיפוץ UI/UX — קליטה חכמה ותיוק אוטומטי (מימוש מלא של משאלה #1)** — תיבת קליטה אחת (דשבורד+מסמכים): זורקים קובץ, המערכת מזהה **ומתייקת לבד** (סלוט קיים/מסמך חדש/"ממתין לשיוך"), והמשתמש רק מפקח ("אשר ושמור" עם תיקונים). אוחדו 5 זרימות הוספה כפולות; הוסר כפתור "נתח"; טופס ידני הפך משני; תג פיקוח "🤖 תויק אוטומטית" + סינון "ממתינים לאישור" + מדור בדשבורד. תוקן באג: רענון נתונים מחק state (מסך טעינה מיותר). 136 טסטים | `backend/intake.js`, `routes/documents.js`, `db/schema.sql` (auto_filed), `db/init.js`, `IntakeBox.jsx`, `DocumentForm.jsx`, `DocumentPage.jsx`, `Dashboard.jsx`, `App.jsx`, `styles/intake.css`, `intake.test.js`, `intake.test.jsx`, `analyze.test.jsx`, `smoke.spec.js` | 2026-07-08 |

---

## 🟡 בעבודה עכשיו (In Progress)

| מה | סטטוס | הערות |
|----|-------|-------|
| _(אין משימה פעילה)_ | | |

> כשמתחילים משימה — להוסיף אותה כאן. כשמסיימים — להעביר ל"הושלם".

---

## 🐛 בעיות ידועות / חובות טכניים (Known Issues)

| בעיה | חומרה | פירוט |
|------|-------|-------|
| ~~בדיקת API מקצה-לקצה~~ | ✅ נסגר | תוקן (undefined→null ב-helper). ראה LESSONS #2. |
| ~~אין נתוני דמו~~ | ✅ נסגר | נוצר `seed.js` עם המצאי האמיתי. |
| PUT דורס שדות | נמוכה | PUT מלא מאפס שדות שלא נשלחו בגוף. ה-frontend שולח אובייקט מלא, אז לא קריטי — לשקול PATCH חלקי בעתיד. |
| הרשאות read-only לבן/בת זוג | נמוכה | הטבלה `users` תומכת ב-role, אבל אין עדיין מנגנון אימות/הרשאות בפועל. |
| ~~עדכון/מחיקת מסמכים ומשימות מה-UI~~ | ✅ נסגר | נוסף בורר סטטוס+מחיקה למסמכים, וסמן-הושלם/החזר+מחיקה למשימות. |

---

## 🔵 מתוכנן — Backlog (לפי סדר עדיפות)

### שלב 1 — השלמת הבסיס ✅ הושלם
- [x] אימות מלא של זרימת ה-API מקצה-לקצה (טסטים)
- [x] Seed script עם נתוני דוגמה
- [x] עדכון סטטוס מסמך/משימה מה-UI
- [x] מחיקת מסמכים/משימות מה-UI
- [x] עמוד חשבונות (CRUD מלא + ניווט)
- [x] עריכה מלאה של מסמך/משימה דרך טופס

### שלב 2 — ניהול מסמכים מתקדם
- [x] **רמזור/התראה לדוחות שמתקרב מועד הגשתם** — סעיף התראות + תגי דחיפות
- [x] העלאת קבצים (PDF/תמונות) — multer + כפתור העלאה/צפייה
- [x] זיהוי חכם: חילוץ טקסט PDF + סיווג (גוף/סוג/שנה) — משאלה #1 MVP
- [ ] OCR למסמכים סרוקים (תמונות) — המשך ל#1
- [ ] קישורים ישירים לאתרי הגופים (יש שדה + תצוגה ב-EntityList; אפשר לשפר)

### שלב 3 — דוחות וניתוח
- [x] סיכום נכסים והתחייבויות (שווי נקי לפי מטבע + התפלגות)
- [x] ייצוא רשימת פעולות ל-CSV (לרו"ח/הדפסה)
- [x] יומן שינויים / audit log + סעיף "שינויים אחרונים"
- [x] דוח חודשי (שינויים + מועדים לחודש)
- [ ] מעקב ניירות ערך (דורש feed מחירים חיצוני)
- [ ] ייצוא/סיכום תנועות בנק

### שלב 4 — אוטומציה
- [ ] אינטגרציה עם API של בנקים לשליפה אוטומטית
- [x] מצב צפייה-בלבד לבן/בת זוג (UI mode) — נעשה
- [ ] מנגנון אימות והרשאות אמיתי (login, משתמשים) — עדיין פתוח

---

## 📌 החלטות ארכיטקטורה (למה עשינו כך)

- **sql.js ולא better-sqlite3/sqlite3** — בסביבה הזו native bindings לא נטענו (`Could not locate the bindings file`). sql.js הוא pure JavaScript ולכן עובד בכל מקום. המחיר: ה-DB בזיכרון ונשמר לקובץ בכל כתיבה.
- **Web app ולא Sheets/CLI** — לפי בקשת המשתמש: dashboard ויזואלי + אפשרות שיתוף read-only.
- **Entity-based model** — מודל גמיש שמתרחב בקלות ככל שמוסיפים סוגי מכשירים פיננסיים.
