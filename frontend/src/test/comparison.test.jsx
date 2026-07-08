import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import axios from 'axios';
import ComparisonPage from '../pages/ComparisonPage';

vi.mock('axios');

const DATA = {
  year: 2026,
  prevYear: 2025,
  missing: [{ entity_id: 10, entity_name: 'ביטוח חיים', document_name: 'אישור מס שנתי' }],
  received: [
    { id: 1, entity_name: 'בנק מזרחי', document_name: 'טופס 867' },
    { id: 2, entity_name: 'IBKR', document_name: 'Annual Statement' },
  ],
  added: [{ id: 3, entity_name: 'ביטוח מנהלים', document_name: 'אישור הפקדות' }],
  endedEntities: [{ id: 6, name: 'BTB', active_until: '2025-12-31' }],
  summary: { missing: 1, received: 2, added: 1, ended: 1 },
};

describe('ComparisonPage', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue({ data: DATA });
  });

  test('מציג את ארבעת המונים', async () => {
    render(<ComparisonPage />);
    await screen.findByText(/מסמכים חסרים/);
    const cards = document.querySelectorAll('.stat-number');
    const nums = Array.from(cards).map((c) => c.textContent);
    expect(nums).toEqual(expect.arrayContaining(['1', '2']));
  });

  test('מסמך חסר מופיע בסעיף החסרים', async () => {
    render(<ComparisonPage />);
    const heading = await screen.findByText(/🔴 מסמכים חסרים/);
    const section = heading.closest('.dashboard-section');
    expect(within(section).getByText(/אישור מס שנתי/)).toBeInTheDocument();
    expect(within(section).getByText(/ביטוח חיים/)).toBeInTheDocument();
  });

  test('גוף שהסתיים מופיע בסעיף ההתקשרויות שהסתיימו', async () => {
    render(<ComparisonPage />);
    const heading = await screen.findByText(/התקשרויות שהסתיימו/);
    const section = heading.closest('.dashboard-section');
    expect(within(section).getByText(/BTB/)).toBeInTheDocument();
  });

  test('שולח בקשה לשנה שנבחרה', async () => {
    render(<ComparisonPage />);
    await screen.findByText(/מסמכים חסרים/);
    expect(vi.mocked(axios.get)).toHaveBeenCalledWith(expect.stringMatching(/\/api\/comparison\/\d+/));
  });
});
