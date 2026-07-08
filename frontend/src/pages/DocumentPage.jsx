import { useState } from 'react';
import { getUrgency, urgencyMeta } from '../utils/deadlines';

const EMPTY_DOC = {
  entity_id: '',
  document_name: '',
  document_type: '',
  required_frequency: 'yearly',
  required_by_date: '',
};

export default function DocumentPage({ documents, entities, onAdd, onUpdate, onDelete, onUpload }) {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_DOC);

  const handleFileChange = async (doc, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(doc.id);
    try {
      await onUpload(doc.id, file);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
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

  const filteredDocs = filterStatus === 'all'
    ? documents
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

      <div className="page-controls">
        <button className="btn btn-primary" onClick={showForm ? () => { setShowForm(false); setEditingId(null); } : openAdd}>
          {showForm ? '❌ ביטול' : '➕ הוסף מסמך'}
        </button>

        <div className="filter-group">
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">כל הסטטוסים ({documents.length})</option>
            <option value="pending">⏳ ממתינים ({documents.filter(d => d.status === 'pending').length})</option>
            <option value="submitted">✅ הוגשו ({documents.filter(d => d.status === 'submitted').length})</option>
            <option value="overdue">⚠️ בעיכוב ({documents.filter(d => d.status === 'overdue').length})</option>
          </select>
        </div>
      </div>

      {showForm && (
        <form className="form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>גוף פיננסי *</label>
            <select
              required
              value={formData.entity_id}
              onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
            >
              <option value="">בחר גוף</option>
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>שם המסמך *</label>
            <input
              type="text"
              required
              value={formData.document_name}
              onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
              placeholder="לדוגמה: דוח 867"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>סוג מסמך</label>
              <input
                type="text"
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                placeholder="לדוגמה: דוח מס"
              />
            </div>

            <div className="form-group">
              <label>תדירות</label>
              <select
                value={formData.required_frequency}
                onChange={(e) => setFormData({ ...formData, required_frequency: e.target.value })}
              >
                <option value="yearly">שנתי</option>
                <option value="monthly">חודשי</option>
                <option value="quarterly">רבעוני</option>
                <option value="once">פעם אחת</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>תאריך הגשה נדרש</label>
            <input
              type="date"
              value={formData.required_by_date}
              onChange={(e) => setFormData({ ...formData, required_by_date: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-success">💾 {editingId ? 'עדכן מסמך' : 'שמור מסמך'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>ביטול</button>
          </div>
        </form>
      )}

      <div className="documents-container">
        {filteredDocs.length === 0 ? (
          <p className="no-data">אין מסמכים</p>
        ) : (
          <div className="documents-grid">
            {filteredDocs.map(doc => (
              <div key={doc.id} className="document-card" style={{ borderLeftColor: getStatusColor(doc.status) }}>
                <div className="doc-header">
                  <h3>{doc.document_name}</h3>
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(doc.status) }}>
                    {getStatusBadge(doc.status)}
                  </span>
                </div>
                <div className="doc-info">
                  <p><strong>גוף:</strong> {doc.entity_name}</p>
                  {doc.document_type && <p><strong>סוג:</strong> {doc.document_type}</p>}
                  {doc.required_frequency && <p><strong>תדירות:</strong> {doc.required_frequency}</p>}
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
                  <p className="doc-file">
                    <strong>קובץ:</strong>{' '}
                    {doc.file_path ? (
                      <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noopener noreferrer">📎 צפייה בקובץ</a>
                    ) : (
                      <span className="no-file">אין קובץ מצורף</span>
                    )}
                  </p>
                </div>
                <div className="doc-upload">
                  <label className="btn btn-small btn-upload">
                    {uploadingId === doc.id ? '⏳ מעלה…' : (doc.file_path ? '🔄 החלף קובץ' : '📤 העלה קובץ')}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      style={{ display: 'none' }}
                      disabled={uploadingId === doc.id}
                      onChange={(e) => handleFileChange(doc, e)}
                    />
                  </label>
                </div>
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
                  <button className="btn btn-small btn-edit" onClick={() => openEdit(doc)}>
                    ✏️ ערוך
                  </button>
                  <button className="btn btn-small btn-delete" onClick={() => handleDelete(doc)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
