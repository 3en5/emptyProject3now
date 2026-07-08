import { useState } from 'react';
import { useReadOnly } from '../ReadOnlyContext';

const EMPTY = {
  entity_id: '',
  account_name: '',
  account_type: '',
  balance: '',
  currency: 'ILS',
  account_number: '',
};

export default function AccountsPage({ accounts, entities, onAdd, onUpdate, onDelete }) {
  const readOnly = useReadOnly();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY);

  const openAdd = () => {
    setEditingId(null);
    setFormData(EMPTY);
    setShowForm(true);
  };

  const openEdit = (acc) => {
    setEditingId(acc.id);
    setFormData({
      entity_id: acc.entity_id ?? '',
      account_name: acc.account_name ?? '',
      account_type: acc.account_type ?? '',
      balance: acc.balance ?? '',
      currency: acc.currency ?? 'ILS',
      account_number: acc.account_number ?? '',
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
      setFormData(EMPTY);
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = (acc) => {
    if (confirm(`למחוק את החשבון "${acc.account_name}"?`)) {
      onDelete(acc.id);
    }
  };

  const entityName = (id) => entities.find((e) => e.id === id)?.name || '';

  return (
    <div className="page">
      <h1>💳 ניהול חשבונות</h1>

      <div className="page-controls">
        {!readOnly && (
          <button className="btn btn-primary" onClick={showForm ? () => setShowForm(false) : openAdd}>
            {showForm ? '❌ ביטול' : '➕ הוסף חשבון'}
          </button>
        )}
        <div className="stats">
          <span>📊 {accounts.length} חשבונות</span>
        </div>
      </div>

      {showForm && (
        <form className="form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>גוף פיננסי *</label>
              <select
                required
                value={formData.entity_id}
                onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
              >
                <option value="">בחר גוף</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>שם החשבון *</label>
              <input
                type="text"
                required
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="לדוגמה: עו״ש, פיקדון"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>סוג חשבון</label>
              <input
                type="text"
                value={formData.account_type}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                placeholder="עו״ש / פיקדון / ניירות ערך"
              />
            </div>
            <div className="form-group">
              <label>מספר חשבון</label>
              <input
                type="text"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>יתרה</label>
              <input
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>מטבע</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="ILS">₪ שקל</option>
                <option value="USD">$ דולר</option>
                <option value="EUR">€ אירו</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-success">💾 {editingId ? 'עדכן' : 'שמור'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>ביטול</button>
          </div>
        </form>
      )}

      {accounts.length === 0 ? (
        <p className="no-data">אין חשבונות עדיין. הוסף חשבון ראשון!</p>
      ) : (
        <div className="entities-grid">
          {accounts.map((acc) => (
            <div key={acc.id} className="entity-card">
              <div className="entity-header">
                <h3>💳 {acc.account_name}</h3>
                {acc.account_type && <span className="category-label">{acc.account_type}</span>}
              </div>
              <div className="entity-details">
                <p><strong>גוף:</strong> {acc.entity_name || entityName(acc.entity_id)}</p>
                {acc.account_number && <p><strong>מספר חשבון:</strong> {acc.account_number}</p>}
                {(acc.balance !== null && acc.balance !== '' && acc.balance !== undefined) && (
                  <p><strong>יתרה:</strong> {Number(acc.balance).toLocaleString('he-IL')} {acc.currency}</p>
                )}
              </div>
              {!readOnly && (
                <div className="entity-actions">
                  <button className="btn btn-icon btn-edit" title="ערוך" aria-label="ערוך" onClick={() => openEdit(acc)}>✏️</button>
                  <button className="btn btn-icon btn-delete" title="מחק" aria-label="מחק" onClick={() => handleDelete(acc)}>🗑️</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
