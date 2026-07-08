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
  suggestions: { issuer: { name: 'IBKR', entityId: 2 }, docType: 'Annual Activity Statement', year: 2025, confidence: 'high', matchedTerms: [] },
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

  test('"החל הצעה" קורא ל-onUpdate עם השדות שזוהו', async () => {
    const onUpdate = vi.fn();
    render(<DocumentPage documents={documents} entities={entities} onAdd={() => {}} onUpdate={onUpdate} onDelete={() => {}} onUpload={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /נתח/ }));
    await screen.findByText(/החל הצעה/);
    fireEvent.click(screen.getByRole('button', { name: /החל הצעה/ }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const [id, payload] = onUpdate.mock.calls[0];
    expect(id).toBe(5);
    expect(payload.document_name).toBe('Annual Activity Statement');
    expect(payload.year).toBe(2025);
    expect(payload.entity_id).toBe(2);
  });
});
