import { useEffect, useState } from 'react';
import axios from 'axios';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '—');

// פופאפ רחב עם פירוט מלא על פריט מסמך בודד + כל הפעולות (העלאה/החלפה/מחיקה).
export default function ReadinessItemModal({ item, entity, year, readOnly, onClose, onUpload, onDelete }) {
  const [extra, setExtra] = useState(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    if (entity?.id) {
      axios.get(`/api/documents/entity/${entity.id}`)
        .then((res) => {
          if (cancelled) return;
          const row = Array.isArray(res.data) ? res.data.find((d) => d.id === item.id) : null;
          if (row) setExtra(row);
        })
        .catch(() => {
          // לא קריטי — הפופאפ עובד גם בלי הפרטים המורחבים
        });
    }
    return () => { cancelled = true; };
  }, [entity?.id, item.id]);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(item.id, file);
      onClose();
    }
    e.target.value = '';
  };

  const handleDelete = () => {
    if (confirm(`למחוק את "${item.document_name}"?`)) {
      onDelete(item.id);
      onClose();
    }
  };

  return (
    <div className="rdn-modal-overlay" onClick={onClose}>
      <div
        className="rdn-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`פרטי מסמך: ${item.document_name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rdn-modal-head">
          <div>
            <h2 className="rdn-modal-title">{item.document_name}</h2>
            {item.has_file ? (
              <span className="rdn-chip rdn-have">✅ התקבל</span>
            ) : (
              <span className="rdn-chip rdn-miss">🔴 חסר</span>
            )}
          </div>
          <button type="button" className="rdn-modal-close" aria-label="סגור" autoFocus onClick={onClose}>✕</button>
        </div>

        <div className="rdn-modal-grid">
          <div className="rdn-modal-label">גוף</div>
          <div className="rdn-modal-value">{entity?.name || '—'}</div>

          <div className="rdn-modal-label">סוג</div>
          <div className="rdn-modal-value">{item.document_type || '—'}</div>

          <div className="rdn-modal-label">שנה</div>
          <div className="rdn-modal-value">{year ?? '—'}</div>

          <div className="rdn-modal-label">סטטוס</div>
          <div className="rdn-modal-value">{item.status || '—'}</div>

          <div className="rdn-modal-label">תאריך המסמך</div>
          <div className="rdn-modal-value">{fmtDate(item.doc_date)}</div>

          <div className="rdn-modal-label">מועד יעד</div>
          <div className="rdn-modal-value">{fmtDate(item.required_by_date)}</div>

          {extra?.summary && (
            <>
              <div className="rdn-modal-label">תקציר</div>
              <div className="rdn-modal-value">{extra.summary}</div>
            </>
          )}

          {Array.isArray(extra?.amounts) && extra.amounts.length > 0 && (
            <>
              <div className="rdn-modal-label">סכומים</div>
              <div className="rdn-modal-value">{extra.amounts.join(', ')}</div>
            </>
          )}

          {extra?.notes && (
            <>
              <div className="rdn-modal-label">הערות</div>
              <div className="rdn-modal-value">{extra.notes}</div>
            </>
          )}
        </div>

        {item.has_file && (
          <div className="rdn-modal-file-row">
            <span>📎 קובץ מצורף</span>
            <a href={`/api/documents/${item.id}/file`} target="_blank" rel="noreferrer">פתח קובץ</a>
            {!readOnly && (
              <label className="rdn-r-act">
                🔄 החלף קובץ
                <input type="file" onChange={handleUpload} />
              </label>
            )}
          </div>
        )}

        {!item.has_file && !readOnly && (
          <div className="rdn-modal-upload-row">
            <label className="btn btn-primary rdn-modal-upload">
              ⬆ העלה קובץ
              <input type="file" onChange={handleUpload} />
            </label>
          </div>
        )}

        {!readOnly && (
          <div className="rdn-modal-footer">
            <button type="button" className="rdn-r-del" onClick={handleDelete}>🗑️ מחק פריט</button>
            <button type="button" className="btn btn-secondary btn-small" onClick={onClose}>סגור</button>
          </div>
        )}
      </div>
    </div>
  );
}
