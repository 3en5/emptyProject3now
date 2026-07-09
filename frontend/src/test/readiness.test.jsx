import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ReadinessPage from '../pages/ReadinessPage';

vi.mock('axios');

const YEAR = new Date().getFullYear();

const READINESS_DATA = {
  year: YEAR,
  summary: { have: 2, missing: 1, total: 3, entities: 2 },
  groups: [
    {
      entity: { id: 1, name: 'בנק הפועלים', type: 'bank', active_until: null },
      have: 1,
      total: 2,
      items: [
        { id: 101, document_name: 'אישור יתרות', document_type: null, has_file: false, file_path: null, status: 'pending', doc_date: null, required_by_date: null },
        { id: 102, document_name: 'ריכוז תנועות', document_type: null, has_file: true, file_path: '/f.pdf', status: 'submitted', doc_date: '2026-02-04', required_by_date: null },
      ],
    },
    {
      entity: { id: 2, name: 'IBI בית השקעות', type: 'investment', active_until: null },
      have: 1,
      total: 1,
      items: [
        { id: 201, document_name: 'טופס 867', document_type: null, has_file: true, file_path: '/g.pdf', status: 'submitted', doc_date: '2026-02-11', required_by_date: null },
      ],
    },
  ],
};

const ENTITIES_DATA = [
  { id: 1, name: 'בנק הפועלים', type: 'bank', category: 'בנק', active_until: null },
  { id: 2, name: 'IBI בית השקעות', type: 'investment', category: 'השקעות', active_until: null },
];

function mockGet(url) {
  if (url === `/api/readiness/${YEAR}`) return Promise.resolve({ data: READINESS_DATA });
  if (url === '/api/entities') return Promise.resolve({ data: ENTITIES_DATA });
  if (url.startsWith('/api/documents/entity/')) return Promise.resolve({ data: [] });
  return Promise.resolve({ data: {} });
}

describe('ReadinessPage', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockImplementation(mockGet);
    vi.mocked(axios.post).mockResolvedValue({ data: { created: 3 } });
  });

  test('מציג את מספרי הסיכום ומד התקדמות', async () => {
    render(<ReadinessPage />);
    await screen.findByText(/מוכנות לרו״ח/, { selector: 'h1' });
    expect(document.querySelector('.rdn-ready-big').textContent).toBe('2');
    expect(screen.getByText(/מתוך 3 מוכנים/)).toBeInTheDocument();
    expect(document.querySelector('.rdn-bar')).toBeInTheDocument();
    expect(document.querySelector('.rdn-bar > span')).toBeInTheDocument();
  });

  test('מציג כותרות קבוצות לפי גוף עם מונה יש/סה"כ', async () => {
    render(<ReadinessPage />);
    const groupHeading = await screen.findByText('בנק הפועלים');
    const group = groupHeading.closest('.rdn-group');
    expect(within(group).getByText('1 / 2')).toBeInTheDocument();
    expect(await screen.findByText('IBI בית השקעות')).toBeInTheDocument();
  });

  test('פריט חסר מציג צ׳יפ חסר, פריט שהתקבל מציג צ׳יפ התקבל', async () => {
    render(<ReadinessPage />);
    await screen.findByText('אישור יתרות');
    const missingRow = screen.getByText('אישור יתרות').closest('.rdn-row');
    expect(within(missingRow).getByText('חסר')).toBeInTheDocument();

    const receivedRow = screen.getByText('ריכוז תנועות').closest('.rdn-row');
    expect(within(receivedRow).getByText(/התקבל/)).toBeInTheDocument();
  });

  test('לחיצה על שורת פריט חסר פותחת פופאפ עם כפתור העלאה', async () => {
    render(<ReadinessPage />);
    await screen.findByText('אישור יתרות');
    fireEvent.click(screen.getByText('אישור יתרות'));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('גוף')).toBeInTheDocument();
    expect(within(dialog).getByText('בנק הפועלים')).toBeInTheDocument();
    expect(within(dialog).getByText(/⬆ העלה קובץ/)).toBeInTheDocument();
  });

  test('לחיצה על שורת פריט שהתקבל פותחת פופאפ עם קישור לפתיחת קובץ', async () => {
    render(<ReadinessPage />);
    await screen.findByText('ריכוז תנועות');
    fireEvent.click(screen.getByText('ריכוז תנועות'));

    const dialog = await screen.findByRole('dialog');
    const link = within(dialog).getByText('פתח קובץ');
    expect(link).toHaveAttribute('href', '/api/documents/102/file');

    fireEvent.click(within(dialog).getByLabelText('סגור'));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  test('לחיצה על "בנה מרשימת אשתקד" קוראת ל-carry-forward', async () => {
    render(<ReadinessPage />);
    const btn = await screen.findByText('🔄 בנה מרשימת אשתקד');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith(`/api/readiness/${YEAR}/carry-forward`);
    });
    await screen.findByText(/נוספו 3 פריטים/);
  });

  test('מתג "רק החסרים" מסתיר פריטים שהתקבלו', async () => {
    render(<ReadinessPage />);
    await screen.findByText('אישור יתרות');
    expect(screen.getByText('ריכוז תנועות')).toBeInTheDocument();

    fireEvent.click(screen.getByText('רק החסרים'));

    expect(screen.getByText('אישור יתרות')).toBeInTheDocument();
    expect(screen.queryByText('ריכוז תנועות')).not.toBeInTheDocument();
    // הקבוצה המוכנה לגמרי (IBI) מוסתרת כולה
    expect(screen.queryByText('IBI בית השקעות')).not.toBeInTheDocument();
  });

  test('הוספת פריט שולחת POST ל-/api/documents עם entity_id ו-year נכונים', async () => {
    render(<ReadinessPage />);
    const bankGroupHeading = await screen.findByText('בנק הפועלים');
    const group = bankGroupHeading.closest('.rdn-group');
    fireEvent.click(within(group).getByText('➕ הוסף פריט'));

    const input = within(group).getByPlaceholderText('שם הדוח/המסמך');
    fireEvent.change(input, { target: { value: 'טופס חדש' } });
    fireEvent.click(within(group).getByText('שמור'));

    await waitFor(() => {
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith('/api/documents', {
        entity_id: 1,
        document_name: 'טופס חדש',
        year: YEAR,
      });
    });
  });
});
