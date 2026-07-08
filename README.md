# 💰 מערכת ניהול מסמכים פיננסיים

Web app לניהול ומעקב אחר **כל** הנכסים, ההתחייבויות והמסמכים של משק בית — עם דגש על *לדעת מה צריך להגיש, לאן, ומה חסר*.

מנהל בנקים, ביטוחים, השקעות, נדל"ן ומשכנתאות, קרנות והשתלמות, **וגם** רכבים (ביטוח חובה/מקיף, טסט) ורישיונות (כלי יריה, מתווך נדל"ן) — כל דבר עם מועד חידוש/תפוגה.

---

## ✨ תכונות

| תחום | מה זה נותן |
|------|-----------|
| 🏦 **ניהול גופים** | בנקים, ביטוחים, השקעות, נדל"ן, הלוואות, רכבים, רישיונות — יצירה/עריכה/מחיקה + סינון |
| 💳 **חשבונות** | חשבונות פרטניים בתוך גוף, עם יתרה ומטבע |
| 📄 **מסמכים** | מעקב דוחות (867 וכו'), סטטוסים, מועדי הגשה, **העלאת PDF/תמונה** |
| 🔍 **זיהוי חכם** | מנתח PDF שהועלה ומזהה לבד גוף/סוג/שנה (מבוסס-כללים) |
| ✅ **משימות שנתיות** | תב"ר של דוחות להגשה (מס הכנסה, מע"מ, ביטוח לאומי...) |
| 🚦 **רמזור מועדים** | התראות צבעוניות על דוחות/משימות שבאיחור או מתקרבים |
| 🔄 **השוואת שנים** | מזהה מה חסר השנה לפי מה שהיה אשתקד (missing/received/added/ended) |
| 📊 **דוחות** | שווי נקי לפי מטבע, התפלגות נכסים, ספירות |
| 🕒 **יומן שינויים** | audit log — כל פעולה נרשמת עם תיאור וזמן |
| 📥 **ייצוא CSV** | רשימת פעולות שנתית להורדה (לרו"ח/הדפסה) |
| 👁️ **מצב צפייה** | מסתיר כפתורי עריכה — להראות לבן/בת זוג בלי חשש |

---

## 🛠️ טכנולוגיה

- **Backend:** Node.js + Express (ESM)
- **Database:** SQLite דרך `sql.js` (pure JavaScript — בלי native modules)
- **Frontend:** React 18 + Vite, ממשק עברית RTL
- **קבצים:** multer (העלאה) · pdf-parse (חילוץ טקסט)
- **טסטים:** node:test + supertest · Vitest + Testing Library · Playwright

---

## 🚀 הרצה

**דרישות:** Node.js 18+ · **התקנה:** `npm run setup`

### מצב שימוש (פקודה אחת, כתובת אחת) — מומלץ
```bash
npm run app          # בונה את ה-frontend ומריץ הכל על port 3001
```
פותחים: **`http://localhost:3001`** — זהו. השרת מגיש גם את האפליקציה וגם את ה-API.

### מצב פיתוח (שני טרמינלים, hot-reload)
```bash
npm start                     # Backend על 3001
cd frontend && npm run dev    # Frontend על 5173
```

### הכנת נתונים
```bash
npm run starter   # מבנה המצאי שלך נקי (גופים + סלוטים למסמכים) — מוכן להעלאת קבצים אמיתיים
npm run seed      # נתוני דמו מלאים (יתרות, היסטוריה) — להתרשמות/בדיקה
npm run reset     # מחיקת כל הנתונים — התחלה ריקה לגמרי
```
> ה-DB נשמר מקומית ב-`backend/db/finance.db` (לא נכנס ל-git). כל הנתונים נשארים בין הפעלות.

---

## 🧪 בדיקות (103 טסטים, פירמידה מלאה)

רצים מול DB מבודד בזיכרון — **לא נוגעים בנתונים האמיתיים**:

```bash
npm run test:all         # הכל: API + רכיבים + E2E
npm run test:api         # 46 טסטי API (node --test + supertest)
npm run test:components  # 41 טסטי רכיבי React (Vitest + RTL)
npm run test:e2e         # 16 טסטי E2E בדפדפן (Playwright)
```

---

## 📁 מבנה הפרויקט

```
backend/
├── db/       schema.sql · init.js (+migrations) · helper.js · seed.js
├── routes/   entities · accounts · documents · checklists · summary · comparison · export · activity
├── app.js    יצירת Express app (createApp) — מיוצא לטסטים
├── server.js נקודת כניסה (init + listen)
├── upload.js (multer) · extract.js (PDF) · classify.js (זיהוי) · activity.js (audit)
└── test/     api.test.js · classify.test.js

frontend/src/
├── components/  Navigation · Dashboard · EntityForm · EntityList
├── pages/       Entities · Accounts · Documents · Checklist · Reports · Comparison
├── utils/       deadlines.js (רמזור)
├── styles/      partials לפי אזור
├── ReadOnlyContext.js · App.jsx
└── test/        טסטי רכיבים

מסמכי-על: CLAUDE.md · INDEX.md · PROGRESS.md · WISHLIST.md · LESSONS.md · REPORTS.md
```

> **מדריך ניווט:** `INDEX.md` מתעד כל קובץ + חתך "לפי נושא" (איזה קבצים לגעת לכל שינוי).

---

## 📊 עיקרי ה-API

| Endpoint | תיאור |
|----------|-------|
| `/api/entities` (GET/POST/PUT/DELETE) | גופים |
| `/api/accounts` (GET/POST/PUT/DELETE) | חשבונות |
| `/api/documents` (GET/POST/PUT/DELETE) | מסמכים |
| `/api/documents/:id/upload` · `/file` · `/analyze` | העלאה · צפייה · זיהוי חכם |
| `/api/checklists/current` · `/year/:year` | משימות שנתיות |
| `/api/summary` | סיכום נכסים/התחייבויות לפי מטבע |
| `/api/comparison/:year` | השוואת שנה-לשנה |
| `/api/export/action-list.csv?year=YYYY` | ייצוא CSV |
| `/api/activity?limit=N` | יומן שינויים |

---

## 🎯 כיוונים עתידיים

- OCR למסמכים סרוקים (תמונות)
- מעקב ניירות ערך (feed מחירים)
- אינטגרציה עם API של בנקים
- אימות אמיתי (login + משתמשים)

## 📝 License

MIT · נבנה עם Claude Code
