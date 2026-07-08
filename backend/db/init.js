import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'finance.db');
let dbInstance = null;

export function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Read and execute schema
      const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

      // Split schema into individual statements and execute
      db.exec(schema, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Insert default user if doesn't exist
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row.count === 0) {
            db.run(
              'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
              ['Admin User', 'admin@local', 'admin'],
              (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                console.log('✅ Database initialized at:', dbPath);
                dbInstance = db;
                resolve(db);
              }
            );
          } else {
            console.log('✅ Database already initialized at:', dbPath);
            dbInstance = db;
            resolve(db);
          }
        });
      });
    });

    db.configure('busyTimeout', 5000);
  });
}

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(dbPath);
    dbInstance.configure('busyTimeout', 5000);
  }
  return dbInstance;
}
