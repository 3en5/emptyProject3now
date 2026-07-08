import { useState, useRef } from 'react';
import axios from 'axios';
import { useReadOnly } from '../ReadOnlyContext';
import { ENTITY_TYPES } from '../constants/entityTypes';

// תיבת הקליטה החכמה — נקודת הכניסה האחת למסמכים.
// זורקים קובץ (או כמה) → המערכת מזהה ומתייקת לבד → מוצג "מה הבנתי ולאן תייקתי"
// עם שדות לתיקון וכפתור אישור אחד. (עקרון: המשתמש מפקח, לא מסווג.)
// גוף שזוהה אך אינו קיים במערכת → אפשר ליצור אותו כאן ("גוף חדש") עם שם+סוג
// ממולאים מראש מהזיהוי וניתנים לעריכה.

const ACTION_META = {
  matched: { icon: '📌', label: 'זוהה ותויק לסלוט קיים' },
  create: { icon: '🆕', label: 'זוהה — נוצר מסמך חדש' },
  unmatched: { icon: '❓', label: 'לא זוהה גוף — נא לשייך' },
};

const CONF_HE = { high: 'גבוה', medium: 'בינוני', low: 'נמוך' };

export default function IntakeBox({ entities, onRefresh, onAddEntity }) {
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
        const issuer = data.suggestions?.issuer;
        setResults((prev) => [...prev, {
          key: `doc-${data.document.id}-${Date.now()}`,
          fileName: file.name,
          action: data.action,
          note: data.note,
          confidence: data.suggestions?.confidence,
          renewalDetected: !!data.suggestions?.renewalDate,
          // שם/סוג הגוף שזוהה — להצעת יצירת גוף חדש (גם כשלא נמצא במערכת)
          detectedName: issuer?.name || '',
          suggestedType: issuer?.suggestedType || '',
          document: data.document,
          edit: {
            entity_id: data.document.entity_id,
            document_name: data.document.document_name || '',
            year: data.document.year || '',
            required_by_date: data.document.required_by_date || '',
          },
          newEntity: null, // { name, type } כשפותחים מיני-טופס יצירה
          saved: false,
        }]);
      } catch (err) {
        setResults((prev) => [...prev, { key: `${file.name}-${Date.now()}`, fileName: file.name, error: err.response?.data?.error || err.message }]);
      }
    }
    setBusy(false);
    onRefresh?.();
  };

  const patch = (key, changes) => {
    setResults((prev) => prev.map((r) => (r.key === key ? { ...r, ...changes } : r)));
  };

  const setEdit = (key, field, value) => {
    setResults((prev) => prev.map((r) => (r.key === key ? { ...r, edit: { ...r.edit, [field]: value } } : r)));
  };

  // פתיחת מיני-טופס "גוף חדש" — ממולא מראש מהזיהוי (שם + סוג), ניתן לעריכה
  const openNewEntity = (r) => {
    patch(r.key, { newEntity: { name: r.detectedName || '', type: r.suggestedType || '' } });
  };

  const setNewEntityField = (key, field, value) => {
    setResults((prev) => prev.map((r) => (r.key === key ? { ...r, newEntity: { ...r.newEntity, [field]: value } } : r)));
  };

  // יצירת הגוף החדש ושיוך המסמך אליו מיד
  const createEntity = async (r) => {
    const { name, type } = r.newEntity;
    if (!name.trim() || !type) return;
    try {
      const created = await onAddEntity({ name: name.trim(), type });
      // הגוף החדש נבחר אוטומטית בשורה, והמיני-טופס נסגר
      patch(r.key, { newEntity: null });
      setEdit(r.key, 'entity_id', created.id);
    } catch (err) {
      patch(r.key, { error: err.response?.data?.error || err.message });
    }
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
      patch(r.key, { saved: true, document: data });
      onRefresh?.();
    } catch (err) {
      patch(r.key, { error: err.response?.data?.error || err.message });
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
                        <div className="intake-entity-row">
                          <select value={r.edit.entity_id || ''} onChange={(e) => setEdit(r.key, 'entity_id', e.target.value)}>
                            {entities.map((en) => (
                              <option key={en.id} value={en.id}>{en.name}</option>
                            ))}
                          </select>
                          {!r.newEntity && (
                            <button type="button" className="btn btn-small btn-secondary" onClick={() => openNewEntity(r)}>➕ גוף חדש</button>
                          )}
                        </div>
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

                      {r.newEntity && (
                        <div className="intake-new-entity">
                          <span className="intake-new-entity-title">➕ גוף חדש {r.detectedName && <em>(זוהה: {r.detectedName})</em>}</span>
                          <label>
                            שם הגוף
                            <input type="text" value={r.newEntity.name} placeholder="שם החברה" onChange={(e) => setNewEntityField(r.key, 'name', e.target.value)} />
                          </label>
                          <label>
                            סוג
                            <select value={r.newEntity.type} onChange={(e) => setNewEntityField(r.key, 'type', e.target.value)}>
                              <option value="">בחר סוג</option>
                              {ENTITY_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </label>
                          <div className="intake-actions">
                            <button type="button" className="btn btn-small btn-success" disabled={!r.newEntity.name.trim() || !r.newEntity.type} onClick={() => createEntity(r)}>צור ושייך</button>
                            <button type="button" className="btn btn-small btn-secondary" onClick={() => patch(r.key, { newEntity: null })}>ביטול</button>
                          </div>
                        </div>
                      )}

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
