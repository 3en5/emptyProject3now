import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import DocumentPage from '../pages/DocumentPage';

vi.mock('axios');

const entities = [{ id: 2, name: 'IBKR', type: 'investment' }];
const documents = [
  { id: 5, entity_id: 2, document_name: 'זמני', status: 'pending', file_path: 'doc_5_123.pdf', entity_name: 'IBKR' },
];

const SUGGESTION = {
  suggestions: { issuer: { name: 'IBKR', entityId: 2 }, docType: 'Annual Activity Statement', year: 2025, renewalDate: '2027-03-31', confidence: 'high', matchedTerms: [] },
  extractedChars: 42,
  note: null,
};

describe('DocumentPage — ניתוח חכם', () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockResolvedValue({ data: SUGGESTION });
  });

  test('כפתור "נתח" מופיע רק כשיש קובץ', () => {
    render(<DocumentPage documents={documents} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} onUpload={() => {}} />);
    expect(screen.getByRole('button', { name: /נתח/ })).toBeInTheDocument();
  });

  test('ניתוח מציג את ההצעות שזוהו', async () => {
    render(<DocumentPage documents={documents} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} onUpload={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /נתח/ }));
    expect(await screen.findByText(/Annual Activity Statement/)).toBeInTheDocument();
    expect(screen.getByText(/2025/)).toBeInTheDocument();
    expect(screen.getByText(/ביטחון: גבוה/)).toBeInTheDocument();
  });

  test('העלאת קובץ מריצה ניתוח אוטומטית — בלי לחיצה על "נתח"', async () => {
    const onUpload = vi.fn().mockResolvedValue({});
    const docsNoFile = [{ id: 6, entity_id: 2, document_name: 'ריק', status: 'pending', entity_name: 'IBKR' }];
    const { container } = render(
      <DocumentPage documents={docsNoFile} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} onUpload={onUpload} />
    );
    const input = container.querySelector('input[type="file"]');
    const file = new File([new Uint8Array([1, 2, 3])], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(6, file));
    // תיבת הניתוח הופיעה לבד (בלי ללחוץ נתח)
    expect(await screen.findByText(/Annual Activity Statement/)).toBeInTheDocument();
  });

  test('מועד החידוש שזוהה מוצג בשדה נערך', async () => {
    render(<DocumentPage documents={documents} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} onUpload={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /נתח/ }));
    await screen.findByText(/מועד חידוש/);
    const dateInput = document.querySelector('.analysis-date-input');
    expect(dateInput.value).toBe('2027-03-31'); // מולא אוטומטית מהזיהוי
    expect(screen.getByText(/זוהה אוטומטית/)).toBeInTheDocument();
  });

  test('"החל ושמור" שומר את השדות כולל מועד החידוש (המתוקן)', async () => {
    const onUpdate = vi.fn();
    render(<DocumentPage documents={documents} entities={entities} onAdd={() => {}} onUpdate={onUpdate} onDelete={() => {}} onUpload={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /נתח/ }));
    await screen.findByText(/החל ושמור/);
    // תיקון המועד לפני שמירה
    fireEvent.change(document.querySelector('.analysis-date-input'), { target: { value: '2028-01-15' } });
    fireEvent.click(screen.getByRole('button', { name: /החל ושמור/ }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const [id, payload] = onUpdate.mock.calls[0];
    expect(id).toBe(5);
    expect(payload.document_name).toBe('Annual Activity Statement');
    expect(payload.year).toBe(2025);
    expect(payload.entity_id).toBe(2);
    expect(payload.required_by_date).toBe('2028-01-15'); // התיקון נשמר
  });
});
