import { useState } from 'react';

export default function ChecklistPage({ checklist, entities, onAdd }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    task_name: '',
    task_category: '',
    entity_id: '',
    required_date: '',
    assignee: 'user'
  });

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
      await onAdd({
        ...formData,
        year: new Date().getFullYear(),
        status: 'pending'
      });
      setFormData({
        task_name: '',
        task_category: '',
        entity_id: '',
        required_date: '',
        assignee: 'user'
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getPendingCount = () => checklist.filter(t => t.status === 'pending').length;
  const getCompletedCount = () => checklist.filter(t => t.status === 'completed').length;

  return (
    <div className="page">
      <h1>✅ תב"ר שנתי {new Date().getFullYear()}</h1>

      <div className="page-controls">
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '❌ ביטול' : '➕ הוסף משימה'}
        </button>
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
            <button type="submit" className="btn btn-success">💾 שמור משימה</button>
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
                      </div>
                      <span className="assignee">👤 {task.assignee === 'spouse' ? 'בן/בת זוג' : 'אני'}</span>
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
                      </div>
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
