export default function Navigation({ currentPage, onPageChange, readOnly, onToggleReadOnly }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>💰 ניהול מסמכים פיננסיים</h1>
        <button
          className={`readonly-toggle ${readOnly ? 'on' : ''}`}
          onClick={onToggleReadOnly}
          title="מצב צפייה-בלבד — מסתיר כפתורי עריכה"
        >
          {readOnly ? '👁️ מצב צפייה' : '✏️ מצב עריכה'}
        </button>
      </div>
      <ul className="navbar-menu">
        <li>
          <button
            className={`nav-button ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => onPageChange('dashboard')}
          >
            🏠 עמוד הבית
          </button>
        </li>
        <li>
          <button
            className={`nav-button ${currentPage === 'entities' ? 'active' : ''}`}
            onClick={() => onPageChange('entities')}
          >
            🏦 גופים פיננסיים
          </button>
        </li>
        <li>
          <button
            className={`nav-button ${currentPage === 'accounts' ? 'active' : ''}`}
            onClick={() => onPageChange('accounts')}
          >
            💳 חשבונות
          </button>
        </li>
        <li>
          <button
            className={`nav-button ${currentPage === 'documents' ? 'active' : ''}`}
            onClick={() => onPageChange('documents')}
          >
            📄 מסמכים
          </button>
        </li>
        <li>
          <button
            className={`nav-button ${currentPage === 'checklist' ? 'active' : ''}`}
            onClick={() => onPageChange('checklist')}
          >
            ✅ משימות שנתיות
          </button>
        </li>
        <li>
          <button
            className={`nav-button ${currentPage === 'reports' ? 'active' : ''}`}
            onClick={() => onPageChange('reports')}
          >
            📊 דוחות
          </button>
        </li>
        <li>
          <button
            className={`nav-button ${currentPage === 'comparison' ? 'active' : ''}`}
            onClick={() => onPageChange('comparison')}
          >
            🔄 השוואת שנים
          </button>
        </li>
      </ul>
    </nav>
  );
}
