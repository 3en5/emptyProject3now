import { useState } from 'react';
import EntityForm from '../components/EntityForm';
import EntityList from '../components/EntityList';

export default function EntitiesPage({ entities, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedType, setSelectedType] = useState('all');

  const filteredEntities = selectedType === 'all'
    ? entities
    : entities.filter(e => e.type === selectedType);

  const handleFormSubmit = async (data) => {
    try {
      if (editingId) {
        await onUpdate(editingId, data);
        setEditingId(null);
      } else {
        await onAdd(data);
      }
      setShowForm(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="page">
      <h1>🏦 ניהול גופים פיננסיים</h1>

      <div className="page-controls">
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '❌ ביטול' : '➕ הוסף גוף פיננסי'}
        </button>

        <select
          className="filter-select"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="all">כל הסוגים</option>
          <option value="bank">🏦 בנק</option>
          <option value="insurance">🛡️ ביטוח</option>
          <option value="investment">📈 השקעה</option>
          <option value="realty">🏠 נדלן</option>
          <option value="loan">💳 הלוואה</option>
          <option value="vehicle">🚗 רכב</option>
          <option value="license">📜 רישיון</option>
        </select>
      </div>

      {showForm && (
        <EntityForm
          onSubmit={handleFormSubmit}
          editingEntity={editingId ? entities.find(e => e.id === editingId) : null}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
        />
      )}

      <EntityList
        entities={filteredEntities}
        onEdit={(id) => {
          setEditingId(id);
          setShowForm(true);
        }}
        onDelete={onDelete}
      />
    </div>
  );
}
