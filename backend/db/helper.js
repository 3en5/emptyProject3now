import { getDatabase, saveDatabase } from './init.js';

function rowToObject(columns, values) {
  const obj = {};
  columns.forEach((col, i) => {
    obj[col] = values[i];
  });
  return obj;
}

export function runQuery(sql, params = []) {
  const db = getDatabase();
  try {
    db.run(sql, params);
    saveDatabase();

    // Get last inserted ID
    let lastID = null;
    try {
      const result = db.exec('SELECT last_insert_rowid() as id');
      if (result && result[0] && result[0].values && result[0].values.length > 0) {
        lastID = result[0].values[0][0];
      }
    } catch (e) {
      // Ignore error
    }

    return { success: true, lastID };
  } catch (error) {
    console.error('Query error:', error.message);
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
    const result = db.exec(sql, params);
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
