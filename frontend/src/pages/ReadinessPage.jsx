import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useYears } from '../hooks/useYears';
import { useReadOnly } from '../ReadOnlyContext';
import ReadinessGroup from '../components/ReadinessGroup';
import ReadinessItemModal from '../components/ReadinessItemModal';

const CURRENT_YEAR = new Date().getFullYear();

const isEnded = (entity, year) => {
  if (!entity.active_until) return false;
  const untilYear = parseInt(String(entity.active_until).slice(0, 4));
  return !!untilYear && untilYear < year;
};

// עמוד "מוכנות לרו״ח" — שולף בעצמו את הנתונים (בדומה ל-ComparisonPage) ומרענן אחרי כל פעולה.
export default function ReadinessPage() {
  const years = useYears();
  const readOnly = useReadOnly();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [data, setData] = useState(null);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [missingOnly, setMissingOnly] = useState(false);
  const [carryNote, setCarryNote] = useState(null);
  const [openItem, setOpenItem] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [readinessRes, entitiesRes] = await Promise.all([
        axios.get(`/api/readiness/${selectedYear}`),
        axios.get('/api/entities'),
      ]);
      setData(readinessRes.data);
      setEntities(entitiesRes.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
  }, [fetchAll]);

  const handleCarryForward = async () => {
    try {
      const res = await axios.post(`/api/readiness/${selectedYear}/carry-forward`);
      setCarryNote(res.data.created > 0 ? `נוספו ${res.data.created} פריטים` : 'אין מה לגלגל');
      await fetchAll();
      setTimeout(() => setCarryNote(null), 4000);
    } catch (err) {
      setError('שגיאה בבניית הרשימה: ' + err.message);
    }
  };

  const handleUpload = async (itemId, file) => {
    try {
      const form = new FormData();
      form.append('file', file);
      await axios.post(`/api/documents/${itemId}/upload`, form);
      await fetchAll();
    } catch (err) {
      setError('שגיאה בהעלאת קובץ: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (itemId) => {
    try {
      await axios.delete(`/api/documents/${itemId}`);
      await fetchAll();
    } catch (err) {
      setError('שגיאה במחיקת פריט: ' + err.message);
    }
  };

  const handleAddItem = async (entityId, documentName) => {
    try {
      await axios.post('/api/documents', { entity_id: entityId, document_name: documentName, year: selectedYear });
      await fetchAll();
    } catch (err) {
      setError('שגיאה בהוספת פריט: ' + err.message);
    }
  };

  const setEntityActiveUntil = async (entity, activeUntil) => {
    try {
      const full = entities.find((e) => e.id === entity.id);
      if (!full) return;
      await axios.put(`/api/entities/${entity.id}`, { ...full, active_until: activeUntil });
      await fetchAll();
    } catch (err) {
      setError('שגיאה בעדכון גוף: ' + err.message);
    }
  };

  const handleEnd = (entity) => setEntityActiveUntil(entity, `${selectedYear}-12-31`);
  const handleReactivate = (entity) => setEntityActiveUntil(entity, null);

  if (loading) {
    return <div className="page readiness-page"><p>טוען נתוני מוכנות...</p></div>;
  }

  const summary = data?.summary || { have: 0, missing: 0, total: 0, entities: 0 };
  const allGroups = data?.groups || [];
  const endedGroups = allGroups.filter((g) => isEnded(g.entity, selectedYear));
  const activeGroups = allGroups.filter((g) => !isEnded(g.entity, selectedYear));
  const pendingGroups = activeGroups.filter((g) => g.have < g.total);
  const readyGroups = activeGroups.filter((g) => g.have === g.total);

  const visibleReady = missingOnly ? [] : readyGroups;
  const visibleEnded = missingOnly ? endedGroups.filter((g) => g.have < g.total) : endedGroups;

  const pct = summary.total > 0 ? Math.round((summary.have / summary.total) * 100) : 0;

  return (
    <div className="page readiness-page">
      <div className="rdn-head-row">
        <div>
          <p className="rdn-eyebrow">מערכת ניהול מסמכים פיננסיים</p>
          <h1>🧾 מוכנות לרו״ח</h1>
          <p className="rdn-sub">כל מה שרו״ח צריך ממך השנה — מה כבר יש, ומה חסר וממי.</p>
        </div>
        <select
          className="filter-select rdn-year-select"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {error && <div className="error-message">{error}</div>}

      <section className="rdn-hero">
        <div>
          <div className="rdn-ready-line">
            <span className="rdn-ready-big">{summary.have}</span>
            <span className="rdn-ready-of">מתוך {summary.total} מוכנים</span>
          </div>
          {summary.missing > 0 ? (
            <div className="rdn-ready-cap">עוד <b>{summary.missing} מסמכים</b> והחבילה מוכנה להגשה לרו״ח.</div>
          ) : (
            <div className="rdn-ready-cap rdn-done">החבילה מוכנה 🎉</div>
          )}
          <div className="rdn-bar"><span style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="rdn-mini-stats">
          <div className="rdn-mini rdn-good"><div className="rdn-n">{summary.have}</div><div className="rdn-l">✅ יש</div></div>
          <div className="rdn-mini rdn-bad"><div className="rdn-n">{summary.missing}</div><div className="rdn-l">🔴 חסר</div></div>
          <div className="rdn-mini"><div className="rdn-n">{summary.entities}</div><div className="rdn-l">🏢 גופים</div></div>
        </div>
      </section>

      <div className="rdn-actions">
        <a className="btn btn-primary" href={`/api/export/action-list.csv?year=${selectedYear}`}>⬇ ייצוא חבילה לרו״ח</a>
        <div className="rdn-seg">
          <button type="button" className={!missingOnly ? 'rdn-on' : ''} onClick={() => setMissingOnly(false)}>הכול</button>
          <button type="button" className={missingOnly ? 'rdn-on' : ''} onClick={() => setMissingOnly(true)}>רק החסרים</button>
        </div>
        {!readOnly && (
          <button type="button" className="btn btn-secondary btn-small" onClick={handleCarryForward}>🔄 בנה מרשימת אשתקד</button>
        )}
        {carryNote && <span className="rdn-carry-note">{carryNote}</span>}
        <div className="rdn-spacer" />
        <span className="rdn-hint">מתעדכן לבד כשאתה מעלה מסמך</span>
      </div>

      {allGroups.length === 0 ? (
        <div className="rdn-empty">
          <p>אין עדיין רשימת מסמכים לשנה זו.</p>
          {!readOnly && (
            <button type="button" className="btn btn-primary" onClick={handleCarryForward} style={{ marginTop: '1rem' }}>
              🔄 בנה מרשימת אשתקד
            </button>
          )}
        </div>
      ) : (
        <>
          {pendingGroups.map((g) => (
            <ReadinessGroup
              key={g.entity.id}
              group={g}
              ended={false}
              readOnly={readOnly}
              missingOnly={missingOnly}
              onAddItem={handleAddItem}
              onEnd={handleEnd}
              onReactivate={handleReactivate}
              onOpenItem={(item) => setOpenItem({ item, entity: g.entity })}
            />
          ))}

          {visibleReady.length > 0 && (
            <>
              <p className="rdn-section-label">מוכנים ✓</p>
              {visibleReady.map((g) => (
                <ReadinessGroup
                  key={g.entity.id}
                  group={g}
                  ended={false}
                  readOnly={readOnly}
                  missingOnly={missingOnly}
                  onAddItem={handleAddItem}
                  onEnd={handleEnd}
                  onReactivate={handleReactivate}
                  onOpenItem={(item) => setOpenItem({ item, entity: g.entity })}
                />
              ))}
            </>
          )}

          {visibleEnded.length > 0 && (
            <>
              <p className="rdn-section-label">הסתיימו — לא מצופה עוד</p>
              {visibleEnded.map((g) => (
                <ReadinessGroup
                  key={g.entity.id}
                  group={g}
                  ended
                  readOnly={readOnly}
                  missingOnly={missingOnly}
                  onAddItem={handleAddItem}
                  onEnd={handleEnd}
                  onReactivate={handleReactivate}
                  onOpenItem={(item) => setOpenItem({ item, entity: g.entity })}
                />
              ))}
            </>
          )}
        </>
      )}

      <p className="rdn-foot">
        הרשימה נבנית לבד ממה שהוגש אשתקד + הגופים שלך, ומתגלגלת שנה קדימה.<br />
        כל מסמך שתעלה מסמן את הפריט המתאים כ״יש״. גוף שסיימת איתו — יורד מהצפי בלחיצה.
      </p>

      {openItem && (
        <ReadinessItemModal
          item={openItem.item}
          entity={openItem.entity}
          year={selectedYear}
          readOnly={readOnly}
          onClose={() => setOpenItem(null)}
          onUpload={handleUpload}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
