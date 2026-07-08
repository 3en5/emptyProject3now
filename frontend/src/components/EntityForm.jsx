import { useState, useEffect } from 'react';

const ENTITY_TYPES = [
  { value: 'bank', label: '🏦 בנק' },
  { value: 'insurance', label: '🛡️ ביטוח' },
  { value: 'investment', label: '📈 השקעה' },
  { value: 'realty', label: '🏠 נדלן' },
  { value: 'loan', label: '💳 הלוואה' },
  { value: 'vehicle', label: '🚗 רכב' },
  { value: 'license', label: '📜 רישיון' }
];

const CATEGORIES = {
  bank: ['חשבון עסקי', 'חשבון משפחתי', 'חשבון השקעות'],
  insurance: ['ביטוח חיים', 'ביטוח בריאות', 'ביטוח רכוש', 'ביטוח מנהלים'],
  investment: ['קרן השתלמות', 'קרן פנסיה', 'ניירות ערך', 'קרן השקעות'],
  realty: ['דירת מגורים', 'נכס השקעה'],
  loan: ['משכנתא', 'הלוואה אישית'],
  vehicle: ['רכב פרטי', 'רכב מסחרי', 'אופנוע'],
  license: ['רישיון כלי יריה', 'תעודת מתווך נדל"ן', 'רישיון נהיגה', 'אחר']
};

export default function EntityForm({ onSubmit, editingEntity, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    category: '',
    website_url: '',
    login_url: '',
    account_number: '',
    contact_info: '',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    if (editingEntity) {
      setFormData(editingEntity);
    }
  }, [editingEntity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const selectedCategories = CATEGORIES[formData.type] || [];

  return (
    <form className="form entity-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>שם הגוף הפיננסי *</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="לדוגמה: בנק מזרחי"
          />
        </div>

        <div className="form-group">
          <label>סוג גוף *</label>
          <select
            name="type"
            required
            value={formData.type}
            onChange={handleChange}
          >
            <option value="">בחר סוג</option>
            {ENTITY_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedCategories.length > 0 && (
        <div className="form-group">
          <label>קטגוריה</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="">בחר קטגוריה</option>
            {selectedCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>אתר אינטרנט</label>
          <input
            type="url"
            name="website_url"
            value={formData.website_url}
            onChange={handleChange}
            placeholder="https://example.com"
          />
        </div>

        <div className="form-group">
          <label>קישור כניסה</label>
          <input
            type="url"
            name="login_url"
            value={formData.login_url}
            onChange={handleChange}
            placeholder="https://example.com/login"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>מספר חשבון</label>
          <input
            type="text"
            name="account_number"
            value={formData.account_number}
            onChange={handleChange}
            placeholder="מספר הזיהוי"
          />
        </div>

        <div className="form-group">
          <label>פרטי קשר</label>
          <input
            type="text"
            name="contact_info"
            value={formData.contact_info}
            onChange={handleChange}
            placeholder="טלפון, דוא״ל וכו'"
          />
        </div>
      </div>

      <div className="form-group">
        <label>הערות</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="כל הערה או הוראה חשובה"
          rows="3"
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-success">
          {editingEntity ? '💾 עדכן' : '💾 שמור'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          ביטול
        </button>
      </div>
    </form>
  );
}
