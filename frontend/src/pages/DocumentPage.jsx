import { useState } from 'react';
import axios from 'axios';
import { getUrgency, urgencyMeta } from '../utils/deadlines';
import { useReadOnly } from '../ReadOnlyContext';
import IntakeBox from '../components/IntakeBox';
import DocumentForm from '../components/DocumentForm';

const EMPTY_DOC = {
  entity_id: '',
  document_name: '',
  document_type: '',
  required_frequency: 'yearly',
  required_by_date: '',
};

// עמוד המסמכים.
// נקודת הכניסה למסמכים היא תיבת הקליטה (IntakeBox) — זורקים קובץ, המערכת מתייקת לבד.
// הכרטיסים משמשים לפיקוח וניהול: סטטוס, אישור תיוק אוטומטי, החלפת קובץ, עריכה.
export default function DocumentPage({ documents, entities, onAdd, onUpdate, onDelete, onUpload, onRefresh, onAddEntity }) {
  const readOnly = useReadOnly();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [analysis, setAnalysis] = useState(null); // { docId, suggestions, note }
  const [editDate, setEditDate] = useState(''); // מועד חידוש שזוהה — ניתן לתיקון בתיבת הזיהוי
  const [formData, setFormData] = useState(EMPTY_DOC);

  const handleAnalyze = async (doc) => {
    setAnalysis(null);
    try {
      const res = await axios.post(`/api/documents/${doc.id}/analyze`);
      setAnalysis({ docId: doc.id, ...res.data });
      setEditDate(res.data.suggestions?.renewalDate || doc.required_by_date || '');
    } catch (err) {
      console.error(err);
    }
  };

  const applySuggestion = (doc, s) => {
    onUpdate(doc.id, {
      ...doc,
      document_name: s.docType || doc.document_name,
      year: s.year || doc.year,
      entity_id: s.issuer?.entityId || doc.entity_id,
      required_by_date: editDate || doc.required_by_date, // מועד החידוש (המתוקן) נשמר
      doc_date: s.docDate || doc.doc_date,
      summary: s.summary || doc.summary,
      amounts: s.amounts?.length ? s.amounts : doc.amounts,
      auto_filed: 0, // המשתמש פיקח ואישר
    });
    setAnalysis(null);
  };

  const ALLOWED_RE = /\.(pdf|jpe?g|png|webp)$/i;

  // החלפת/העלאת קובץ לכרטיס ספציפי (המשתמש כבר בחר יעד) + זיהוי אוטומטי
  const uploadAndAnalyze = async (doc, file) => {
    if (!file) return;
    if (!ALLOWED_RE.test(file.name)) {
      alert('סוג קובץ לא נתמך — רק PDF או תמונה');
      return;
    }
    setUploadingId(doc.id);
    setAnalysis(null);
    try {
      await onUpload(doc.id, file);
      await handleAnalyze(doc); // מזהה לבד מיד אחרי ההעלאה
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingId(null);
    }
  };

  const handleFileChange = async (doc, e) => {
    const file = e.target.files?.[0];
    await uploadAndAnalyze(doc, file);
    e.target.value = '';
  };

  // גרירה על כרטיס ספציפי = כוונה ממוקדת ("שים את זה כאן") — נתמך בשקט
  const handleDrop = (doc, e) => {
    e.preventDefault();
    setDragOverId(null);
    if (uploadingId === doc.id) return;
    uploadAndAnalyze(doc, e.dataTransfer.files?.[0]);
  };

  // עדכון סטטוס מהיר — שולח את המסמך המלא (PUT דורס שדות חסרים)
  const handleStatusChange = (doc, newStatus) => {
    const today = new Date().toISOString().slice(0, 10);
    onUpdate(doc.id, {
      ...doc,
      status: newStatus,
      date_filed: newStatus === 'submitted' && !doc.date_filed ? today : doc.date_filed,
    });
  };

  // אישור פיקוח בלחיצה אחת — "התיוק האוטומטי נכון"
  const confirmAutoFiled = (doc) => {
    onUpdate(doc.id, { ...doc, auto_filed: 0 });
  };

  const handleDelete = (doc) => {
    if (confirm(`למחוק את המסמך "${doc.document_name}"?`)) {
      onDelete(doc.id);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_DOC);
    setShowForm(true);
  };

  const openEdit = (doc) => {
    setEditingId(doc.id);
    setFormData({
      entity_id: doc.entity_id ?? '',
      document_name: doc.document_name ?? '',
      document_type: doc.document_type ?? '',
      required_frequency: doc.required_frequency ?? 'yearly',
      required_by_date: doc.required_by_date ?? '',
      year: doc.year,
      status: doc.status,
      date_filed: doc.date_filed,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await onUpdate(editingId, formData);
      } else {
        await onAdd(formData);
      }
      setFormData(EMPTY_DOC);
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const autoFiledCount = documents.filter(d => d.auto_filed).length;

  const filteredDocs = filterStatus === 'all'
    ? documents
    : filterStatus === 'auto'
      ? documents.filter(d => d.auto_filed)
      : documents.filter(d => d.status === filterStatus);

  const getStatusBadge = (status) => {
    const badges = {
      pending: '⏳ ממתין',
      submitted: '✅ הוגש',
      verified: '✔️ אומת',
      overdue: '⚠️ בעיכוב'
    };
    return badges[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ff6b6b',
      submitted: '#51cf66',
      verified: '#40c057',
      overdue: '#ffa500'
    };
    return colors[status] || '#ccc';
  };

  return (
    <div className="page">
      <h1>📄 ניהול מסמכים</h1>

      <IntakeBox entities={entities} onRefresh={onRefresh} onAddEntity={onAddEntity} />

      <div className="page-controls">
        <div className="filter-group">
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">כל הסטטוסים ({documents.length})</option>
            {autoFiledCount > 0 && <option value="auto">🤖 ממתינים לאישור ({autoFiledCount})</option>}
            <option value="pending">⏳ ממתינים ({documents.filter(d => d.status === 'pending').length})</option>
            <option value="submitted">✅ הוגשו ({documents.filter(d => d.status === 'submitted').length})</option>
            <option value="overdue">⚠️ בעיכוב ({documents.filter(d => d.status === 'overdue').length})</option>
          </select>
        </div>

        {!readOnly && (
          <button className="btn btn-secondary btn-small" onClick={showForm ? () => { setShowForm(false); setEditingId(null); } : openAdd}>
            {showForm ? '❌ ביטול' : '➕ הוספה ידנית (מסמך מתוכנן)'}
          </button>
        )}
      </div>

      {showForm && (
        <DocumentForm
          formData={formData}
          setFormData={setFormData}
          entities={entities}
          editingId={editingId}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="documents-container">
        {filteredDocs.length === 0 ? (
          <p className="no-data">אין מסמכים</p>
        ) : (
          <div className="documents-list">
            {filteredDocs.map(doc => (
              <div
                key={doc.id}
                className={`document-card ${dragOverId === doc.id ? 'drag-over' : ''}`}
                style={{ borderLeftColor: getStatusColor(doc.status) }}
                onDragOver={readOnly ? undefined : (e) => { e.preventDefault(); setDragOverId(doc.id); }}
                onDragLeave={readOnly ? undefined : () => setDragOverId(null)}
                onDrop={readOnly ? undefined : (e) => handleDrop(doc, e)}
              >
                <div className="doc-header">
                  <h3>{doc.document_name}</h3>
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(doc.status) }}>
                    {getStatusBadge(doc.status)}
                  </span>
                </div>
                <div className="doc-info">
                  <p><strong>גוף:</strong> {doc.entity_name}</p>
                  {doc.document_type && <p><strong>סוג:</strong> {doc.document_type}</p>}
                  {doc.year && <p><strong>שנה:</strong> {doc.year}</p>}
                  {doc.required_by_date && (
                    <p>
                      <strong>להגשה:</strong> {new Date(doc.required_by_date).toLocaleDateString('he-IL')}
                      {(() => {
                        const { level, daysLeft } = getUrgency(doc.required_by_date, doc.status);
                        if (level === 'overdue' || level === 'soon') {
                          const meta = urgencyMeta(level, daysLeft);
                          return <span className="urgency-badge" style={{ backgroundColor: meta.color }}>{meta.label}</span>;
                        }
                        return null;
                      })()}
                    </p>
                  )}
                  {doc.date_filed && (
                    <p><strong>הוגש:</strong> {new Date(doc.date_filed).toLocaleDateString('he-IL')}</p>
                  )}
                  {doc.doc_date && (
                    <p><strong>תאריך המסמך:</strong> {new Date(doc.doc_date).toLocaleDateString('he-IL')}</p>
                  )}
                  {doc.summary && (
                    <p className="doc-summary"><strong>📝 תקציר:</strong> {doc.summary}</p>
                  )}
                  {doc.amounts?.length > 0 && (
                    <div className="doc-amounts">
                      <strong>💰 סכומים:</strong>
                      <ul>
                        {doc.amounts.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  )}
                  <p className="doc-file">
                    <strong>קובץ:</strong>{' '}
                    {doc.file_path ? (
                      <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noopener noreferrer">📎 צפייה בקובץ</a>
                    ) : (
                      <span className="no-file">אין קובץ — גררו לכאן או השתמשו בתיבת הקליטה</span>
                    )}
                  </p>
                  {!readOnly && !!doc.auto_filed && (
                    <span className="auto-filed-badge">
                      🤖 תויק אוטומטית — נכון?
                      <button className="btn btn-success" onClick={() => confirmAutoFiled(doc)}>✓ אשר</button>
                      <button className="btn btn-secondary" onClick={() => openEdit(doc)}>תקן</button>
                    </span>
                  )}
                </div>
                {!readOnly && (<>
                {doc.file_path && (
                  <div className="doc-upload">
                    <label className="btn btn-small btn-upload">
                      {uploadingId === doc.id ? '⏳ מעלה ומזהה…' : '🔄 החלף קובץ'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        style={{ display: 'none' }}
                        disabled={uploadingId === doc.id}
                        onChange={(e) => handleFileChange(doc, e)}
                      />
                    </label>
                  </div>
                )}

                {analysis && analysis.docId === doc.id && (
                  <div className="analysis-box">
                    {analysis.note && <p className="analysis-note">⚠️ {analysis.note}</p>}
                    <p className="analysis-title">🔍 זוהה (ביטחון: {
                      { high: 'גבוה', medium: 'בינוני', low: 'נמוך' }[analysis.suggestions.confidence]
                    })</p>
                    <ul className="analysis-list">
                      <li>גוף: <strong>{analysis.suggestions.issuer?.name || '—'}</strong></li>
                      <li>סוג מסמך: <strong>{analysis.suggestions.docType || '—'}</strong></li>
                      <li>שנה: <strong>{analysis.suggestions.year || '—'}</strong></li>
                      {analysis.suggestions.docDate && (
                        <li>תאריך המסמך: <strong>{new Date(analysis.suggestions.docDate).toLocaleDateString('he-IL')}</strong></li>
                      )}
                      <li className="analysis-date">
                        מועד חידוש/הגשה:{' '}
                        <input
                          type="date"
                          className="analysis-date-input"
                          value={editDate || ''}
                          onChange={(e) => setEditDate(e.target.value)}
                        />
                        {analysis.suggestions.renewalDate
                          ? <span className="analysis-detected">✓ זוהה אוטומטית</span>
                          : <span className="analysis-note-inline">לא זוהה — אפשר למלא ידנית</span>}
                      </li>
                      {analysis.suggestions.summary && (
                        <li>📝 תקציר: <strong>{analysis.suggestions.summary}</strong></li>
                      )}
                      {analysis.suggestions.amounts?.length > 0 && (
                        <li>
                          💰 סכומים:
                          <ul className="analysis-amounts">
                            {analysis.suggestions.amounts.map((a, i) => <li key={i}>{a}</li>)}
                          </ul>
                        </li>
                      )}
                    </ul>
                    <button className="btn btn-small btn-success" onClick={() => applySuggestion(doc, analysis.suggestions)}>
                      ✅ החל ושמור
                    </button>
                    <button className="btn btn-small btn-secondary" onClick={() => setAnalysis(null)}>סגור</button>
                  </div>
                )}
                <div className="doc-actions">
                  <select
                    className="status-select"
                    value={doc.status}
                    onChange={(e) => handleStatusChange(doc, e.target.value)}
                  >
                    <option value="pending">⏳ ממתין</option>
                    <option value="submitted">✅ הוגש</option>
                    <option value="verified">✔️ אומת</option>
                    <option value="overdue">⚠️ בעיכוב</option>
                  </select>
                  <button className="btn btn-icon btn-edit" title="ערוך" aria-label="ערוך" onClick={() => openEdit(doc)}>
                    ✏️
                  </button>
                  <button className="btn btn-icon btn-delete" title="מחק" aria-label="מחק" onClick={() => handleDelete(doc)}>
                    🗑️
                  </button>
                </div>
                </>)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
