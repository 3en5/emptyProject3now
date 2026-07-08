import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import EntitiesPage from './pages/EntitiesPage';
import ChecklistPage from './pages/ChecklistPage';
import DocumentPage from './pages/DocumentPage';
import AccountsPage from './pages/AccountsPage';
import ReportsPage from './pages/ReportsPage';
import ComparisonPage from './pages/ComparisonPage';
import { ReadOnlyContext } from './ReadOnlyContext';

const API_URL = '/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [readOnly, setReadOnly] = useState(() => localStorage.getItem('readOnly') === '1');
  const [entities, setEntities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [entitiesRes, docsRes, checklistRes, accountsRes] = await Promise.all([
        axios.get(`${API_URL}/entities`),
        axios.get(`${API_URL}/documents`),
        axios.get(`${API_URL}/checklists/current`),
        axios.get(`${API_URL}/accounts`)
      ]);

      setEntities(entitiesRes.data);
      setDocuments(docsRes.data);
      setChecklist(checklistRes.data);
      setAccounts(accountsRes.data);
      setError(null);
    } catch (err) {
      setError('שגיאה בטעינת הנתונים: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntity = async (entityData) => {
    try {
      const response = await axios.post(`${API_URL}/entities`, entityData);
      setEntities([...entities, response.data]);
      return response.data;
    } catch (err) {
      setError('שגיאה בהוספת גוף פיננסי');
      throw err;
    }
  };

  const handleUpdateEntity = async (id, entityData) => {
    try {
      const response = await axios.put(`${API_URL}/entities/${id}`, entityData);
      setEntities(entities.map(e => e.id === id ? response.data : e));
      return response.data;
    } catch (err) {
      setError('שגיאה בעדכון גוף פיננסי');
      throw err;
    }
  };

  const handleDeleteEntity = async (id) => {
    try {
      await axios.delete(`${API_URL}/entities/${id}`);
      setEntities(entities.filter(e => e.id !== id));
    } catch (err) {
      setError('שגיאה במחיקת גוף פיננסי');
      throw err;
    }
  };

  const handleAddDocument = async (docData) => {
    try {
      const response = await axios.post(`${API_URL}/documents`, docData);
      setDocuments([...documents, response.data]);
      return response.data;
    } catch (err) {
      setError('שגיאה בהוספת מסמך');
      throw err;
    }
  };

  const handleUpdateDocument = async (id, docData) => {
    try {
      const response = await axios.put(`${API_URL}/documents/${id}`, docData);
      setDocuments(documents.map(d => d.id === id ? response.data : d));
      return response.data;
    } catch (err) {
      setError('שגיאה בעדכון מסמך');
      throw err;
    }
  };

  const handleDeleteDocument = async (id) => {
    try {
      await axios.delete(`${API_URL}/documents/${id}`);
      setDocuments(documents.filter(d => d.id !== id));
    } catch (err) {
      setError('שגיאה במחיקת מסמך');
      throw err;
    }
  };

  const handleUploadDocument = async (id, file) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await axios.post(`${API_URL}/documents/${id}/upload`, form);
      setDocuments(documents.map(d => d.id === id ? response.data : d));
      return response.data;
    } catch (err) {
      setError('שגיאה בהעלאת קובץ: ' + (err.response?.data?.error || err.message));
      throw err;
    }
  };

  const handleAddChecklistTask = async (taskData) => {
    try {
      const response = await axios.post(`${API_URL}/checklists`, taskData);
      setChecklist([...checklist, response.data]);
      return response.data;
    } catch (err) {
      setError('שגיאה בהוספת משימה');
      throw err;
    }
  };

  const handleUpdateChecklistTask = async (id, taskData) => {
    try {
      const response = await axios.put(`${API_URL}/checklists/${id}`, taskData);
      setChecklist(checklist.map(t => t.id === id ? response.data : t));
      return response.data;
    } catch (err) {
      setError('שגיאה בעדכון משימה');
      throw err;
    }
  };

  const handleDeleteChecklistTask = async (id) => {
    try {
      await axios.delete(`${API_URL}/checklists/${id}`);
      setChecklist(checklist.filter(t => t.id !== id));
    } catch (err) {
      setError('שגיאה במחיקת משימה');
      throw err;
    }
  };

  const handleAddAccount = async (accountData) => {
    try {
      const response = await axios.post(`${API_URL}/accounts`, accountData);
      setAccounts([...accounts, response.data]);
      return response.data;
    } catch (err) {
      setError('שגיאה בהוספת חשבון');
      throw err;
    }
  };

  const handleUpdateAccount = async (id, accountData) => {
    try {
      const response = await axios.put(`${API_URL}/accounts/${id}`, accountData);
      setAccounts(accounts.map(a => a.id === id ? { ...a, ...response.data } : a));
      return response.data;
    } catch (err) {
      setError('שגיאה בעדכון חשבון');
      throw err;
    }
  };

  const handleDeleteAccount = async (id) => {
    try {
      await axios.delete(`${API_URL}/accounts/${id}`);
      setAccounts(accounts.filter(a => a.id !== id));
    } catch (err) {
      setError('שגיאה במחיקת חשבון');
      throw err;
    }
  };

  if (loading) {
    return <div className="container"><p>טוען נתונים...</p></div>;
  }

  const toggleReadOnly = () => {
    setReadOnly((prev) => {
      const next = !prev;
      localStorage.setItem('readOnly', next ? '1' : '0');
      return next;
    });
  };

  return (
    <ReadOnlyContext.Provider value={readOnly}>
    <div className="app">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} readOnly={readOnly} onToggleReadOnly={toggleReadOnly} />
      <main className="main-content">
        {error && <div className="error-message">{error}</div>}

        {currentPage === 'dashboard' && (
          <Dashboard
            entities={entities}
            documents={documents}
            checklist={checklist}
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage === 'entities' && (
          <EntitiesPage
            entities={entities}
            onAdd={handleAddEntity}
            onUpdate={handleUpdateEntity}
            onDelete={handleDeleteEntity}
          />
        )}

        {currentPage === 'checklist' && (
          <ChecklistPage
            checklist={checklist}
            entities={entities}
            onAdd={handleAddChecklistTask}
            onUpdate={handleUpdateChecklistTask}
            onDelete={handleDeleteChecklistTask}
          />
        )}

        {currentPage === 'documents' && (
          <DocumentPage
            documents={documents}
            entities={entities}
            onAdd={handleAddDocument}
            onUpdate={handleUpdateDocument}
            onDelete={handleDeleteDocument}
            onUpload={handleUploadDocument}
          />
        )}

        {currentPage === 'accounts' && (
          <AccountsPage
            accounts={accounts}
            entities={entities}
            onAdd={handleAddAccount}
            onUpdate={handleUpdateAccount}
            onDelete={handleDeleteAccount}
          />
        )}

        {currentPage === 'reports' && <ReportsPage />}

        {currentPage === 'comparison' && <ComparisonPage />}
      </main>
    </div>
    </ReadOnlyContext.Provider>
  );
}
