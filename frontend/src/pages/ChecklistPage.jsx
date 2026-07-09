import { useState, useEffect } from 'react';
import axios from 'axios';
import { getUrgency, urgencyMeta } from '../utils/deadlines';
import { useReadOnly } from '../ReadOnlyContext';
import { useYears } from '../hooks/useYears';

const EMPTY_TASK = {
  task_name: '',
  task_category: '',
  entity_id: '',
  required_date: '',
  assignee: 'user',
};

const CURRENT_YEAR = new Date().getFullYear();

export default function ChecklistPage({ checklist, entities, onAdd, onUpdate, onDelete }) {
  const readOnly = useReadOnly();
  const years = useYears();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_TASK);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [otherYearList, setOtherYearList] = useState([]);
  const [loadingYear, setLoadingYear] = useState(false);

  // App.jsx כבר מחזיק את השנה הנוכחית מעודכנת (checklist prop) — לשנים אחרות שולפים בנפרד
  const isCurrentYear = selectedYear === CURRENT_YEAR;
  const list = isCurrentYear ? checklist : otherYearList;

  useEffect(() => {
    if (isCurrentYear) return;
    let active = true;
    setLoadingYear(true);
    axios.get(`/api/checklists/year/${selectedYear}`)
      .then((res) => { if (active) setOtherYearList(res.data); })
      .finally(() => { if (active) setLoadingYear(false); });
    return () => { active = false; };
  }, [selectedYear, isCurrentYear]);

  const refreshOtherYear = () => {
    if (isCurrentYear) return;
    axios.get(`/api/checklists/year/${selectedYear}`).then((res) => setOtherYearList(res.data));
  };

  // סימון הושלם/ממתין — שולח את המשימה המלאה (PUT דורס שדות חסרים)
  // auto_completed: 0 — זו פעולה ידנית, לא הדגל האוטומטי; מנקה אותו אם היה דלוק
  const toggleComplete = async (task) => {
    const completed = task.status === 'completed';
    const today = new Date().toISOString().slice(0, 10);
    await onUpdate(task.id, {
      ...task,
      status: completed ? 'pending' : 'completed',
      completed_date: completed ? null : today,
      auto_completed: 0,
    });
    refreshOtherYear();
  };

  // אישור פיקוח בלחיצה אחת — "ההשלמה האוטומטית נכונה" (משאיר completed, רק מנקה את הדגל)
  const confirmAutoCompleted = async (task) => {
    await onUpdate(task.id, { ...task, auto_completed: 0 });
    refreshOtherYear();
  };

  // אישור פיקוח על משימה שנוצרה אוטומטית (עקב מסמך שהתקבל) — רק מנקה את הדגל
  const confirmAutoCreated = async (task) => {
    await onUpdate(task.id, { ...task, auto_created: 0 });
    refreshOtherYear();
  };

  const handleDelete = async (task) => {
    if (confirm(`למחוק את המשימה "${task.task_name}"?`)) {
      await onDelete(task.id);
      refreshOtherYear();
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_TASK);
    setShowForm(true);
  };

  const openEdit = (task) => {
    setEditingId(task.id);
    setFormData({
      task_name: task.task_name ?? '',
      task_category: task.task_category ?? '',
      entity_id: task.entity_id ?? '',
      required_date: task.required_date ?? '',
      assignee: task.assignee ?? 'user',
      status: task.status,
      completed_date: task.completed_date,
    });
    setShowForm(true);
  };

  const categories = [
    'דוח מס הכנסה',
    'דוח קצבה',
    'דוח השקעות',
    'עדכון ביטוח',
    'דוח בנק',
    'דוח נדלן',
    'דוח ביטוח מנהלים',
    'דוח קרן השתלמות',
    'אחר'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await onUpdate(editingId, { ...formData, year: selectedYear });
      } else {
        await onAdd({
          ...formData,
          year: selectedYear,
          status: 'pending'
        });
      }
      refreshOtherYear();
      setFormData(EMPTY_TASK);
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getPendingCount = () => list.filter(t => t.status === 'pending').length;
  const getCompletedCount = () => list.filter(t => t.status === 'completed').length;

  return (
    <div className="page">
      <h1>✅ משימות שנתיות {selectedYear}</h1>

      <div className="page-controls">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {!readOnly && (
            <button className="btn btn-primary" onClick={showForm ? () => { setShowForm(false); setEditingId(null); } : openAdd}>
              {showForm ? '❌ ביטול' : '➕ הוסף משימה'}
            </button>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>שנה</label>
            <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <a
            className="btn btn-secondary"
            href={`/api/export/action-list.csv?year=${selectedYear}`}
            download
          >
            📥 ייצוא רשימת פעולות (CSV)
          </a>
        </div>
        <div className="stats">
          <span>⏳ {getPendingCount()} ממתינות</span>
          <span>✅ {getCompletedCount()} הושלמו</span>
          <span>📊 {list.length} סה"כ</span>
        </div>
      </div>

      {showForm && (
        <form className="form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>שם המשימה *</label>
            <input
              type="text"
              required
              value={formData.task_name}
              onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
              placeholder="לדוגמה: הגשת דוח 867"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>קטגוריה</label>
              <select
                value={formData.task_category}
                onChange={(e) => setFormData({ ...formData, task_category: e.target.value })}
              >
                <option value="">בחר קטגוריה</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>גוף פיננסי</label>
              <select
                value={formData.entity_id}
                onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
              >
                <option value="">בחר גוף</option>
                {entities.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>תאריך הגשה</label>
              <input
                type="date"
                value={formData.required_date}
                onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>משימה של</label>
              <select
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              >
                <option value="user">אני</option>
                <option value="spouse">בן/בת זוג</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-success">💾 {editingId ? 'עדכן משימה' : 'שמור משימה'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>ביטול</button>
          </div>
        </form>
      )}

      <div className="checklist-container">
        {loadingYear ? (
          <p className="no-data">טוען משימות {selectedYear}...</p>
        ) : list.length === 0 ? (
          <p className="no-data">אין משימות עדיין ל-{selectedYear}</p>
        ) : (
          <div className="status-sections">
            <div className="status-section">
              <h2>⏳ ממתינות ({getPendingCount()})</h2>
              {list.filter(t => t.status === 'pending').length === 0 ? (
                <p className="no-data">אין משימות ממתינות</p>
              ) : (
                <ul className="task-list">
                  {list.filter(t => t.status === 'pending').map(task => (
                    <li key={task.id} className="task-item">
                      <div className="task-info">
                        <h3>{task.task_name}</h3>
                        {task.task_category && <span className="badge">{task.task_category}</span>}
                        {task.entity_name && <span className="badge entity">{task.entity_name}</span>}
                        {task.required_date && <span className="badge date">{new Date(task.required_date).toLocaleDateString('he-IL')}</span>}
                        {(() => {
                          const { level, daysLeft } = getUrgency(task.required_date, task.status);
                          if (level === 'overdue' || level === 'soon') {
                            const meta = urgencyMeta(level, daysLeft);
                            return <span className="urgency-badge" style={{ backgroundColor: meta.color }}>{meta.label}</span>;
                          }
                          return null;
                        })()}
                        {!!task.auto_created && (
                          <span className="auto-completed-badge">
                            🤖 נוצרה אוטומטית ממסמך שהתקבל
                            {!readOnly && <button className="btn btn-success" onClick={() => confirmAutoCreated(task)}>✓ אשר</button>}
                          </span>
                        )}
                      </div>
                      <div className="task-actions">
                        <span className="assignee">👤 {task.assignee === 'spouse' ? 'בן/בת זוג' : 'אני'}</span>
                        {!readOnly && (<>
                          <button className="btn btn-small btn-success" onClick={() => toggleComplete(task)}>
                            ✔️ סמן כהושלם
                          </button>
                          <button className="btn btn-icon btn-edit" title="ערוך" aria-label="ערוך" onClick={() => openEdit(task)}>✏️</button>
                          <button className="btn btn-icon btn-delete" title="מחק" aria-label="מחק" onClick={() => handleDelete(task)}>🗑️</button>
                        </>)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="status-section completed">
              <h2>✅ הושלמו ({getCompletedCount()})</h2>
              {list.filter(t => t.status === 'completed').length === 0 ? (
                <p className="no-data">אין משימות הושלמות</p>
              ) : (
                <ul className="task-list">
                  {list.filter(t => t.status === 'completed').map(task => (
                    <li key={task.id} className="task-item completed">
                      <div className="task-info">
                        <h3>{task.task_name}</h3>
                        {task.task_category && <span className="badge">{task.task_category}</span>}
                        {task.completed_date && <span className="badge date">הושלם: {new Date(task.completed_date).toLocaleDateString('he-IL')}</span>}
                        {!!task.auto_completed && (
                          <span className="auto-completed-badge">
                            🤖 הושלם אוטומטית{task.completed_by_document_name && <> עקב מסמך: <strong>{task.completed_by_document_name}</strong></>}
                            {!readOnly && <button className="btn btn-success" onClick={() => confirmAutoCompleted(task)}>✓ אשר</button>}
                          </span>
                        )}
                      </div>
                      {!readOnly && (
                        <div className="task-actions">
                          <button className="btn btn-small btn-secondary" onClick={() => toggleComplete(task)}>
                            ↩️ החזר לממתין
                          </button>
                          <button className="btn btn-icon btn-edit" title="ערוך" aria-label="ערוך" onClick={() => openEdit(task)}>✏️</button>
                          <button className="btn btn-icon btn-delete" title="מחק" aria-label="מחק" onClick={() => handleDelete(task)}>🗑️</button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
