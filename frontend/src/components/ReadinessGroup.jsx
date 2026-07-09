import { useState } from 'react';

const TYPE_ICONS = {
  bank: '🏦',
  insurance: '🛡️',
  investment: '📈',
  realty: '🏠',
  loan: '💳',
  vehicle: '🚗',
  license: '📜',
  donation: '🎗️',
};

const getTypeIcon = (type) => TYPE_ICONS[type] || '📋';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '');

// כרטיס גוף אחד במסך "מוכנות לרו״ח" — כותרת + שורות מסמכים + הוספת פריט בסוף.
export default function ReadinessGroup({
  group, ended, readOnly, missingOnly,
  onAddItem, onEnd, onReactivate, onOpenItem,
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const { entity, items, have, total } = group;

  const visibleItems = missingOnly ? items.filter((i) => !i.has_file) : items;

  const submitAdd = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onAddItem(entity.id, name);
    setNewName('');
    setAdding(false);
  };

  return (
    <section className={`rdn-group ${ended ? 'rdn-ended' : ''}`}>
      <div className="rdn-group-head">
        <div className="rdn-g-icon">{getTypeIcon(entity.type)}</div>
        <div className="rdn-g-main">
          <div className="rdn-g-name">{entity.name}</div>
          <div className="rdn-g-type">{entity.type || ''}</div>
        </div>
        {ended ? (
          <span className="rdn-badge-ended">הסתיים {String(entity.active_until).slice(0, 4)}</span>
        ) : (
          <span className="rdn-g-count">{have} / {total}</span>
        )}
        {!readOnly && (
          ended ? (
            <button type="button" className="rdn-g-end" onClick={() => onReactivate(entity)}>↩ החזר לצפי</button>
          ) : (
            <button type="button" className="rdn-g-end" title="הפסק לצפות לדיווחים מגוף זה" onClick={() => onEnd(entity)}>
              סיימתי עם הגוף הזה
            </button>
          )
        )}
      </div>

      {!ended && (
        <ul className="rdn-rows">
          {visibleItems.map((item) => (
            <li key={item.id} className={`rdn-row ${!item.has_file ? 'rdn-miss-row' : ''}`}>
              <button type="button" className="rdn-row-btn" onClick={() => onOpenItem(item)}>
                <span className="rdn-r-status" aria-hidden="true">{item.has_file ? '✅' : '🔴'}</span>
                <span className="rdn-r-main">
                  <span className="rdn-r-title">{item.document_name}</span>
                  {item.document_type && <span className="rdn-r-note">{item.document_type}</span>}
                </span>
                {item.has_file ? (
                  <span className="rdn-chip rdn-have">התקבל {item.doc_date && <span className="rdn-dt">{fmtDate(item.doc_date)}</span>}</span>
                ) : (
                  <span className="rdn-chip rdn-miss">חסר</span>
                )}
                <span className="rdn-r-chevron" aria-hidden="true">‹</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!ended && !readOnly && (
        <div className="rdn-add-row">
          {adding ? (
            <form className="rdn-add-form" onSubmit={submitAdd}>
              <input
                type="text"
                placeholder="שם הדוח/המסמך"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-small btn-primary">שמור</button>
              <button type="button" className="btn btn-small btn-secondary" onClick={() => { setAdding(false); setNewName(''); }}>ביטול</button>
            </form>
          ) : (
            <button type="button" className="rdn-add-toggle" onClick={() => setAdding(true)}>➕ הוסף פריט</button>
          )}
        </div>
      )}
    </section>
  );
}
