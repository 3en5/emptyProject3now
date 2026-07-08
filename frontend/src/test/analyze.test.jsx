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

const SUGGESTION_WITH_SUMMARY = {
  suggestions: {
    issuer: { name: 'IBKR', entityId: 2 }, docType: 'Annual Activity Statement', year: 2025,
    docDate: '2025-04-15', renewalDate: '2027-03-31', confidence: 'high', matchedTerms: [],
    summary: 'דוח פעילות שנתי של IBKR לשנת 2025.',
    amounts: ['שווי תיק: $12,340', 'עמלות שנתיות: $45'],
  },
  extractedChars: 42,
  note: null,
};

// מדמה החלפת קובץ על כרטיס (הדרך הממוקדת) — הכרטיס מקופל כברירת מחדל, פותחים אותו קודם
async function replaceFileOnCard(container, onUploadMock) {
  fireEvent.click(container.querySelector('.doc-header-toggle'));
  const input = container.querySelector('.document-card input[type="file"]');
  const file = new File([new Uint8Array([1, 2, 3])], 'doc.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(onUploadMock).toHaveBeenCalled());
}

describe('DocumentPage — כרטיסים מתקפלים', () => {
  test('מקופל כברירת מחדל — פרטים ופעולות מוסתרים, השם והסטטוס נשארים גלויים', () => {
    const { container } = render(<DocumentPage documents={documents} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} onUpload={() => {}} />);
    expect(container.querySelector('.document-card')).toHaveClass('collapsed');
    expect(container.querySelector('.doc-header-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('זמני')).toBeInTheDocument(); // שם המסמך גלוי מקופל
    expect(screen.queryByText(/קובץ:/)).not.toBeInTheDocument(); // פרטים מוסתרים
  });

  test('לחיצה על הכותרת פותחת את הכרטיס, ולחיצה נוספת מקפלת אותו בחזרה', () => {
    const { container } = render(<DocumentPage documents={documents} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} onUpload={() => {}} />);
    const toggle = container.querySelector('.doc-header-toggle');
    fireEvent.click(toggle);
    expect(container.querySelector('.document-card')).toHaveClass('expanded');
    expect(screen.getByText(/קובץ:/)).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(container.querySelector('.document-card')).toHaveClass('collapsed');
  });
});

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
    const { container } = render(<DocumentPage documents={docs} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} onUpload={() => {}} />);
    // הכרטיסים מקופלים כברירת מחדל — פותחים את שניהם
    container.querySelectorAll('.doc-header-toggle').forEach((btn) => fireEvent.click(btn));
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

  test('תקציר, תאריך מסמך וסכומים מוצגים בתיבת הניתוח ונשמרים עם "החל ושמור"', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: SUGGESTION_WITH_SUMMARY });
    const onUpload = vi.fn().mockResolvedValue({});
    const onUpdate = vi.fn();
    const { container } = render(
      <DocumentPage documents={documents} entities={entities} onAdd={() => {}} onUpdate={onUpdate} onDelete={() => {}} onUpload={onUpload} />
    );
    await replaceFileOnCard(container, onUpload);

    expect(await screen.findByText(/דוח פעילות שנתי של IBKR לשנת 2025/)).toBeInTheDocument();
    expect(screen.getByText(/שווי תיק: \$12,340/)).toBeInTheDocument();
    expect(screen.getByText(/15\.4\.2025/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /החל ושמור/ }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const [, payload] = onUpdate.mock.calls[0];
    expect(payload.summary).toBe('דוח פעילות שנתי של IBKR לשנת 2025.');
    expect(payload.doc_date).toBe('2025-04-15');
    expect(payload.amounts).toEqual(['שווי תיק: $12,340', 'עמלות שנתיות: $45']);
  });

  test('תקציר וסכומים שכבר נשמרו על המסמך מוצגים אחרי פתיחת הכרטיס', () => {
    const docWithSummary = [{
      ...documents[0],
      doc_date: '2025-04-15',
      summary: 'דוח פעילות שנתי של IBKR לשנת 2025.',
      amounts: ['שווי תיק: $12,340'],
    }];
    const { container } = render(<DocumentPage documents={docWithSummary} entities={entities} onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} onUpload={() => {}} />);
    fireEvent.click(container.querySelector('.doc-header-toggle'));
    expect(screen.getByText(/דוח פעילות שנתי של IBKR לשנת 2025/)).toBeInTheDocument();
    expect(screen.getByText(/שווי תיק: \$12,340/)).toBeInTheDocument();
  });

  test('מסמך שתויק אוטומטית מציג סימון בכותרת המקופלת, ותג פיקוח מלא אחרי פתיחה — "אשר" מנקה את הדגל', async () => {
    const onUpdate = vi.fn();
    const autoDocs = [{ ...documents[0], auto_filed: 1 }];
    const { container } = render(<DocumentPage documents={autoDocs} entities={entities} onAdd={() => {}} onUpdate={onUpdate} onDelete={() => {}} onUpload={() => {}} />);
    expect(screen.getByTitle(/ממתין לאישור/)).toBeInTheDocument(); // 🤖 גלוי גם מקופל
    fireEvent.click(container.querySelector('.doc-header-toggle'));
    expect(screen.getByText(/תויק אוטומטית — נכון\?/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /✓ אשר/ }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const [, payload] = onUpdate.mock.calls[0];
    expect(payload.auto_filed).toBe(0);
  });

  test('עבור מי המסמך: אחרי ניתוח מוצג רמז לשם שזוהה, ובחירה נשמרת עם "החל ושמור"', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        suggestions: { ...SUGGESTION.suggestions, personName: 'דנה כהן', ownerGuess: 'spouse' },
        extractedChars: 42,
        note: null,
      },
    });
    const onUpload = vi.fn().mockResolvedValue({});
    const onUpdate = vi.fn();
    const { container } = render(
      <DocumentPage documents={documents} entities={entities} onAdd={() => {}} onUpdate={onUpdate} onDelete={() => {}} onUpload={onUpload} />
    );
    await replaceFileOnCard(container, onUpload);

    expect(await screen.findByText(/זוהה שם: דנה כהן/)).toBeInTheDocument();
    const ownerSelect = container.querySelector('.analysis-owner select');
    expect(ownerSelect.value).toBe('spouse'); // מולא אוטומטית מה-guess

    fireEvent.click(screen.getByRole('button', { name: /החל ושמור/ }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const [, payload] = onUpdate.mock.calls[0];
    expect(payload.owner).toBe('spouse');
  });

  test('תג הבעלים מוצג בכותרת המקופלת, וניתן לשנות אותו ישירות מהכרטיס הפתוח', () => {
    const onUpdate = vi.fn();
    const docWithOwner = [{ ...documents[0], owner: 'user' }];
    const { container } = render(
      <DocumentPage documents={docWithOwner} entities={entities} onAdd={() => {}} onUpdate={onUpdate} onDelete={() => {}} onUpload={() => {}} />
    );
    expect(screen.getByText(/👤 אני/)).toBeInTheDocument(); // תג גלוי גם מקופל

    fireEvent.click(container.querySelector('.doc-header-toggle'));
    const ownerSelect = container.querySelector('.owner-select');
    expect(ownerSelect.value).toBe('user');
    fireEvent.change(ownerSelect, { target: { value: 'spouse' } });
    expect(onUpdate).toHaveBeenCalledWith(5, expect.objectContaining({ owner: 'spouse' }));
  });
});
