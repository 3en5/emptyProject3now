# 💰 מערכת ניהול מסמכים פיננסיים

מערכת web app שלמה לניהול וארגון כל המסמכים הפיננסיים שלך - בנקים, ביטוחים, השקעות, נדלן וכדומה.

## 📋 תכונות

- ✅ **ניהול גופים פיננסיים** - הוסף וערוך בנקים, ביטוחים, השקעות וכו'
- ✅ **מעקב מסמכים** - עקוב אחרי דוחות שנדרשים ותאריכי הגשה
- ✅ **משימות שנתיות** - רשימת משימות וסטטוסים
- ✅ **דאשבורד** - סקירה כוללת של כל הנתונים
- ✅ **קישורים ישירים** - קישור ישיר לאתרים של כל גוף
- ✅ **סטטוס צבעוני** - עקוב בקלות אחרי מה שהושלם ומה שממתין

## 🛠️ טכנולוגיה

- **Backend:** Node.js + Express
- **Frontend:** React 18 + Vite
- **Database:** SQLite
- **Styling:** CSS בעברית תמימה

## 🚀 התחלה מהר

### דרישות
- Node.js 16+

### התקנה

```bash
# Install dependencies
npm run setup

# Start backend
npm start

# In another terminal, start frontend
npm run client
```

ה-app יהיה זמין ב: `http://localhost:5173`
ה-API יהיה זמין ב: `http://localhost:3001/api`

## 🧪 בדיקות (Testing)

פירמידת טסטים מלאה — רצה מול DB מבודד, לא נוגעת בנתונים האמיתיים:

```bash
npm run test:all         # הכל: API + רכיבים + E2E
npm run test:api         # טסטי API (node --test + supertest)
npm run test:components  # טסטי רכיבי React (Vitest + Testing Library)
npm run test:e2e         # טסטי E2E בדפדפן (Playwright)
```

## 📁 מבנה הפרויקט

```
├── backend/
│   ├── db/
│   │   ├── schema.sql       # Database schema
│   │   └── init.js          # Database initialization
│   ├── routes/
│   │   ├── entities.js      # Routes for financial entities
│   │   ├── accounts.js      # Routes for accounts
│   │   ├── documents.js     # Routes for documents
│   │   └── checklists.js    # Routes for annual checklists
│   └── server.js            # Express server
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   └── App.jsx          # Main app component
│   └── vite.config.js       # Vite configuration
└── package.json             # Root package.json
```

## 📊 API Endpoints

### Financial Entities
- `GET /api/entities` - Get all entities
- `GET /api/entities/:id` - Get single entity
- `POST /api/entities` - Create entity
- `PUT /api/entities/:id` - Update entity
- `DELETE /api/entities/:id` - Delete entity

### Documents
- `GET /api/documents` - Get all documents
- `GET /api/documents/status/:status` - Get documents by status
- `POST /api/documents` - Create document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### Annual Checklist
- `GET /api/checklists/current` - Get current year checklist
- `GET /api/checklists/year/:year` - Get checklist for specific year
- `POST /api/checklists` - Create task
- `PUT /api/checklists/:id` - Update task
- `DELETE /api/checklists/:id` - Delete task

## 🎯 שלבים עתידיים

- [ ] שלב 2: Upload מסמכים ותמונות
- [ ] שלב 3: דוחות ואנליזה
- [ ] שלב 4: API integrations עם בנקים
- [ ] שלב 5: Mobile app

## 📝 License

MIT

## 👤 Author

Built with ❤️ using Claude AI
