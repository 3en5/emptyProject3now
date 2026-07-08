import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import IntakeBox from '../components/IntakeBox';

vi.mock('axios');

const entities = [
  { id: 1, name: '📥 ממתין לשיוך', type: 'other' },
  { id: 2, name: 'IBKR', type: 'investment' },
  { id: 3, name: 'הראל ביטוח', type: 'insurance' },
];

const INTAKE_MATCHED = {
  document: {
    id: 42, entity_id: 2, entity_name: 'IBKR', document_name: 'Annual Activity Statement',
    year: 2025, required_by_date: '2027-03-31', file_path: 'doc_x_1.pdf', auto_filed: 1, status: 'pending',
  },
  action: 'matched',
  suggestions: { issuer: { name: 'IBKR', entityId: 2 }, docType: 'Annual Activity Statement', year: 2025, renewalDate: '2027-03-31', confidence: 'high' },
  note: null,
};

const INTAKE_UNMATCHED = {
  document: {
    id: 43, entity_id: 1, entity_name: '📥 ממתין לשיוך', document_name: 'scan',
    year: null, required_by_date: null, file_path: 'doc_x_2.pdf', auto_filed: 1, status: 'pending',
  },
  action: 'unmatched',
  suggestions: { issuer: null, docType: null, year: null, renewalDate: null, confidence: 'low' },
  note: 'לא זוהה טקסט — ייתכן שהקובץ סרוק (יידרש OCR בעתיד)',
};

// גוף שזוהה (הפניקס) אך אינו קיים ברשימת הגופים → נקלט ל"ממתין לשיוך" עם suggestedType
const INTAKE_KNOWN_ISSUER_NO_ENTITY = {
  document: {
    id: 50, entity_id: 1, entity_name: '📥 ממתין לשיוך', document_name: 'policy',
    year: 2025, required_by_date: null, file_path: 'doc_x_3.pdf', auto_filed: 1, status: 'pending',
  },
  action: 'unmatched',
  suggestions: { issuer: { name: 'הפניקס', entityId: null, suggestedType: 'insurance' }, docType: null, year: 2025, renewalDate: null, confidence: 'medium' },
  note: null,
};

function dropFile(name = 'test.pdf') {
  const input = document.querySelector('.intake-box input[type="file"]');
  const file = new File([new Uint8Array([1, 2, 3])], name, { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
}

describe('IntakeBox — תיבת הקליטה החכמה', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // סטטוס GPT — נטען ב-useEffect של IntakeBox
    vi.mocked(axios.get).mockResolvedValue({ data: { configured: true, model: 'gpt-4o' } });
  });

  test('קובץ שזוהה ותויק מציג את ההחלטה ואת השדות לפיקוח', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: INTAKE_MATCHED });
    render(<IntakeBox entities={entities} onRefresh={() => {}} />);
    dropFile('ibkr-2025.pdf');

    expect(await screen.findByText(/זוהה ותויק לסלוט קיים/)).toBeInTheDocument();
    expect(screen.getByText(/ביטחון: גבוה/)).toBeInTheDocument();
    // השדות מולאו מהזיהוי וניתנים לתיקון
    expect(screen.getByDisplayValue('Annual Activity Statement')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2027-03-31')).toBeInTheDocument();
  });

  test('"אשר ושמור" שולח את התיקונים ומנקה את דגל הפיקוח', async () => {
    const onRefresh = vi.fn();
    vi.mocked(axios.post).mockResolvedValue({ data: INTAKE_MATCHED });
    vi.mocked(axios.put).mockResolvedValue({ data: { ...INTAKE_MATCHED.document, document_name: 'שם מתוקן', auto_filed: 0 } });
    render(<IntakeBox entities={entities} onRefresh={onRefresh} />);
    dropFile();

    await screen.findByText(/אשר ושמור/);
    // תיקון השם לפני אישור
    fireEvent.change(screen.getByDisplayValue('Annual Activity Statement'), { target: { value: 'שם מתוקן' } });
    fireEvent.click(screen.getByRole('button', { name: /אשר ושמור/ }));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    const [url, payload] = vi.mocked(axios.put).mock.calls[0];
    expect(url).toBe('/api/documents/42');
    expect(payload.document_name).toBe('שם מתוקן');
    expect(payload.auto_filed).toBe(0);
    expect(await screen.findByText(/אושר ונשמר/)).toBeInTheDocument();
    expect(onRefresh).toHaveBeenCalled();
  });

  test('קובץ לא מזוהה מבקש שיוך ידני ומאפשר בחירת גוף', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: INTAKE_UNMATCHED });
    render(<IntakeBox entities={entities} onRefresh={() => {}} />);
    dropFile('scan.pdf');

    expect(await screen.findByText(/לא זוהה גוף — נא לשייך/)).toBeInTheDocument();
    expect(screen.getByText(/ייתכן שהקובץ סרוק/)).toBeInTheDocument();
    // בורר הגופים זמין לשיוך מחדש
    const select = screen.getByDisplayValue(/ממתין לשיוך/);
    fireEvent.change(select, { target: { value: '3' } });
    expect(screen.getByDisplayValue('הראל ביטוח')).toBeInTheDocument();
  });

  test('גוף שזוהה אך לא קיים → "גוף חדש" ממולא מראש (שם+סוג) וניתן לעריכה, יוצר ומשייך', async () => {
    const onAddEntity = vi.fn().mockResolvedValue({ id: 99, name: 'הפניקס', type: 'insurance' });
    vi.mocked(axios.post).mockResolvedValue({ data: INTAKE_KNOWN_ISSUER_NO_ENTITY });
    render(<IntakeBox entities={entities} onRefresh={() => {}} onAddEntity={onAddEntity} />);
    dropFile('phoenix.pdf');

    await screen.findByText(/לא זוהה גוף — נא לשייך/);
    // פתיחת מיני-הטופס
    fireEvent.click(screen.getByRole('button', { name: /גוף חדש/ }));
    // השם והסוג מולאו מראש מהזיהוי
    expect(screen.getByDisplayValue('הפניקס')).toBeInTheDocument();
    const typeSelect = screen.getByDisplayValue('🛡️ ביטוח');
    expect(typeSelect).toBeInTheDocument();
    // עריכה של השם לפני יצירה (הזיהוי לא מדויק)
    fireEvent.change(screen.getByDisplayValue('הפניקס'), { target: { value: 'הפניקס חברה לביטוח' } });
    fireEvent.click(screen.getByRole('button', { name: /צור ושייך/ }));

    await waitFor(() => expect(onAddEntity).toHaveBeenCalledWith({ name: 'הפניקס חברה לביטוח', type: 'insurance' }));
    // אחרי היצירה המיני-טופס נסגר
    await waitFor(() => expect(screen.queryByRole('button', { name: /צור ושייך/ })).not.toBeInTheDocument());
  });

  test('גוף חדש זמין גם כשכלום לא זוהה (שם ריק לעריכה)', async () => {
    const onAddEntity = vi.fn().mockResolvedValue({ id: 77, name: 'חברה ידנית', type: 'bank' });
    vi.mocked(axios.post).mockResolvedValue({ data: INTAKE_UNMATCHED });
    render(<IntakeBox entities={entities} onRefresh={() => {}} onAddEntity={onAddEntity} />);
    dropFile('mystery.pdf');

    await screen.findByText(/לא זוהה גוף/);
    fireEvent.click(screen.getByRole('button', { name: /גוף חדש/ }));
    // "צור ושייך" חסום עד שממלאים שם וסוג
    expect(screen.getByRole('button', { name: /צור ושייך/ })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('שם החברה'), { target: { value: 'חברה ידנית' } });
    // בורר הסוג של המיני-טופס הוא האחרון בשורה
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[selects.length - 1], { target: { value: 'bank' } });
    await waitFor(() => expect(screen.getByRole('button', { name: /צור ושייך/ })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: /צור ושייך/ }));
    await waitFor(() => expect(onAddEntity).toHaveBeenCalledWith({ name: 'חברה ידנית', type: 'bank' }));
  });

  test('קובץ כפול → מציג התראה וקישור לקיים, בלי שדות עריכה', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { action: 'duplicate', existing: { id: 12, document_name: 'טופס 867', entity_name: 'IBKR' }, note: 'הקובץ כבר קיים במערכת כ"טופס 867" (IBKR)' },
    });
    render(<IntakeBox entities={entities} onRefresh={() => {}} />);
    dropFile('dup.pdf');
    expect(await screen.findByText(/קובץ כפול — כבר קיים במערכת/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /צפייה בקיים/ })).toBeInTheDocument();
    // אין כפתור "אשר ושמור" עבור כפול
    expect(screen.queryByRole('button', { name: /אשר ושמור/ })).not.toBeInTheDocument();
  });

  test('כפתור "השלך" מוחק את המסמך שנקלט', async () => {
    const onRefresh = vi.fn();
    vi.mocked(axios.post).mockResolvedValue({ data: INTAKE_MATCHED });
    vi.mocked(axios.delete).mockResolvedValue({ data: {} });
    render(<IntakeBox entities={entities} onRefresh={onRefresh} />);
    dropFile('x.pdf');
    await screen.findByText(/אשר ושמור/);
    fireEvent.click(screen.getByRole('button', { name: /השלך/ }));
    await waitFor(() => expect(axios.delete).toHaveBeenCalledWith('/api/documents/42'));
    // השורה הוסרה
    await waitFor(() => expect(screen.queryByText(/אשר ושמור/)).not.toBeInTheDocument());
  });

  test('כמה קבצים בבת אחת — כל אחד מקבל שורת תוצאה', async () => {
    vi.mocked(axios.post)
      .mockResolvedValueOnce({ data: INTAKE_MATCHED })
      .mockResolvedValueOnce({ data: { ...INTAKE_UNMATCHED, document: { ...INTAKE_UNMATCHED.document, id: 44 } } });
    render(<IntakeBox entities={entities} onRefresh={() => {}} />);

    const input = document.querySelector('.intake-box input[type="file"]');
    const f1 = new File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' });
    const f2 = new File([new Uint8Array([2])], 'b.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [f1, f2] } });

    expect(await screen.findByText(/זוהה ותויק לסלוט קיים/)).toBeInTheDocument();
    expect(await screen.findByText(/לא זוהה גוף — נא לשייך/)).toBeInTheDocument();
    expect(vi.mocked(axios.post)).toHaveBeenCalledTimes(2);
  });
});
