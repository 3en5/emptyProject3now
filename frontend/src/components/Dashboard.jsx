import { getUrgency, urgencyMeta, isAlerting } from '../utils/deadlines';
import UpdateChecker from './UpdateChecker';
import IntakeBox from './IntakeBox';

export default function Dashboard({ entities, documents, checklist, onNavigate, onRefresh, onAddEntity }) {
  const autoFiled = documents.filter(d => d.auto_filed);
  const pendingDocs = documents.filter(d => d.status === 'pending').length;
  const completedDocs = documents.filter(d => d.status === 'submitted').length;
  const pendingTasks = checklist.filter(t => t.status === 'pending').length;
  const completedTasks = checklist.filter(t => t.status === 'completed').length;

  // איסוף התראות דחיפות ממסמכים ומשימות יחד
  const alerts = [
    ...documents.map(d => ({
      id: `doc-${d.id}`, kind: 'doc', name: d.document_name, sub: d.entity_name,
      date: d.required_by_date, ...getUrgency(d.required_by_date, d.status),
    })),
    ...checklist.map(t => ({
      id: `task-${t.id}`, kind: 'task', name: t.task_name, sub: t.task_category,
      date: t.required_date, ...getUrgency(t.required_date, t.status),
    })),
  ]
    .filter(a => isAlerting(a.level))
    .sort((a, b) => a.daysLeft - b.daysLeft); // הכי דחוף (באיחור) קודם

  const entityTypes = {
    bank: '🏦 בנקים',
    insurance: '🛡️ ביטוחים',
    investment: '📈 השקעות',
    realty: '🏠 נדלן',
    loan: '💳 הלוואות',
    vehicle: '🚗 רכבים',
    license: '📜 רישיונות'
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
      <IntakeBox entities={entities} onRefresh={onRefresh} onAddEntity={onAddEntity} />

      {autoFiled.length > 0 && (
        <div className="dashboard-section alerts-section">
          <h2>🤖 תויקו אוטומטית — ממתינים לאישור שלך ({autoFiled.length})</h2>
          <div className="pending-list">
            {autoFiled.slice(0, 5).map(d => (
              <div key={d.id} className="pending-item alert-item" onClick={() => onNavigate('documents')}>
                <span>📄 {d.document_name}</span>
                <span className="entity-badge">{d.entity_name}</span>
                {d.year && <span className="date-badge">{d.year}</span>}
              </div>
            ))}
            <button className="view-all-btn" onClick={() => onNavigate('documents')}>
              לפיקוח ואישור
            </button>
          </div>
        </div>
      )}

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

      {alerts.length > 0 && (
        <div className="dashboard-section alerts-section">
          <h2>🚨 התראות מועדים ({alerts.length})</h2>
          <div className="pending-list">
            {alerts.slice(0, 8).map(a => {
              const meta = urgencyMeta(a.level, a.daysLeft);
              return (
                <div
                  key={a.id}
                  className="pending-item alert-item"
                  style={{ borderRightColor: meta.color }}
                  onClick={() => onNavigate(a.kind === 'doc' ? 'documents' : 'checklist')}
                >
                  <span>{a.kind === 'doc' ? '📄' : '📝'} {a.name}</span>
                  {a.sub && <span className="entity-badge">{a.sub}</span>}
                  <span className="date-badge" style={{ backgroundColor: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="date-badge">
                    {new Date(a.date).toLocaleDateString('he-IL')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      <UpdateChecker />
    </div>
  );
}
