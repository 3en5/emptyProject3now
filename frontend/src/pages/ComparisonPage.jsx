import { useState, useEffect } from 'react';
import axios from 'axios';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default function ComparisonPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    axios
      .get(`/api/comparison/${year}`)
      .then((res) => { if (active) { setData(res.data); setError(null); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [year]);

  return (
    <div className="page">
      <h1>🔄 השוואת שנה-לשנה</h1>

      <div className="page-controls">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>שנה להשוואה (מול {year - 1})</label>
          <select className="filter-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading && <p>טוען השוואה...</p>}
      {error && <p className="error-message">שגיאה: {error}</p>}

      {data && !loading && (
        <>
          <div className="stats-grid">
            <div className="stat-card" style={{ borderTopColor: '#e74c3c' }}>
              <h3>🔴 חסרים</h3>
              <p className="stat-number" style={{ color: '#e74c3c' }}>{data.summary.missing}</p>
              <p className="stat-details">היו ב-{data.prevYear}, טרם התקבלו</p>
            </div>
            <div className="stat-card" style={{ borderTopColor: '#27ae60' }}>
              <h3>🟢 התקבלו</h3>
              <p className="stat-number" style={{ color: '#27ae60' }}>{data.summary.received}</p>
              <p className="stat-details">חוזרים מ-{data.prevYear}</p>
            </div>
            <div className="stat-card" style={{ borderTopColor: '#3498db' }}>
              <h3>➕ חדשים</h3>
              <p className="stat-number" style={{ color: '#3498db' }}>{data.summary.added}</p>
              <p className="stat-details">חדשים ב-{data.year}</p>
            </div>
            <div className="stat-card" style={{ borderTopColor: '#95a5a6' }}>
              <h3>⏹️ הסתיימו</h3>
              <p className="stat-number" style={{ color: '#7f8c8d' }}>{data.summary.ended}</p>
              <p className="stat-details">גופים שהתקשרותם הסתיימה</p>
            </div>
          </div>

          <Bucket title="🔴 מסמכים חסרים" empty="אין מסמכים חסרים — הכל התקבל! 🎉" color="#e74c3c"
            items={data.missing.map((m) => ({ key: `${m.entity_id}-${m.document_name}`, name: m.document_name, sub: m.entity_name }))} />

          <Bucket title="➕ מסמכים חדשים השנה" empty="אין מסמכים חדשים" color="#3498db"
            items={data.added.map((a) => ({ key: a.id, name: a.document_name, sub: a.entity_name }))} />

          <Bucket title="🟢 מסמכים חוזרים (התקבלו)" empty="אין מסמכים חוזרים" color="#27ae60"
            items={data.received.map((r) => ({ key: r.id, name: r.document_name, sub: r.entity_name }))} />

          {data.endedEntities.length > 0 && (
            <Bucket title="⏹️ התקשרויות שהסתיימו" empty="" color="#95a5a6"
              items={data.endedEntities.map((e) => ({ key: e.id, name: e.name, sub: `הסתיים: ${e.active_until || ''}` }))} />
          )}
        </>
      )}
    </div>
  );
}

function Bucket({ title, items, empty, color }) {
  return (
    <div className="dashboard-section" style={{ borderTop: `4px solid ${color}` }}>
      <h2>{title} ({items.length})</h2>
      {items.length === 0 ? (
        <p className="no-data">{empty}</p>
      ) : (
        <div className="pending-list">
          {items.map((it) => (
            <div key={it.key} className="pending-item" style={{ borderRightColor: color }}>
              <span>📄 {it.name}</span>
              <span className="entity-badge">{it.sub}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
