import { useState } from 'react';
import { useReadOnly } from '../ReadOnlyContext';

const TYPE_ICONS = {
  bank: '🏦',
  insurance: '🛡️',
  investment: '📈',
  realty: '🏠',
  loan: '💳',
  vehicle: '🚗',
  license: '📜',
};

// כרטיסים מתקפלים: שורת כותרת קבועה (שם+קטגוריה), לחיצה פותחת/סוגרת את הפרטים.
export default function EntityList({ entities, onEdit, onDelete }) {
  const readOnly = useReadOnly();
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggle = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getTypeIcon = (type) => TYPE_ICONS[type] || '📋';

  return (
    <div className="entities-list">
      {entities.length === 0 ? (
        <p className="no-data">אין גופים פיננסיים עדיין. בואו נתחיל בהוספת גוף!</p>
      ) : (
        <div className="entities-grid">
          {entities.map(entity => {
            const expanded = expandedIds.has(entity.id);
            return (
              <div key={entity.id} className={`entity-card ${expanded ? 'expanded' : 'collapsed'}`}>
                <button
                  type="button"
                  className="entity-header entity-header-toggle"
                  onClick={() => toggle(entity.id)}
                  aria-expanded={expanded}
                >
                  <span className="entity-header-title">
                    <h3>{getTypeIcon(entity.type)} {entity.name}</h3>
                    <span className="category-label">{entity.category}</span>
                  </span>
                  <span className="collapse-chevron">{expanded ? '▲' : '▼'}</span>
                </button>

                {expanded && (
                  <>
                    <div className="entity-details">
                      {entity.account_number && (
                        <p><strong>מספר חשבון:</strong> {entity.account_number}</p>
                      )}
                      {entity.contact_info && (
                        <p><strong>יצירת קשר:</strong> {entity.contact_info}</p>
                      )}
                      {entity.website_url && (
                        <p><a href={entity.website_url} target="_blank" rel="noopener noreferrer">🌐 אתר אינטרנט</a></p>
                      )}
                      {entity.login_url && (
                        <p><a href={entity.login_url} target="_blank" rel="noopener noreferrer">🔐 קישור כניסה</a></p>
                      )}
                      {entity.notes && (
                        <p><strong>הערות:</strong> {entity.notes}</p>
                      )}
                    </div>

                    {!readOnly && (
                      <div className="entity-actions">
                        <button className="btn btn-icon btn-edit" title="ערוך" aria-label="ערוך" onClick={() => onEdit(entity.id)}>
                          ✏️
                        </button>
                        <button className="btn btn-icon btn-delete" title="מחק" aria-label="מחק" onClick={() => {
                          if (confirm(`האם אתה בטוח שברצונך למחוק את ${entity.name}?`)) {
                            onDelete(entity.id);
                          }
                        }}>
                          🗑️
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
