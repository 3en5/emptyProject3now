import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import axios from 'axios';
import MonthlyPage from '../pages/MonthlyPage';

vi.mock('axios');

const DATA = {
  month: '2026-07',
  changes: [{ id: 1, action: 'create', description: 'נוסף גוף "רכב"', created_at: '2026-07-05 10:00:00' }],
  dueDocuments: [{ id: 1, document_name: 'טופס 867', required_by_date: '2026-07-15', status: 'pending', entity_name: 'בנק מזרחי' }],
  dueTasks: [{ id: 1, task_name: 'דוח מע"מ', task_category: 'מע"מ', required_date: '2026-07-20', status: 'pending' }],
  summary: { changes: 1, dueDocuments: 1, dueTasks: 1 },
};

describe('MonthlyPage', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue({ data: DATA });
  });

  test('מציג מסמכים לפירעון החודש', async () => {
    render(<MonthlyPage />);
    const heading = await screen.findByText(/מסמכים שמועדם החודש/);
    const section = heading.closest('.dashboard-section');
    expect(within(section).getByText(/טופס 867/)).toBeInTheDocument();
    expect(within(section).getByText(/בנק מזרחי/)).toBeInTheDocument();
  });

  test('מציג משימות ושינויים של החודש', async () => {
    render(<MonthlyPage />);
    await screen.findByText(/מסמכים שמועדם החודש/);
    expect(screen.getByText(/דוח מע"מ/)).toBeInTheDocument();
    expect(screen.getByText(/נוסף גוף "רכב"/)).toBeInTheDocument();
  });

  test('שולח בקשה עם פרמטר החודש', async () => {
    render(<MonthlyPage />);
    await screen.findByText(/מסמכים שמועדם החודש/);
    expect(vi.mocked(axios.get)).toHaveBeenCalledWith(expect.stringMatching(/\/api\/report\/monthly\?month=\d{4}-\d{2}/));
  });
});
