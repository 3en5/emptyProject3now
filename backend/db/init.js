import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// נתיב ה-DB ניתן להגדרה דרך env (לטסטים). ':memory:' = DB זמני בזיכרון בלבד.
const dbPath = process.env.FINANCE_DB_PATH || path.join(__dirname, 'finance.db');
const inMemory = dbPath === ':memory:';
let SQL = null;
let db = null;

async function initDatabase() {
  try {
    SQL = await initSqlJs();

    // Load existing database or create new one
    if (!inMemory && fs.existsSync(dbPath)) {
      const filebuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(filebuffer);
    } else {
      db = new SQL.Database();
    }

    // Read and execute schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

    // Execute schema statements
    const statements = schema.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        try {
          db.run(stmt);
        } catch (e) {
          // Ignore "already exists" errors
          if (!e.message.includes('already exists')) {
            console.error('Schema error:', e.message);
          }
        }
      }
    }

    // מיגרציות קלות — הוספת עמודות חדשות ל-DB קיים (ALTER לא נכלל ב-IF NOT EXISTS)
    ensureColumn('documents', 'year', 'INTEGER');
    ensureColumn('documents', 'auto_filed', 'INTEGER DEFAULT 0'); // תויק אוטומטית — ממתין לפיקוח המשתמש
    ensureColumn('documents', 'file_hash', 'TEXT'); // SHA-256 לזיהוי כפילויות
    ensureColumn('documents', 'doc_date', 'DATE');  // תאריך המסמך עצמו (GPT)
    ensureColumn('documents', 'summary', 'TEXT');   // תקציר קצר (GPT)
    ensureColumn('documents', 'amounts', 'TEXT');   // סכומים, JSON array (GPT)
    ensureColumn('documents', 'owner', 'TEXT');      // עבור מי המסמך: 'user' | 'spouse'
    ensureColumn('annual_checklist', 'auto_completed', 'INTEGER DEFAULT 0'); // הושלמה אוטומטית עקב מסמך
    ensureColumn('annual_checklist', 'completed_by_document_id', 'INTEGER'); // המסמך שגרם להשלמה
    ensureColumn('financial_entities', 'active_from', 'DATE');
    ensureColumn('financial_entities', 'active_until', 'DATE');

    // Insert default user if doesn't exist
    try {
      const users = db.exec('SELECT COUNT(*) as count FROM users');
      if (!users || !users[0] || users[0].values[0][0] === 0) {
        db.run('INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
          ['Admin User', 'admin@local', 'admin']);
      }
    } catch (e) {
      // Table might not exist yet
    }

    // Save database
    saveDatabase();

    if (!process.env.FINANCE_QUIET) {
      console.log('✅ Database initialized at:', dbPath);
    }
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// מוסיף עמודה לטבלה רק אם היא לא קיימת (מיגרציה בטוחה)
function ensureColumn(table, column, defn) {
  try {
    const info = db.exec(`PRAGMA table_info(${table})`);
    const names = info && info[0] ? info[0].values.map((v) => v[1]) : [];
    if (!names.includes(column)) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${defn}`);
    }
  } catch (e) {
    console.error(`Migration error (${table}.${column}):`, e.message);
  }
}

function saveDatabase() {
  if (db && !inMemory) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
}

export function getDatabaseSQL() {
  if (!SQL) {
    throw new Error('SQL not initialized. Call initDatabase first.');
  }
  return SQL;
}

export async function init() {
  return await initDatabase();
}

export { saveDatabase };
