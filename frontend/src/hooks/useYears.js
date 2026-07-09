import { useState, useEffect } from 'react';
import axios from 'axios';

const CURRENT = new Date().getFullYear();
// חלון ברירת מחדל אם השליפה נכשלה: 7 שנים אחורה (תקופת שמירת מסמכים לפי דיני המס) עד שנה קדימה
const FALLBACK = Array.from({ length: 9 }, (_, i) => CURRENT + 1 - i); // [current+1 .. current-7], יורד

// רשימת השנים לבוררי השנה בממשק — נשלפת מהשרת (שנים הקיימות בנתונים + חלון ברירת מחדל),
// כך שמסמך/משימה משנה ישנה גורמים לשנה שלהם להופיע אוטומטית. נופל לחלון ברירת המחדל בכשל.
export function useYears() {
  const [years, setYears] = useState(FALLBACK);
  useEffect(() => {
    let alive = true;
    Promise.resolve(axios.get('/api/system/years'))
      .then((r) => { if (alive && Array.isArray(r?.data?.years) && r.data.years.length) setYears(r.data.years); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return years;
}
