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

// מדמה החלפת קובץ על כרטיס (הדרך הממוקדת) — הניתוח רץ אוטומטית אחריה
async function replaceFileOnCard(container, onUploadMock) {
  const input = container.querySelector('.document-card input[type="file"]');
  const file = new File([new Uint8Array([1, 2, 3])], 'doc.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(onUploadMock).toHaveBeenCalled());
}

describe('DocumentPage — זיהוי אוטומטי בכרטיס (החלפת קובץ)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.post).mockResolvedValue({ data: SUGGESTION });
  });

  test('כרטיס עם קובץ מציג "החלף קובץ"; כרטיס בלי קובץ מפנה לתיבת הקליטה', () => {
    const docs = [
      ...documents,
      { id: 6, entity_id: 2, document_name: 'ריק', status: 'pending', entity_name: 'IBKR' },
    ];
    render(<DocumentPage documents={docs} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} onUpload={() => {}} />);
    expect(screen.getByText(/החלף קובץ/)).toBeInTheDocument();
    expect(screen.getByText(/אין קובץ — גררו לכאן או השתמשו בתיבת הקליטה/)).toBeInTheDocument();
    // אין יותר כפתור "נתח" נפרד — הניתוח אוטומטי
    expect(screen.queryByRole('button', { name: /^🔍 נתח$/ })).not.toBeInTheDocument();
  });

  test('החלפת קובץ מריצה ניתוח אוטומטית ומציגה את ההצעות', async () => {
    const onUpload = vi.fn().mockResolvedValue({});
    const { container } = render(
      <DocumentPage documents={documents} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} onUpload={onUpload} />
    );
    await replaceFileOnCard(container, onUpload);
    expect(await screen.findByText(/Annual Activity Statement/)).toBeInTheDocument();
    expect(screen.getByText(/ביטחון: גבוה/)).toBeInTheDocument();
  });

  test('מועד החידוש שזוהה מוצג בשדה נערך', async () => {
    const onUpload = vi.fn().mockResolvedValue({});
    const { container } = render(
      <DocumentPage documents={documents} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} onUpload={onUpload} />
    );
    await replaceFileOnCard(container, onUpload);
    await screen.findByText(/מועד חידוש/);
    const dateInput = container.querySelector('.analysis-box .analysis-date-input');
    expect(dateInput.value).toBe('2027-03-31'); // מולא אוטומטית מהזיהוי
    expect(screen.getByText(/זוהה אוטומטית/)).toBeInTheDocument();
  });

  test('"החל ושמור" שומר את השדות כולל מועד החידוש (המתוקן) ומאשר פיקוח', async () => {
    const onUpload = vi.fn().mockResolvedValue({});
    const onUpdate = vi.fn();
    const { container } = render(
      <DocumentPage documents={documents} entities={entities} onAdd={() => {}} onUpdate={onUpdate} onDelete={() => {}} onUpload={onUpload} />
    );
    await replaceFileOnCard(container, onUpload);
    await screen.findByText(/החל ושמור/);
    // תיקון המועד לפני שמירה
    fireEvent.change(container.querySelector('.analysis-box .analysis-date-input'), { target: { value: '2028-01-15' } });
    fireEvent.click(screen.getByRole('button', { name: /החל ושמור/ }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const [id, payload] = onUpdate.mock.calls[0];
    expect(id).toBe(5);
    expect(payload.document_name).toBe('Annual Activity Statement');
    expect(payload.year).toBe(2025);
    expect(payload.entity_id).toBe(2);
    expect(payload.required_by_date).toBe('2028-01-15'); // התיקון נשמר
    expect(payload.auto_filed).toBe(0); // אושר בפיקוח
  });

  test('מסמך שתויק אוטומטית מציג תג פיקוח, ו"אשר" מנקה את הדגל', async () => {
    const onUpdate = vi.fn();
    const autoDocs = [{ ...documents[0], auto_filed: 1 }];
    render(<DocumentPage documents={autoDocs} entities={entities} onAdd={() => {}} onUpdate={onUpdate} onDelete={() => {}} onUpload={() => {}} />);
    expect(screen.getByText(/תויק אוטומטית — נכון\?/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /✓ אשר/ }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const [, payload] = onUpdate.mock.calls[0];
    expect(payload.auto_filed).toBe(0);
  });
});
