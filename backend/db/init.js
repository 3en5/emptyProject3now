import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'finance.db');

export function initDatabase() {
  const db = new Database(dbPath);

  // Read and execute schema
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  // Insert default user if doesn't exist
  const checkUser = db.prepare('SELECT COUNT(*) as count FROM users');
  if (checkUser.get().count === 0) {
    const insertUser = db.prepare(
      'INSERT INTO users (name, email, role) VALUES (?, ?, ?)'
    );
    insertUser.run('Admin User', 'admin@local', 'admin');
  }

  console.log('✅ Database initialized at:', dbPath);
  return db;
}

export function getDatabase() {
  return new Database(dbPath);
}
