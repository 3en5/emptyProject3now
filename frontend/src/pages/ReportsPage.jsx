import { useState, useEffect } from 'react';
import axios from 'axios';

const CURRENCY_SYMBOL = { ILS: '₪', USD: '$', EUR: '€' };
const TYPE_LABEL = {
  bank: '🏦 בנקים',
  insurance: '🛡️ ביטוחים',
  investment: '📈 השקעות',
  realty: '🏠 נדל"ן',
  loan: '💳 הלוואות',
};

function fmt(amount, currency) {
  const sym = CURRENCY_SYMBOL[currency] || '';
  return `${sym}${Number(amount || 0).toLocaleString('he-IL')}`;
}

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    axios
      .get('/api/summary')
      .then((res) => { if (active) setSummary(res.data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="page"><p>טוען דוח...</p></div>;
  if (error) return <div className="page"><p className="error-message">שגיאה בטעינת הדוח: {error}</p></div>;

  const { currencies = [], assetsByType = [], counts = {} } = summary || {};
  const hasFinancials = currencies.some((c) => c.accountCount > 0);

  return (
    <div className="page">
      <h1>📊 דוח סיכום</h1>

      <div className="dashboard-section">
        <h2>💰 שווי נקי לפי מטבע</h2>
        {!hasFinancials ? (
          <p className="no-data">אין עדיין חשבונות עם יתרות. הוסף חשבונות כדי לראות סיכום כספי.</p>
        ) : (
          <div className="networth-grid">
            {currencies.map((c) => (
              <div key={c.currency} className="networth-card">
                <h3>{CURRENCY_SYMBOL[c.currency] || c.currency} {c.currency}</h3>
                <div className="networth-row assets">
                  <span>נכסים</span>
                  <strong>{fmt(c.assets, c.currency)}</strong>
                </div>
                <div className="networth-row liabilities">
                  <span>התחייבויות</span>
                  <strong>−{fmt(c.liabilities, c.currency)}</strong>
                </div>
                <div className={`networth-row net ${c.net >= 0 ? 'positive' : 'negative'}`}>
                  <span>שווי נקי</span>
                  <strong>{fmt(c.net, c.currency)}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {assetsByType.length > 0 && (
        <div className="dashboard-section">
          <h2>📈 התפלגות נכסים לפי סוג</h2>
          <div className="pending-list">
            {assetsByType.map((row, i) => (
              <div key={i} className="pending-item">
                <span>{TYPE_LABEL[row.type] || row.type}</span>
                <span className="entity-badge">{row.cnt} חשבונות</span>
                <span className="date-badge">{fmt(row.total, row.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-section">
        <h2>📋 סיכום כללי</h2>
        <div className="stats-grid">
          <div className="stat-card"><h3>גופים פיננסיים</h3><p className="stat-number">{counts.entities ?? 0}</p></div>
          <div className="stat-card"><h3>חשבונות</h3><p className="stat-number">{counts.accounts ?? 0}</p></div>
          <div className="stat-card"><h3>מסמכים</h3><p className="stat-number">{counts.documents ?? 0}</p></div>
          <div className="stat-card"><h3>משימות</h3><p className="stat-number">{counts.tasks ?? 0}</p></div>
        </div>
      </div>
    </div>
  );
}
