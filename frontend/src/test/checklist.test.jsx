import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ChecklistPage from '../pages/ChecklistPage';

vi.mock('axios');

const entities = [];
const CURRENT_YEAR = new Date().getFullYear();

describe('ChecklistPage — פיקוח על השלמה אוטומטית (עקב מסמך שהתקבל)', () => {
  test('משימה שהושלמה אוטומטית מציגה תג עם שם המסמך המקושר, וכפתור "אשר"', () => {
    const checklist = [{
      id: 1, task_name: 'איסוף טופס 106', task_category: 'דוח שכיר', status: 'completed',
      completed_date: '2026-03-01', auto_completed: 1, completed_by_document_name: 'טופס 106',
    }];
    render(<ChecklistPage checklist={checklist} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/הושלם אוטומטית/)).toBeInTheDocument();
    expect(screen.getByText('טופס 106')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /✓ אשר/ })).toBeInTheDocument();
  });

  test('לחיצה על "אשר" מנקה את הדגל האוטומטי בלי לשנות את הסטטוס', async () => {
    const onUpdate = vi.fn();
    const checklist = [{
      id: 1, task_name: 'איסוף טופס 106', task_category: 'דוח שכיר', status: 'completed',
      completed_date: '2026-03-01', auto_completed: 1, completed_by_document_name: 'טופס 106',
    }];
    render(<ChecklistPage checklist={checklist} entities={entities} onAdd={() => {}} onUpdate={onUpdate} onDelete={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /✓ אשר/ }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const [id, payload] = onUpdate.mock.calls[0];
    expect(id).toBe(1);
    expect(payload.auto_completed).toBe(0);
    expect(payload.status).toBe('completed'); // הסטטוס לא משתנה, רק הדגל
  });

  test('משימה שהושלמה ידנית (לא אוטומטית) לא מציגה את תג הפיקוח', () => {
    const checklist = [{ id: 2, task_name: 'הגשת דוח שנתי', status: 'completed', completed_date: '2026-03-01', auto_completed: 0 }];
    render(<ChecklistPage checklist={checklist} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} />);
    expect(screen.queryByText(/הושלם אוטומטית/)).not.toBeInTheDocument();
  });

  test('"החזר לממתין" שולח auto_completed: 0 יחד עם שינוי הסטטוס', async () => {
    const onUpdate = vi.fn();
    const checklist = [{ id: 3, task_name: 'איסוף טופס 106', status: 'completed', completed_date: '2026-03-01', auto_completed: 1 }];
    render(<ChecklistPage checklist={checklist} entities={entities} onAdd={() => {}} onUpdate={onUpdate} onDelete={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /החזר לממתין/ }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const [, payload] = onUpdate.mock.calls[0];
    expect(payload.status).toBe('pending');
    expect(payload.auto_completed).toBe(0);
  });
});

describe('ChecklistPage — פיקוח על משימות שנוצרו אוטומטית (עקב מסמך שהתקבל)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('משימה ממתינה עם auto_created מציגה תג "נוצרה אוטומטית" וכפתור "אשר", בלי לפנות ל-API', () => {
    const checklist = [{ id: 5, task_name: 'איסוף טופס 106', status: 'pending', auto_created: 1 }];
    render(<ChecklistPage checklist={checklist} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/נוצרה אוטומטית ממסמך שהתקבל/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /✓ אשר/ })).toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalledWith(expect.stringContaining('/api/checklists/year/'));
  });

  test('לחיצה על "אשר" למשימה ממתינה שולחת auto_created: 0 בלי לשנות את הסטטוס', async () => {
    const onUpdate = vi.fn();
    const checklist = [{ id: 5, task_name: 'איסוף טופס 106', status: 'pending', auto_created: 1 }];
    render(<ChecklistPage checklist={checklist} entities={entities} onAdd={() => {}} onUpdate={onUpdate} onDelete={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /✓ אשר/ }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const [id, payload] = onUpdate.mock.calls[0];
    expect(id).toBe(5);
    expect(payload.auto_created).toBe(0);
    expect(payload.status).toBe('pending');
  });

  test('משימה ממתינה עם auto_created: 0 לא מציגה את התג', () => {
    const checklist = [{ id: 6, task_name: 'הגשת דוח שנתי', status: 'pending', auto_created: 0 }];
    render(<ChecklistPage checklist={checklist} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} />);
    expect(screen.queryByText(/נוצרה אוטומטית ממסמך שהתקבל/)).not.toBeInTheDocument();
  });
});

describe('ChecklistPage — בחירת שנה', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('כברירת מחדל מציגה את השנה הנוכחית מה-checklist prop, בלי לפנות ל-API', () => {
    const checklist = [{ id: 1, task_name: 'משימת השנה', status: 'pending' }];
    render(<ChecklistPage checklist={checklist} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('משימת השנה')).toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalledWith(expect.stringContaining('/api/checklists/year/'));
  });

  test('בחירת שנה אחרת שולפת מ-/api/checklists/year/:year ומציגה את המשימות שלה', async () => {
    const checklist = [{ id: 1, task_name: 'משימת השנה הנוכחית', status: 'pending' }];
    vi.mocked(axios.get).mockResolvedValue({
      data: [{ id: 2, task_name: 'משימת שנה קודמת', status: 'pending' }],
    });
    render(<ChecklistPage checklist={checklist} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: String(CURRENT_YEAR - 1) } });

    expect(await screen.findByText('משימת שנה קודמת')).toBeInTheDocument();
    expect(screen.queryByText('משימת השנה הנוכחית')).not.toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith(`/api/checklists/year/${CURRENT_YEAR - 1}`);
  });

  test('הוספת משימה בזמן צפייה בשנה אחרת נשלחת עם אותה שנה, לא השנה הנוכחית', async () => {
    const onAdd = vi.fn().mockResolvedValue({});
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    render(<ChecklistPage checklist={[]} entities={entities} onAdd={onAdd} onUpdate={() => {}} onDelete={() => {}} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: String(CURRENT_YEAR - 1) } });
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /הוסף משימה/ }));
    fireEvent.change(screen.getByPlaceholderText('לדוגמה: הגשת דוח 867'), { target: { value: 'משימה משנה שעברה' } });
    fireEvent.click(screen.getByRole('button', { name: /שמור משימה/ }));

    await waitFor(() => expect(onAdd).toHaveBeenCalled());
    expect(onAdd.mock.calls[0][0].year).toBe(CURRENT_YEAR - 1);
  });

  test('בורר השנה נטען מ-/api/system/years וכולל שנים ישנות מהנתונים', async () => {
    const checklist = [{ id: 1, task_name: 'משימת השנה', status: 'pending' }];
    vi.mocked(axios.get).mockResolvedValue({
      data: { years: [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, 2019] },
    });
    render(<ChecklistPage checklist={checklist} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} />);

    expect(await screen.findByRole('option', { name: '2019' })).toBeInTheDocument();
  });
});
