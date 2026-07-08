import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import axios from 'axios';
import ReportsPage from '../pages/ReportsPage';

vi.mock('axios');

const SUMMARY = {
  currencies: [
    { currency: 'ILS', assets: 250000, liabilities: 780000, net: -530000, accountCount: 3 },
    { currency: 'USD', assets: 320000, liabilities: 0, net: 320000, accountCount: 1 },
  ],
  assetsByType: [
    { type: 'bank', currency: 'ILS', total: 45000, cnt: 1 },
    { type: 'investment', currency: 'USD', total: 320000, cnt: 1 },
  ],
  counts: { entities: 18, accounts: 4, documents: 11, tasks: 7 },
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue({ data: SUMMARY });
  });

  test('מציג שווי נקי לפי מטבע אחרי טעינה', async () => {
    render(<ReportsPage />);
    // מחכה לטעינה האסינכרונית
    expect(await screen.findByText(/ILS/)).toBeInTheDocument();
    expect(screen.getByText(/USD/)).toBeInTheDocument();
    // ערכים מפורמטים
    expect(screen.getByText(/250,000/)).toBeInTheDocument();
    expect(screen.getAllByText(/320,000/).length).toBeGreaterThan(0);
  });

  test('מציג את הספירות הכלליות', async () => {
    render(<ReportsPage />);
    await screen.findByText(/ILS/);
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
  });

  test('מצב ללא חשבונות מציג הודעה', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { currencies: [], assetsByType: [], counts: { entities: 0, accounts: 0, documents: 0, tasks: 0 } },
    });
    render(<ReportsPage />);
    expect(await screen.findByText(/אין עדיין חשבונות/)).toBeInTheDocument();
  });
});
