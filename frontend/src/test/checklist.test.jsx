import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChecklistPage from '../pages/ChecklistPage';

const entities = [];

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
