import { useState, useEffect } from 'react';
import axios from 'axios';
import { getUrgency, urgencyMeta } from '../utils/deadlines';

const ACTION_ICON = { create: '➕', update: '✏️', delete: '🗑️' };

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function MonthlyPage() {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    axios
      .get(`/api/report/monthly?month=${month}`)
      .then((res) => { if (active) { setData(res.data); setError(null); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month]);

  return (
    <div className="page">
      <h1>📅 דוח חודשי</h1>

      <div className="page-controls">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>חודש</label>
          <input type="month" className="filter-select" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>

      {loading && <p>טוען דוח...</p>}
      {error && <p className="error-message">שגיאה: {error}</p>}

      {data && !loading && (
        <>
          <div className="stats-grid">
            <div className="stat-card"><h3>🕒 שינויים</h3><p className="stat-number">{data.summary.changes}</p></div>
            <div className="stat-card"><h3>📄 מסמכים לפירעון</h3><p className="stat-number">{data.summary.dueDocuments}</p></div>
            <div className="stat-card"><h3>✅ משימות לפירעון</h3><p className="stat-number">{data.summary.dueTasks}</p></div>
          </div>

          <div className="dashboard-section">
            <h2>📄 מסמכים שמועדם החודש</h2>
            {data.dueDocuments.length === 0 ? (
              <p className="no-data">אין מסמכים לפירעון החודש</p>
            ) : (
              <div className="pending-list">
                {data.dueDocuments.map((d) => {
                  const { level, daysLeft } = getUrgency(d.required_by_date, d.status);
                  const meta = urgencyMeta(level, daysLeft);
                  return (
                    <div key={d.id} className="pending-item" style={{ borderRightColor: meta.color || '#ccc' }}>
                      <span>📄 {d.document_name}</span>
                      <span className="entity-badge">{d.entity_name}</span>
                      <span className="date-badge">{new Date(d.required_by_date).toLocaleDateString('he-IL')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dashboard-section">
            <h2>✅ משימות שמועדן החודש</h2>
            {data.dueTasks.length === 0 ? (
              <p className="no-data">אין משימות לפירעון החודש</p>
            ) : (
              <div className="pending-list">
                {data.dueTasks.map((t) => (
                  <div key={t.id} className="pending-item">
                    <span>📝 {t.task_name}</span>
                    {t.task_category && <span className="category-badge">{t.task_category}</span>}
                    <span className="date-badge">{new Date(t.required_date).toLocaleDateString('he-IL')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-section">
            <h2>🕒 שינויים שבוצעו החודש</h2>
            {data.changes.length === 0 ? (
              <p className="no-data">לא בוצעו שינויים החודש</p>
            ) : (
              <div className="pending-list">
                {data.changes.map((a) => (
                  <div key={a.id} className="pending-item">
                    <span>{ACTION_ICON[a.action] || '•'} {a.description}</span>
                    <span className="date-badge">
                      {a.created_at ? new Date(a.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('he-IL') : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
