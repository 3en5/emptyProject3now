export default function Dashboard({ entities, documents, checklist, onNavigate }) {
  const pendingDocs = documents.filter(d => d.status === 'pending').length;
  const completedDocs = documents.filter(d => d.status === 'submitted').length;
  const pendingTasks = checklist.filter(t => t.status === 'pending').length;
  const completedTasks = checklist.filter(t => t.status === 'completed').length;

  const entityTypes = {
    bank: '🏦 בנקים',
    insurance: '🛡️ ביטוחים',
    investment: '📈 השקעות',
    realty: '🏠 נדלן',
    loan: '💳 הלוואות'
  };

  const entitiesByType = {};
  entities.forEach(e => {
    if (!entitiesByType[e.type]) {
      entitiesByType[e.type] = [];
    }
    entitiesByType[e.type].push(e);
  });

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>📊 סך הכל גופים פיננסיים</h3>
          <p className="stat-number">{entities.length}</p>
        </div>
        <div className="stat-card">
          <h3>📄 מסמכים</h3>
          <p className="stat-number">{documents.length}</p>
          <p className="stat-details">⏳ {pendingDocs} ממתינים | ✅ {completedDocs} הגישו</p>
        </div>
        <div className="stat-card">
          <h3>✅ משימות שנתיות</h3>
          <p className="stat-number">{checklist.length}</p>
          <p className="stat-details">⏳ {pendingTasks} ממתינים | ✅ {completedTasks} הושלמו</p>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>🏦 גופים פיננסיים לפי סוג</h2>
        <div className="entities-by-type">
          {Object.entries(entityTypes).map(([type, label]) => (
            <div key={type} className="type-section">
              <h3>{label}</h3>
              {entitiesByType[type] && entitiesByType[type].length > 0 ? (
                <ul>
                  {entitiesByType[type].map(e => (
                    <li key={e.id}>{e.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="no-data">אין גופים מסוג זה</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h2>⏳ מסמכים ממתינים</h2>
        {pendingDocs > 0 ? (
          <div className="pending-list">
            {documents.filter(d => d.status === 'pending').slice(0, 5).map(doc => (
              <div key={doc.id} className="pending-item">
                <span>📄 {doc.document_name}</span>
                <span className="entity-badge">{doc.entity_name}</span>
                <span className="date-badge">
                  {doc.required_by_date ? new Date(doc.required_by_date).toLocaleDateString('he-IL') : 'לא צוין'}
                </span>
              </div>
            ))}
            <button className="view-all-btn" onClick={() => onNavigate('documents')}>
              הצג הכל
            </button>
          </div>
        ) : (
          <p className="success-message">✅ אין מסמכים ממתינים!</p>
        )}
      </div>

      <div className="dashboard-section">
        <h2>✅ משימות שנתיות ממתינות</h2>
        {pendingTasks > 0 ? (
          <div className="pending-list">
            {checklist.filter(t => t.status === 'pending').slice(0, 5).map(task => (
              <div key={task.id} className="pending-item">
                <span>📝 {task.task_name}</span>
                <span className="category-badge">{task.task_category}</span>
                <span className="date-badge">
                  {task.required_date ? new Date(task.required_date).toLocaleDateString('he-IL') : 'לא צוין'}
                </span>
              </div>
            ))}
            <button className="view-all-btn" onClick={() => onNavigate('checklist')}>
              הצג הכל
            </button>
          </div>
        ) : (
          <p className="success-message">✅ כל המשימות הושלמו!</p>
        )}
      </div>
    </div>
  );
}
