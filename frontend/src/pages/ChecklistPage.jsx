import { useState } from 'react';
import { getUrgency, urgencyMeta } from '../utils/deadlines';
import { useReadOnly } from '../ReadOnlyContext';

const EMPTY_TASK = {
  task_name: '',
  task_category: '',
  entity_id: '',
  required_date: '',
  assignee: 'user',
};

export default function ChecklistPage({ checklist, entities, onAdd, onUpdate, onDelete }) {
  const readOnly = useReadOnly();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_TASK);

  // סימון הושלם/ממתין — שולח את המשימה המלאה (PUT דורס שדות חסרים)
  const toggleComplete = (task) => {
    const completed = task.status === 'completed';
    const today = new Date().toISOString().slice(0, 10);
    onUpdate(task.id, {
      ...task,
      status: completed ? 'pending' : 'completed',
      completed_date: completed ? null : today,
    });
  };

  const handleDelete = (task) => {
    if (confirm(`למחוק את המשימה "${task.task_name}"?`)) {
      onDelete(task.id);
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
        await onUpdate(editingId, { ...formData, year: new Date().getFullYear() });
      } else {
        await onAdd({
          ...formData,
          year: new Date().getFullYear(),
          status: 'pending'
        });
      }
      setFormData(EMPTY_TASK);
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getPendingCount = () => checklist.filter(t => t.status === 'pending').length;
  const getCompletedCount = () => checklist.filter(t => t.status === 'completed').length;

  return (
    <div className="page">
      <h1>✅ משימות שנתיות {new Date().getFullYear()}</h1>

      <div className="page-controls">
        {!readOnly && (
          <button className="btn btn-primary" onClick={showForm ? () => { setShowForm(false); setEditingId(null); } : openAdd}>
            {showForm ? '❌ ביטול' : '➕ הוסף משימה'}
          </button>
        )}
        <div className="stats">
          <span>⏳ {getPendingCount()} ממתינות</span>
          <span>✅ {getCompletedCount()} הושלמו</span>
          <span>📊 {checklist.length} סה"כ</span>
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
        {checklist.length === 0 ? (
          <p className="no-data">אין משימות עדיין</p>
        ) : (
          <div className="status-sections">
            <div className="status-section">
              <h2>⏳ ממתינות ({getPendingCount()})</h2>
              {checklist.filter(t => t.status === 'pending').length === 0 ? (
                <p className="no-data">אין משימות ממתינות</p>
              ) : (
                <ul className="task-list">
                  {checklist.filter(t => t.status === 'pending').map(task => (
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
                      </div>
                      <div className="task-actions">
                        <span className="assignee">👤 {task.assignee === 'spouse' ? 'בן/בת זוג' : 'אני'}</span>
                        {!readOnly && (<>
                          <button className="btn btn-small btn-success" onClick={() => toggleComplete(task)}>
                            ✔️ סמן כהושלם
                          </button>
                          <button className="btn btn-small btn-edit" onClick={() => openEdit(task)}>
                            ✏️
                          </button>
                          <button className="btn btn-small btn-delete" onClick={() => handleDelete(task)}>
                            🗑️
                          </button>
                        </>)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="status-section completed">
              <h2>✅ הושלמו ({getCompletedCount()})</h2>
              {checklist.filter(t => t.status === 'completed').length === 0 ? (
                <p className="no-data">אין משימות הושלמות</p>
              ) : (
                <ul className="task-list">
                  {checklist.filter(t => t.status === 'completed').map(task => (
                    <li key={task.id} className="task-item completed">
                      <div className="task-info">
                        <h3>{task.task_name}</h3>
                        {task.task_category && <span className="badge">{task.task_category}</span>}
                        {task.completed_date && <span className="badge date">הושלם: {new Date(task.completed_date).toLocaleDateString('he-IL')}</span>}
                      </div>
                      {!readOnly && (
                        <div className="task-actions">
                          <button className="btn btn-small btn-secondary" onClick={() => toggleComplete(task)}>
                            ↩️ החזר לממתין
                          </button>
                          <button className="btn btn-small btn-edit" onClick={() => openEdit(task)}>
                            ✏️
                          </button>
                          <button className="btn btn-small btn-delete" onClick={() => handleDelete(task)}>
                            🗑️
                          </button>
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
