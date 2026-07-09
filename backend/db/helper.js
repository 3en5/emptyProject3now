import { getDatabase, saveDatabase } from './init.js';

function rowToObject(columns, values) {
  const obj = {};
  columns.forEach((col, i) => {
    obj[col] = values[i];
  });
  return obj;
}

// sql.js לא יודע לקשור undefined — רק null/number/string.
// ממירים כל undefined ל-null לפני קשירה (שדות שלא נשלחו בבקשה).
function sanitize(params) {
  return (params || []).map(p => (p === undefined ? null : p));
}

export function runQuery(sql, params = []) {
  const db = getDatabase();
  try {
    db.run(sql, sanitize(params));

    // קריאת ה-ID האחרון *לפני* saveDatabase — db.export() (שרץ בשמירה ל-DB קובץ)
    // מאפס את last_insert_rowid ל-0. ב-:memory: אין export, ולכן טסטים עם DB
    // בזיכרון לא יתפסו סדר הפוך — ראה LESSONS #9.
    let lastID = null;
    try {
      const result = db.exec('SELECT last_insert_rowid() as id');
      if (result && result[0] && result[0].values && result[0].values.length > 0) {
        lastID = result[0].values[0][0];
      }
    } catch (e) {
      // Ignore error
    }

    saveDatabase();
    return { success: true, lastID };
  } catch (error) {
    console.error('Query error:', error.message);
    return { success: false, error: error.message };
  }
}

export function getOne(sql, params = []) {
  const db = getDatabase();
  try {
    const result = db.exec(sql, sanitize(params));
    if (result && result[0] && result[0].values && result[0].values.length > 0) {
      const columns = result[0].columns;
      const row = result[0].values[0];
      return rowToObject(columns, row);
    }
    return null;
  } catch (error) {
    console.error('getOne error:', error);
    return null;
  }
}

export function getAll(sql, params = []) {
  const db = getDatabase();
  try {
    const result = db.exec(sql, sanitize(params));
    if (result && result[0]) {
      const columns = result[0].columns;
      return result[0].values.map(row => rowToObject(columns, row));
    }
    return [];
  } catch (error) {
    console.error('getAll error:', error);
    return [];
  }
}
