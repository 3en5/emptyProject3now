import { useState } from 'react';
import axios from 'axios';

// כפתור "בדיקת עדכון תוכנה" — פונה ל-git דרך ה-backend, מציג אם יש עדכון,
// ומאפשר להתקין אותו (pull + build). הנתונים המקומיים לא נוגעים.
export default function UpdateChecker() {
  const [status, setStatus] = useState('idle'); // idle | checking | result | installing | done | error
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  const check = async () => {
    setStatus('checking');
    setError(null);
    try {
      const { data } = await axios.get('/api/system/update/check');
      setInfo(data);
      setStatus('result');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setStatus('error');
    }
  };

  const install = async () => {
    setStatus('installing');
    setError(null);
    try {
      const { data } = await axios.post('/api/system/update/apply');
      setInfo(data);
      setStatus('done');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setStatus('error');
    }
  };

  return (
    <div className="dashboard-section update-section">
      <h2>🔄 עדכון תוכנה</h2>

      {(status === 'idle' || status === 'error') && (
        <button className="btn btn-primary" onClick={check}>
          🔍 בדיקת עדכון תוכנה
        </button>
      )}

      {status === 'checking' && <p className="update-msg">בודק מול GitHub…</p>}
      {status === 'installing' && <p className="update-msg">מתקין עדכון — מושך, מתקין ובונה מחדש… (עד דקה)</p>}

      {status === 'result' && info && !info.gitAvailable && (
        <p className="update-msg update-warn">
          התוכנה לא הותקנה דרך Git (כנראה הורדת ZIP), ולכן אי אפשר לעדכן אוטומטית.
          כדי לאפשר עדכון בלחיצה — יש להביא את הפרויקט דרך <code>git clone</code>.
        </p>
      )}

      {status === 'result' && info?.gitAvailable && !info.updateAvailable && (
        <p className="update-msg update-ok">
          ✅ אתה מעודכן — אין גרסה חדשה. (גרסה נוכחית: <code>{info.current?.hash}</code>)
        </p>
      )}

      {status === 'result' && info?.gitAvailable && info.updateAvailable && (
        <div>
          <p className="update-msg">
            נמצא עדכון: <strong>{info.behind}</strong> שינויים חדשים זמינים.
          </p>
          <ul className="update-list">
            {info.commits.slice(0, 8).map((c) => (
              <li key={c.hash}>
                <code>{c.hash}</code> {c.subject}
              </li>
            ))}
          </ul>
          <button className="btn btn-success" onClick={install}>
            ⬇️ התקן עדכון
          </button>
        </div>
      )}

      {status === 'done' && (
        <p className="update-msg update-ok">
          ✅ העדכון הותקן (גרסה <code>{info?.current?.hash}</code>). {info?.note}
        </p>
      )}

      {status === 'error' && error && <p className="update-msg update-warn">שגיאה: {error}</p>}
    </div>
  );
}
