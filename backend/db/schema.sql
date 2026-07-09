-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Financial Entities (בנקים, ביטוחים, השקעות וכו')
CREATE TABLE IF NOT EXISTS financial_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT,
  website_url TEXT,
  login_url TEXT,
  account_number TEXT,
  contact_info TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  active_from DATE,   -- תחילת ההתקשרות (למנוע ההשוואה השנתית)
  active_until DATE,  -- סוף ההתקשרות (NULL = עדיין פעיל)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Accounts (חשבונות פרטניים בתוך גוף פיננסי)
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT,
  balance REAL,
  currency TEXT DEFAULT 'ILS',
  account_number TEXT,
  last_updated DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id) REFERENCES financial_entities(id)
);

-- Documents (מסמכים שנדרשים)
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT,
  required_frequency TEXT,
  year INTEGER,           -- שנת המס/הדיווח שהמסמך שייך אליה
  required_by_date DATE,
  date_filed DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  file_path TEXT,
  file_hash TEXT,                -- SHA-256 של הקובץ המצורף — לזיהוי העלאות כפולות
  auto_filed INTEGER DEFAULT 0,  -- תויק אוטומטית דרך תיבת הקליטה — ממתין לאישור/פיקוח
  doc_date DATE,                 -- התאריך שמופיע על המסמך עצמו (זוהה ע"י GPT)
  summary TEXT,                  -- תקציר קצר של המסמך (זוהה ע"י GPT)
  amounts TEXT,                  -- סכומים שזוהו במסמך, כ-JSON array של מחרוזות
  owner TEXT,                    -- עבור מי המסמך: 'user' | 'spouse' | NULL (לא ידוע)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id) REFERENCES financial_entities(id)
);

-- Annual Checklist (משימות שנתיות)
CREATE TABLE IF NOT EXISTS annual_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  entity_id INTEGER,
  task_name TEXT NOT NULL,
  task_category TEXT,
  required_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  assignee TEXT,
  auto_completed INTEGER DEFAULT 0,      -- הושלמה אוטומטית עקב קליטת מסמך תואם — ניתן לביטול/אישור
  auto_created INTEGER DEFAULT 0,        -- נוצרה אוטומטית ע"י מחזור המשימות השנתי (rollover), לא ע"י המשתמש
  completed_by_document_id INTEGER,      -- המסמך שגרם להשלמה האוטומטית (לצורך תצוגה/קישור)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id) REFERENCES financial_entities(id),
  FOREIGN KEY (completed_by_document_id) REFERENCES documents(id)
);

-- Activity Log (יומן שינויים / audit trail)
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,        -- create / update / delete
  target_type TEXT NOT NULL,   -- entity / account / document / task
  target_id INTEGER,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_entities_type ON financial_entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_category ON financial_entities(category);
CREATE INDEX IF NOT EXISTS idx_accounts_entity ON accounts(entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_checklist_year ON annual_checklist(year);
CREATE INDEX IF NOT EXISTS idx_checklist_status ON annual_checklist(status);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
