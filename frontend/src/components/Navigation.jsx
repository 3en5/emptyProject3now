export default function Navigation({ currentPage, onPageChange }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>💰 ניהול מסמכים פיננסיים</h1>
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
            ✅ תב"ר שנתי
          </button>
        </li>
      </ul>
    </nav>
  );
}
