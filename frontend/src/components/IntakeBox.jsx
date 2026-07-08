import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useReadOnly } from '../ReadOnlyContext';
import { ENTITY_TYPES } from '../constants/entityTypes';
import { OWNER_OPTIONS } from '../constants/owner';

// מי ניתח את המסמך — שקיפות למשתמש (GPT באמת רץ, או רק כללים מקומיים)
const METHOD_META = {
  gpt: { icon: '🤖', label: 'זוהה ע״י GPT (ראייה)' },
  rules: { icon: '📋', label: 'זוהה ע״י כללים מקומיים' },
};

// תיבת הקליטה החכמה — נקודת הכניסה האחת למסמכים.
// זורקים קובץ (או כמה) → המערכת מזהה ומתייקת לבד → מוצג "מה הבנתי ולאן תייקתי"
// עם שדות לתיקון וכפתור אישור אחד. (עקרון: המשתמש מפקח, לא מסווג.)
// גוף שזוהה אך אינו קיים במערכת → אפשר ליצור אותו כאן ("גוף חדש") עם שם+סוג
// ממולאים מראש מהזיהוי וניתנים לעריכה.

const ACTION_META = {
  matched: { icon: '📌', label: 'זוהה ותויק לסלוט קיים' },
  create: { icon: '🆕', label: 'זוהה — נוצר מסמך חדש' },
  unmatched: { icon: '❓', label: 'לא זוהה גוף — נא לשייך' },
  duplicate: { icon: '♻️', label: 'קובץ כפול — כבר קיים במערכת' },
};

const CONF_HE = { high: 'גבוה', medium: 'בינוני', low: 'נמוך' };

export default function IntakeBox({ entities, onRefresh, onAddEntity }) {
  const readOnly = useReadOnly();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [aiStatus, setAiStatus] = useState(null); // { configured, model }
  const inputRef = useRef(null);

  // בדיקת סטטוס הזיהוי החכם — כדי להראות למשתמש אם GPT באמת פעיל
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await axios.get('/api/system/ai-status');
        if (alive && r?.data) setAiStatus(r.data);
      } catch {
        if (alive) setAiStatus({ configured: false });
      }
    })();
    return () => { alive = false; };
  }, []);

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

        // קובץ כפול — לא נוצר מסמך; מציגים התראה וקישור לקיים
        if (data.action === 'duplicate') {
          setResults((prev) => [...prev, {
            key: `dup-${data.existing.id}-${Date.now()}`,
            fileName: file.name, action: 'duplicate', note: data.note, existing: data.existing, saved: true,
          }]);
          continue;
        }

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
          method: data.suggestions?.method, // 'gpt' | 'rules' — מי ניתח
          aiError: data.suggestions?.aiError, // GPT הופעל אך נכשל
          matchedTask: data.matchedTask, // משימה שנתית שסומנה אוטומטית כהושלמה עקב המסמך
          personName: data.suggestions?.personName || '', // שם שזוהה על המסמך (רמז ל"עבור מי")
          document: data.document,
          edit: {
            entity_id: data.document.entity_id,
            document_name: data.document.document_name || '',
            year: data.document.year || '',
            required_by_date: data.document.required_by_date || '',
            owner: data.document.owner || '',
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
        owner: r.edit.owner || '',
        auto_filed: 0,
      });
      patch(r.key, { saved: true, document: data });
      onRefresh?.();
    } catch (err) {
      patch(r.key, { error: err.response?.data?.error || err.message });
    }
  };

  // השלכה — מוחק את המסמך שנקלט (למשל תיוק שגוי) כדי לאפשר העלאה מחדש
  const discardResult = async (r) => {
    try {
      await axios.delete(`/api/documents/${r.document.id}`);
      setResults((prev) => prev.filter((x) => x.key !== r.key));
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

      {aiStatus && (
        aiStatus.configured ? (
          <p className="intake-ai-status on">🤖 זיהוי חכם (GPT) פעיל — כל מסמך מנותח בראייה ({aiStatus.model})</p>
        ) : (
          <p className="intake-ai-status off">
            💡 זיהוי חכם (GPT) כבוי — כרגע זיהוי מבוסס כללים מקומיים בלבד.
            להפעלה: הגדירו <code>OPENAI_API_KEY</code> בקובץ <code>.env</code> והפעילו מחדש את השרת.
          </p>
        )
      )}

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
                  {r.method && METHOD_META[r.method] && (
                    <p className="intake-method">{METHOD_META[r.method].icon} {METHOD_META[r.method].label}{r.aiError && ' — GPT נכשל, נופל לכללים'}</p>
                  )}
                  {r.note && <p className="intake-note">⚠️ {r.note}</p>}
                  {r.matchedTask && (
                    <p className="intake-task-matched">✔️ גם סומנה כהושלמה משימה שנתית: <strong>{r.matchedTask.task_name}</strong></p>
                  )}
                  {r.action === 'duplicate' ? (
                    <p className="intake-saved">
                      ♻️ לא הועלה שוב.{' '}
                      <a href={`/api/documents/${r.existing.id}/file`} target="_blank" rel="noopener noreferrer">📎 צפייה בקיים</a>
                    </p>
                  ) : r.saved ? (
                    <>
                      <p className="intake-saved">✅ אושר ונשמר — {r.document.document_name} ({r.document.entity_name})</p>
                      {r.document.summary && <p className="intake-summary">📝 {r.document.summary}</p>}
                    </>
                  ) : (
                    <div className="intake-fields">
                      {(r.document.doc_date || r.document.summary || r.document.amounts?.length > 0) && (
                        <div className="intake-summary-box">
                          {r.document.doc_date && (
                            <p className="intake-doc-date">📅 תאריך המסמך: <strong>{new Date(r.document.doc_date).toLocaleDateString('he-IL')}</strong></p>
                          )}
                          {r.document.summary && <p className="intake-summary">📝 {r.document.summary}</p>}
                          {r.document.amounts?.length > 0 && (
                            <ul className="intake-amounts">
                              {r.document.amounts.map((a, i) => <li key={i}>💰 {a}</li>)}
                            </ul>
                          )}
                        </div>
                      )}
                      <label>
                        גוף
                        <div className="intake-entity-row">
                          <select className="entity-select" value={r.edit.entity_id || ''} onChange={(e) => setEdit(r.key, 'entity_id', e.target.value)}>
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
                      <label>
                        עבור מי
                        <select value={r.edit.owner} onChange={(e) => setEdit(r.key, 'owner', e.target.value)}>
                          {OWNER_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        {r.personName && <span className="analysis-detected">✓ זוהה שם: {r.personName}</span>}
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
                        <button className="btn btn-small btn-delete" title="השלך — מחק ואפשר העלאה מחדש" onClick={() => discardResult(r)}>🗑️ השלך</button>
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
