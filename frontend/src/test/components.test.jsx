import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
