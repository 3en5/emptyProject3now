import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import EntitiesPage from './pages/EntitiesPage';
import ChecklistPage from './pages/ChecklistPage';
import DocumentPage from './pages/DocumentPage';

const API_URL = '/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [entities, setEntities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [entitiesRes, docsRes, checklistRes] = await Promise.all([
        axios.get(`${API_URL}/entities`),
        axios.get(`${API_URL}/documents`),
        axios.get(`${API_URL}/checklists/current`)
      ]);

      setEntities(entitiesRes.data);
      setDocuments(docsRes.data);
      setChecklist(checklistRes.data);
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

  if (loading) {
    return <div className="container"><p>טוען נתונים...</p></div>;
  }

  return (
    <div className="app">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
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
            onRefresh={fetchData}
          />
        )}

        {currentPage === 'documents' && (
          <DocumentPage
            documents={documents}
            entities={entities}
            onAdd={handleAddDocument}
            onUpdate={handleUpdateDocument}
          />
        )}
      </main>
    </div>
  );
}
