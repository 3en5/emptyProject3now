// טופס הוספה/עריכה ידנית של מסמך — הדרך המשנית (הדרך הראשית: תיבת הקליטה).
// משמש בעיקר ליצירת "סלוט" מתוכנן מראש (מסמך שמצפים לו) או לעריכת פרטי מסמך קיים.
export default function DocumentForm({ formData, setFormData, entities, editingId, onSubmit, onCancel }) {
  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="form-group">
        <label>גוף פיננסי *</label>
        <select
          required
          value={formData.entity_id}
          onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
        >
          <option value="">בחר גוף</option>
          {entities.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>שם המסמך *</label>
        <input
          type="text"
          required
          value={formData.document_name}
          onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
          placeholder="לדוגמה: דוח 867"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>סוג מסמך</label>
          <input
            type="text"
            value={formData.document_type}
            onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
            placeholder="לדוגמה: דוח מס"
          />
        </div>

        <div className="form-group">
          <label>תדירות</label>
          <select
            value={formData.required_frequency}
            onChange={(e) => setFormData({ ...formData, required_frequency: e.target.value })}
          >
            <option value="yearly">שנתי</option>
            <option value="monthly">חודשי</option>
            <option value="quarterly">רבעוני</option>
            <option value="once">פעם אחת</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>תאריך הגשה נדרש</label>
        <input
          type="date"
          value={formData.required_by_date}
          onChange={(e) => setFormData({ ...formData, required_by_date: e.target.value })}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-success">💾 {editingId ? 'עדכן מסמך' : 'שמור מסמך'}</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>ביטול</button>
      </div>
    </form>
  );
}
