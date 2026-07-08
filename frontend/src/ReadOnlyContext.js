import { createContext, useContext } from 'react';

// מצב צפייה-בלבד — כשהוא true, כל כפתורי העריכה/יצירה/מחיקה מוסתרים.
// זהו מצב תצוגה (למשל להראות לבן/בת זוג), לא מנגנון אבטחה.
export const ReadOnlyContext = createContext(false);

export function useReadOnly() {
  return useContext(ReadOnlyContext);
}
