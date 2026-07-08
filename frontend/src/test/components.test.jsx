import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Navigation from '../components/Navigation';
import Dashboard from '../components/Dashboard';
import EntityList from '../components/EntityList';

describe('Navigation', () => {
  test('מרנדר את כל כפתורי הניווט', () => {
    render(<Navigation currentPage="dashboard" onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: /עמוד הבית/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /גופים פיננסיים/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /📄 מסמכים/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /משימות שנתיות/ })).toBeInTheDocument();
  });

  test('לחיצה על כפתור קוראת ל-onPageChange עם העמוד הנכון', () => {
    const onPageChange = vi.fn();
    render(<Navigation currentPage="dashboard" onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: /📄 מסמכים/ }));
    expect(onPageChange).toHaveBeenCalledWith('documents');
  });

  test('הכפתור הפעיל מקבל class active', () => {
    render(<Navigation currentPage="entities" onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: /גופים פיננסיים/ }).className).toContain('active');
  });
});

describe('Dashboard', () => {
  const entities = [
    { id: 1, name: 'בנק מזרחי', type: 'bank' },
    { id: 2, name: 'IBKR', type: 'investment' },
  ];
  const documents = [
    { id: 1, document_name: '867', status: 'pending', entity_name: 'IBKR' },
    { id: 2, document_name: '106', status: 'submitted', entity_name: 'בנק מזרחי' },
  ];
  const checklist = [{ id: 1, task_name: 'דוח שנתי', status: 'pending' }];

  test('מציג את מספרי הסטטיסטיקה הנכונים', () => {
    render(<Dashboard entities={entities} documents={documents} checklist={checklist} onNavigate={() => {}} />);
    const nums = screen.getAllByText(/^\d+$/).map((e) => e.textContent);
    expect(nums).toContain('2'); // גופים
    expect(nums).toContain('1'); // משימות
  });

  test('מציג מסמך ממתין ברשימה', () => {
    render(<Dashboard entities={entities} documents={documents} checklist={checklist} onNavigate={() => {}} />);
    expect(screen.getByText('📄 867')).toBeInTheDocument();
  });

  test('כפתור "הצג הכל" מנווט לעמוד המסמכים', () => {
    const onNavigate = vi.fn();
    render(<Dashboard entities={entities} documents={documents} checklist={checklist} onNavigate={onNavigate} />);
    fireEvent.click(screen.getAllByText('הצג הכל')[0]);
    expect(onNavigate).toHaveBeenCalledWith('documents');
  });
});

describe('Dashboard — התראות מועדים', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 8)); // 2026-07-08
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const entities = [{ id: 1, name: 'גוף', type: 'bank' }];

  test('מציג התראה למסמך באיחור ולמסמך מתקרב, לא למסמך רחוק/הוגש', () => {
    const documents = [
      { id: 1, document_name: 'מסמך באיחור', status: 'pending', required_by_date: '2026-04-30', entity_name: 'גוף' },
      { id: 2, document_name: 'מסמך מתקרב', status: 'pending', required_by_date: '2026-07-10', entity_name: 'גוף' },
      { id: 3, document_name: 'מסמך רחוק', status: 'pending', required_by_date: '2026-12-31', entity_name: 'גוף' },
      { id: 4, document_name: 'מסמך שהוגש', status: 'submitted', required_by_date: '2026-04-30', entity_name: 'גוף' },
    ];
    render(<Dashboard entities={entities} documents={documents} checklist={[]} onNavigate={() => {}} />);
    const section = screen.getByText(/התראות מועדים \(2\)/).closest('.dashboard-section');
    expect(within(section).getByText(/מסמך באיחור/)).toBeInTheDocument();
    expect(within(section).getByText(/מסמך מתקרב/)).toBeInTheDocument();
    expect(within(section).queryByText(/מסמך רחוק/)).not.toBeInTheDocument();
    expect(within(section).queryByText(/מסמך שהוגש/)).not.toBeInTheDocument();
  });

  test('בלי התראות — סעיף ההתראות לא מוצג', () => {
    const documents = [
      { id: 1, document_name: 'רחוק', status: 'pending', required_by_date: '2026-12-31', entity_name: 'גוף' },
    ];
    render(<Dashboard entities={entities} documents={documents} checklist={[]} onNavigate={() => {}} />);
    expect(screen.queryByText(/התראות מועדים/)).not.toBeInTheDocument();
  });

  test('לחיצה על התראה מנווטת לעמוד המתאים', () => {
    const onNavigate = vi.fn();
    const documents = [
      { id: 1, document_name: 'באיחור', status: 'pending', required_by_date: '2026-04-30', entity_name: 'גוף' },
    ];
    render(<Dashboard entities={entities} documents={documents} checklist={[]} onNavigate={onNavigate} />);
    const section = screen.getByText(/התראות מועדים/).closest('.dashboard-section');
    fireEvent.click(within(section).getByText(/📄 באיחור/));
    expect(onNavigate).toHaveBeenCalledWith('documents');
  });
});

describe('EntityList', () => {
  const entities = [
    { id: 1, name: 'בנק מזרחי', type: 'bank', category: 'משפחתי' },
    { id: 2, name: 'IBKR', type: 'investment', category: 'ניירות ערך' },
  ];

  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  test('מרנדר את שמות הגופים', () => {
    render(<EntityList entities={entities} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/בנק מזרחי/)).toBeInTheDocument();
    expect(screen.getByText(/IBKR/)).toBeInTheDocument();
  });

  test('מצב ריק מציג הודעה', () => {
    render(<EntityList entities={[]} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/אין גופים פיננסיים/)).toBeInTheDocument();
  });

  test('כפתור מחיקה (אחרי אישור) קורא ל-onDelete עם ה-id', () => {
    const onDelete = vi.fn();
    render(<EntityList entities={entities} onEdit={() => {}} onDelete={onDelete} />);
    fireEvent.click(screen.getAllByText(/מחק/)[0]);
    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  test('כפתור עריכה קורא ל-onEdit עם ה-id', () => {
    const onEdit = vi.fn();
    render(<EntityList entities={entities} onEdit={onEdit} onDelete={() => {}} />);
    fireEvent.click(screen.getAllByText(/ערוך/)[0]);
    expect(onEdit).toHaveBeenCalledWith(1);
  });
});
