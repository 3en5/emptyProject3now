import { getDatabase, saveDatabase } from './init.js';

export function runQuery(sql, params = []) {
  const db = getDatabase();
  try {
    const result = db.run(sql, params);
    saveDatabase();
    return { success: true, lastID: db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function getOne(sql, params = []) {
  const db = getDatabase();
  try {
    const result = db.exec(sql, params);
    if (result && result[0] && result[0].values && result[0].values.length > 0) {
      const columns = result[0].columns;
      const row = result[0].values[0];
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    }
    return null;
  } catch (error) {
    console.error('Query error:', error);
    return null;
  }
}

export function getAll(sql, params = []) {
  const db = getDatabase();
  try {
    const result = db.exec(sql, params);
    if (result && result[0]) {
      const columns = result[0].columns;
      return result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });
    }
    return [];
  } catch (error) {
    console.error('Query error:', error);
    return [];
  }
}
