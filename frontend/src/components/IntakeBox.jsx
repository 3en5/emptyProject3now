import { useState, useRef } from 'react';
import axios from 'axios';
import { useReadOnly } from '../ReadOnlyContext';

// תיבת הקליטה החכמה — נקודת הכניסה האחת למסמכים.
// זורקים קובץ (או כמה) → המערכת מזהה ומתייקת לבד → מוצג "מה הבנתי ולאן תייקתי"
// עם שדות לתיקון וכפתור אישור אחד. (עקרון: המשתמש מפקח, לא מסווג.)

const ACTION_META = {
  matched: { icon: '📌', label: 'זוהה ותויק לסלוט קיים' },
  create: { icon: '🆕', label: 'זוהה — נוצר מסמך חדש' },
  unmatched: { icon: '❓', label: 'לא זוהה גוף — נא לשייך' },
};

const CONF_HE = { high: 'גבוה', medium: 'בינוני', low: 'נמוך' };

export default function IntakeBox({ entities, onRefresh }) {
  const readOnly = useReadOnly();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  if (readOnly) return null;

  const ALLOWED_RE = /\.(pdf|jpe?g|png|webp)$/i;

  const processFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setBusy(true);
    for (const file of files) {
      if (!ALLOWED_RE.test(file.name)) {
        setResults((prev) => [...prev, { key: `${file.name}-${Date.now()}`, fileName: file.name, error: 'סוג קובץ לא נתמך — רק PDF או תמונה' }]);
        continue;
      }
      try {
        const form = new FormData();
        form.append('file', file);
        const { data } = await axios.post('/api/documents/intake', form);
        setResults((prev) => [...prev, {
          key: `doc-${data.document.id}-${Date.now()}`,
          fileName: file.name,
          action: data.action,
          note: data.note,
          confidence: data.suggestions?.confidence,
          renewalDetected: !!data.suggestions?.renewalDate,
          document: data.document,
          edit: {
            entity_id: data.document.entity_id,
            document_name: data.document.document_name || '',
            year: data.document.year || '',
            required_by_date: data.document.required_by_date || '',
          },
          saved: false,
        }]);
      } catch (err) {
        setResults((prev) => [...prev, { key: `${file.name}-${Date.now()}`, fileName: file.name, error: err.response?.data?.error || err.message }]);
      }
    }
    setBusy(false);
    onRefresh?.();
  };

  const setEdit = (key, field, value) => {
    setResults((prev) => prev.map((r) => (r.key === key ? { ...r, edit: { ...r.edit, [field]: value } } : r)));
  };

  // אישור/תיקון — כפתור אחד: שומר את השדות (כפי שתוקנו) ומוריד את דגל הפיקוח
  const confirmResult = async (r) => {
    try {
      const { data } = await axios.put(`/api/documents/${r.document.id}`, {
        ...r.document,
        document_name: r.edit.document_name,
        year: r.edit.year ? parseInt(r.edit.year) : null,
        required_by_date: r.edit.required_by_date || null,
        entity_id: r.edit.entity_id ? parseInt(r.edit.entity_id) : null,
        auto_filed: 0,
      });
      setResults((prev) => prev.map((x) => (x.key === r.key ? { ...x, saved: true, document: data } : x)));
      onRefresh?.();
    } catch (err) {
      setResults((prev) => prev.map((x) => (x.key === r.key ? { ...x, error: err.response?.data?.error || err.message } : x)));
    }
  };

  return (
    <div className="intake-box">
      <div
        className={`intake-dropzone ${dragOver ? 'drag-over' : ''} ${busy ? 'busy' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <div className="intake-icon">📥</div>
        <div className="intake-text">
          <strong>{busy ? 'קולט ומזהה…' : 'גררו לכאן מסמכים — או לחצו לבחירה'}</strong>
          <span>המערכת תזהה לבד מה המסמך ותתייק אותו. אתם רק מאשרים.</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          style={{ display: 'none' }}
          disabled={busy}
          onChange={(e) => { processFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {results.length > 0 && (
        <div className="intake-results">
          {results.map((r) => (
            <div key={r.key} className={`intake-result ${r.saved ? 'saved' : ''}`}>
              {r.error && !r.document ? (
                <p className="intake-error">⚠️ {r.fileName}: {r.error}</p>
              ) : (
                <>
                  <div className="intake-result-header">
                    <span>{ACTION_META[r.action]?.icon} <strong>{r.fileName}</strong> — {ACTION_META[r.action]?.label}</span>
                    {r.confidence && <span className={`confidence-chip conf-${r.confidence}`}>ביטחון: {CONF_HE[r.confidence]}</span>}
                  </div>
                  {r.note && <p className="intake-note">⚠️ {r.note}</p>}
                  {r.saved ? (
                    <p className="intake-saved">✅ אושר ונשמר — {r.document.document_name} ({r.document.entity_name})</p>
                  ) : (
                    <div className="intake-fields">
                      <label>
                        גוף
                        <select value={r.edit.entity_id || ''} onChange={(e) => setEdit(r.key, 'entity_id', e.target.value)}>
                          {entities.map((en) => (
                            <option key={en.id} value={en.id}>{en.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        שם המסמך
                        <input type="text" value={r.edit.document_name} onChange={(e) => setEdit(r.key, 'document_name', e.target.value)} />
                      </label>
                      <label>
                        שנה
                        <input type="number" value={r.edit.year} onChange={(e) => setEdit(r.key, 'year', e.target.value)} />
                      </label>
                      <label>
                        מועד חידוש/הגשה
                        <input type="date" className="analysis-date-input" value={r.edit.required_by_date} onChange={(e) => setEdit(r.key, 'required_by_date', e.target.value)} />
                        {r.renewalDetected && <span className="analysis-detected">✓ זוהה</span>}
                      </label>
                      <div className="intake-actions">
                        <button className="btn btn-small btn-success" onClick={() => confirmResult(r)}>✅ אשר ושמור</button>
                        <a className="btn btn-small btn-secondary" href={`/api/documents/${r.document.id}/file`} target="_blank" rel="noopener noreferrer">📎 צפייה</a>
                      </div>
                    </div>
                  )}
                  {r.error && <p className="intake-error">⚠️ {r.error}</p>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
